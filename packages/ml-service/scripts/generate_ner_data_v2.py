# -*- coding: utf-8 -*-
"""
generate_ner_data_v2.py
========================
BẢN MỞ RỘNG của generate_ner_data.py — sinh câu có gán nhãn BIO (B-SKILL/
I-SKILL, B-EXP/I-EXP, B-EDU/I-EDU, B-ORG/I-ORG) để fine-tune M1 NER, nhưng
dùng ĐÚNG skill đã seed trong Supabase (qua industry_skills_source.py), phủ
đủ 73 ngành — không bịa thêm ngành/skill nào ngoài danh sách đã có.

Đây là data BỔ SUNG cho train_real.conll (data thật đã bootstrap) — không
thay thế. Dùng khi cần ép model thấy rõ các skill mới/hiếm mà data thật
chưa có nhiều ví dụ.

100% rule-based, không gọi LLM.

Chạy: python scripts/generate_ner_data_v2.py
Output: data/ner/train_v2.conll, data/ner/val_v2.conll
"""
import json
import random
from pathlib import Path

from industry_skills_source import load_industries
from generate_training_data_v2 import ROLES

random.seed(43)

# ─── Câu mẫu (giữ format giống generate_ner_data.py để tương thích) ─────────
SKILL_TEMPLATES = [
    "Thành thạo {skills}",
    "Có kinh nghiệm với {skills}",
    "Kỹ năng: {skills}",
    "Sử dụng thành thạo {skills}",
    "Am hiểu và làm việc với {skills}",
    "Biết sử dụng {skills}",
    "Có kiến thức về {skills}",
    "Kinh nghiệm sử dụng {skills}",
]

EXP_TEMPLATES = [
    "{years} năm kinh nghiệm làm việc tại {company}",
    "Hơn {years} năm kinh nghiệm trong lĩnh vực {field}",
    "Có {years} năm kinh nghiệm thực tế",
    "{years} năm làm việc tại {company} với vị trí {role}",
    "Kinh nghiệm {years} năm tại {company}",
    "{years} năm làm {role} tại {company}",
    "Hơn {years} năm kinh nghiệm làm {role}",
]

EDU_TEMPLATES = [
    "Tốt nghiệp {degree} tại {school} năm {year}",
    "Đang theo học {degree} tại {school}",
    "Bằng {degree} chuyên ngành {major} tại {school}",
    "Tốt nghiệp {degree} ngành {major}",
    "{degree} - {school}, {year}",
]

EXP_YEARS = ["1", "2", "3", "4", "5", "6", "7", "8", "10"]
COMPANIES = [
    "FPT Software", "Viettel", "VinGroup", "VNPT", "Vinamilk", "Masan Group",
    "Techcombank", "Bảo Việt", "Coteccons", "Traphaco", "Vinhomes",
    "Bệnh viện Đại học Y Dược", "Công ty vận tải Phương Trang",
    "Nhà máy tại KCN Bình Dương", "Chuỗi cửa hàng bán lẻ", "Doanh nghiệp tư nhân",
]
FIELDS = [
    "phát triển phần mềm", "kế toán tài chính", "kinh doanh", "nhân sự",
    "xây dựng", "y tế", "giáo dục", "sản xuất", "bất động sản", "logistics",
]
DEGREES = ["Đại học", "Cử nhân", "Kỹ sư", "Thạc sĩ", "Cao đẳng"]
SCHOOLS = [
    "Đại học Bách Khoa TP.HCM", "Đại học Kinh Tế TP.HCM", "Đại học FPT",
    "Đại học Ngoại Thương", "Đại học Y Dược TP.HCM", "Đại học Sư Phạm",
    "Đại học Kiến Trúc TP.HCM", "Đại học Giao Thông Vận Tải",
]
MAJORS = [
    "Công nghệ thông tin", "Kế toán", "Quản trị kinh doanh", "Marketing",
    "Xây dựng", "Y khoa", "Sư phạm", "Cơ khí", "Tài chính ngân hàng",
]
YEARS = ["2019", "2020", "2021", "2022", "2023", "2024"]


def tokenize(text: str) -> list[str]:
    tokens = []
    current = ""
    for ch in text:
        if ch in " \t\n":
            if current:
                tokens.append(current)
                current = ""
        elif ch in ".,;:()[]{}\"'":
            if current:
                tokens.append(current)
                current = ""
            tokens.append(ch)
        else:
            current += ch
    if current:
        tokens.append(current)
    return tokens


def bio_tag_skill(text: str, skills_used: list[str]) -> list[tuple[str, str]]:
    tokens = tokenize(text)
    labels = ["O"] * len(tokens)
    # Sắp theo độ dài giảm dần để skill dài (nhiều từ) được ưu tiên khớp trước
    for skill in sorted(skills_used, key=len, reverse=True):
        skill_tokens = tokenize(skill)
        n = len(skill_tokens)
        if n == 0:
            continue
        for i in range(len(tokens) - n + 1):
            if labels[i] != "O":
                continue
            if [t.lower() for t in tokens[i:i + n]] == [t.lower() for t in skill_tokens]:
                labels[i] = "B-SKILL"
                for j in range(1, n):
                    labels[i + j] = "I-SKILL"
    return list(zip(tokens, labels))


def bio_tag_exp(text: str, years: str, company: str = "") -> list[tuple[str, str]]:
    tokens = tokenize(text)
    labels = ["O"] * len(tokens)
    exp_tokens = tokenize(f"{years} năm")
    n = len(exp_tokens)
    for i in range(len(tokens) - n + 1):
        if [t.lower() for t in tokens[i:i + n]] == [t.lower() for t in exp_tokens]:
            labels[i] = "B-EXP"
            for j in range(1, n):
                labels[i + j] = "I-EXP"
    if company:
        comp_tokens = tokenize(company)
        n = len(comp_tokens)
        for i in range(len(tokens) - n + 1):
            if tokens[i:i + n] == comp_tokens:
                labels[i] = "B-ORG"
                for j in range(1, n):
                    labels[i + j] = "I-ORG"
    return list(zip(tokens, labels))


def bio_tag_edu(text: str, degree: str, school: str) -> list[tuple[str, str]]:
    tokens = tokenize(text)
    labels = ["O"] * len(tokens)
    for entity in (degree, school):
        ent_tokens = tokenize(entity)
        n = len(ent_tokens)
        for i in range(len(tokens) - n + 1):
            if tokens[i:i + n] == ent_tokens:
                labels[i] = "B-EDU"
                for j in range(1, n):
                    labels[i + j] = "I-EDU"
    return list(zip(tokens, labels))


def gen_skill_sample(industries: dict, all_slugs: list[str]) -> list[tuple[str, str]]:
    """Chọn 1 ngành (uniform, để mọi ngành — kể cả ngành ít data thật — đều
    được thấy đều nhau), lấy skill THẬT của Supabase để sinh câu."""
    slug = random.choice(all_slugs)
    skills_pool = industries[slug]["skills"]
    n_skills = random.randint(2, min(5, len(skills_pool)))
    chosen = random.sample(skills_pool, n_skills)
    # Random chọn tên gốc hoặc alias cho mỗi skill (đa dạng cách viết)
    skills_used = [random.choice([name] + list(aliases)) for name, aliases in chosen]
    skills_str = ", ".join(skills_used)
    template = random.choice(SKILL_TEMPLATES)
    text = template.format(skills=skills_str)
    return bio_tag_skill(text, skills_used)


def gen_exp_sample(industries: dict, all_slugs: list[str]) -> list[tuple[str, str]]:
    slug = random.choice(all_slugs)
    info = industries[slug]
    role = random.choice(ROLES.get(slug, [info["name"]]))
    years = random.choice(EXP_YEARS)
    company = random.choice(COMPANIES)
    field = random.choice(FIELDS)
    template = random.choice(EXP_TEMPLATES)
    text = template.format(years=years, company=company, role=role, field=field)
    return bio_tag_exp(text, years, company)


def gen_edu_sample() -> list[tuple[str, str]]:
    degree = random.choice(DEGREES)
    school = random.choice(SCHOOLS)
    major = random.choice(MAJORS)
    year = random.choice(YEARS)
    template = random.choice(EDU_TEMPLATES)
    text = template.format(degree=degree, school=school, major=major, year=year)
    return bio_tag_edu(text, degree, school)


def generate_dataset(industries: dict, n_samples: int = 6000) -> list[list[tuple[str, str]]]:
    all_slugs = [s for s, v in industries.items()
                 if v["level"] in ("group", "branch") and v["skills"]]
    samples = []
    per_type = n_samples // 3
    print(f"Dang sinh {n_samples} cau NER (phu {len(all_slugs)}/73 nganh)...")
    for _ in range(per_type):
        samples.append(gen_skill_sample(industries, all_slugs))
    for _ in range(per_type):
        samples.append(gen_exp_sample(industries, all_slugs))
    for _ in range(n_samples - 2 * per_type):
        samples.append(gen_edu_sample())
    random.shuffle(samples)
    return samples


def save_conll(samples, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for sample in samples:
            for token, label in sample:
                f.write(f"{token}\t{label}\n")
            f.write("\n")
    print(f"[SAVED] {path} ({len(samples)} cau)")


def save_json(samples, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = [{"tokens": [t for t, _ in s], "labels": [l for _, l in s]} for s in samples]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[SAVED] {path}")


if __name__ == "__main__":
    industries = load_industries()
    out_dir = Path(__file__).parent.parent / "data" / "ner"

    all_samples = generate_dataset(industries, n_samples=6000)

    n = len(all_samples)
    n_train = int(n * 0.85)
    train = all_samples[:n_train]
    val = all_samples[n_train:]

    save_conll(train, out_dir / "train_v2.conll")
    save_conll(val, out_dir / "val_v2.conll")
    save_json(train, out_dir / "train_v2.json")

    # Kiểm tra bao phủ ngành trong câu skill
    all_slugs = [s for s, v in industries.items()
                 if v["level"] in ("group", "branch") and v["skills"]]
    print(f"\n[SPLIT] Train={len(train)} | Val={len(val)}")
    print(f"[COVERAGE] Tong so nganh co skill dung de sinh cau: {len(all_slugs)}/73")

    print("\n--- PREVIEW ---")
    for token, label in all_samples[0][:15]:
        print(f"  {token:25s} {label}")
