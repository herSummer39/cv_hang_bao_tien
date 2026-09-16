"""
test_industry_aware_pipeline.py
================================
Test pipeline industry-aware với 10-15 cặp CV+JD thật.

Chạy: python packages/ml-service/scripts/test_industry_aware_pipeline.py

Output:
  - Ngành auto-detect vs ngành thật (theo cv/jd_industry_mapping.csv)
  - Hard skills lấy được (từ bộ industry-aware) cho mỗi cặp
  - Tóm tắt cuối: detect đúng / tổng, liệt kê case sai
"""
import sys
import json
from pathlib import Path

# Thêm ml-service root vào path
ML_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ML_ROOT))

import pandas as pd
import industry_lookup
from build_industry_map_v2 import classify

# ─── Data ────────────────────────────────────────────────────────────────────
KAGGLE_DIR = Path("E:/datasets/kaggle/phamtheds/job-dataset-for-recommendation/versions/1")
CV_MAP = ML_ROOT / "data/processed/cv_industry_mapping.csv"
JD_MAP = ML_ROOT / "data/processed/jd_industry_mapping.csv"

# ─── Load CSV gốc + mapping ──────────────────────────────────────────────────
cv_df   = pd.read_csv(KAGGLE_DIR / "USER_DATA_FINAL.csv")
jd_df   = pd.read_csv(KAGGLE_DIR / "JOB_DATA_FINAL.csv")
cv_map  = pd.read_csv(CV_MAP)
jd_map  = pd.read_csv(JD_MAP)

# ─── Chọn mẫu: 1-2 cặp / nhóm lớn, trải đều ────────────────────────────────
TARGET_GROUPS = [
    "cntt",
    "marketing-truyen-thong",
    "ke-toan-tai-chinh",
    "nhan-su-hanh-chinh",
    "kinh-doanh-ban-hang",
    "thiet-ke-kien-truc",
    "van-tai-logistics",
    "y-te-duoc",
    "xay-dung",
    "giao-duc-dao-tao",
    "san-xuat-qa-qc",
    "khach-san-nha-hang-du-lich",
    "lao-dong-pho-thong",
]

samples: list[dict] = []

for group in TARGET_GROUPS:
    # Lấy CV row đầu tiên của nhóm này
    cv_rows = cv_map[cv_map["industry_group_slug"] == group]
    jd_rows = jd_map[jd_map["industry_group_slug"] == group]
    if cv_rows.empty or jd_rows.empty:
        continue

    cv_idx = int(cv_rows.iloc[0]["cv_row_index"])
    jd_idx = int(jd_rows.iloc[0]["jd_row_index"])

    cv_row = cv_df.iloc[cv_idx]
    jd_row = jd_df.iloc[jd_idx]

    # Gom CV text
    cv_text = " ".join(
        str(cv_row.get(c, ""))
        for c in ["Skills", "Objective", "Resume"]
        if pd.notna(cv_row.get(c, "")) and str(cv_row.get(c, "")) != "nan"
    ).strip()
    if not cv_text:
        cv_text = str(cv_row.get("Industry", "")) + " professional"

    # Gom JD text
    jd_text = " ".join(
        str(jd_row.get(c, ""))
        for c in ["Job Description", "Key Skills", "Role"]
        if pd.notna(jd_row.get(c, "")) and str(jd_row.get(c, "")) != "nan"
    ).strip()
    job_title = str(jd_row.get("Job Title", "")) if pd.notna(jd_row.get("Job Title", "")) else ""
    if not jd_text:
        jd_text = job_title or str(jd_row.get("Industry", ""))

    # "ground truth" ngành
    true_cv_group  = str(cv_rows.iloc[0]["industry_group_slug"])
    true_jd_group  = str(jd_rows.iloc[0]["industry_group_slug"])
    true_cv_branch = str(cv_rows.iloc[0]["industry_branch_slug"])
    true_jd_branch = str(jd_rows.iloc[0]["industry_branch_slug"])

    samples.append({
        "group":          group,
        "job_title":      job_title,
        "cv_text":        cv_text[:500],
        "jd_text":        jd_text[:500],
        "true_cv_group":  true_cv_group,
        "true_jd_group":  true_jd_group,
        "true_cv_branch": true_cv_branch,
        "true_jd_branch": true_jd_branch,
    })

print(f"\n{'='*70}")
print(f"INDUSTRY-AWARE PIPELINE TEST — {len(samples)} mẫu")
print(f"{'='*70}")
print(f"Chú ý: industry_lookup chạy OFFLINE (không có Supabase)")
print(f"       → get_skills_for_industry() trả về rỗng, chỉ test detect ngành")
print(f"{'='*70}\n")

# ─── Chạy test ───────────────────────────────────────────────────────────────
correct = 0
wrong_cases = []

for i, s in enumerate(samples, 1):
    print(f"{'─'*70}")
    print(f"[{i:02d}] NHÓM THẬT: {s['group']}")
    print(f"     job_title: {s['job_title'][:60]}")
    print(f"     CV (500 chars): {s['cv_text'][:120]}...")
    print(f"     JD (500 chars): {s['jd_text'][:120]}...")

    # Auto-detect
    detect = industry_lookup.detect_industry(s["job_title"], s["jd_text"])

    if detect is None:
        print(f"     AUTO-DETECT: ❌ Không match")
        detected_group = None
        detected_branch = None
    else:
        detected_group  = detect["group_slug"]
        detected_branch = detect.get("branch_slug")
        match_symbol = "✅" if detected_group == s["true_jd_group"] else "⚠️ "
        print(f"     AUTO-DETECT: {match_symbol} {detect['nhom_lon']} / {detect['nhanh_nho']}")
        print(f"       → group_slug:  {detected_group}")
        print(f"       → branch_slug: {detected_branch}")

    print(f"     GROUND TRUTH JD: group={s['true_jd_group']}, branch={s['true_jd_branch']}")

    # Đánh giá
    if detect is not None and detected_group == s["true_jd_group"]:
        correct += 1
        verdict = "✅ ĐÚNG"
    else:
        verdict = "❌ SAI"
        wrong_cases.append({
            "idx": i,
            "group_thật": s["true_jd_group"],
            "group_detect": detected_group,
            "branch_detect": detected_branch,
            "job_title": s["job_title"],
            "jd_snippet": s["jd_text"][:100],
        })

    print(f"     → Kết quả: {verdict}")

    # Skills (offline = rỗng nhưng in structure)
    best_id = industry_lookup.resolve_best_industry_id(detect) if detect else None
    skills = industry_lookup.get_skills_for_industry(best_id)
    print(f"     Skills offline (hard={len(skills['hard'])}, soft={len(skills['soft'])})")
    if skills["hard"]:
        print(f"       hard sample: {', '.join(skills['hard'][:8])}")
    else:
        print(f"       hard: (rỗng — cần Supabase để load)")
    print()

# ─── Tóm tắt ─────────────────────────────────────────────────────────────────
total = len(samples)
print(f"\n{'='*70}")
print(f"TÓM TẮT KẾT QUẢ DETECT NGÀNH (so sánh group slug với JD ground truth)")
print(f"{'='*70}")
print(f"  Detect đúng: {correct}/{total}  ({correct/total*100:.0f}%)")

if wrong_cases:
    print(f"\n  Cases detect sai ({len(wrong_cases)}):")
    for w in wrong_cases:
        print(f"    [{w['idx']:02d}] thật={w['group_thật']}")
        print(f"         detect={w['group_detect']} / branch={w['group_detect']}")
        print(f"         job_title: {w['job_title'][:50]}")
        print(f"         jd snippet: {w['jd_snippet']}")
        # Gợi ý lý do
        from build_industry_map_v2 import classify
        nhom, nhanh = classify(w["jd_snippet"])
        print(f"         classify(jd_snippet) → ({nhom}, {nhanh})")
        print()
else:
    print("  → Tất cả detect đúng! 🎉")

print(f"{'='*70}")
print(f"\nNOTE: Để test get_skills_for_industry() đầy đủ (với Supabase data),")
print(f"      chạy worker.py với .env.worker hợp lệ.")
print(f"      Số keyword industry-aware ước tính:")
print(f"      Hard skills/group trung bình ≈ 30-40, Soft skills = 35 (dùng chung)")
