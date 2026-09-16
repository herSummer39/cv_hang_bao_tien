"""
tag_real_data_with_industry.py
================================
Gán industry_group_slug + industry_branch_slug cho từng dòng CV và JD thật.
Không kết nối Supabase — chỉ dùng slug để map, tương thích với migration_v4.

Output:
  packages/ml-service/data/processed/cv_industry_mapping.csv
    cột: cv_row_index, industry_group_slug, industry_branch_slug

  packages/ml-service/data/processed/jd_industry_mapping.csv
    cột: jd_row_index, industry_group_slug, industry_branch_slug
    (1 JD có nhiều tag → nhiều dòng cho cùng jd_row_index, không dedupe)

Chạy:
    python packages/ml-service/scripts/tag_real_data_with_industry.py
"""
import sys
from pathlib import Path
import pandas as pd

# Tái dùng classify() từ build_industry_map_v2.py
sys.path.insert(0, str(Path(__file__).parent))
from build_industry_map_v2 import NHOM_LON, classify

KAGGLE_DIR = Path("E:/datasets/kaggle/phamtheds/job-dataset-for-recommendation/versions/1")
OUT_DIR    = Path(__file__).parent.parent / "data" / "processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Map: (nhom_lon_str, nhanh_nho_str) → (group_slug, branch_slug) ────────────
# Được đồng bộ với migration_v4_industry_branches.sql
# Nhánh đã gộp sẽ trỏ về nhánh đích, không tạo slug riêng
SLUG_MAP: dict[tuple, tuple] = {
    # ── 1. Kinh doanh / Bán hàng ─────────────────────────────────────────────
    ("Kinh doanh / Ban hang", "Kinh doanh tong hop"):       ("kinh-doanh-ban-hang", "kinh-doanh-ban-hang-tong-hop"),
    ("Kinh doanh / Ban hang", "Ban hang"):                  ("kinh-doanh-ban-hang", "kinh-doanh-ban-hang-ban-hang"),
    ("Kinh doanh / Ban hang", "Sale/Dai dien kinh doanh"):  ("kinh-doanh-ban-hang", "kinh-doanh-ban-hang-sale"),
    ("Kinh doanh / Ban hang", "Telesale"):                  ("kinh-doanh-ban-hang", "kinh-doanh-ban-hang-ban-hang"),   # gộp
    ("Kinh doanh / Ban hang", "Ban le - Ban si"):            ("kinh-doanh-ban-hang", "kinh-doanh-ban-hang-ban-le-si"),
    ("Kinh doanh / Ban hang", "Thu ngan"):                  ("kinh-doanh-ban-hang", "kinh-doanh-ban-hang-thu-ngan"),

    # ── 2. Marketing ──────────────────────────────────────────────────────────
    ("Marketing / Truyen thong / Quang cao", "Truyen thong / PR"):    ("marketing-truyen-thong", "marketing-truyen-thong-pr"),
    ("Marketing / Truyen thong / Quang cao", "Bien - Phien dich"):    ("marketing-truyen-thong", "marketing-bien-phien-dich"),
    ("Marketing / Truyen thong / Quang cao", "Marketing tong hop"):   ("marketing-truyen-thong", "marketing-tong-hop"),
    ("Marketing / Truyen thong / Quang cao", "Bao chi - Truyen hinh"):("marketing-truyen-thong", "marketing-bao-chi-truyen-hinh"),
    ("Marketing / Truyen thong / Quang cao", "SEO/Digital"):          ("marketing-truyen-thong", "marketing-seo-digital"),
    ("Marketing / Truyen thong / Quang cao", "To chuc su kien"):      ("marketing-truyen-thong", "marketing-to-chuc-su-kien"),
    ("Marketing / Truyen thong / Quang cao", "Quang cao"):            ("marketing-truyen-thong", "marketing-tong-hop"),           # gộp
    ("Marketing / Truyen thong / Quang cao", "Content"):              ("marketing-truyen-thong", "marketing-tong-hop"),           # gộp

    # ── 3. CNTT ───────────────────────────────────────────────────────────────
    ("Cong nghe thong tin", "Phat trien phan mem"): ("cntt", "cntt-phat-trien-phan-mem"),
    ("Cong nghe thong tin", "Phan cung / Mang"):    ("cntt", "cntt-phan-cung-mang"),
    ("Cong nghe thong tin", "QA/Tester"):           ("cntt", "cntt-phat-trien-phan-mem"),    # gộp
    ("Cong nghe thong tin", "Data/AI"):             ("cntt", "cntt-phat-trien-phan-mem"),    # gộp

    # ── 4. Kế toán ────────────────────────────────────────────────────────────
    ("Ke toan / Tai chinh / Ngan hang / Bao hiem", "Kiem toan"):          ("ke-toan-tai-chinh", "ke-toan-tai-chinh-kiem-toan"),
    ("Ke toan / Tai chinh / Ngan hang / Bao hiem", "Bao hiem"):           ("ke-toan-tai-chinh", "ke-toan-tai-chinh-bao-hiem"),
    ("Ke toan / Tai chinh / Ngan hang / Bao hiem", "Ngan hang"):          ("ke-toan-tai-chinh", "ke-toan-tai-chinh-ngan-hang"),
    ("Ke toan / Tai chinh / Ngan hang / Bao hiem", "Ke toan"):            ("ke-toan-tai-chinh", "ke-toan-tai-chinh-ke-toan"),
    ("Ke toan / Tai chinh / Ngan hang / Bao hiem", "Tai chinh / Dau tu"): ("ke-toan-tai-chinh", "ke-toan-tai-chinh-tai-chinh"),
    ("Ke toan / Tai chinh / Ngan hang / Bao hiem", "Chung khoan / Dau tu"):("ke-toan-tai-chinh", "ke-toan-tai-chinh-chung-khoan"),

    # ── 5. Nhân sự ────────────────────────────────────────────────────────────
    ("Nhan su / Hanh chinh / Phap ly", "Hanh chinh van phong"):  ("nhan-su-hanh-chinh", "nhan-su-hanh-chinh-van-phong"),
    ("Nhan su / Hanh chinh / Phap ly", "Tuyen dung / C&B"):      ("nhan-su-hanh-chinh", "nhan-su-tuyen-dung-cb"),
    ("Nhan su / Hanh chinh / Phap ly", "Thu ky / Tro ly"):        ("nhan-su-hanh-chinh", "nhan-su-thu-ky-tro-ly"),
    ("Nhan su / Hanh chinh / Phap ly", "Phap ly / Phap che"):     ("nhan-su-hanh-chinh", "nhan-su-phap-ly-phap-che"),

    # ── 6. Dịch vụ khách hàng ────────────────────────────────────────────────
    ("Dich vu khach hang", "CSKH"):                ("dich-vu-khach-hang", "dich-vu-khach-hang-cskh"),
    ("Dich vu khach hang", "CSKH qua dien thoai"): ("dich-vu-khach-hang", "dich-vu-khach-hang-cskh"),   # gộp

    # ── 7. Thiết kế ───────────────────────────────────────────────────────────
    ("Thiet ke / Kien truc / Noi that / My thuat", "Thiet ke do hoa"):      ("thiet-ke-kien-truc", "thiet-ke-do-hoa"),
    ("Thiet ke / Kien truc / Noi that / My thuat", "Kien truc"):            ("thiet-ke-kien-truc", "thiet-ke-kien-truc-kien-truc"),
    ("Thiet ke / Kien truc / Noi that / My thuat", "My thuat / Nghe thuat"):("thiet-ke-kien-truc", "thiet-ke-my-thuat"),
    ("Thiet ke / Kien truc / Noi that / My thuat", "Thiet ke noi that"):    ("thiet-ke-kien-truc", "thiet-ke-noi-that"),

    # ── 8. Khách sạn ──────────────────────────────────────────────────────────
    ("Khach san / Nha hang / Du lich / Spa - Lam dep", "Khach san"):       ("khach-san-nha-hang-du-lich", "khach-san-khach-san"),
    ("Khach san / Nha hang / Du lich / Spa - Lam dep", "Le tan"):          ("khach-san-nha-hang-du-lich", "khach-san-khach-san"),    # gộp
    ("Khach san / Nha hang / Du lich / Spa - Lam dep", "Du lich / Le hanh"):("khach-san-nha-hang-du-lich", "khach-san-du-lich-le-hanh"),
    ("Khach san / Nha hang / Du lich / Spa - Lam dep", "Spa / Lam dep"):   ("khach-san-nha-hang-du-lich", "khach-san-spa-lam-dep"),
    ("Khach san / Nha hang / Du lich / Spa - Lam dep", "Nha hang / F&B"):  ("khach-san-nha-hang-du-lich", "khach-san-nha-hang-fb"),
    ("Khach san / Nha hang / Du lich / Spa - Lam dep", "Bep / Am thuc"):   ("khach-san-nha-hang-du-lich", "khach-san-nha-hang-fb"),  # gộp
    ("Khach san / Nha hang / Du lich / Spa - Lam dep", "Pha che / Bar"):   ("khach-san-nha-hang-du-lich", "khach-san-nha-hang-fb"),  # gộp

    # ── 9. Y tế / Dược ────────────────────────────────────────────────────────
    ("Y te / Duoc", "Y te"):              ("y-te-duoc", "y-te-duoc-y-te"),
    ("Y te / Duoc", "Dieu duong"):        ("y-te-duoc", "y-te-duoc-y-te"),       # gộp
    ("Y te / Duoc", "Duoc pham"):         ("y-te-duoc", "y-te-duoc-duoc-pham"),
    ("Y te / Duoc", "Trinh duoc vien"):   ("y-te-duoc", "y-te-duoc-duoc-pham"),  # gộp

    # ── 10. Xây dựng ──────────────────────────────────────────────────────────
    ("Xay dung", "Ky su / Giam sat xay dung"): ("xay-dung", "xay-dung-ky-su"),
    ("Xay dung", "Cau duong"):                 ("xay-dung", "xay-dung-ky-su"),  # gộp
    ("Xay dung", "Du toan / QS"):              ("xay-dung", "xay-dung-ky-su"),  # gộp

    # ── 11. Điện / Viễn thông ─────────────────────────────────────────────────
    ("Dien / Dien tu / Vien thong", "Dien lanh"):         ("dien-dien-tu-vien-thong", "dien-dien-tu-dien-lanh"),
    ("Dien / Dien tu / Vien thong", "Dien cong nghiep"):  ("dien-dien-tu-vien-thong", "dien-dien-tu-dien-lanh"),   # gộp
    ("Dien / Dien tu / Vien thong", "Vien thong"):        ("dien-dien-tu-vien-thong", "dien-dien-tu-vien-thong-vt"),

    # ── 12. Bất động sản ──────────────────────────────────────────────────────
    ("Bat dong san", "Moi gioi / Tu van BDS"): ("bat-dong-san", "bat-dong-san-moi-gioi"),

    # ── 13. Cơ khí ────────────────────────────────────────────────────────────
    ("Co khi / Che tao / Tu dong hoa / O to", "Tu dong hoa"):   ("co-khi-che-tao", "co-khi-tu-dong-hoa"),
    ("Co khi / Che tao / Tu dong hoa / O to", "Co khi che tao"):("co-khi-che-tao", "co-khi-che-tao-co-khi"),
    ("Co khi / Che tao / Tu dong hoa / O to", "O to"):          ("co-khi-che-tao", "co-khi-o-to"),

    # ── 14. Vận tải / Logistics ───────────────────────────────────────────────
    ("Van tai / Logistics / Xuat nhap khau", "Logistics / Kho van"):   ("van-tai-logistics", "van-tai-logistics-kho-van"),
    ("Van tai / Logistics / Xuat nhap khau", "Giao nhan / Van chuyen"):("van-tai-logistics", "van-tai-giao-nhan"),
    ("Van tai / Logistics / Xuat nhap khau", "Xuat nhap khau"):        ("van-tai-logistics", "van-tai-xuat-nhap-khau"),

    # ── 15. Sản xuất / QA-QC ──────────────────────────────────────────────────
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "QA/QC"):               ("san-xuat-qa-qc", "san-xuat-qa-qc-qa-qc"),
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "Thuc pham / Do uong (SX)"):("san-xuat-qa-qc", "san-xuat-thuc-pham"),
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "Quan ly san xuat"):    ("san-xuat-qa-qc", "san-xuat-quan-ly"),
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "Dau khi / Hoa chat"):  ("san-xuat-qa-qc", "san-xuat-quan-ly"),       # gộp
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "Hang khong / Hang hai"):("san-xuat-qa-qc", "san-xuat-quan-ly"),      # gộp
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "In an / Xuat ban"):    ("san-xuat-qa-qc", "san-xuat-quan-ly"),       # gộp
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "Det may / Da giay"):   ("san-xuat-qa-qc", "san-xuat-det-may"),
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "My pham / Trang suc"): ("san-xuat-qa-qc", "san-xuat-my-pham"),
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "Nong - Lam - Ngu"):    ("san-xuat-qa-qc", "san-xuat-nong-nghiep"),
    ("San xuat / Chat luong (QA-QC) / Cong nghiep chuyen nganh", "Moi truong / Xu ly chat thai"):("san-xuat-qa-qc", "san-xuat-moi-truong"),

    # ── 16. Giáo dục ──────────────────────────────────────────────────────────
    ("Giao duc / Dao tao", "Giang day"):      ("giao-duc-dao-tao", "giao-duc-giang-day"),
    ("Giao duc / Dao tao", "Tro giang"):      ("giao-duc-dao-tao", "giao-duc-giang-day"),  # gộp
    ("Giao duc / Dao tao", "Dao tao noi bo"): ("giao-duc-dao-tao", "giao-duc-giang-day"),  # gộp

    # ── 17. Lao động phổ thông ────────────────────────────────────────────────
    # Lái xe giữ trong lao-dong-pho-thong, KHÔNG chuyển sang van-tai-logistics
    ("Lao dong pho thong / Khac", "Lai xe (khong uu tien train)"): ("lao-dong-pho-thong", "lao-dong-pho-thong-lai-xe"),
    ("Lao dong pho thong / Khac", "Cong nhan"):                    ("lao-dong-pho-thong", "lao-dong-pho-thong-cong-nhan"),
    ("Lao dong pho thong / Khac", "Lao dong pho thong khac"):      ("lao-dong-pho-thong", "lao-dong-pho-thong-cong-nhan"),  # gộp
    ("Lao dong pho thong / Khac", "Tap vu / Giup viec"):           ("lao-dong-pho-thong", "lao-dong-pho-thong-tap-vu"),
    ("Lao dong pho thong / Khac", "Bao ve"):                       ("lao-dong-pho-thong", "lao-dong-pho-thong-bao-ve"),
}


def to_slugs(raw_text: str) -> tuple[str | None, str | None]:
    """Trả về (group_slug, branch_slug) hoặc (None, None) nếu không match."""
    nhom, nhanh = classify(raw_text)
    if nhom is None:
        return None, None
    key = (nhom, nhanh)
    result = SLUG_MAP.get(key)
    if result is None:
        # Fallback: chỉ biết nhóm lớn, không có nhánh cụ thể
        return None, None
    return result


# ── CV side ───────────────────────────────────────────────────────────────────
print("=" * 60)
print("Gán ngành cho CV (USER_DATA_FINAL.csv) ...")
print("=" * 60)
cv = pd.read_csv(KAGGLE_DIR / "USER_DATA_FINAL.csv")

cv_rows = []
for idx, row in cv.iterrows():
    g_slug, b_slug = to_slugs(str(row.get("Industry", "")))
    cv_rows.append({
        "cv_row_index":        idx,
        "industry_group_slug": g_slug,
        "industry_branch_slug": b_slug,
    })

cv_map = pd.DataFrame(cv_rows)
matched_cv = cv_map["industry_group_slug"].notna().sum()
print(f"  Tổng CV:    {len(cv_map)}")
print(f"  Matched:    {matched_cv} ({matched_cv/len(cv_map)*100:.1f}%)")
print(f"  Không match:{len(cv_map) - matched_cv}")

cv_out = OUT_DIR / "cv_industry_mapping.csv"
cv_map.to_csv(cv_out, index=False, encoding="utf-8-sig")
print(f"  → Đã lưu: {cv_out}")

# ── JD side (explode theo dấu phẩy, giữ nhiều dòng cho 1 jd_row_index) ───────
print("\n" + "=" * 60)
print("Gán ngành cho JD (JOB_DATA_FINAL.csv, explode tags) ...")
print("=" * 60)
jd = pd.read_csv(KAGGLE_DIR / "JOB_DATA_FINAL.csv")

jd_rows = []
for idx, row in jd.iterrows():
    raw_industry = str(row.get("Industry", ""))
    tags = [t.strip() for t in raw_industry.split(",") if t.strip()]
    if not tags:
        jd_rows.append({"jd_row_index": idx, "industry_group_slug": None, "industry_branch_slug": None})
        continue
    for tag in tags:
        g_slug, b_slug = to_slugs(tag)
        jd_rows.append({
            "jd_row_index":        idx,
            "industry_group_slug": g_slug,
            "industry_branch_slug": b_slug,
        })

jd_map = pd.DataFrame(jd_rows)
matched_jd = jd_map["industry_group_slug"].notna().sum()
print(f"  Tổng JD gốc:         {len(jd)}")
print(f"  Tổng dòng (sau explode): {len(jd_map)}")
print(f"  Matched tags:        {matched_jd} ({matched_jd/len(jd_map)*100:.1f}%)")
print(f"  Không match tags:    {len(jd_map) - matched_jd}")

jd_out = OUT_DIR / "jd_industry_mapping.csv"
jd_map.to_csv(jd_out, index=False, encoding="utf-8-sig")
print(f"  → Đã lưu: {jd_out}")

# ── Tổng kết theo branch ──────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("BẢNG TỔNG KẾT: nhóm lớn | nhánh nhỏ | số CV | số JD (dòng tag)")
print("=" * 70)

cv_branch = (
    cv_map.dropna(subset=["industry_branch_slug"])
          .groupby(["industry_group_slug", "industry_branch_slug"])
          .size()
          .reset_index(name="so_cv")
)
jd_branch = (
    jd_map.dropna(subset=["industry_branch_slug"])
          .groupby(["industry_group_slug", "industry_branch_slug"])
          .size()
          .reset_index(name="so_jd")
)
summary = pd.merge(cv_branch, jd_branch, on=["industry_group_slug", "industry_branch_slug"], how="outer").fillna(0)
summary["so_cv"] = summary["so_cv"].astype(int)
summary["so_jd"] = summary["so_jd"].astype(int)
summary["tong"]  = summary["so_cv"] + summary["so_jd"]
summary = summary.sort_values(["industry_group_slug", "tong"], ascending=[True, False])

print(f"\n{'NHÓM':<35} {'NHÁNH':<40} {'CV':>6} {'JD':>6} {'Tổng':>6}")
print("-" * 93)
for _, r in summary.iterrows():
    print(f"{str(r['industry_group_slug']):<35} {str(r['industry_branch_slug']):<40} {int(r['so_cv']):>6} {int(r['so_jd']):>6} {int(r['tong']):>6}")

print(f"\nTổng nhánh: {len(summary)}")
print(f"Grand total CV rows: {int(summary['so_cv'].sum())} | JD tag rows: {int(summary['so_jd'].sum())}")
