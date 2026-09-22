"""
train_m1_ner.py
Fine-tune PhoBERT cho bài toán NER trên CV tiếng Việt
Labels: B-SKILL, I-SKILL, B-EXP, I-EXP, B-EDU, I-EDU, B-ORG, I-ORG, O
"""
import os
os.environ["USE_TF"] = "0"
os.environ["USE_JAX"] = "0"
os.environ["TRANSFORMERS_NO_TF"] = "1"

import json
import argparse
import logging
import numpy as np
from pathlib import Path
from dataclasses import dataclass

import torch
from torch.utils.data import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")
logger = logging.getLogger(__name__)

# ─── Config ──────────────────────────────────────────────────────────────────
BASE_MODEL = "vinai/phobert-base"   # PhoBERT gốc của VinAI

LABEL_LIST = [
    "O",
    "B-SKILL", "I-SKILL",
    "B-EXP",   "I-EXP",
    "B-EDU",   "I-EDU",
    "B-ORG",   "I-ORG",
]
LABEL2ID = {l: i for i, l in enumerate(LABEL_LIST)}
ID2LABEL = {i: l for i, l in enumerate(LABEL_LIST)}

DATA_DIR   = Path(__file__).parent.parent / "data" / "ner"
OUTPUT_DIR = Path(__file__).parent.parent / "models" / "m1_ner"


# ─── Dataset ─────────────────────────────────────────────────────────────────
def load_conll(path: Path) -> list[dict]:
    """Đọc file CoNLL-2003."""
    samples = []
    tokens, labels = [], []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip()
            if line == "":
                if tokens:
                    samples.append({"tokens": tokens, "labels": labels})
                    tokens, labels = [], []
            else:
                parts = line.split("\t")
                tokens.append(parts[0])
                labels.append(parts[1] if len(parts) > 1 else "O")
    if tokens:
        samples.append({"tokens": tokens, "labels": labels})
    return samples


class NERDataset(Dataset):
    def __init__(self, samples: list[dict], tokenizer, max_len: int = 128):
        self.samples = samples
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        tokens = sample["tokens"]
        labels = sample["labels"]

        # Đếm số sub-token mỗi word sinh ra (slow tokenizer không có word_ids)
        word_subtoken_counts = []
        for word in tokens:
            subs = self.tokenizer.tokenize(word)
            word_subtoken_counts.append(max(len(subs), 1))

        # Encode toàn câu
        encoding = self.tokenizer(
            tokens,
            is_split_into_words=True,
            truncation=True,
            max_length=self.max_len,
            padding="max_length",
        )

        input_ids = encoding["input_ids"]
        seq_len = len(input_ids)

        # Xây dựng label_ids thủ công
        # [CLS]/[BOS] = -100, [SEP]/[EOS] = -100, [PAD] = -100
        special_ids = {
            self.tokenizer.cls_token_id,
            self.tokenizer.sep_token_id,
            self.tokenizer.pad_token_id,
        }
        # Lọc None
        special_ids.discard(None)

        label_ids = []
        word_idx = 0
        subtoken_pos = 0  # vị trí sub-token trong word hiện tại

        for i in range(seq_len):
            tok_id = input_ids[i]
            if tok_id in special_ids:
                label_ids.append(-100)
            else:
                if word_idx >= len(labels):
                    label_ids.append(-100)
                else:
                    orig_label = labels[word_idx]
                    if subtoken_pos == 0:
                        # Token đầu tiên của word → dùng label gốc
                        label_ids.append(LABEL2ID.get(orig_label, 0))
                    else:
                        # Sub-token tiếp theo → đổi B- thành I-
                        if orig_label.startswith("B-"):
                            label_ids.append(LABEL2ID.get("I-" + orig_label[2:], 0))
                        else:
                            label_ids.append(LABEL2ID.get(orig_label, 0))

                    subtoken_pos += 1
                    if word_idx < len(word_subtoken_counts) and subtoken_pos >= word_subtoken_counts[word_idx]:
                        word_idx += 1
                        subtoken_pos = 0

        encoding["labels"] = label_ids
        return {k: torch.tensor(v) for k, v in encoding.items()}


# ─── Metrics ─────────────────────────────────────────────────────────────
def compute_metrics(pred):
    predictions, labels = pred
    predictions = np.argmax(predictions, axis=2)

    true_labels, true_preds = [], []
    for pred_seq, label_seq in zip(predictions, labels):
        for p, l in zip(pred_seq, label_seq):
            if l != -100:
                true_labels.append(ID2LABEL[l])
                true_preds.append(ID2LABEL[p])

    # F1 tổng (entity-level)
    correct = sum(1 for p, l in zip(true_preds, true_labels) if p == l and l != "O")
    total_pred = sum(1 for p in true_preds if p != "O")
    total_true = sum(1 for l in true_labels if l != "O")

    precision = correct / total_pred if total_pred > 0 else 0
    recall    = correct / total_true if total_true > 0 else 0
    f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    # Per-label F1 (in ra console để theo dõi cân bằng ngành)
    try:
        from sklearn.metrics import classification_report
        # Chỉ xét các nhãn khác O
        entity_labels = [l for l in LABEL_LIST if l != "O"]
        report = classification_report(
            true_labels, true_preds,
            labels=entity_labels,
            zero_division=0,
            digits=3,
        )
        print("\n=== Per-label F1 (entity-level) ===")
        print(report)
    except ImportError:
        pass  # sklearn chưa cài

    return {"precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4)}


# ─── Train ───────────────────────────────────────────────────────────────────
def train(mode: str = "full", resume_from_checkpoint: str = None, use_real_data: bool = False):
    logger.info(f"Mode: {mode}")
    logger.info(f"Base model: {BASE_MODEL}")

    # Load data — uu tien data that neu co
    if use_real_data and (DATA_DIR / "train_real.conll").exists():
        logger.info("Dung DATA THAT (train_real.conll + val_real.conll)")
        # Ket hop synthetic + real de tang do da dang
        train_synth = load_conll(DATA_DIR / "train.conll")
        train_real  = load_conll(DATA_DIR / "train_real.conll")
        train_samples = train_synth + train_real
        val_samples   = load_conll(DATA_DIR / "val_real.conll")
        logger.info(f"Synthetic: {len(train_synth)} | Real: {len(train_real)} | Tong: {len(train_samples)}")
    else:
        train_samples = load_conll(DATA_DIR / "train.conll")
        val_samples   = load_conll(DATA_DIR / "val.conll")

    # Bo sung train_v2.conll (generate_ner_data_v2.py) neu co - sinh tu dung
    # skill da seed trong Supabase (73/73 nganh, xem industry_skills_source.py),
    # giup model thay ro cac skill moi/hiem ma data that chua co nhieu vi du.
    # QUAN TRONG: KHONG cong val_v2.conll vao val_samples — val phai giu
    # nguyen 100% data thuc (val_real/val.conll) de precision/recall/F1 do
    # dung tren phan bo thuc te, khong bi lech vi danh gia tren cau template.
    if (DATA_DIR / "train_v2.conll").exists():
        train_v2 = load_conll(DATA_DIR / "train_v2.conll")
        train_samples = train_samples + train_v2
        logger.info(f"Bo sung train_v2.conll vao TRAIN (73 nganh Supabase): +{len(train_v2)} cau")

    logger.info(f"Train: {len(train_samples)} | Val: {len(val_samples)} (val giu nguyen data thuc)")

    if mode == "dev":
        train_samples = train_samples[:200]
        val_samples   = val_samples[:50]
        epochs = 2
        batch  = 8
    else:
        epochs = 5
        batch  = 16

    # Tokenizer & model
    # Neu resume tu checkpoint, load model tu checkpoint thay vi BASE_MODEL
    if resume_from_checkpoint and Path(resume_from_checkpoint).exists():
        logger.info(f"Resume tu checkpoint: {resume_from_checkpoint}")
        model_path = resume_from_checkpoint
    else:
        model_path = BASE_MODEL

    logger.info(f"Loading tokenizer and model from: {model_path}")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, use_fast=False)  # Tokenizer luon tu goc
    model = AutoModelForTokenClassification.from_pretrained(
        model_path,
        num_labels=len(LABEL_LIST),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        ignore_mismatched_sizes=True,
    )

    # Dataset
    train_ds = NERDataset(train_samples, tokenizer)
    val_ds   = NERDataset(val_samples,   tokenizer)

    collator = DataCollatorForTokenClassification(tokenizer)

    # Training args
    args = TrainingArguments(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch,
        per_device_eval_batch_size=batch,
        learning_rate=3e-5,
        warmup_steps=50,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        fp16=False,
        dataloader_pin_memory=False,
        report_to="none",
        logging_steps=20,
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=collator,
        compute_metrics=compute_metrics,
    )

    logger.info("Bat dau train M1 NER...")
    # Chi resume trainer state neu co trainer_state.json (checkpoint that su)
    # "final" chi co model weights, khong co trainer state -> train fresh tu weights do
    ckpt_path = Path(resume_from_checkpoint) if resume_from_checkpoint else None
    has_trainer_state = ckpt_path and (ckpt_path / "trainer_state.json").exists()
    actual_resume = str(ckpt_path) if has_trainer_state else None
    if resume_from_checkpoint and not has_trainer_state:
        logger.info("Load model weights xong, bat dau fine-tune fresh (khong resume trainer state)")
    trainer.train(resume_from_checkpoint=actual_resume)


    # Save final model
    final_dir = OUTPUT_DIR / "final"
    final_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(final_dir)
    tokenizer.save_pretrained(final_dir)

    # Save label map
    (final_dir / "label_map.json").write_text(
        json.dumps({"id2label": ID2LABEL, "label2id": LABEL2ID}, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    logger.info(f"[DONE] Model lưu tại: {final_dir}")

    # Quick test
    logger.info("\n--- KIỂM TRA NHANH ---")
    test_sentences = [
        "Thành thạo React TypeScript Node.js",
        "Có 3 năm kinh nghiệm tại FPT Software",
        "Tốt nghiệp Đại học Bách Khoa TP.HCM năm 2022",
    ]
    from transformers import pipeline
    ner_pipe = pipeline("token-classification", model=str(final_dir), aggregation_strategy="simple")
    for sent in test_sentences:
        results = ner_pipe(sent)
        entities = [(r["word"], r["entity_group"], round(r["score"], 2)) for r in results]
        logger.info(f"  Input: {sent}")
        logger.info(f"  → {entities}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["dev", "full"], default="full",
                        help="dev=200 samples nhanh | full=3000 samples day du")
    parser.add_argument("--resume_from_checkpoint", type=str, default=None,
                        help="Duong dan den checkpoint de tiep tuc train")
    parser.add_argument("--use_real_data", action="store_true",
                        help="Fine-tune voi data that tu timviec365 (train_real.conll)")
    args = parser.parse_args()
    train(args.mode, resume_from_checkpoint=args.resume_from_checkpoint, use_real_data=args.use_real_data)
