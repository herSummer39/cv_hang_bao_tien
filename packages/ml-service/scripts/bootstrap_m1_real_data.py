"""
Script bootstrapping data that cho M1 NER:
  1. Doc CV that tu timviec365 (USER_DATA_FINAL.csv)
  2. Dung M1 hien tai tu dong gan nhan BIO
  3. Chi giu cac cau co confidence > 0.85
  4. Luu ra format CoNLL de fine-tune M1

Chay: python scripts/bootstrap_m1_real_data.py
Output: data/ner/train_real.conll, val_real.conll
"""
import os
os.environ["USE_TF"] = "0"
os.environ["USE_JAX"] = "0"
os.environ["TRANSFORMERS_NO_TF"] = "1"

import re
import json
import random
import pandas as pd
from pathlib import Path
from transformers import pipeline

random.seed(42)

# ─ Đư᨝ng dẫn ───────────────────────────────────────────────────────────────
KAGGLE_CSV = Path("E:/datasets/kaggle/phamtheds/job-dataset-for-recommendation/versions/1/USER_DATA_FINAL.csv")
M1_MODEL   = Path(__file__).parent.parent / "models" / "m1_ner" / "final"
OUT_DIR    = Path(__file__).parent.parent / "data" / "ner"
OUT_DIR.mkdir(parents=True, exist_ok=True)

CONFIDENCE_THRESHOLD = 0.80  # Chỉ giữ dự đoán tự tin >= 80%

# ─ Từ điển skill đa ngành để gán nhãn trực tiếp (bypass bias) ──────────────────
DOMAIN_SKILL_DICT = {
    # Marketing
    "seo", "google ads", "facebook ads", "tiktok ads", "content marketing",
    "email marketing", "google analytics", "canva", "copywriting",
    "social media marketing", "brand management", "media planning", "market research",
    "hubspot", "mailchimp", "digital marketing", "affiliate marketing",
    # Kế toán / Tài chính
    "misa", "kế toán tổng hợp", "báo cáo tài chính", "kế toán thuế",
    "kiểm toán", "phân tích tài chính", "lập ngân sách",
    "ifrs", "vas", "kế toán kho", "kế toán công nợ", "kế toán lương",
    "hóa đơn điện tử", "quyết toán thuế", "tài chính doanh nghiệp",
    # Nhân sự / HR
    "tuyển dụng", "c&b", "onboarding", "hris", "đào tạo phát triển",
    "lương thưởng", "okr", "đánh giá hiệu suất", "phúc lợi nhân viên",
    "quan hệ lao động", "hợp đồng lao động", "headhunting", "bhxh",
    "talent management", "hr analytics", "employee engagement",
    # Kinh doanh / Sales
    "b2b sales", "đàm phán hợp đồng", "quản lý kênh phân phối",
    "pipeline sales", "cold calling", "telesales", "account management",
    "business development", "upselling", "cross-selling", "b2c sales", "retail sales",
    # Thiết kế
    "wireframing", "prototyping", "user research",
    "brand identity", "visual design", "motion graphics", "logo design",
    "design system", "color theory", "indesign",
    # Logistics
    "xuất nhập khẩu", "hải quan", "incoterms", "vận tải biển",
    "quản lý kho", "wms", "customs clearance", "bill of lading",
    "freight forwarding", "supply chain", "procurement",
    "last mile delivery", "3pl", "transport management",
    # Kỹ thuật / Xây dựng
    "autocad", "revit", "solidworks", "matlab", "plc", "scada",
    "dự toán công trình", "thiết kế kết cấu", "điện công nghiệp",
    "hệ thống hvac", "an toàn lao động", "iso 14001", "qa/qc",
    "hàn", "bim", "thi công", "giám sát công trình",
    # Y tế
    "dược lâm sàng", "điều dưỡng", "chẩn đoán hình ảnh",
    "xét nghiệm y khoa", "gmp", "gdp", "dược phẩm",
    "quản lý phòng khám", "vật lý trị liệu", "nghiên cứu lâm sàng",
    "dược điển", "y học dự phòng", "tư vấn dinh dưỡng",
    # Giáo dục
    "giáo án", "quản lý lớp học", "phương pháp giảng dạy",
    "e-learning", "lms", "moodle", "thiết kế khóa học",
    "đào tạo doanh nghiệp", "kỹ năng mềm", "stem", "blended learning",
    # Nhà hàng / Khách sạn
    "quản lý nhà hàng", "quản lý khách sạn", "lễ tân",
    "housekeeping", "f&b", "bartending", "barista", "quản lý bếp",
    "pms hotel", "tour guide", "event management",
    "revenue management", "ota", "du lịch lữ hành",
}

def dict_label_sentence(sent: str) -> list[tuple[str, str]] | None:
    """
    Gán nhãn bằng từ điển cho các câu chứa kỹ năng ngành ít dữ liệu.
    Trả về list (word, label) nếu tìm thấy ít nhất 1 keyword, None nếu không.
    """
    sent_lower = sent.lower()
    found_skills = [kw for kw in DOMAIN_SKILL_DICT if kw in sent_lower]
    if not found_skills:
        return None

    words = sent.split()
    labels = ["O"] * len(words)

    for skill_kw in found_skills:
        skill_tokens = skill_kw.split()
        n = len(skill_tokens)
        words_lower = [w.lower() for w in words]
        for i in range(len(words_lower) - n + 1):
            if words_lower[i:i+n] == skill_tokens:
                labels[i] = "B-SKILL"
                for j in range(1, n):
                    labels[i+j] = "I-SKILL"
                break

    return list(zip(words, labels))


# -- Buoc 1: Load M1 model ---------------------------------------------------
print("=" * 60)
print("BUOC 1: Load M1 NER model...")
print("=" * 60)
ner_pipe = pipeline(
    "token-classification",
    model=str(M1_MODEL),
    aggregation_strategy="simple",
    device=-1,  # CPU
)
print("  -> M1 loaded!")

# -- Buoc 2: Doc CV that -----------------------------------------------------
print("\n" + "=" * 60)
print("BUOC 2: Doc CV that tu timviec365...")
print("=" * 60)
df = pd.read_csv(KAGGLE_CSV)
print(f"  -> Tong: {len(df)} ho so")

def extract_cv_sentences(row) -> list[str]:
    """Trich xuat cac cau co the chua entity tu CV."""
    sentences = []
    # Lay tu cac truong: Skills, Target, Work Experience
    for field in ["Skills", "Target"]:
        val = str(row.get(field, ""))
        if pd.isna(row.get(field)) or val == "nan":
            continue
        # Tach thanh cac cau / menh de ngan
        parts = re.split(r'[.\n;,]+', val)
        for p in parts:
            p = p.strip()
            # Chi lay cau co 3-30 tu, co the chua entity
            words = p.split()
            if 3 <= len(words) <= 30:
                sentences.append(p)
    return sentences

all_sentences = []
for _, row in df.iterrows():
    sents = extract_cv_sentences(row)
    all_sentences.extend(sents)

# Loai bo trung lap
all_sentences = list(set(all_sentences))
print(f"  -> Tong cau trich xuat: {len(all_sentences)}")

# -- Buoc 3: Tu dong gan nhan bang M1 ----------------------------------------
print("\n" + "=" * 60)
print("BUOC 3: Tu dong gan nhan NER (chay M1 tren CV that)...")
print("=" * 60)

BATCH_SIZE = 64
conll_records = []  # List[(cau, list[(tu, nhan)])]
skipped = 0
kept = 0

for i in range(0, len(all_sentences), BATCH_SIZE):
    batch = all_sentences[i:i+BATCH_SIZE]
    try:
        results = ner_pipe(batch)
    except Exception as e:
        skipped += len(batch)
        continue

    for sent, ents in zip(batch, results):
        # Kiem tra confidence trung binh cua cac entity
        if not ents:
            # Khong co entity -> gan tat ca O
            words = sent.split()
            labels = ["O"] * len(words)
            conll_records.append((sent, list(zip(words, labels))))
            kept += 1
            continue

        avg_conf = sum(e["score"] for e in ents) / len(ents)
        if avg_conf < CONFIDENCE_THRESHOLD:
            skipped += 1
            continue

        # Chuyen entity span ve token-level BIO labels
        words = sent.split()
        labels = ["O"] * len(words)

        for ent in ents:
            ent_type = ent["entity_group"]  # SKILL, EXP, EDU, ORG
            # Tim vi tri tu trong cau (don gian: so sanh text)
            ent_words = ent["word"].replace("@@", "").strip().split()
            for j in range(len(words)):
                # Tim vi tri bat dau cua entity trong chuoi words
                match = True
                for k, ew in enumerate(ent_words):
                    if j + k >= len(words):
                        match = False
                        break
                    if ew.lower() not in words[j+k].lower():
                        match = False
                        break
                if match and len(ent_words) > 0:
                    labels[j] = f"B-{ent_type}"
                    for k in range(1, len(ent_words)):
                        if j + k < len(words):
                            labels[j+k] = f"I-{ent_type}"
                    break

        conll_records.append((sent, list(zip(words, labels))))
        kept += 1

        if (i // BATCH_SIZE) % 10 == 0:
            pct = min(100, int(i / len(all_sentences) * 100))
            print(f"  [{pct}%] Xu ly {i}/{len(all_sentences)} cau | Giu: {kept} | Bo: {skipped}")

print(f"\n  -> Tong cau giu lai (model): {kept}")
print(f"  -> Tong cau bo (confidence thap): {skipped}")

# -- Buoc 3b: Gap nhan bang tu dien cho nganh it du lieu ----------------------
print("\n" + "=" * 60)
print("BUOC 3b: Gap nhan tu dien (bypass bias cho nganh khong phai IT)...")
print("=" * 60)

existing_sents = {s for s, _ in conll_records}
dict_kept = 0
for sent in all_sentences:
    if sent in existing_sents:      # Bo qua cau model da xu ly
        continue
    result = dict_label_sentence(sent)
    if result is not None:
        conll_records.append((sent, result))
        existing_sents.add(sent)
        dict_kept += 1

print(f"  -> Tu dien them vao: {dict_kept} cau")
print(f"  -> Tong cau sau 2 buoc: {len(conll_records)}")

# -- Buoc 4: Luu ra format CoNLL --------------------------------------------
print("\n" + "=" * 60)
print("BUOC 4: Luu ra format CoNLL...")
print("=" * 60)

random.shuffle(conll_records)
n_val   = max(50, int(len(conll_records) * 0.1))
n_train = len(conll_records) - n_val

train_records = conll_records[:n_train]
val_records   = conll_records[n_train:]

def write_conll(records, path: Path):
    lines = []
    for sent, token_labels in records:
        for word, label in token_labels:
            if word.strip():
                lines.append(f"{word} {label}")
        lines.append("")  # Dong trong phan cach cac cau
    path.write_text("\n".join(lines), encoding="utf-8")

train_path = OUT_DIR / "train_real.conll"
val_path   = OUT_DIR / "val_real.conll"

write_conll(train_records, train_path)
write_conll(val_records,   val_path)

# Thong ke nhan
all_labels = [lbl for _, tl in conll_records for _, lbl in tl]
from collections import Counter
label_counts = Counter(all_labels)

print(f"\n  -> Train: {len(train_records)} cau → {train_path}")
print(f"  -> Val  : {len(val_records)} cau → {val_path}")
print(f"\n  Phan phoi nhan:")
for lbl, cnt in sorted(label_counts.items()):
    print(f"    {lbl:12s}: {cnt:6d}")

print("\n" + "=" * 60)
print("[XONG] Data that da san sang de fine-tune M1!")
print("Chay tiep: python scripts/train_m1_ner.py --mode full \\")
print("           --resume_from_checkpoint models/m1_ner/final \\")
print("           --data_dir data/ner/train_real.conll")
print("=" * 60)
