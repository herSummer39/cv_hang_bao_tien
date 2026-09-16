"""
build_industry_map_v2.py
Xay dung INDUSTRY_MAP v2: 17 nhom lon + nhanh nho, neo vao category THAT
dang co trong USER_DATA_FINAL.csv (CV) va JOB_DATA_FINAL.csv (JD).

Chay: python packages/ml-service/scripts/build_industry_map_v2.py
"""
import re
import unicodedata
from pathlib import Path
import pandas as pd

KAGGLE_DIR = Path("E:/datasets/kaggle/phamtheds/job-dataset-for-recommendation/versions/1")

# ---------------------------------------------------------------------------
# 17 nhom lon + nhanh nho. Key = tu khoa (khong dau, thuong) de match substring
# co word-boundary. Value = (nhom_lon, nhanh_nho)
# ---------------------------------------------------------------------------
NHOM_LON = [
    "Kinh doanh / Ban hang",
    "Marketing / Truyen thong / Quang cao",
    "Cong nghe thong tin",
    "Ke toan / Tai chinh / Ngan hang / Bao hiem",
    "Nhan su / Hanh chinh / Phap ly",
    "Dich vu khach hang",
    "Thiet ke / Kien truc / Noi that / My thuat",
    "Khach san / Nha hang / Du lich / Spa - Lam dep",
    "Y te / Duoc",
    "Xay dung",
    "Dien / Dien tu / Vien thong",
    "Bat dong san",
    "Co khi / Che tao / Tu dong hoa / O to",
    "Van tai / Logistics / Xuat nhap khau",
    "San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh",
    "Giao duc / Dao tao",
    "Lao dong pho thong / Khac",
]

# tu khoa (khong dau) -> (nhom_lon index 0-16, nhanh_nho)
KEYWORD_MAP = {
    # 1. Kinh doanh / Ban hang
    "kinh doanh": (0, "Kinh doanh tong hop"),
    "ban hang": (0, "Ban hang"),
    "sale": (0, "Sale/Dai dien kinh doanh"),
    "telesale": (0, "Telesale"),
    "ban le": (0, "Ban le - Ban si"),
    "ban si": (0, "Ban le - Ban si"),
    "dai dien kinh doanh": (0, "Sale/Dai dien kinh doanh"),
    "thu ngan": (0, "Thu ngan"),

    # 2. Marketing / Truyen thong / Quang cao
    "marketing": (1, "Marketing tong hop"),
    "truyen thong": (1, "Truyen thong / PR"),
    "quang cao": (1, "Quang cao"),
    "content": (1, "Content"),
    "seo": (1, "SEO/Digital"),
    "digital marketing": (1, "SEO/Digital"),
    "pr": (1, "Truyen thong / PR"),
    "bao chi": (1, "Bao chi - Truyen hinh"),
    "truyen hinh": (1, "Bao chi - Truyen hinh"),
    "bien dich": (1, "Bien - Phien dich"),
    "phien dich": (1, "Bien - Phien dich"),
    "to chuc su kien": (1, "To chuc su kien"),
    "su kien": (1, "To chuc su kien"),

    # 3. Cong nghe thong tin
    "cong nghe thong tin": (2, "Phat trien phan mem"),
    "cntt": (2, "Phat trien phan mem"),
    "phan mem": (2, "Phat trien phan mem"),
    "lap trinh": (2, "Phat trien phan mem"),
    "developer": (2, "Phat trien phan mem"),
    "phan cung": (2, "Phan cung / Mang"),
    "quan tri mang": (2, "Phan cung / Mang"),
    "tester": (2, "QA/Tester"),
    "data engineer": (2, "Data/AI"),
    "tri tue nhan tao": (2, "Data/AI"),

    # 4. Ke toan / Tai chinh / Ngan hang / Bao hiem
    "ke toan": (3, "Ke toan"),
    "kiem toan": (3, "Kiem toan"),
    "ngan hang": (3, "Ngan hang"),
    "tai chinh": (3, "Tai chinh / Dau tu"),
    "bao hiem": (3, "Bao hiem"),
    "chung khoan": (3, "Chung khoan / Dau tu"),
    "thu ngan ngan hang": (3, "Ngan hang"),
    "giao dich vien": (3, "Ngan hang"),

    # 5. Nhan su / Hanh chinh / Phap ly
    "nhan su": (4, "Tuyen dung / C&B"),
    "tuyen dung": (4, "Tuyen dung / C&B"),
    "hanh chinh": (4, "Hanh chinh van phong"),
    "van phong": (4, "Hanh chinh van phong"),
    "thu ky": (4, "Thu ky / Tro ly"),
    "tro ly": (4, "Thu ky / Tro ly"),
    "phap ly": (4, "Phap ly / Phap che"),
    "phap che": (4, "Phap ly / Phap che"),
    "luat su": (4, "Phap ly / Phap che"),

    # 6. Dich vu khach hang
    "dich vu khach hang": (5, "CSKH"),
    "cham soc khach hang": (5, "CSKH"),
    "ho tro khach hang": (5, "CSKH"),
    "tu van qua dien thoai": (5, "CSKH qua dien thoai"),

    # 7. Thiet ke / Kien truc / Noi that / My thuat
    "thiet ke do hoa": (6, "Thiet ke do hoa"),
    "thiet ke noi that": (6, "Thiet ke noi that"),
    "kien truc": (6, "Kien truc"),
    "my thuat": (6, "My thuat / Nghe thuat"),
    "dien anh": (6, "My thuat / Nghe thuat"),

    # 8. Khach san / Nha hang / Du lich / Spa
    "khach san": (7, "Khach san"),
    "nha hang": (7, "Nha hang / F&B"),
    "du lich": (7, "Du lich / Le hanh"),
    "spa": (7, "Spa / Lam dep"),
    "lam dep": (7, "Spa / Lam dep"),
    "le tan": (7, "Le tan"),
    "bep": (7, "Bep / Am thuc"),
    "pha che": (7, "Pha che / Bar"),

    # 9. Y te / Duoc
    "y te": (8, "Y te"),
    "duoc": (8, "Duoc pham"),
    "dieu duong": (8, "Dieu duong"),
    "trinh duoc vien": (8, "Trinh duoc vien"),
    "bac si": (8, "Y te"),
    "y ta": (8, "Y te"),

    # 10. Xay dung
    "xay dung": (9, "Ky su / Giam sat xay dung"),
    "giam sat cong trinh": (9, "Ky su / Giam sat xay dung"),
    "du toan": (9, "Du toan / QS"),
    "cau duong": (9, "Cau duong"),

    # 11. Dien / Dien tu / Vien thong
    "dien tu vien thong": (10, "Vien thong"),
    "vien thong": (10, "Vien thong"),
    "buu chinh": (10, "Vien thong"),
    "dien lanh": (10, "Dien lanh"),
    "ky su dien": (10, "Dien cong nghiep"),

    # 12. Bat dong san
    "bat dong san": (11, "Moi gioi / Tu van BDS"),
    "moi gioi nha dat": (11, "Moi gioi / Tu van BDS"),
    "nha dat": (11, "Moi gioi / Tu van BDS"),
    "can ho": (11, "Moi gioi / Tu van BDS"),

    # 13. Co khi / Che tao / Tu dong hoa / O to
    "co khi": (12, "Co khi che tao"),
    "che tao": (12, "Co khi che tao"),
    "tu dong hoa": (12, "Tu dong hoa"),
    "cong nghe o to": (12, "O to"),
    "ky thuat o to": (12, "O to"),

    # 14. Van tai / Logistics / Xuat nhap khau  (KHONG gom lai xe thuan)
    "logistic": (13, "Logistics / Kho van"),
    "kho van": (13, "Logistics / Kho van"),
    "xuat nhap khau": (13, "Xuat nhap khau"),
    "giao nhan": (13, "Giao nhan / Van chuyen"),
    "hai quan": (13, "Xuat nhap khau"),

    # 15. San xuat / QA-QC / Cong nghiep chuyen nganh
    "san xuat": (14, "Quan ly san xuat"),
    "qa qc": (14, "QA/QC"),
    "chat luong": (14, "QA/QC"),
    "det may": (14, "Det may / Da giay"),
    "da giay": (14, "Det may / Da giay"),
    "thuc pham": (14, "Thuc pham / Do uong (SX)"),
    "do uong": (14, "Thuc pham / Do uong (SX)"),
    "my pham": (14, "My pham / Trang suc"),
    "nong nghiep": (14, "Nong - Lam - Ngu"),
    "lam nghiep": (14, "Nong - Lam - Ngu"),
    "ngu nghiep": (14, "Nong - Lam - Ngu"),
    "thuy san": (14, "Nong - Lam - Ngu"),
    "hoa chat": (14, "Dau khi / Hoa chat"),
    "dau khi": (14, "Dau khi / Hoa chat"),
    "moi truong": (14, "Moi truong / Xu ly chat thai"),
    "hang khong": (14, "Hang khong / Hang hai"),
    "hang hai": (14, "Hang khong / Hang hai"),
    "in an": (14, "In an / Xuat ban"),
    "xuat ban": (14, "In an / Xuat ban"),

    # 16. Giao duc / Dao tao
    "giao duc": (15, "Giang day"),
    "dao tao": (15, "Dao tao noi bo"),
    "giao vien": (15, "Giang day"),
    "giang vien": (15, "Giang day"),
    "tro giang": (15, "Tro giang"),
    "gia su": (15, "Giang day"),

    # 17. Lao dong pho thong / Khac
    "cong nhan": (16, "Cong nhan"),
    "bao ve": (16, "Bao ve"),
    "tap vu": (16, "Tap vu / Giup viec"),
    "giup viec": (16, "Tap vu / Giup viec"),
    "lai xe": (16, "Lai xe (khong uu tien train)"),
    "phu xe": (16, "Lai xe (khong uu tien train)"),
    "boc xep": (16, "Lao dong pho thong khac"),
}

# sap xep key dai truoc de match dung hon (vd "dich vu khach hang" truoc "khach hang")
_SORTED_KEYS = sorted(KEYWORD_MAP.keys(), key=len, reverse=True)


def _strip_accents(text: str) -> str:
    # "d"/"Đ" khong tach duoc bang NFD (khong phai base+combining-mark),
    # phai thay the truc tiep truoc khi normalize
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def classify(raw_text: str):
    """Tra ve (nhom_lon, nhanh_nho) hoac (None, None) neu khong match."""
    if not isinstance(raw_text, str) or not raw_text.strip():
        return None, None
    norm = _strip_accents(raw_text.lower())
    for key in _SORTED_KEYS:
        # word-boundary-ish: key phai la 1 cum tu doc lap, tranh substring bug
        # (vd "it" khong match trong "writer")
        pattern = r"(?<![a-z0-9])" + re.escape(key) + r"(?![a-z0-9])"
        if re.search(pattern, norm):
            idx, branch = KEYWORD_MAP[key]
            return NHOM_LON[idx], branch
    return None, None


def main():
    print("=" * 80)
    print("CV SIDE - USER_DATA_FINAL.csv (cot Industry)")
    print("=" * 80)
    cv = pd.read_csv(KAGGLE_DIR / "USER_DATA_FINAL.csv")
    cv["nhom_lon"], cv["nhanh_nho"] = zip(*cv["Industry"].map(classify))
    cv_counts = cv["nhom_lon"].value_counts(dropna=False)
    print(cv_counts.to_string())
    print(f"\nTong CV: {len(cv)} | Khong match (None): {cv['nhom_lon'].isna().sum()}")

    print("\n" + "=" * 80)
    print("JD SIDE - JOB_DATA_FINAL.csv (cot Industry, tach het cac tag bang dau phay)")
    print("=" * 80)
    jd = pd.read_csv(KAGGLE_DIR / "JOB_DATA_FINAL.csv")
    # dung TOAN BO cac tag (khong chi tag dau) vi tag phu cung mang thong tin nganh
    jd_exploded = jd["Industry"].dropna().astype(str).str.split(",")
    jd_all_tags = jd_exploded.explode().str.strip()
    jd_map = jd_all_tags.map(classify)
    jd_nhom = jd_map.apply(lambda t: t[0])
    jd_counts = jd_nhom.value_counts(dropna=False)
    print(jd_counts.to_string())
    print(f"\nTong tag JD (sau explode): {len(jd_all_tags)} | Khong match: {jd_nhom.isna().sum()}")

    print("\n" + "=" * 80)
    print("BANG TONG HOP CV vs JD THEO NHOM LON")
    print("=" * 80)
    summary = pd.DataFrame({"CV": cv_counts, "JD_tags": jd_counts}).fillna(0).astype(int)
    summary = summary.reindex(NHOM_LON + [None])
    print(summary.to_string())

    out_dir = Path("packages/ml-service/data/processed")
    out_dir.mkdir(parents=True, exist_ok=True)
    summary.to_csv(out_dir / "industry_map_v2_summary.csv", encoding="utf-8-sig")
    print(f"\nDa luu bang tong hop: {out_dir / 'industry_map_v2_summary.csv'}")


if __name__ == "__main__":
    main()
