"""
generate_ner_data.py
Sinh dữ liệu NER cho M1: nhận dạng SKILL / EXP / EDU trong CV tiếng Việt
Format: CoNLL-2003 (BIO tagging)
"""
import json
import random
from pathlib import Path

random.seed(42)

# ─── Từ điển kỹ năng theo ngành ──────────────────────────────────────────────
SKILLS = [
    # IT
    "React", "ReactJS", "Vue", "Angular", "TypeScript", "JavaScript",
    "Next.js", "Node.js", "Python", "FastAPI", "Django", "Flask",
    "Java", "Spring Boot", "MySQL", "PostgreSQL", "MongoDB", "Redis",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Git", "GitHub",
    "CI/CD", "Jenkins", "Linux", "REST API", "GraphQL",
    "TensorFlow", "PyTorch", "Scikit-learn", "XGBoost", "PhoBERT",
    "Pandas", "NumPy", "Spark", "Kafka",
    # Marketing
    "SEO", "Google Ads", "Facebook Ads", "TikTok Ads", "Content Marketing",
    "Email Marketing", "CRM", "Google Analytics", "Canva",
    # Kế toán
    "MISA", "SAP", "Excel", "Kế toán tổng hợp", "Báo cáo tài chính",
    # Sales
    "B2B Sales", "CRM", "Đàm phán hợp đồng", "Quản lý kênh phân phối",
    # HR
    "Tuyển dụng", "C&B", "Onboarding", "HRIS", "Đào tạo phát triển",
    # Design
    "Figma", "Adobe XD", "Photoshop", "Illustrator", "UI/UX",
]

# ─── Cấu trúc câu mô tả kỹ năng ─────────────────────────────────────────────
SKILL_TEMPLATES = [
    "Thành thạo {skills}",
    "Có kinh nghiệm với {skills}",
    "Kỹ năng: {skills}",
    "Sử dụng thành thạo {skills}",
    "Am hiểu và làm việc với {skills}",
    "Biết sử dụng {skills}",
    "Có kiến thức về {skills}",
    "Thành thạo các công nghệ {skills}",
    "Kinh nghiệm sử dụng {skills}",
    "Làm việc hằng ngày với {skills}",
]

# ─── Cấu trúc câu kinh nghiệm ────────────────────────────────────────────────
EXP_TEMPLATES = [
    "{years} năm kinh nghiệm làm việc tại {company}",
    "Hơn {years} năm kinh nghiệm trong lĩnh vực {field}",
    "Có {years} năm kinh nghiệm thực tế",
    "{years} năm làm việc tại {company} với vị trí {role}",
    "Kinh nghiệm {years} năm tại {company}",
    "Tôi có {years} năm kinh nghiệm trong ngành {field}",
    "{years} năm làm {role} tại {company}",
    "Hơn {years} năm kinh nghiệm làm {role}",
]

EXP_YEARS = ["1", "2", "3", "4", "5", "6", "7", "8", "10"]
COMPANIES = [
    "FPT Software", "Viettel", "VinGroup", "VNPT", "TMA Solutions",
    "Nashtech", "Axon Active", "KMS Technology", "Sky Mavis", "Logigear",
    "MoMo", "VNPay", "Tiki", "Shopee Vietnam", "Lazada Vietnam",
]
FIELDS = [
    "phát triển phần mềm", "công nghệ thông tin", "marketing",
    "kế toán tài chính", "kinh doanh", "nhân sự",
]
ROLES = [
    "Software Engineer", "Frontend Developer", "Backend Developer",
    "Data Analyst", "DevOps Engineer", "Product Manager",
    "Marketing Executive", "Kế toán viên", "Sales Executive",
]

# ─── Cấu trúc câu học vấn ────────────────────────────────────────────────────
EDU_TEMPLATES = [
    "Tốt nghiệp {degree} tại {school} năm {year}",
    "Đang theo học {degree} tại {school}",
    "Bằng {degree} chuyên ngành {major} tại {school}",
    "Tốt nghiệp {degree} ngành {major}",
    "{degree} - {school}, {year}",
    "Học {degree} tại {school}",
]

DEGREES = [
    "Đại học", "Cử nhân", "Kỹ sư", "Thạc sĩ", "Cao đẳng",
]
SCHOOLS = [
    "Đại học Bách Khoa TP.HCM", "Đại học Công Nghệ Thông Tin",
    "Đại học Quốc Gia Hà Nội", "Đại học FPT", "Đại học Kinh Tế",
    "Đại học Tôn Đức Thắng", "Đại học Sư Phạm Kỹ Thuật",
    "Đại học Ngoại Thương", "Học viện Tài chính",
]
MAJORS = [
    "Công nghệ thông tin", "Khoa học máy tính", "Kỹ thuật phần mềm",
    "Kế toán", "Quản trị kinh doanh", "Marketing", "Tài chính ngân hàng",
]
YEARS = ["2018", "2019", "2020", "2021", "2022", "2023", "2024"]


def tokenize(text: str) -> list[str]:
    """Tách từ đơn giản theo khoảng trắng và dấu câu."""
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
    """Gán BIO tag cho câu chứa kỹ năng."""
    tokens = tokenize(text)
    labels = ["O"] * len(tokens)

    for skill in skills_used:
        skill_tokens = tokenize(skill)
        n = len(skill_tokens)
        for i in range(len(tokens) - n + 1):
            if tokens[i:i+n] == skill_tokens:
                labels[i] = "B-SKILL"
                for j in range(1, n):
                    labels[i+j] = "I-SKILL"

    return list(zip(tokens, labels))


def bio_tag_exp(text: str, years: str, company: str = "", role: str = "") -> list[tuple[str, str]]:
    """Gán BIO tag cho câu chứa kinh nghiệm."""
    tokens = tokenize(text)
    labels = ["O"] * len(tokens)

    # Tag years
    exp_phrase = f"{years} năm"
    exp_tokens = tokenize(exp_phrase)
    n = len(exp_tokens)
    for i in range(len(tokens) - n + 1):
        if tokens[i:i+n] == exp_tokens:
            labels[i] = "B-EXP"
            for j in range(1, n):
                labels[i+j] = "I-EXP"

    # Tag company
    if company:
        comp_tokens = tokenize(company)
        n = len(comp_tokens)
        for i in range(len(tokens) - n + 1):
            if tokens[i:i+n] == comp_tokens:
                labels[i] = "B-ORG"
                for j in range(1, n):
                    labels[i+j] = "I-ORG"

    return list(zip(tokens, labels))


def bio_tag_edu(text: str, degree: str, school: str) -> list[tuple[str, str]]:
    """Gán BIO tag cho câu chứa học vấn."""
    tokens = tokenize(text)
    labels = ["O"] * len(tokens)

    for entity, tag in [(degree, "EDU"), (school, "EDU")]:
        ent_tokens = tokenize(entity)
        n = len(ent_tokens)
        for i in range(len(tokens) - n + 1):
            if tokens[i:i+n] == ent_tokens:
                labels[i] = f"B-{tag}"
                for j in range(1, n):
                    labels[i+j] = f"I-{tag}"

    return list(zip(tokens, labels))


def gen_skill_sample() -> list[tuple[str, str]]:
    """Tạo 1 câu mô tả kỹ năng có tag."""
    n_skills = random.randint(2, 5)
    skills_used = random.sample(SKILLS, n_skills)
    skills_str = ", ".join(skills_used)
    template = random.choice(SKILL_TEMPLATES)
    text = template.format(skills=skills_str)
    return bio_tag_skill(text, skills_used)


def gen_exp_sample() -> list[tuple[str, str]]:
    """Tạo 1 câu kinh nghiệm có tag."""
    years = random.choice(EXP_YEARS)
    company = random.choice(COMPANIES)
    role = random.choice(ROLES)
    field = random.choice(FIELDS)
    template = random.choice(EXP_TEMPLATES)
    text = template.format(years=years, company=company, role=role, field=field)
    return bio_tag_exp(text, years, company, role)


def gen_edu_sample() -> list[tuple[str, str]]:
    """Tạo 1 câu học vấn có tag."""
    degree = random.choice(DEGREES)
    school = random.choice(SCHOOLS)
    major = random.choice(MAJORS)
    year = random.choice(YEARS)
    template = random.choice(EDU_TEMPLATES)
    text = template.format(degree=degree, school=school, major=major, year=year)
    return bio_tag_edu(text, degree, school)


def generate_dataset(n_samples: int = 2000) -> list[list[tuple[str, str]]]:
    """Tạo dataset NER."""
    samples = []
    per_type = n_samples // 3

    print(f"Đang sinh {n_samples} câu NER...")
    for _ in range(per_type):
        samples.append(gen_skill_sample())
    for _ in range(per_type):
        samples.append(gen_exp_sample())
    for _ in range(n_samples - 2 * per_type):
        samples.append(gen_edu_sample())

    random.shuffle(samples)
    print(f"[OK] Đã tạo {len(samples)} câu")
    return samples


def save_conll(samples: list[list[tuple[str, str]]], path: Path):
    """Lưu theo format CoNLL-2003."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for sample in samples:
            for token, label in sample:
                f.write(f"{token}\t{label}\n")
            f.write("\n")  # blank line giữa các câu
    print(f"[SAVED] {path} ({len(samples)} câu)")


def save_json(samples: list[list[tuple[str, str]]], path: Path):
    """Lưu dạng JSON để debug dễ hơn."""
    path.parent.mkdir(parents=True, exist_ok=True)
    data = [
        {"tokens": [t for t, _ in s], "labels": [l for _, l in s]}
        for s in samples
    ]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[SAVED] {path}")


if __name__ == "__main__":
    out_dir = Path(__file__).parent.parent / "data" / "ner"

    all_samples = generate_dataset(n_samples=3000)

    # Split train/val/test = 80/10/10
    n = len(all_samples)
    n_train = int(n * 0.8)
    n_val = int(n * 0.1)

    train = all_samples[:n_train]
    val = all_samples[n_train:n_train + n_val]
    test = all_samples[n_train + n_val:]

    save_conll(train, out_dir / "train.conll")
    save_conll(val,   out_dir / "val.conll")
    save_conll(test,  out_dir / "test.conll")
    save_json(train,  out_dir / "train.json")

    print(f"\n[SPLIT] Train={len(train)} | Val={len(val)} | Test={len(test)}")

    # Preview
    print("\n--- PREVIEW ---")
    for token, label in all_samples[0][:15]:
        print(f"  {token:20s} {label}")
