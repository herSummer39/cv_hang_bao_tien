"""
peek_unmatched.py
Soi ky phan "None" (chua match nhom lon) o ca CV va JD, va kiem tra rieng
xem co dong nao chua "bat dong san"/"nha dat" nhung bi lot luoi khong.

Chay: python packages/ml-service/scripts/peek_unmatched.py
"""
from pathlib import Path
import pandas as pd
import sys

sys.path.insert(0, str(Path(__file__).parent))
from build_industry_map_v2 import classify, _strip_accents, KAGGLE_DIR  # noqa: E402

pd.set_option("display.max_rows", 100)


def main():
    cv = pd.read_csv(KAGGLE_DIR / "USER_DATA_FINAL.csv")
    cv["nhom_lon"], _ = zip(*cv["Industry"].map(classify))

    print("=" * 80)
    print("CV: top 40 raw Industry KHONG match nhom nao (None)")
    print("=" * 80)
    none_cv = cv[cv["nhom_lon"].isna()]
    print(none_cv["Industry"].value_counts().head(40).to_string())

    print("\n" + "=" * 80)
    print("CV: kiem tra rieng cac dong co chua 'bat dong san' / 'nha dat' / 'can ho' trong Industry")
    print("=" * 80)
    mask = cv["Industry"].astype(str).apply(
        lambda s: any(k in _strip_accents(s.lower()) for k in ["bat dong san", "nha dat", "can ho"])
    )
    print(f"So dong CV chua tu khoa BDS: {mask.sum()}")
    if mask.sum() > 0:
        print(cv.loc[mask, "Industry"].value_counts().to_string())

    jd = pd.read_csv(KAGGLE_DIR / "JOB_DATA_FINAL.csv")
    jd_tags = jd["Industry"].dropna().astype(str).str.split(",").explode().str.strip()
    jd_class = jd_tags.map(classify)
    jd_nhom = jd_class.apply(lambda t: t[0])

    print("\n" + "=" * 80)
    print("JD: top 60 tag KHONG match nhom nao (None)")
    print("=" * 80)
    none_jd = jd_tags[jd_nhom.isna()]
    print(none_jd.value_counts().head(60).to_string())

    print("\n" + "=" * 80)
    print("JD: kiem tra rieng cac tag co chua 'bat dong san' / 'nha dat' / 'can ho'")
    print("=" * 80)
    mask_jd = jd_tags.apply(lambda s: any(k in _strip_accents(s.lower()) for k in ["bat dong san", "nha dat", "can ho"]))
    print(f"So tag JD chua tu khoa BDS: {mask_jd.sum()}")
    if mask_jd.sum() > 0:
        print(jd_tags[mask_jd].value_counts().to_string())


if __name__ == "__main__":
    main()
