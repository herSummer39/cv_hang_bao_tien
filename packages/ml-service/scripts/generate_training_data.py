"""
BƯỚC 1: Sinh data tổng hợp cho train M2 Embedding Model.
Script này tạo ~1000 cặp (CV_chunk, JD_chunk) tiếng Việt theo ngành IT.

Chạy: python scripts/generate_training_data.py
Output: data/processed/embedding_pairs.json
"""
import json
import random
from pathlib import Path
from itertools import product

random.seed(42)

# ─── Kho từ vựng IT tiếng Việt ─────────────────────────────────────────────

SKILLS_FRONTEND = [
    "ReactJS", "React Native", "Next.js", "Vue.js", "Angular",
    "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS",
    "Redux", "Zustand", "Vite", "Webpack", "Sass/SCSS",
]
SKILLS_BACKEND = [
    "Node.js", "Python", "FastAPI", "Django", "Flask",
    "NestJS", "Express.js", "REST API", "GraphQL", "gRPC",
    "Java", "Spring Boot", "PHP", "Laravel", "Go",
]
SKILLS_DATA = [
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "Supabase", "Firebase", "Prisma ORM", "SQLAlchemy", "Pandas",
    "NumPy", "Scikit-learn", "XGBoost", "TensorFlow", "PyTorch",
]
SKILLS_DEVOPS = [
    "Docker", "Kubernetes", "AWS", "GCP", "Azure",
    "GitHub Actions", "GitLab CI/CD", "Nginx", "Linux", "Terraform",
    "Vercel", "Netlify", "PM2", "Git", "Jira",
]
SKILLS_AI = [
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
    "PhoBERT", "BERT", "Transformer", "LangChain", "RAG",
    "Hugging Face", "Scikit-learn", "XGBoost", "LightGBM", "SHAP",
]

# ── Ngành phi IT ───────────────────────────────────────────────────────────
SKILLS_MARKETING = [
    "SEO", "Google Ads", "Facebook Ads", "Content Marketing", "Email Marketing",
    "Social Media", "Branding", "Google Analytics", "Canva", "Copywriting",
    "TikTok Ads", "KOL Marketing", "CRM", "Hubspot", "Mailchimp",
]
SKILLS_ACCOUNTING = [
    "Excel nâng cao", "SAP", "MISA", "Fast Accounting", "Báo cáo tài chính",
    "Kế toán thuế", "Kiểm toán", "Kế toán tổng hợp", "Kế toán công nợ",
    "Tài chính doanh nghiệp", "Phân tích tài chính", "Ngân sách", "PowerBI",
]
SKILLS_SALES = [
    "B2B Sales", "B2C Sales", "Telesales", "CRM", "Salesforce",
    "Đàm phán hợp đồng", "Chăm sóc khách hàng", "KPI doanh số",
    "Phát triển thị trường", "Quản lý kênh phân phối", "Up-selling",
]
SKILLS_HR = [
    "Tuyển dụng", "Onboarding", "C&B", "Lương thưởng", "HRIS",
    "Đánh giá hiệu suất (KPI)", "Đào tạo phát triển", "Luật lao động",
    "Văn hóa doanh nghiệp", "Employee Engagement", "Workday", "BambooHR",
]
SKILLS_DESIGN = [
    "Figma", "Adobe XD", "Photoshop", "Illustrator", "After Effects",
    "UI/UX Design", "Wireframing", "Prototyping", "Motion Design",
    "Brand Identity", "Typography", "Color Theory", "Design System",
]

ALL_SKILLS = (SKILLS_FRONTEND + SKILLS_BACKEND + SKILLS_DATA + SKILLS_DEVOPS
              + SKILLS_AI + SKILLS_MARKETING + SKILLS_ACCOUNTING
              + SKILLS_SALES + SKILLS_HR + SKILLS_DESIGN)


ROLES_JD = [
    # IT
    "Frontend Developer", "Backend Developer", "Fullstack Developer",
    "Data Engineer", "ML Engineer", "AI Engineer",
    "DevOps Engineer", "Software Engineer", "Web Developer",
    "React Developer", "Python Developer", "Node.js Developer",
    # Marketing
    "Digital Marketing Executive", "Content Creator", "SEO Specialist",
    "Social Media Manager", "Marketing Manager",
    # Kế toán / Tài chính
    "Kế toán tổng hợp", "Kế toán thuế", "Kiểm toán viên",
    "Chuyên viên tài chính", "Kế toán trưởng",
    # Bán hàng
    "Sales Executive", "Account Manager", "Business Development",
    "Trưởng phòng kinh doanh", "Telesales",
    # HR
    "Chuyên viên tuyển dụng", "HR Manager", "C&B Specialist",
    "Training & Development", "HRBP",
    # Design
    "UI/UX Designer", "Graphic Designer", "Motion Designer",
    "Product Designer", "Brand Designer",
]

COMPANIES = [
    # Tech
    "FPT Software", "VNG Corporation", "Tiki", "Shopee Vietnam",
    "MoMo", "VinAI", "Grab Vietnam", "Google Vietnam",
    "Startup công nghệ", "Agency web", "Công ty fintech",
    # Non-tech
    "Unilever Vietnam", "Vinamilk", "Masan Group",
    "PwC Vietnam", "Deloitte Vietnam", "KPMG Vietnam",
    "Lazada Vietnam", "Sendo", "The Coffee House",
    "Công ty bảo hiểm", "Ngân hàng TMCP",
]

EXP_LEVELS = [
    (0, 1, "fresher", "sinh viên mới tốt nghiệp"),
    (1, 2, "junior", "1-2 năm kinh nghiệm"),
    (2, 4, "mid", "2-4 năm kinh nghiệm"),
    (4, 7, "senior", "4-7 năm kinh nghiệm"),
    (7, 15, "lead", "7+ năm kinh nghiệm"),
]

DEGREE = ["Kỹ sư CNTT", "Cử nhân CNTT", "Kỹ sư Phần mềm", "Cử nhân Khoa học Máy tính"]
UNIVERSITIES = [
    "Đại học Bách Khoa TP.HCM", "Đại học CNTT TP.HCM", "Đại học FPT",
    "Đại học Bình Dương", "Đại học Khoa học Tự nhiên", "Đại học Công nghệ",
]


# ─── Template generators ────────────────────────────────────────────────────

def gen_cv_chunk(role_skills: list[str], exp_years: int, extra_skills: list[str] = None) -> str:
    """Sinh đoạn CV text."""
    if extra_skills is None:
        extra_skills = []
    all_cv_skills = list(set(role_skills + extra_skills))
    random.shuffle(all_cv_skills)
    skill_str = ", ".join(all_cv_skills[:random.randint(4, 8)])

    company = random.choice(COMPANIES)
    degree = random.choice(DEGREE)
    uni = random.choice(UNIVERSITIES)

    templates = [
        f"Có {exp_years} năm kinh nghiệm làm việc với {skill_str}. "
        f"Từng làm việc tại {company}. Tốt nghiệp {degree} tại {uni}.",

        f"Lập trình viên với {exp_years} năm kinh nghiệm thực tế. "
        f"Thành thạo {skill_str}. "
        f"Đã triển khai nhiều dự án thực tế tại {company}.",

        f"Kỹ năng: {skill_str}. "
        f"Kinh nghiệm: {exp_years} năm tại các công ty công nghệ bao gồm {company}. "
        f"Trình độ: {degree}.",

        f"Sinh viên {uni} chuyên ngành CNTT. "
        f"Có {exp_years} năm kinh nghiệm thực tế với {skill_str}. "
        f"Đam mê phát triển phần mềm và xây dựng hệ thống.",
    ]
    return random.choice(templates)


def gen_jd_chunk(role: str, required_skills: list[str], exp_min: int, exp_max: int) -> str:
    """Sinh đoạn JD text."""
    skill_str = ", ".join(required_skills[:random.randint(3, 6)])
    exp_range = f"{exp_min}-{exp_max} năm" if exp_min > 0 else "Fresher hoặc dưới 1 năm"

    templates = [
        f"Tuyển dụng vị trí {role}. "
        f"Yêu cầu kinh nghiệm {exp_range}. "
        f"Kỹ năng bắt buộc: {skill_str}. "
        f"Ưu tiên ứng viên có kinh nghiệm thực tế tại môi trường Agile.",

        f"Chúng tôi cần {role} có {exp_range} kinh nghiệm. "
        f"Yêu cầu thành thạo {skill_str}. "
        f"Có khả năng làm việc độc lập và teamwork tốt.",

        f"Vị trí: {role} ({exp_range}). "
        f"Mô tả: Xây dựng và duy trì hệ thống sử dụng {skill_str}. "
        f"Yêu cầu: tư duy logic, chủ động, có trách nhiệm.",
    ]
    return random.choice(templates)


# ─── Sinh pairs ─────────────────────────────────────────────────────────────

def generate_pairs(n_positive: int = 1500, n_negative: int = 1500) -> list[dict]:
    """
    Sinh dataset 10 ngành:
    - positive pairs: CV và JD cùng ngành → label=1
    - negative pairs: CV và JD khác ngành hoàn toàn → label=0
    """
    pairs = []

    # ── Positive pairs — 10 ngành ─────────────────────────────────
    skill_groups = {
        "frontend":   SKILLS_FRONTEND,
        "backend":    SKILLS_BACKEND,
        "data":       SKILLS_DATA,
        "devops":     SKILLS_DEVOPS,
        "ai":         SKILLS_AI,
        "marketing":  SKILLS_MARKETING,
        "accounting": SKILLS_ACCOUNTING,
        "sales":      SKILLS_SALES,
        "hr":         SKILLS_HR,
        "design":     SKILLS_DESIGN,
    }
    roles_by_group = {
        "frontend":   ["Frontend Developer", "React Developer", "Web Developer"],
        "backend":    ["Backend Developer", "Node.js Developer", "Python Developer"],
        "data":       ["Data Engineer", "Database Administrator"],
        "devops":     ["DevOps Engineer", "Cloud Engineer"],
        "ai":         ["ML Engineer", "AI Engineer", "Data Scientist"],
        "marketing":  ["Digital Marketing Executive", "SEO Specialist", "Social Media Manager"],
        "accounting": ["Kế toán tổng hợp", "Kế toán thuế", "Chuyên viên tài chính"],
        "sales":      ["Sales Executive", "Account Manager", "Business Development"],
        "hr":         ["Chuyên viên tuyển dụng", "HR Manager", "C&B Specialist"],
        "design":     ["UI/UX Designer", "Graphic Designer", "Product Designer"],
    }

    for _ in range(n_positive):
        group = random.choice(list(skill_groups.keys()))
        skills = skill_groups[group]
        role = random.choice(roles_by_group[group])
        exp_min, exp_max, level, _ = random.choice(EXP_LEVELS)
        exp_years = random.randint(max(exp_min, 0), exp_max)

        cv_skills = random.sample(skills, k=min(6, len(skills)))
        jd_skills = random.sample(skills, k=min(4, len(skills)))

        cv = gen_cv_chunk(cv_skills, exp_years)
        jd = gen_jd_chunk(role, jd_skills, exp_min, exp_max)

        pairs.append({
            "cv": cv, "jd": jd, "label": 1,
            "score": random.uniform(0.65, 0.98),
            "group": group, "level": level,
        })

    # ── Negative pairs — chắc chắn khác ngành ────────────────────
    group_list = list(skill_groups.keys())
    for _ in range(n_negative):
        g1, g2 = random.sample(group_list, 2)  # Chắc chắn khác nhau
        skills1 = skill_groups[g1]
        skills2 = skill_groups[g2]
        role2 = random.choice(roles_by_group[g2])

        exp_min1, exp_max1, level1, _ = random.choice(EXP_LEVELS)
        exp_min2, exp_max2, level2, _ = random.choice(EXP_LEVELS)
        exp_years1 = random.randint(max(exp_min1, 0), exp_max1)

        cv_skills = random.sample(skills1, k=min(5, len(skills1)))
        jd_skills = random.sample(skills2, k=min(4, len(skills2)))

        cv = gen_cv_chunk(cv_skills, exp_years1)
        jd = gen_jd_chunk(role2, jd_skills, exp_min2, exp_max2)

        pairs.append({
            "cv": cv,
            "jd": jd,
            "label": 0,
            "score": random.uniform(0.05, 0.35),  # Điểm similarity thấp
            "group": f"{g1}_vs_{g2}",
            "level": f"{level1}_vs_{level2}",
        })

    random.shuffle(pairs)
    return pairs


# ─── Main ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    out_dir = Path(__file__).parent.parent / "data" / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Dang sinh du lieu training...")
    pairs = generate_pairs(n_positive=1500, n_negative=1500)

    out_path = out_dir / "embedding_pairs.json"
    out_path.write_text(
        json.dumps(pairs, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    pos = sum(1 for p in pairs if p["label"] == 1)
    neg = sum(1 for p in pairs if p["label"] == 0)
    print(f"[OK] Da tao {len(pairs)} cap:")
    print(f"     Positive (lien quan) : {pos}")
    print(f"     Negative (khong lien quan): {neg}")
    print(f"[SAVED] {out_path}")

    # Preview 3 mau
    print("\n--- PREVIEW ---")
    for i, p in enumerate(pairs[:3]):
        print(f"\n[{i+1}] Label={p['label']} | Score={p['score']:.2f} | Group={p['group']}")
        print(f"  CV : {p['cv'][:100]}...")
        print(f"  JD : {p['jd'][:100]}...")
