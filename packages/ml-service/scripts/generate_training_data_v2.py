# -*- coding: utf-8 -*-
"""
generate_training_data_v2.py
=============================
BẢN MỞ RỘNG của generate_training_data.py — sinh cặp (CV_chunk, JD_chunk) cho
train M2 Embedding, nhưng phủ ĐỦ 73 ngành (17 nhóm lớn + 56 nhánh nhỏ) hiện có
trong Supabase, dùng ĐÚNG skill đã seed (migration_v5 + v10 + v11) qua
industry_skills_source.py — KHÔNG bịa thêm ngành/skill nào ngoài danh sách đó.

100% rule-based / template-based, không gọi LLM nào.

Chạy: python scripts/generate_training_data_v2.py
Output: data/processed/embedding_pairs_v2.json
"""
import json
import random
from pathlib import Path

from industry_skills_source import load_industries

random.seed(42)

# ─── Phân loại 17 nhóm lớn theo "văn phong" để chọn template phù hợp ────────
GROUP_CATEGORY = {
    "kinh-doanh-ban-hang":        "sales",
    "marketing-truyen-thong":     "office",
    "cntt":                       "office",
    "ke-toan-tai-chinh":          "office",
    "nhan-su-hanh-chinh":         "office",
    "dich-vu-khach-hang":         "service",
    "thiet-ke-kien-truc":         "office",
    "khach-san-nha-hang-du-lich": "service",
    "y-te-duoc":                  "healthcare",
    "xay-dung":                   "technical",
    "dien-dien-tu-vien-thong":    "technical",
    "bat-dong-san":               "sales",
    "co-khi-che-tao":             "technical",
    "van-tai-logistics":          "technical",
    "san-xuat-qa-qc":             "technical",
    "giao-duc-dao-tao":           "education",
    "lao-dong-pho-thong":         "labor",
}

# ─── Vai trò (role) tiêu biểu cho từng ngành — dựa trên chính tên ngành ─────
ROLES = {
    "kinh-doanh-ban-hang": ["Nhân viên kinh doanh", "Chuyên viên phát triển kinh doanh"],
    "marketing-truyen-thong": ["Chuyên viên Marketing", "Nhân viên truyền thông"],
    "cntt": ["Kỹ sư phần mềm", "Chuyên viên CNTT"],
    "ke-toan-tai-chinh": ["Kế toán viên", "Chuyên viên tài chính"],
    "nhan-su-hanh-chinh": ["Chuyên viên nhân sự", "Nhân viên hành chính"],
    "dich-vu-khach-hang": ["Nhân viên chăm sóc khách hàng", "Nhân viên dịch vụ khách hàng"],
    "thiet-ke-kien-truc": ["Chuyên viên thiết kế", "Kiến trúc sư"],
    "khach-san-nha-hang-du-lich": ["Nhân viên khách sạn nhà hàng", "Nhân viên du lịch"],
    "y-te-duoc": ["Điều dưỡng viên", "Dược sĩ"],
    "xay-dung": ["Kỹ sư xây dựng", "Giám sát công trình"],
    "dien-dien-tu-vien-thong": ["Kỹ thuật viên điện", "Kỹ sư điện tử viễn thông"],
    "bat-dong-san": ["Chuyên viên bất động sản", "Nhân viên môi giới BĐS"],
    "co-khi-che-tao": ["Kỹ thuật viên cơ khí", "Kỹ sư cơ khí"],
    "van-tai-logistics": ["Nhân viên logistics", "Chuyên viên xuất nhập khẩu"],
    "san-xuat-qa-qc": ["Nhân viên QA/QC", "Quản lý sản xuất"],
    "giao-duc-dao-tao": ["Giáo viên", "Chuyên viên đào tạo"],
    "lao-dong-pho-thong": ["Nhân viên lao động phổ thông", "Công nhân"],

    "kinh-doanh-ban-hang-tong-hop": ["Nhân viên kinh doanh tổng hợp"],
    "kinh-doanh-ban-hang-ban-hang": ["Nhân viên bán hàng"],
    "kinh-doanh-ban-hang-sale": ["Chuyên viên Sale", "Đại diện kinh doanh"],
    "kinh-doanh-ban-hang-ban-le-si": ["Nhân viên bán lẻ - bán sỉ"],
    "kinh-doanh-ban-hang-thu-ngan": ["Nhân viên thu ngân"],
    "marketing-truyen-thong-pr": ["Chuyên viên PR", "Chuyên viên truyền thông"],
    "marketing-bien-phien-dich": ["Biên dịch viên", "Phiên dịch viên"],
    "marketing-tong-hop": ["Chuyên viên Marketing tổng hợp"],
    "marketing-bao-chi-truyen-hinh": ["Phóng viên", "Biên tập viên truyền hình"],
    "marketing-seo-digital": ["Chuyên viên SEO", "Chuyên viên Digital Marketing"],
    "marketing-to-chuc-su-kien": ["Chuyên viên tổ chức sự kiện"],
    "cntt-phat-trien-phan-mem": ["Kỹ sư phần mềm", "Lập trình viên"],
    "cntt-phan-cung-mang": ["Kỹ thuật viên phần cứng - mạng"],
    "ke-toan-tai-chinh-kiem-toan": ["Kiểm toán viên"],
    "ke-toan-tai-chinh-bao-hiem": ["Chuyên viên tư vấn bảo hiểm"],
    "ke-toan-tai-chinh-ngan-hang": ["Giao dịch viên ngân hàng", "Chuyên viên tín dụng"],
    "ke-toan-tai-chinh-ke-toan": ["Kế toán viên"],
    "ke-toan-tai-chinh-tai-chinh": ["Chuyên viên tài chính - đầu tư"],
    "ke-toan-tai-chinh-chung-khoan": ["Chuyên viên chứng khoán"],
    "nhan-su-hanh-chinh-van-phong": ["Nhân viên hành chính văn phòng"],
    "nhan-su-tuyen-dung-cb": ["Chuyên viên tuyển dụng", "Chuyên viên C&B"],
    "nhan-su-thu-ky-tro-ly": ["Thư ký", "Trợ lý giám đốc"],
    "nhan-su-phap-ly-phap-che": ["Chuyên viên pháp lý"],
    "dich-vu-khach-hang-cskh": ["Nhân viên chăm sóc khách hàng"],
    "thiet-ke-do-hoa": ["Chuyên viên thiết kế đồ họa"],
    "thiet-ke-kien-truc-kien-truc": ["Kiến trúc sư"],
    "thiet-ke-my-thuat": ["Họa sĩ minh họa", "Chuyên viên mỹ thuật"],
    "thiet-ke-noi-that": ["Chuyên viên thiết kế nội thất"],
    "khach-san-khach-san": ["Nhân viên lễ tân khách sạn"],
    "khach-san-du-lich-le-hanh": ["Hướng dẫn viên du lịch"],
    "khach-san-spa-lam-dep": ["Chuyên viên spa - làm đẹp"],
    "khach-san-nha-hang-fb": ["Nhân viên nhà hàng - F&B"],
    "y-te-duoc-y-te": ["Điều dưỡng viên", "Bác sĩ"],
    "y-te-duoc-duoc-pham": ["Trình dược viên", "Dược sĩ"],
    "xay-dung-ky-su": ["Kỹ sư xây dựng", "Giám sát thi công"],
    "dien-dien-tu-dien-lanh": ["Kỹ thuật viên điện lạnh"],
    "dien-dien-tu-vien-thong-vt": ["Kỹ sư viễn thông"],
    "bat-dong-san-moi-gioi": ["Nhân viên môi giới bất động sản"],
    "co-khi-tu-dong-hoa": ["Kỹ sư tự động hóa"],
    "co-khi-che-tao-co-khi": ["Kỹ thuật viên cơ khí chế tạo"],
    "co-khi-o-to": ["Kỹ thuật viên sửa chữa ô tô"],
    "van-tai-logistics-kho-van": ["Nhân viên kho vận"],
    "van-tai-giao-nhan": ["Nhân viên giao nhận"],
    "van-tai-xuat-nhap-khau": ["Chuyên viên xuất nhập khẩu"],
    "san-xuat-qa-qc-qa-qc": ["Nhân viên QA/QC"],
    "san-xuat-thuc-pham": ["Nhân viên sản xuất thực phẩm"],
    "san-xuat-quan-ly": ["Quản lý sản xuất"],
    "san-xuat-det-may": ["Nhân viên dệt may"],
    "san-xuat-my-pham": ["Nhân viên sản xuất mỹ phẩm"],
    "san-xuat-nong-nghiep": ["Kỹ thuật viên nông nghiệp"],
    "san-xuat-moi-truong": ["Chuyên viên môi trường"],
    "giao-duc-giang-day": ["Giáo viên", "Giảng viên"],
    "lao-dong-pho-thong-lai-xe": ["Lái xe"],
    "lao-dong-pho-thong-cong-nhan": ["Công nhân"],
    "lao-dong-pho-thong-tap-vu": ["Nhân viên tạp vụ"],
    "lao-dong-pho-thong-bao-ve": ["Nhân viên bảo vệ"],
}

COMPANIES = [
    "FPT Software", "VNG Corporation", "Tiki", "Shopee Vietnam", "MoMo",
    "Vinamilk", "Masan Group", "PwC Vietnam", "Deloitte Vietnam",
    "Lazada Vietnam", "The Coffee House", "Vinhomes", "Techcombank",
    "Bảo Việt", "Coteccons", "Traphaco", "Bệnh viện Đại học Y Dược",
    "Trung tâm Anh ngữ ILA", "Công ty vận tải Phương Trang",
    "Nhà máy sản xuất tại KCN Bình Dương", "Chuỗi cửa hàng bán lẻ",
    "Công ty tư nhân", "Doanh nghiệp gia đình",
]
DEGREES = ["Đại học", "Cao đẳng", "Kỹ sư", "Cử nhân", "Trung cấp"]
SCHOOLS = [
    "Đại học Bách Khoa TP.HCM", "Đại học Kinh Tế TP.HCM", "Đại học FPT",
    "Đại học Ngoại Thương", "Đại học Y Dược TP.HCM", "Đại học Sư Phạm",
    "Đại học Kiến Trúc TP.HCM", "Đại học Giao Thông Vận Tải",
    "Học viện Tài chính", "Cao đẳng Kỹ thuật Cao Thắng",
]
EXP_LEVELS = [(0, 1), (1, 2), (2, 4), (4, 7), (7, 12)]

CV_TEMPLATES = {
    "office": [
        "Có {exp_years} năm kinh nghiệm làm {role}, thành thạo {skill_str}. "
        "Từng làm việc tại {company}. Tốt nghiệp {degree} tại {school}.",
        "{role} với {exp_years} năm kinh nghiệm thực tế. Kỹ năng: {skill_str}. "
        "Đã làm việc tại {company}.",
        "Kỹ năng: {skill_str}. Kinh nghiệm {exp_years} năm trong vai trò {role} "
        "tại các công ty như {company}. Trình độ: {degree}.",
    ],
    "technical": [
        "{role} với {exp_years} năm kinh nghiệm thực tế. Thành thạo {skill_str}. "
        "Từng thi công/vận hành tại {company}.",
        "Có {exp_years} năm kinh nghiệm làm {role}, am hiểu {skill_str}. "
        "Đã làm việc tại {company}, luôn đảm bảo an toàn lao động.",
        "{role}, {exp_years} năm kinh nghiệm. Kỹ năng: {skill_str}. "
        "Tốt nghiệp {degree} tại {school}.",
    ],
    "service": [
        "{role} với {exp_years} năm kinh nghiệm trong ngành dịch vụ. "
        "Thành thạo {skill_str}. Đã làm việc tại {company}.",
        "Có {exp_years} năm kinh nghiệm làm {role}, phong cách phục vụ chuyên nghiệp. "
        "Kỹ năng: {skill_str}.",
        "{exp_years} năm kinh nghiệm {role} tại {company}. Am hiểu {skill_str}, "
        "luôn đặt sự hài lòng của khách hàng lên hàng đầu.",
    ],
    "sales": [
        "{role} với {exp_years} năm kinh nghiệm, nhiều lần đạt/vượt chỉ tiêu doanh số. "
        "Kỹ năng: {skill_str}.",
        "Có {exp_years} năm kinh nghiệm làm {role} tại {company}. Thành thạo {skill_str}, "
        "có mạng lưới khách hàng rộng.",
        "{exp_years} năm kinh nghiệm {role}. Kỹ năng: {skill_str}. "
        "Từng làm việc tại {company}.",
    ],
    "labor": [
        "{role} với {exp_years} năm kinh nghiệm, chăm chỉ, chịu được áp lực công việc. "
        "Kỹ năng: {skill_str}.",
        "Có {exp_years} năm kinh nghiệm làm {role} tại {company}. Thành thạo {skill_str}, "
        "tuân thủ nội quy nghiêm túc.",
        "{exp_years} năm kinh nghiệm {role}. Kỹ năng: {skill_str}. "
        "Sẵn sàng làm việc theo ca, tăng ca khi cần.",
    ],
    "healthcare": [
        "{role} với {exp_years} năm kinh nghiệm lâm sàng. Thành thạo {skill_str}. "
        "Tốt nghiệp {degree} tại {school}.",
        "Có {exp_years} năm kinh nghiệm làm {role} tại {company}. Kỹ năng: {skill_str}.",
        "{degree} chuyên ngành liên quan, {exp_years} năm kinh nghiệm {role}. "
        "Am hiểu {skill_str}.",
    ],
    "education": [
        "{role} với {exp_years} năm kinh nghiệm giảng dạy. Thành thạo {skill_str}. "
        "Tốt nghiệp {degree} tại {school}.",
        "Có {exp_years} năm kinh nghiệm làm {role} tại {company}. Kỹ năng: {skill_str}.",
        "{degree} chuyên ngành sư phạm/liên quan, {exp_years} năm kinh nghiệm {role}. "
        "Am hiểu {skill_str}.",
    ],
}

JD_TEMPLATES = {
    "office": [
        "Tuyển {role}. Yêu cầu kinh nghiệm {exp_range}. Kỹ năng bắt buộc: {skill_str}. "
        "Làm việc tại văn phòng, giờ hành chính.",
        "Cần tuyển {role} có {exp_range} kinh nghiệm. Yêu cầu thành thạo {skill_str}. "
        "Ưu tiên khả năng làm việc độc lập, chủ động.",
    ],
    "technical": [
        "Tuyển {role}. Yêu cầu kinh nghiệm {exp_range}. Kỹ năng bắt buộc: {skill_str}. "
        "Làm việc tại công trình/nhà máy.",
        "Cần tuyển {role} có {exp_range} kinh nghiệm thực tế. Yêu cầu thành thạo {skill_str}, "
        "đảm bảo an toàn lao động.",
    ],
    "service": [
        "Tuyển {role}. Yêu cầu kinh nghiệm {exp_range}. Kỹ năng bắt buộc: {skill_str}. "
        "Ưu tiên ngoại hình ưa nhìn, giao tiếp tốt.",
        "Cần tuyển {role} có {exp_range} kinh nghiệm. Yêu cầu thành thạo {skill_str}, "
        "thái độ phục vụ chuyên nghiệp.",
    ],
    "sales": [
        "Tuyển {role}. Yêu cầu kinh nghiệm {exp_range}. Kỹ năng bắt buộc: {skill_str}. "
        "Thu nhập theo doanh số, không giới hạn.",
        "Cần tuyển {role} có {exp_range} kinh nghiệm. Yêu cầu thành thạo {skill_str}, "
        "chịu được áp lực chỉ tiêu.",
    ],
    "labor": [
        "Tuyển {role}. Không yêu cầu kinh nghiệm nhiều, {exp_range}. Kỹ năng: {skill_str}. "
        "Làm việc theo ca, có hỗ trợ ăn ở.",
        "Cần tuyển {role}, {exp_range} kinh nghiệm. Yêu cầu: {skill_str}, "
        "chăm chỉ, chịu được cường độ công việc.",
    ],
    "healthcare": [
        "Tuyển {role}. Yêu cầu kinh nghiệm {exp_range}. Kỹ năng bắt buộc: {skill_str}. "
        "Ưu tiên có chứng chỉ hành nghề.",
        "Cần tuyển {role} có {exp_range} kinh nghiệm. Yêu cầu thành thạo {skill_str}, "
        "cẩn thận, có tâm với nghề.",
    ],
    "education": [
        "Tuyển {role}. Yêu cầu kinh nghiệm {exp_range}. Kỹ năng bắt buộc: {skill_str}. "
        "Ưu tiên có nghiệp vụ sư phạm.",
        "Cần tuyển {role} có {exp_range} kinh nghiệm. Yêu cầu thành thạo {skill_str}, "
        "kiên nhẫn, yêu trẻ/yêu nghề.",
    ],
}


def _category_of(slug: str, industries: dict) -> str:
    info = industries[slug]
    if info["level"] == "group":
        return GROUP_CATEGORY[slug]
    return GROUP_CATEGORY[info["parent_slug"]]


def _skill_strings(skills: list[tuple[str, list[str]]], k: int) -> list[str]:
    """Lấy k skill, mỗi skill random chọn tên gốc hoặc 1 alias (đa dạng câu chữ)."""
    chosen = random.sample(skills, k=min(k, len(skills)))
    out = []
    for name, aliases in chosen:
        pool = [name] + list(aliases)
        out.append(random.choice(pool))
    return out


def gen_cv_chunk(slug: str, role: str, category: str, skills: list, exp_years: int) -> str:
    skill_str = ", ".join(_skill_strings(skills, random.randint(3, 6)))
    template = random.choice(CV_TEMPLATES[category])
    return template.format(
        role=role, skill_str=skill_str, exp_years=exp_years,
        company=random.choice(COMPANIES),
        degree=random.choice(DEGREES), school=random.choice(SCHOOLS),
    )


def gen_jd_chunk(slug: str, role: str, category: str, skills: list, exp_min: int, exp_max: int) -> str:
    skill_str = ", ".join(_skill_strings(skills, random.randint(3, 5)))
    exp_range = f"{exp_min}-{exp_max} năm" if exp_min > 0 else "không yêu cầu / dưới 1 năm"
    template = random.choice(JD_TEMPLATES[category])
    return template.format(role=role, skill_str=skill_str, exp_range=exp_range)


def generate_pairs(industries: dict, n_positive: int = 6000, n_negative: int = 6000) -> list[dict]:
    all_slugs = [s for s, v in industries.items() if v["level"] in ("group", "branch") and v["skills"]]
    soft_skills = industries["__soft__"]["skills"]

    pairs = []
    for _ in range(n_positive):
        slug = random.choice(all_slugs)
        info = industries[slug]
        category = _category_of(slug, industries)
        role = random.choice(ROLES.get(slug, [info["name"]]))
        # Trộn thêm 1-2 soft skill cho tự nhiên hơn (không tính vào matching skill)
        skills_pool = info["skills"] + random.sample(soft_skills, k=min(2, len(soft_skills)))
        exp_min, exp_max = random.choice(EXP_LEVELS)
        exp_years = random.randint(max(exp_min, 0), max(exp_max, exp_min))

        cv = gen_cv_chunk(slug, role, category, skills_pool, exp_years)
        jd = gen_jd_chunk(slug, role, category, skills_pool, exp_min, exp_max)

        pairs.append({
            "cv": cv, "jd": jd, "label": 1,
            "score": random.uniform(0.65, 0.98),
            "industry_slug": slug, "group_slug": slug if info["level"] == "group" else info["parent_slug"],
        })

    for _ in range(n_negative):
        slug1, slug2 = random.sample(all_slugs, 2)
        # Đảm bảo khác nhóm lớn hẳn (không chỉ khác nhánh trong cùng nhóm)
        g1 = slug1 if industries[slug1]["level"] == "group" else industries[slug1]["parent_slug"]
        g2 = slug2 if industries[slug2]["level"] == "group" else industries[slug2]["parent_slug"]
        tries = 0
        while g1 == g2 and tries < 10:
            slug2 = random.choice(all_slugs)
            g2 = slug2 if industries[slug2]["level"] == "group" else industries[slug2]["parent_slug"]
            tries += 1

        info1, info2 = industries[slug1], industries[slug2]
        cat1, cat2 = _category_of(slug1, industries), _category_of(slug2, industries)
        role1 = random.choice(ROLES.get(slug1, [info1["name"]]))
        role2 = random.choice(ROLES.get(slug2, [info2["name"]]))

        exp_min1, exp_max1 = random.choice(EXP_LEVELS)
        exp_min2, exp_max2 = random.choice(EXP_LEVELS)
        exp_years1 = random.randint(max(exp_min1, 0), max(exp_max1, exp_min1))

        cv = gen_cv_chunk(slug1, role1, cat1, info1["skills"], exp_years1)
        jd = gen_jd_chunk(slug2, role2, cat2, info2["skills"], exp_min2, exp_max2)

        pairs.append({
            "cv": cv, "jd": jd, "label": 0,
            "score": random.uniform(0.02, 0.30),
            "industry_slug": f"{slug1}_vs_{slug2}", "group_slug": f"{g1}_vs_{g2}",
        })

    random.shuffle(pairs)
    return pairs


if __name__ == "__main__":
    industries = load_industries()

    print("Dang sinh du lieu training (day du 73 nganh)...")
    pairs = generate_pairs(industries, n_positive=6000, n_negative=6000)

    out_dir = Path(__file__).parent.parent / "data" / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "embedding_pairs_v2.json"
    out_path.write_text(json.dumps(pairs, ensure_ascii=False, indent=2), encoding="utf-8")

    pos = sum(1 for p in pairs if p["label"] == 1)
    neg = sum(1 for p in pairs if p["label"] == 0)
    slugs_covered = {p["industry_slug"] for p in pairs if p["label"] == 1}
    print(f"[OK] Da tao {len(pairs)} cap (positive={pos}, negative={neg})")
    print(f"[OK] So nganh (group+branch) xuat hien trong positive pairs: {len(slugs_covered)}/73")
    print(f"[SAVED] {out_path}")

    print("\n--- PREVIEW ---")
    for i, p in enumerate(pairs[:3]):
        print(f"\n[{i+1}] Label={p['label']} | Nganh={p['industry_slug']}")
        print(f"  CV: {p['cv']}")
        print(f"  JD: {p['jd']}")
