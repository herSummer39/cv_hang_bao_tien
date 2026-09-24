"""
BƯỚC 2: Train M2 — Embedding Model (Vietnamese Bi-Encoder).

Thuật toán: Contrastive Learning với MultipleNegativesRankingLoss
Base model: bkai-foundation-models/vietnamese-bi-encoder (~135M params)

Chạy local (CPU — test nhỏ):
  python scripts/train_m2_embedding.py --mode dev

Chạy Kaggle/Colab (GPU T4 — train thật, tu dau tu BASE_MODEL):
  python scripts/train_m2_embedding.py --mode full

Chạy Kaggle/Colab (GPU T4 — TRAIN THEM VAO model da fine-tune san co,
khong train lai tu dau, giu nguyen nhung gi model da hoc):
  python scripts/train_m2_embedding.py --mode full \
      --resume_from_checkpoint models/m2_embedding_full/final
"""
# Force PyTorch-only — tắt TensorFlow/JAX trước khi import bất cứ thứ gì
import os
os.environ["USE_TF"] = "0"
os.environ["USE_JAX"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TRANSFORMERS_NO_TF"] = "1"

import json
import argparse
import logging
from pathlib import Path
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")
logger = logging.getLogger(__name__)


def load_data(data_path: Path) -> tuple[list, list, list]:
    """Load pairs và tách thành train/val/test.

    QUAN TRONG: eval_pairs (dung de danh gia + chon best checkpoint qua
    metric_for_best_model) CHI lay tu data GOC (data_path — data that hoac
    synthetic cu), KHONG duoc lan embedding_pairs_v2.json vao — neu tron ca
    v2 vao eval thi Spearman correlation se bi danh gia tren 1 phan lon la
    cau van tong hop/template, khong con phan anh dung chat luong tren CV/JD
    THAT nua, va co the chon nham checkpoint "hoc tot template" thay vi
    checkpoint that su tot voi nguoi dung thuc te.
    v2 CHI duoc cong them vao phan TRAIN (pos_pairs) — noi model can thay
    nhieu vi du hon cho cac nganh/skill moi (bao hiem, bat dong san...) it
    xuat hien trong data that.
    """
    pairs = json.loads(data_path.read_text(encoding="utf-8"))

    # eval_pairs: CHI tu data goc — giu nguyen, khong lan v2 (xem docstring)
    eval_pairs = [(p["cv"], p["jd"], float(p["score"])) for p in pairs]

    # Bo sung embedding_pairs_v2.json (generate_training_data_v2.py) neu co -
    # sinh tu dung skill da seed trong Supabase, phu du 73/73 nganh (xem
    # industry_skills_source.py) - CHI dua vao phan TRAIN, khong dua vao eval.
    pairs_for_train = pairs
    v2_path = data_path.parent / "embedding_pairs_v2.json"
    if v2_path.exists() and v2_path != data_path:
        v2_pairs = json.loads(v2_path.read_text(encoding="utf-8"))
        logger.info(f"Bo sung embedding_pairs_v2.json vao TRAIN (73 nganh Supabase): +{len(v2_pairs)} cap")
        pairs_for_train = pairs + v2_pairs

    # Chỉ dùng positive pairs cho MultipleNegativesRankingLoss
    # Loss này tự dùng các sample khác trong batch làm negative
    pos_pairs = [(p["cv"], p["jd"]) for p in pairs_for_train if p["label"] == 1]

    # Shuffle và split 80/10/10
    import random
    random.seed(42)
    random.shuffle(pos_pairs)
    random.shuffle(eval_pairs)

    n_train = int(len(pos_pairs) * 0.8)
    train_pairs = pos_pairs[:n_train]
    val_pos = pos_pairs[n_train:]

    n_eval_val = int(len(eval_pairs) * 0.1)
    eval_val = eval_pairs[:n_eval_val]

    return train_pairs, val_pos, eval_val


def train(mode: str = "dev", resume_from_checkpoint: str = None):
    import torch
    from sentence_transformers import (
        SentenceTransformer,
        SentenceTransformerTrainer,
        SentenceTransformerTrainingArguments,
        losses,
    )
    from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
    from datasets import Dataset

    # ── Config theo mode ──────────────────────────────────────────
    if mode == "dev":
        # Test nhanh trên CPU — 50 samples, 1 epoch
        N_SAMPLES   = 50
        EPOCHS      = 1
        BATCH_SIZE  = 8
        BASE_MODEL  = "bkai-foundation-models/vietnamese-bi-encoder"
        logger.info("MODE: DEV (CPU, 50 samples, 1 epoch) — dung de kiem tra code")
    elif mode == "quick":
        # Train nhanh tren CPU — 500 samples, 2 epochs, batch 8
        N_SAMPLES   = 500
        EPOCHS      = 2
        BATCH_SIZE  = 8
        BASE_MODEL  = "bkai-foundation-models/vietnamese-bi-encoder"
        logger.info("MODE: QUICK (CPU, 500 samples, 2 epochs) — train nhanh bang CPU")
    else:
        # Train thật trên GPU T4 (Kaggle/Colab)
        N_SAMPLES   = None  # Dùng hết
        EPOCHS      = 5
        BATCH_SIZE  = 32
        BASE_MODEL  = "bkai-foundation-models/vietnamese-bi-encoder"
        logger.info("MODE: FULL (GPU, all samples, 5 epochs) — train that")

    # ── Load data ─────────────────────────────────────────────────
    # Uu tien data that, fallback sang data tong hop neu chua co
    data_path_real = Path(__file__).parent.parent / "data" / "processed" / "embedding_pairs_real.json"
    data_path_synth = Path(__file__).parent.parent / "data" / "processed" / "embedding_pairs.json"
    if data_path_real.exists():
        data_path = data_path_real
        logger.info("Dung DATA THAT: embedding_pairs_real.json (6000 cap tu timviec365 + VietJobs)")
    elif data_path_synth.exists():
        data_path = data_path_synth
        logger.info("Dung data tong hop: embedding_pairs.json")
    else:
        raise FileNotFoundError(
            "Chua co data! Chay truoc: python scripts/build_real_embedding_pairs.py"
        )

    train_pairs, val_pairs, eval_pairs = load_data(data_path)

    if N_SAMPLES:
        train_pairs = train_pairs[:N_SAMPLES]

    logger.info(f"Train pairs: {len(train_pairs)}")
    logger.info(f"Val pairs  : {len(val_pairs)}")

    # ── Load base model (hoac resume tu model da fine-tune) ───────
    # Neu resume_from_checkpoint duoc truyen va duong dan ton tai, load
    # model TU DO de tiep tuc fine-tune tren nhung gi model da hoc duoc,
    # KHONG tai lai BASE_MODEL goc tu dau. Luu y: day la SentenceTransformer
    # da save (model.save()) nen chi co model weights, khong co optimizer/
    # lr-scheduler state cua Trainer -> optimizer/lr se bat dau lai tu dau,
    # nhung TRONG SO (weights) la trong so model da hoc duoc tu (cac) lan
    # train truoc do — dung y "train them vao" (incremental), khong phai
    # "lam lai tu dau" (full retrain tu BASE_MODEL).
    if resume_from_checkpoint and Path(resume_from_checkpoint).exists():
        logger.info(f"Resume tu model da fine-tune: {resume_from_checkpoint}")
        model = SentenceTransformer(resume_from_checkpoint)
    else:
        logger.info(f"Dang tai model goc: {BASE_MODEL}")
        logger.info("(Lan dau: ~500MB, sau do cache lai)")
        model = SentenceTransformer(BASE_MODEL)
    logger.info(f"Model da tai: {model.get_sentence_embedding_dimension()} chieu")

    # ── Chuẩn bị dataset ─────────────────────────────────────────
    # MultipleNegativesRankingLoss cần cột "anchor" và "positive"
    train_dataset = Dataset.from_dict({
        "anchor":   [p[0] for p in train_pairs],  # CV chunks
        "positive": [p[1] for p in train_pairs],  # JD chunks liên quan
    })

    # ── Loss function ─────────────────────────────────────────────
    # MultipleNegativesRankingLoss:
    # - Mỗi batch: sample i là positive pair (anchor_i, positive_i)
    # - Tự dùng positive_j (j≠i) làm in-batch negatives
    # - Hiệu quả với batch size lớn (không cần label negative riêng)
    loss = losses.MultipleNegativesRankingLoss(model)

    # ── Evaluator ─────────────────────────────────────────────────
    if eval_pairs:
        evaluator = EmbeddingSimilarityEvaluator(
            sentences1=[p[0] for p in eval_pairs],
            sentences2=[p[1] for p in eval_pairs],
            scores=[p[2] for p in eval_pairs],
            name="cv_jd_similarity",
        )
    else:
        evaluator = None

    # ── Training arguments ────────────────────────────────────────
    output_dir = Path(__file__).parent.parent / "models" / f"m2_embedding_{mode}"
    run_name   = f"m2-vi-biencoder-{mode}-{datetime.now().strftime('%m%d_%H%M')}"

    args = SentenceTransformerTrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        warmup_ratio=0.1,
        learning_rate=2e-5,
        fp16=torch.cuda.is_available(),  # tu dong bat mixed-precision khi co GPU (nhanh hon ~1.5-2x tren Tensor Core)
        bf16=False,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_cv_jd_similarity_spearman_cosine",
        run_name=run_name,
        logging_steps=10,
        report_to="none",   # Đổi thành "wandb" nếu muốn theo dõi
    )

    # ── Train ─────────────────────────────────────────────────────
    logger.info("Bat dau train M2 Embedding Model...")
    trainer = SentenceTransformerTrainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        loss=loss,
        evaluator=evaluator,
    )
    # Neu resume_from_checkpoint la 1 checkpoint THAT SU cua Trainer (co
    # trainer_state.json - VD checkpoint-450 sau khi terminal bi kill giua
    # luc dang chay epoch 3/5), resume DUNG VI TRI (epoch, step, optimizer,
    # lr-scheduler, RNG) de KHONG train lai tu dau cac epoch da xong roi -
    # tiep tuc dung ngay cho epoch con lai, nhanh hon nhieu so voi train lai
    # tu "final" (chi la model weights, khong co trainer state).
    ckpt_path = Path(resume_from_checkpoint) if resume_from_checkpoint else None
    has_trainer_state = bool(ckpt_path and (ckpt_path / "trainer_state.json").exists())
    actual_resume = str(ckpt_path) if has_trainer_state else None
    if resume_from_checkpoint and not has_trainer_state:
        logger.info("Load model weights xong, bat dau fine-tune fresh (khong resume trainer state)")
    elif has_trainer_state:
        logger.info(f"Resume DUNG VI TRI trainer (epoch/step/optimizer/lr) tu: {actual_resume}")
    trainer.train(resume_from_checkpoint=actual_resume)

    # ── Save final model ──────────────────────────────────────────
    final_path = output_dir / "final"
    model.save(str(final_path))
    logger.info(f"[DONE] Model luu tai: {final_path}")

    # ── Quick test ────────────────────────────────────────────────
    logger.info("\n--- KIEM TRA NHANH ---")
    test_pairs = [
        ("3 nam kinh nghiem React TypeScript Frontend Developer",
         "Tuyen Frontend Developer thanh thao React va TypeScript"),
        ("3 nam kinh nghiem React TypeScript Frontend Developer",
         "Tuyen Data Scientist thanh thao Python va Machine Learning"),
    ]
    for cv, jd in test_pairs:
        cv_emb  = model.encode(cv)
        jd_emb  = model.encode(jd)
        from sentence_transformers.util import cos_sim
        sim = cos_sim(cv_emb, jd_emb).item()
        print(f"  Sim={sim:.3f} | CV: {cv[:40]}...")
        print(f"           JD: {jd[:40]}...")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=["dev", "quick", "full"],
        default="dev",
        help="dev=CPU 50 mau | quick=CPU 500 mau | full=GPU train that",
    )
    parser.add_argument(
        "--resume_from_checkpoint",
        type=str,
        default=None,
        help="Duong dan den model da fine-tune de train THEM VAO (VD: models/m2_embedding_full/final). "
             "Khong truyen = train tu BASE_MODEL goc tu dau.",
    )
    args = parser.parse_args()
    train(mode=args.mode, resume_from_checkpoint=args.resume_from_checkpoint)
