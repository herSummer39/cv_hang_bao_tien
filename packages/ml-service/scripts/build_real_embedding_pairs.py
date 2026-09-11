"""
Script xây dựng embedding_pairs từ data THẬT:
  - CV thật: USER_DATA_FINAL.csv (timviec365.vn, 3983 hồ sơ)
  - JD thật: JOB_DATA_FINAL.csv (timviec365.vn, 14634 tin tuyển dụng)
  - JD thật: VietJobs HuggingFace (48092 tin tuyển dụng)

Output: data/processed/embedding_pairs_real.json
Chạy: python scripts/build_real_embedding_pairs.py
"""

import json
import random
import re
import pandas as pd
from pathlib import Path
from datasets import load_dataset

random.seed(42)

# -- Duong dan -------------------------------------------------------------
KAGGLE_DIR = Path("E:/datasets/kaggle/phamtheds/job-dataset-for-recommendation/versions/1")
OUT_DIR = Path(__file__).parent.parent / "data" / "processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# -- Chuan hoa nganh nghe --------------------------------------------------
INDUSTRY_MAP = {
    # IT
    "cong nghe thong tin": "it", "cntt": "it", "phan mem": "it",
    "it": "it", "lap trinh": "it", "software": "it",
    "ky thuat phan mem": "it",
    # Marketing
    "marketing": "marketing", "truyen thong": "marketing",
    "quang cao": "marketing", "digital marketing": "marketing", "pr": "marketing",
    # Ke toan
    "ke toan": "accounting", "tai chinh": "accounting",
    "kiem toan": "accounting", "ngan hang": "accounting", "bao hiem": "accounting",
    # Nhan su
    "nhan su": "hr", "hanh chinh": "hr", "tuyen dung": "hr", "hr": "hr",
    # Ban hang
    "kinh doanh": "sales", "ban hang": "sales", "sales": "sales", "thuong mai": "sales",
    # Thiet ke
    "thiet ke": "design", "do hoa": "design", "ui": "design", "ux": "design",
    # Van tai
    "van tai": "logistics", "lai xe": "logistics",
    "logistics": "logistics", "kho van": "logistics", "xuat nhap khau": "logistics",
    # Xay dung
    "xay dung": "engineering", "ky thuat": "engineering",
    "co khi": "engineering", "dien": "engineering",
    # Y te / Giao duc
    "y te": "healthcare", "duoc": "healthcare",
    "giao duc": "education", "dao tao": "education",
    # Nha hang
    "nha hang": "hospitality", "khach san": "hospitality",
    "du lich": "hospitality", "am thuc": "hospitality",
}

def normalize_industry(text: str) -> str:
    if not text or (hasattr(text, '__class__') and text.__class__.__name__ == 'float'):
        return "other"
    import unicodedata
    s = str(text).lower().strip()
    # Bo dau tieng Viet de match
    s_no_accent = ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    )
    for key, val in INDUSTRY_MAP.items():
        if key in s_no_accent:
            return val
    return "other"

def clean_text(text) -> str:
    if text is None:
        return ""
    try:
        import math
        if isinstance(text, float) and math.isnan(text):
            return ""
    except Exception:
        pass
    text = str(text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:500]

# -- Buoc 1: Doc CV that ---------------------------------------------------
print("=" * 60)
print("BUOC 1: Doc CV that tu Kaggle (timviec365.vn)...")
print("=" * 60)

user_df = pd.read_csv(KAGGLE_DIR / "USER_DATA_FINAL.csv")
print(f"  -> Tong ho so: {len(user_df)}")

cv_records = []
for _, row in user_df.iterrows():
    industry_raw = str(row.get("Industry", ""))
    industry = normalize_industry(industry_raw)
    parts = []
    desired_job = clean_text(row.get("Desired Job", ""))
    skills = clean_text(row.get("Skills", ""))
    target = clean_text(row.get("Target", ""))
    work_exp = clean_text(row.get("Work Experience", ""))
    degree = clean_text(row.get("Degree", ""))

    if desired_job:
        parts.append(f"Vi tri mong muon: {desired_job}.")
    if work_exp:
        parts.append(f"Kinh nghiem: {work_exp}.")
    if skills:
        parts.append(f"Ky nang: {skills[:200]}")
    if target:
        parts.append(f"Muc tieu: {target[:150]}")
    if degree:
        parts.append(f"Trinh do: {degree[:100]}")

    cv_text = " ".join(parts).strip()
    if cv_text and len(cv_text) > 50:
        cv_records.append({"text": cv_text, "industry": industry, "industry_raw": industry_raw})

print(f"  -> CV hop le: {len(cv_records)}")

# -- Buoc 2: Doc JD that tu Kaggle -----------------------------------------
print("\n" + "=" * 60)
print("BUOC 2: Doc JD that tu Kaggle...")
print("=" * 60)

job_df = pd.read_csv(KAGGLE_DIR / "JOB_DATA_FINAL.csv")
print(f"  -> Tong tin tuyen dung: {len(job_df)}")

jd_kaggle = []
for _, row in job_df.iterrows():
    industry_raw = str(row.get("Industry", ""))
    industry = normalize_industry(industry_raw)
    parts = []
    title = clean_text(row.get("Job Title", ""))
    desc = clean_text(row.get("Job Description", ""))
    req = clean_text(row.get("Job Requirements", ""))
    exp = clean_text(row.get("Years of Experience", ""))
    level = clean_text(row.get("Career Level", ""))

    if title:
        parts.append(f"Tuyen dung: {title}.")
    if level:
        parts.append(f"Cap bac: {level}.")
    if exp:
        parts.append(f"Kinh nghiem yeu cau: {exp}.")
    if req:
        parts.append(f"Yeu cau: {req[:200]}")
    if desc:
        parts.append(f"Mo ta: {desc[:150]}")

    jd_text = " ".join(parts).strip()
    if jd_text and len(jd_text) > 50:
        jd_kaggle.append({"text": jd_text, "industry": industry, "industry_raw": industry_raw})

print(f"  -> JD hop le tu Kaggle: {len(jd_kaggle)}")

# -- Buoc 3: Doc JD tu VietJobs (HuggingFace) ------------------------------
print("\n" + "=" * 60)
print("BUOC 3: Doc JD tu VietJobs (HuggingFace)...")
print("=" * 60)

vietjobs = load_dataset("dinhieufam/VietJobs", split="train")
print(f"  -> Tong tin VietJobs: {len(vietjobs)}")

jd_vietjobs = []
for row in vietjobs:
    industry_raw = str(row.get("category", ""))
    industry = normalize_industry(industry_raw)
    parts = []
    title = clean_text(row.get("job_title", ""))
    tech = clean_text(row.get("technical_skills", ""))
    soft = clean_text(row.get("soft_skills", ""))
    qualifications = clean_text(row.get("qualifications", ""))
    req_text = clean_text(row.get("requirements_text", ""))
    exp = clean_text(row.get("experience_required", ""))

    if title:
        parts.append(f"Vi tri tuyen dung: {title}.")
    if exp:
        parts.append(f"Kinh nghiem: {exp}.")
    if tech:
        parts.append(f"Ky nang ky thuat: {tech[:200]}")
    if soft:
        parts.append(f"Ky nang mem: {soft[:100]}")
    if qualifications:
        parts.append(f"Yeu cau: {qualifications[:150]}")
    elif req_text:
        parts.append(f"Yeu cau: {req_text[:150]}")

    jd_text = " ".join(parts).strip()
    if jd_text and len(jd_text) > 50:
        jd_vietjobs.append({"text": jd_text, "industry": industry, "industry_raw": industry_raw})

print(f"  -> JD hop le tu VietJobs: {len(jd_vietjobs)}")

all_jds = jd_kaggle + jd_vietjobs
print(f"\n  -> Tong JD gop lai: {len(all_jds)}")

# -- Buoc 4: Tao cap Positive va Negative ----------------------------------
print("\n" + "=" * 60)
print("BUOC 4: Tao cap training...")
print("=" * 60)

cv_by_industry: dict = {}
jd_by_industry: dict = {}

for cv in cv_records:
    cv_by_industry.setdefault(cv["industry"], []).append(cv)
for jd in all_jds:
    jd_by_industry.setdefault(jd["industry"], []).append(jd)

all_industries = sorted(set(cv_by_industry.keys()) | set(jd_by_industry.keys()))
print("\n  Phan phoi theo nganh:")
for ind in all_industries:
    n_cv = len(cv_by_industry.get(ind, []))
    n_jd = len(jd_by_industry.get(ind, []))
    print(f"    {ind:15s}: {n_cv:4d} CV  |  {n_jd:5d} JD")

valid_industries = [
    ind for ind in all_industries
    if len(cv_by_industry.get(ind, [])) >= 1
    and len(jd_by_industry.get(ind, [])) >= 1
    and ind != "other"
]
print(f"\n  Nganh co ca CV va JD: {valid_industries}")

pairs = []
N_POSITIVE = 3000
for _ in range(N_POSITIVE):
    ind = random.choice(valid_industries)
    cv = random.choice(cv_by_industry[ind])
    jd = random.choice(jd_by_industry[ind])
    pairs.append({
        "cv": cv["text"], "jd": jd["text"],
        "label": 1,
        "score": random.uniform(0.65, 0.95),
        "group": ind, "source": "real",
    })

print(f"  -> Tao {N_POSITIVE} cap Phu Hop (Positive)")

N_NEGATIVE = 3000
for _ in range(N_NEGATIVE):
    ind1, ind2 = random.sample(valid_industries, 2)
    cv = random.choice(cv_by_industry[ind1])
    jd = random.choice(jd_by_industry[ind2])
    pairs.append({
        "cv": cv["text"], "jd": jd["text"],
        "label": 0,
        "score": random.uniform(0.05, 0.35),
        "group": f"{ind1}_vs_{ind2}", "source": "real",
    })

print(f"  -> Tao {N_NEGATIVE} cap Khong Phu Hop (Negative)")

random.shuffle(pairs)

# -- Luu file ----------------------------------------------------------------
out_path = OUT_DIR / "embedding_pairs_real.json"
out_path.write_text(json.dumps(pairs, ensure_ascii=False, indent=2), encoding="utf-8")

print("\n" + "=" * 60)
pos = sum(1 for p in pairs if p["label"] == 1)
neg = sum(1 for p in pairs if p["label"] == 0)
print(f"[XONG] Da luu {len(pairs)} cap vao: {out_path}")
print(f"       Positive (Phu hop)   : {pos}")
print(f"       Negative (Khong hop) : {neg}")
print("=" * 60)
