"""
count_branch_volume.py
======================
Đếm số CV / số tag JD theo TỪNG NHÁNH NHỎ (không chỉ nhóm lớn).

Chạy:
    python packages/ml-service/scripts/count_branch_volume.py

Output:
    - In bảng: nhóm lớn | nhánh nhỏ | số CV | số JD tag
    - Lưu CSV:  packages/ml-service/data/processed/branch_volume.csv
"""
import re
import unicodedata
from pathlib import Path
import pandas as pd

# ── Tái dùng toàn bộ NHOM_LON, KEYWORD_MAP từ build_industry_map_v2 ──────────
import sys
sys.path.insert(0, str(Path(__file__).parent))
from build_industry_map_v2 import NHOM_LON, KEYWORD_MAP, _SORTED_KEYS, classify

KAGGLE_DIR = Path("E:/datasets/kaggle/phamtheds/job-dataset-for-recommendation/versions/1")
OUT_DIR    = Path(__file__).parent.parent / "data" / "processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ── Hàm classify trả về cả nhánh nhỏ ─────────────────────────────────────────
def classify_branch(raw_text: str) -> tuple:
    """Trả về (nhom_lon_str, nhanh_nho_str) hoặc (None, None)."""
    return classify(raw_text)          # đã có sẵn trong build_industry_map_v2


# ── CV side ───────────────────────────────────────────────────────────────────
print("=" * 70)
print("Đọc CV - USER_DATA_FINAL.csv ...")
print("=" * 70)
cv = pd.read_csv(KAGGLE_DIR / "USER_DATA_FINAL.csv")
cv["nhom_lon"], cv["nhanh_nho"] = zip(*cv["Industry"].map(classify_branch))

cv_branch_counts = (
    cv.groupby(["nhom_lon", "nhanh_nho"], dropna=False)
      .size()
      .reset_index(name="so_cv")
)

print(f"Tổng CV: {len(cv)}")
print(f"Không match: {cv['nhom_lon'].isna().sum()}")

# ── JD side (explode theo dấu phẩy) ──────────────────────────────────────────
print("\n" + "=" * 70)
print("Đọc JD - JOB_DATA_FINAL.csv (explode theo dấu phẩy) ...")
print("=" * 70)
jd = pd.read_csv(KAGGLE_DIR / "JOB_DATA_FINAL.csv")
jd_exploded = (
    jd["Industry"]
    .dropna()
    .astype(str)
    .str.split(",")
    .explode()
    .str.strip()
    .reset_index(drop=True)
)

jd_result = jd_exploded.map(classify_branch)
jd_nhom   = jd_result.apply(lambda t: t[0])
jd_nhanh  = jd_result.apply(lambda t: t[1])
jd_df     = pd.DataFrame({"nhom_lon": jd_nhom, "nhanh_nho": jd_nhanh})

jd_branch_counts = (
    jd_df.groupby(["nhom_lon", "nhanh_nho"], dropna=False)
         .size()
         .reset_index(name="so_jd_tag")
)

print(f"Tổng tag JD (sau explode): {len(jd_exploded)}")
print(f"Không match: {jd_nhom.isna().sum()}")

# ── Ghép CV + JD theo (nhóm lớn, nhánh nhỏ) ──────────────────────────────────
merged = pd.merge(
    cv_branch_counts,
    jd_branch_counts,
    on=["nhom_lon", "nhanh_nho"],
    how="outer"
).fillna(0)
merged["so_cv"]     = merged["so_cv"].astype(int)
merged["so_jd_tag"] = merged["so_jd_tag"].astype(int)
merged["tong"]      = merged["so_cv"] + merged["so_jd_tag"]

# Sắp xếp theo nhóm lớn (theo thứ tự NHOM_LON), rồi theo tổng giảm dần
nhom_order = {n: i for i, n in enumerate(NHOM_LON)}
merged["_nhom_idx"] = merged["nhom_lon"].map(nhom_order).fillna(99)
merged = merged.sort_values(["_nhom_idx", "tong"], ascending=[True, False])
merged = merged.drop(columns=["_nhom_idx"])

# ── In bảng kết quả ───────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print(f"{'NHÓM LỚN':<42} {'NHÁNH NHỎ':<30} {'CV':>6} {'JD':>6} {'Tổng':>6}")
print("-" * 92)

current_nhom = None
nhom_cv_total   = 0
nhom_jd_total   = 0
grand_cv = grand_jd = 0

for _, row in merged.iterrows():
    nhom   = str(row["nhom_lon"])  if pd.notna(row["nhom_lon"])  else "(không match)"
    nhanh  = str(row["nhanh_nho"]) if pd.notna(row["nhanh_nho"]) else "(không match)"
    so_cv  = int(row["so_cv"])
    so_jd  = int(row["so_jd_tag"])

    if nhom != current_nhom:
        if current_nhom is not None:
            print(f"  {'→ Subtotal':>70}  CV={nhom_cv_total:5d}  JD={nhom_jd_total:5d}")
            print()
        current_nhom = nhom
        nhom_cv_total = nhom_jd_total = 0
        print(f"[{nhom}]")

    print(f"  {'  ' + nhanh:<50}  {so_cv:>6}  {so_jd:>6}  {so_cv+so_jd:>6}")
    nhom_cv_total += so_cv
    nhom_jd_total += so_jd
    grand_cv += so_cv
    grand_jd += so_jd

# In subtotal nhóm cuối
if current_nhom is not None:
    print(f"  {'→ Subtotal':>70}  CV={nhom_cv_total:5d}  JD={nhom_jd_total:5d}")

print()
print("=" * 70)
print(f"GRAND TOTAL   CV={grand_cv}   JD={grand_jd}")

# ── Lưu CSV ───────────────────────────────────────────────────────────────────
out_path = OUT_DIR / "branch_volume.csv"
merged.to_csv(out_path, index=False, encoding="utf-8-sig")
print(f"\nĐã lưu: {out_path}")
