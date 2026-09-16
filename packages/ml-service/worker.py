"""
CareerFit Worker — Chạy trên máy local để xử lý AI jobs từ Supabase
====================================================================
Cách chạy:
  1. Đặt SUPABASE_URL và SUPABASE_KEY vào file .env.worker (xem .env.worker.example)
  2. python worker.py

Worker tự poll Supabase mỗi 5 giây, lấy job pending → M1+M2+M3 → lưu kết quả
"""
import os, time, json, logging, base64, tempfile, traceback
from pathlib import Path
from dotenv import load_dotenv
import industry_lookup

# Load env từ file .env.worker (cùng thư mục với worker.py)
load_dotenv(Path(__file__).parent / ".env.worker")

import os as _os
_os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("worker")

# ─── Cấu hình ────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")   # dùng anon key (RLS đã mở)
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "5"))  # giây

BASE_DIR     = Path(__file__).parent
M1_PATH      = BASE_DIR / "models" / "m1_ner" / "final"
M2_PATH      = BASE_DIR / "models" / "m2_embedding_full" / "final"
M3_PATH      = BASE_DIR / "models" / "m3_xgboost" / "xgboost_scorer.pkl"

# ─── Load Models (một lần khi khởi động) ────────────────────────────────────

log.info("🔧 Đang load models vào RAM...")

# M1 — NER PhoBERT
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
m1_tokenizer = AutoTokenizer.from_pretrained(str(M1_PATH))
m1_model     = AutoModelForTokenClassification.from_pretrained(str(M1_PATH))
m1_ner       = pipeline("ner", model=m1_model, tokenizer=m1_tokenizer,
                         aggregation_strategy="simple", device=-1)
log.info("  ✅ M1 NER loaded")

# M2 — Sentence Embedding
from sentence_transformers import SentenceTransformer, util
m2_model = SentenceTransformer(str(M2_PATH))
log.info("  ✅ M2 Embedding loaded")

# M3 — XGBoost Scorer
import pickle, numpy as np
with open(M3_PATH, "rb") as f:
    _m3_data = pickle.load(f)
m3_model = _m3_data["model"]
m3_keys  = _m3_data["feature_keys"]  # thu tu feature luc train - PHAI dung dung thu tu nay khi predict
log.info(f"  ok M3 XGBoost loaded (features: {m3_keys})")

# OCR — EasyOCR (khởi tạo 1 lần)
import easyocr
ocr_reader = easyocr.Reader(['vi', 'en'], gpu=False)
log.info("  ✅ EasyOCR loaded")

log.info("✅ Tất cả models sẵn sàng!\n")

# ─── Hàm trích xuất CV text từ PDF ──────────────────────────────────────────

def extract_text_from_pdf_b64(b64_str: str) -> str:
    """Decode base64 PDF → extract text bằng pdfplumber."""
    try:
        import pdfplumber
        pdf_bytes = base64.b64decode(b64_str)
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name
        with pdfplumber.open(tmp_path) as pdf:
            text = "\n".join(p.extract_text() or "" for p in pdf.pages)
        os.unlink(tmp_path)
        return text.strip()
    except Exception as e:
        log.warning(f"PDF extract error: {e}")
        return ""

def detect_file_type(b64_str: str) -> str:
    """Xác định loại file dựa trên magic bytes của base64 string."""
    try:
        header = base64.b64decode(b64_str[:24])  # 24 chia hết cho 4 → decode an toàn, đủ ~18 byte để check magic bytes
        if header.startswith(b"%PDF"):
            return "pdf"
        elif header.startswith(b"\xff\xd8"):
            return "jpg"
        elif header.startswith(b"\x89PNG"):
            return "png"
    except Exception:
        pass
    return "unknown"

def extract_text_from_image_b64(b64_str: str) -> str:
    """Decode base64 Image → extract text bằng EasyOCR."""
    try:
        img_bytes = base64.b64decode(b64_str)
        results = ocr_reader.readtext(img_bytes, detail=0)
        return "\n".join(results)
    except Exception as e:
        log.warning(f"Lỗi khi trích xuất text từ ảnh bằng OCR: {e}")
        return ""

# Keyword fallback đa ngành — luôn tìm được skill dù NER thất bại
# ~25 từ/ngành, 11 ngành — cân bằng với SKILLS_BY_INDUSTRY trong generate_ner_data.py
ALL_DOMAIN_KEYWORDS = [
    # IT
    "react", "reactjs", "typescript", "javascript", "next.js", "nextjs", "vue",
    "angular", "html", "css", "tailwind", "redux", "graphql", "webpack", "vite",
    "python", "java", "node.js", "nodejs", "fastapi", "django", "flask", "spring",
    "express", "nestjs", "laravel", "php", "golang", "rust", "c++", "c#",
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
    "docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "jenkins", "terraform",
    "flutter", "react native", "kotlin", "swift", "machine learning", "deep learning",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "git", "rest api",
    "microservices", "agile", "scrum", "linux", "nginx", "figma",
    # Marketing
    "seo", "google ads", "facebook ads", "tiktok ads", "content marketing",
    "email marketing", "google analytics", "canva", "copywriting",
    "social media marketing", "influencer marketing", "brand management",
    "media planning", "market research", "a/b testing", "hubspot",
    "mailchimp", "youtube ads", "affiliate marketing", "landing page",
    "kpi marketing", "adobe premiere", "digital marketing", "pr",
    # Kế toán / Tài chính
    "misa", "sap", "excel", "kế toán tổng hợp", "báo cáo tài chính",
    "kế toán thuế", "kiểm toán", "phân tích tài chính", "lập ngân sách",
    "ifrs", "vas", "kế toán kho", "kế toán công nợ", "kế toán lương",
    "hóa đơn điện tử", "quyết toán thuế", "oracle finance", "quickbooks",
    "tài chính doanh nghiệp", "dòng tiền", "kế toán ngân hàng",
    "balance sheet", "p&l", "định giá tài sản",
    # Nhân sự / HR
    "tuyển dụng", "c&b", "onboarding", "hris", "đào tạo phát triển",
    "lương thưởng", "kpi", "okr", "đánh giá hiệu suất", "phúc lợi nhân viên",
    "quan hệ lao động", "hợp đồng lao động", "headhunting", "linkedin recruiter",
    "bhxh", "talent management", "hr analytics", "employee engagement",
    "succession planning", "job description", "quản trị nhân sự",
    # Kinh doanh / Sales
    "b2b sales", "đàm phán hợp đồng", "quản lý kênh phân phối",
    "salesforce", "pipeline sales", "cold calling", "telesales",
    "account management", "business development", "proposal", "báo giá",
    "hợp đồng thương mại", "upselling", "cross-selling", "b2c sales",
    "retail sales", "quản lý đại lý", "crm", "target doanh số",
    # Thiết kế
    "adobe xd", "photoshop", "illustrator", "indesign",
    "ui/ux", "wireframing", "prototyping", "user research", "typography",
    "brand identity", "visual design", "motion graphics", "after effects",
    "logo design", "packaging design", "web design", "design system",
    "color theory", "sketch", "zeplin", "framer",
    # Logistics / Xuất nhập khẩu
    "xuất nhập khẩu", "hải quan", "incoterms", "vận tải biển", "vận tải hàng không",
    "quản lý kho", "wms", "customs clearance", "bill of lading",
    "freight forwarding", "supply chain", "procurement",
    "last mile delivery", "3pl", "sap mm", "quản lý nhà cung cấp",
    "transport management", "logistics planning", "erp logistics",
    # Kỹ thuật / Xây dựng
    "autocad", "revit", "solidworks", "matlab", "plc", "scada",
    "dự toán công trình", "thiết kế kết cấu", "cơ khí chế tạo",
    "điện công nghiệp", "hệ thống hvac", "an toàn lao động",
    "iso 14001", "qa/qc", "hàn", "bim", "thi công",
    "giám sát công trình", "kỹ thuật điện", "kỹ thuật cơ khí", "mep",
    # Y tế
    "dược lâm sàng", "điều dưỡng", "chẩn đoán hình ảnh", "y học cổ truyền",
    "xét nghiệm y khoa", "gmp", "gdp", "dược phẩm",
    "quản lý phòng khám", "vật lý trị liệu", "emr", "quản lý bệnh viện",
    "kiểm soát nhiễm khuẩn", "nghiên cứu lâm sàng", "dược điển",
    "y học dự phòng", "tư vấn dinh dưỡng", "chăm sóc bệnh nhân",
    # Giáo dục
    "giáo án", "quản lý lớp học", "phương pháp giảng dạy", "chương trình học",
    "e-learning", "lms", "moodle", "google classroom", "thiết kế khóa học",
    "đào tạo doanh nghiệp", "huấn luyện viên", "mentor",
    "kỹ năng mềm", "stem", "ielts teaching", "blended learning",
    # Nhà hàng / Khách sạn
    "quản lý nhà hàng", "phục vụ bàn", "quản lý khách sạn", "lễ tân",
    "housekeeping", "f&b", "bartending", "barista", "quản lý bếp",
    "pms hotel", "tour guide", "event management",
    "revenue management", "ota", "du lịch lữ hành",
    "hội nghị hội thảo", "nghiệp vụ lưu trú", "vệ sinh an toàn thực phẩm",
]

def keyword_extract_skills(text: str, domain_keywords: list | None = None) -> list:
    """Keyword fallback. Dùng domain_keywords nếu có, ngược lại dùng ALL_DOMAIN_KEYWORDS."""
    pool = domain_keywords if domain_keywords is not None else ALL_DOMAIN_KEYWORDS
    text_lower = text.lower()
    return [kw for kw in pool if kw in text_lower]

def extract_skills(text: str, domain_keywords: list | None = None) -> list[str]:
    """M1 NER + keyword fallback để đảm bảo luôn lấy được skill.

    Args:
        text: CV hoặc JD text
        domain_keywords: danh sách keyword đặc thù ngành từ industry_lookup.
            Nếu None → fallback về ALL_DOMAIN_KEYWORDS (hành vi cũ).
    """
    if not text.strip():
        return []
    import unicodedata
    text = unicodedata.normalize("NFC", text)
    # NER
    ner_skills = []
    try:
        entities = m1_ner(text[:3000])
        ner_skills = list({e["word"].replace("##","").replace("@@","").strip()
                           for e in entities
                           if e.get("entity_group") in ("SKILL", "B-SKILL", "I-SKILL")
                           and len(e["word"].strip()) > 1})
    except Exception:
        pass
    # Keyword fallback — industry-aware nếu có, ngược lại dùng ALL_DOMAIN_KEYWORDS
    kw_skills = keyword_extract_skills(text, domain_keywords)
    return list(set(ner_skills) | set(kw_skills))

def compute_similarity(text_a: str, text_b: str) -> float:
    """M2: tính cosine similarity giữa 2 đoạn text đầy đủ."""
    try:
        emb_a = m2_model.encode(text_a[:800], convert_to_tensor=True)
        emb_b = m2_model.encode(text_b[:800], convert_to_tensor=True)
        return float(util.cos_sim(emb_a, emb_b)[0][0])
    except Exception:
        return 0.0

def compute_score(features: dict, similarity: float) -> float:
    """M3: tinh diem tong the.

    QUAN TRONG: model M3 duoc train (xem scripts/train_m3_xgboost.py) voi dung 11 feature
    theo thu tu luu trong m3_keys. Neu build sai so luong/thu tu feature, XGBoost se raise
    loi shape-mismatch va bi nuot boi except o duoi -> diem luon roi ve similarity*100,
    bo qua hoan toan skill/kinh nghiem. Day chinh la loi cu da fix o day.
    """
    try:
        x = np.array([[features[k] for k in m3_keys]])
        return float(m3_model.predict(x)[0])
    except Exception as e:
        log.warning(f"M3 predict loi, fallback ve similarity*100: {e}")
        return similarity * 100

def extract_exp_years(text: str) -> float:
    """Trích xuất số năm kinh nghiệm từ CV."""
    import re
    patterns = [r"(\d+)\s*(?:\+?\s*)?(?:năm|years?)\s*(?:kinh nghiệm|experience)",
                r"(?:kinh nghiệm|experience)[:\s]+(\d+)\s*(?:năm|years?)"]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return float(m.group(1))
    return 0.0

def extract_exp_range_from_jd(jd_text: str) -> tuple[float, float]:
    """Trich xuat khoang so nam kinh nghiem yeu cau tu JD -> (jd_exp_min, jd_exp_max).

    Model M3 train tren 2 feature rieng jd_exp_min / jd_exp_max (khong phai 1 so duy nhat),
    nen ham nay phai tra ve ca khoang, khong chi 1 gia tri nhu ban cu.
    """
    import re
    m = re.search(r"(\d+)\s*[-–]\s*(\d+)\s*(?:năm|years?)", jd_text, re.IGNORECASE)
    if m:
        return float(m.group(1)), float(m.group(2))
    m = re.search(r"(\d+)\+?\s*năm\s*(?:trở lên|trở đi)", jd_text, re.IGNORECASE)
    if m:
        y = float(m.group(1))
        return y, y + 5
    m = re.search(r"(?:ít nhất|tối thiểu|minimum|at least)[^\d]*(\d+)\s*(?:năm|years?)", jd_text, re.IGNORECASE)
    if m:
        y = float(m.group(1))
        return y, y + 3
    m = re.search(r"(\d+)\+?\s*(?:năm|years?)\s*(?:kinh nghiệm|experience)", jd_text, re.IGNORECASE)
    if m:
        y = float(m.group(1))
        return y, y + 3
    return 2.0, 5.0

def analyze(cv_text: str, jd_text: str, job_title: str,
            domain_keywords: list | None = None) -> dict:
    """Chay toan bo pipeline M1->M2->M3 va tra ve ket qua.

    Args:
        domain_keywords: keyword đặc thù ngành (từ industry_lookup).
            None → dùng ALL_DOMAIN_KEYWORDS (tương thích ngược).
    """
    # Trich xuat skills (industry-aware nếu có domain_keywords)
    cv_skills  = set(extract_skills(cv_text, domain_keywords))
    jd_skills  = set(extract_skills(jd_text, domain_keywords))

    # Overlap
    matched = list(cv_skills & jd_skills)
    missing = list(jd_skills - cv_skills)
    skill_overlap_count = len(matched)
    skill_ratio          = skill_overlap_count / max(len(jd_skills), 1)

    # Kinh nghiem
    cv_exp = extract_exp_years(cv_text)
    jd_exp_min, jd_exp_max = extract_exp_range_from_jd(jd_text)
    req_exp = jd_exp_min  # giu lai ten cu cho phan build strengths/gaps/questions phia duoi
    exp_ok  = 1 if jd_exp_min <= cv_exp <= jd_exp_max + 2 else 0
    exp_gap = max(0.0, jd_exp_min - cv_exp)
    exp_ratio = min(cv_exp / max(jd_exp_min, 1), 2.0)

    # M2 similarity
    similarity = compute_similarity(cv_text[:512], jd_text[:512])

    # M3 score (0-100) - feature vector day du 11 chieu, dung thu tu luc train
    features = {
        "skill_overlap_count": skill_overlap_count,
        "skill_ratio": skill_ratio,
        "jd_skill_count": len(jd_skills),
        "cv_skill_count": len(cv_skills),
        "cv_exp_years": cv_exp,
        "jd_exp_min": jd_exp_min,
        "jd_exp_max": jd_exp_max,
        "exp_ok": exp_ok,
        "exp_gap": exp_gap,
        "exp_ratio": exp_ratio,
        "m2_similarity": similarity,
    }
    raw_score = compute_score(features, similarity)
    score = max(0.0, min(100.0, raw_score))

    # Build strengths / gaps / questions
    strengths = []
    if matched:
        strengths.append({
            "title": f"{len(matched)} kỹ năng phù hợp với JD",
            "desc": "Bao gồm: " + ", ".join(matched[:5]) + (f" và {len(matched)-5} kỹ năng khác." if len(matched) > 5 else "."),
        })
    if similarity >= 0.5:
        strengths.append({
            "title": "Hồ sơ phù hợp về ngữ nghĩa",
            "desc": f"Chỉ số tương đồng ngữ nghĩa đạt {similarity*100:.0f}% — CV và JD cùng ngữ cảnh ngành.",
        })
    if cv_exp > 0 and exp_ok:
        strengths.append({
            "title": f"Kinh nghiệm {cv_exp:.0f} năm đáp ứng yêu cầu",
            "desc": f"JD yêu cầu {req_exp:.0f} năm — ứng viên đã vượt yêu cầu.",
        })

    gaps = []
    if missing:
        gaps.append({
            "title": f"Thiếu {len(missing)} kỹ năng quan trọng trong JD",
            "desc": "Cần bổ sung: " + ", ".join(missing[:5]) + (f" và {len(missing)-5} kỹ năng khác." if len(missing) > 5 else "."),
        })
    if exp_gap > 0:
        gaps.append({
            "title": f"Khoảng cách kinh nghiệm {exp_gap:.0f} năm",
            "desc": f"JD yêu cầu {req_exp:.0f} năm, CV thể hiện {cv_exp:.0f} năm kinh nghiệm.",
        })
    if similarity < 0.4:
        gaps.append({
            "title": "Ngôn ngữ CV chưa bám sát JD",
            "desc": "Nên điều chỉnh từ ngữ CV để gần hơn với yêu cầu vị trí.",
        })

    questions = []
    if missing:
        questions.append({
            "id": "01",
            "category": "Xác minh kỹ năng còn thiếu",
            "categoryColor": "bg-[#dce1ff] text-[#001551]",
            "badgeBg": "bg-[#1d4ed8]",
            "duration": "15 phút",
            "weight": "40%",
            "weightColor": "text-[#0037b0]",
            "question": f'"Vị trí {job_title} yêu cầu {", ".join(missing[:3])}. Bạn có kinh nghiệm thực tế với các công nghệ này không? Hãy mô tả dự án cụ thể."',
            "expected": [
                "Ứng viên có thể mô tả dự án thực tế liên quan.",
                "Thể hiện khả năng tự học và tiếp thu công nghệ mới.",
            ],
            "redFlags": [
                "Chỉ biết lý thuyết, không có project thực tế.",
                "Không thể giải thích cơ chế hoạt động cơ bản.",
            ],
        })
    if matched:
        questions.append({
            "id": "02",
            "category": "Đào sâu kỹ năng thế mạnh",
            "categoryColor": "bg-[#85f8c4] text-[#002114]",
            "badgeBg": "bg-[#004f35]",
            "duration": "20 phút",
            "weight": "35%",
            "weightColor": "text-[#004f35]",
            "question": f'"Bạn đã dùng {", ".join(matched[:2])} trong môi trường production như thế nào? Kết quả đo lường được là gì?"',
            "expected": [
                "Nêu được metrics cụ thể (tốc độ, scale, uptime...).",
                "Hiểu được trade-off của giải pháp đã chọn.",
            ],
            "redFlags": [
                "Không nhớ kết quả cụ thể.",
                "Chỉ dùng ở side project nhỏ.",
            ],
        })

    return {
        "score": round(score, 1),
        "similarity": round(similarity, 3),
        "matched_skills": matched,
        "missing_skills": missing,
        "cv_exp_years": cv_exp,
        "job_title": job_title,
        "strengths": strengths or [{"title": "Đang phân tích...", "desc": "Cần thêm thông tin trong CV."}],
        "gaps": gaps or [{"title": "Không phát hiện khoảng trống rõ ràng", "desc": "CV khá phù hợp với JD."}],
        "questions": questions,
        "features": features,
    }

# ─── Main Loop ───────────────────────────────────────────────────────────────

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("❌ Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong .env.worker!")
        log.error("   Tạo file .env.worker từ .env.worker.example rồi chạy lại.")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info(f"🚀 Worker khởi động! Poll mỗi {POLL_INTERVAL}s")
    log.info(f"   Supabase: {SUPABASE_URL[:40]}...")

    # Khởi tạo industry cache — dùng đúng supabase client này
    industry_lookup.init_cache(supabase)
    log.info("   Industry cache đã load xong.\n")

    while True:
        try:
            # Lấy 1 job pending cũ nhất — bao gồm cả industry_id (có thể NULL)
            resp = (
                supabase.table("analysis_jobs")
                .select("id, cv_text, cv_b64, cv_filename, jd_text, job_title, industry_id")
                .eq("status", "pending")
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )

            jobs = resp.data or []
            if not jobs:
                print(".", end="", flush=True)
                time.sleep(POLL_INTERVAL)
                continue

            job = jobs[0]
            job_id = job["id"]
            print()  # newline sau các dấu chấm polling
            log.info(f"🔔 Job mới: {job_id[:8]}... | Vị trí: {job.get('job_title','?')}")

            # Đánh dấu đang xử lý
            supabase.table("analysis_jobs").update({"status": "processing"}).eq("id", job_id).execute()

            # Lấy CV text
            cv_text = job.get("cv_text") or ""
            if not cv_text and job.get("cv_b64"):
                file_type = detect_file_type(job["cv_b64"])
                if file_type == "pdf":
                    log.info("  📄 Đang extract text từ PDF...")
                    cv_text = extract_text_from_pdf_b64(job["cv_b64"])
                    log.info(f"  ✅ Extracted {len(cv_text)} ký tự từ PDF")
                elif file_type in ("jpg", "png"):
                    log.info("  🖼️ Đang OCR ảnh CV...")
                    cv_text = extract_text_from_image_b64(job["cv_b64"])
                    log.info(f"  ✅ OCR được {len(cv_text)} ký tự từ ảnh")
                else:
                    log.warning("  ⚠️ File type không xác định, bỏ qua extract")
                    cv_text = ""

            # ── Industry-aware: tự detect ngành nếu job.industry_id == NULL ──
            jd_text   = job.get("jd_text", "")
            job_title = job.get("job_title", "Vị trí không xác định")
            industry_id = job.get("industry_id")  # có thể None

            domain_keywords: list | None = None  # None = dùng ALL_DOMAIN_KEYWORDS cũ

            if industry_id is None:
                detect = industry_lookup.detect_industry(job_title, jd_text)
                if detect is not None:
                    industry_id = industry_lookup.resolve_best_industry_id(detect)
                    # UPDATE lại DB để lưu kết quả đoán (trace + UI dùng sau)
                    if industry_id:
                        try:
                            supabase.table("analysis_jobs").update(
                                {"industry_id": industry_id}
                            ).eq("id", job_id).execute()
                            log.info(f"  🏭 Auto-detect ngành: {detect['nhom_lon']} "
                                     f"→ {detect['nhanh_nho']} "
                                     f"(slug={detect.get('branch_slug') or detect['group_slug']})")
                        except Exception as e:
                            log.warning(f"  ⚠️  Không UPDATE industry_id được: {e}")
                else:
                    log.info("  🏭 Auto-detect ngành: không match — dùng ALL_DOMAIN_KEYWORDS")

            # Lấy bộ skill đúng ngành (hoặc rỗng nếu không detect được)
            if industry_id is not None:
                skills_dict = industry_lookup.get_skills_for_industry(industry_id)
                hard_kws = skills_dict["hard"]
                soft_kws = skills_dict["soft"]
                if hard_kws:
                    # Gộp hard + soft → domain_keywords cho extract_skills
                    domain_keywords = list(set(hard_kws + soft_kws))
                    log.info(f"  📚 Industry skills: {len(hard_kws)} hard + "
                             f"{len(soft_kws)} soft = {len(domain_keywords)} keywords")
                else:
                    # Branch/group không có skill trong DB → fallback
                    log.info("  📚 Không có skill trong DB cho ngành này — dùng ALL_DOMAIN_KEYWORDS")
                    domain_keywords = None

            # Chạy AI pipeline — truyền domain_keywords (None = hành vi cũ)
            log.info("  🤖 Đang phân tích M1 → M2 → M3...")
            result = analyze(
                cv_text=cv_text,
                jd_text=jd_text,
                job_title=job_title,
                domain_keywords=domain_keywords,
            )

            # Ghi thêm industry metadata vào result để FE có thể hiển thị
            result["detected_industry"] = (
                {"group_slug": detect.get("group_slug"),
                 "branch_slug": detect.get("branch_slug"),
                 "nhom_lon": detect.get("nhom_lon"),
                 "nhanh_nho": detect.get("nhanh_nho")}
                if industry_id and 'detect' in dir() and detect
                else None
            )

            # Lưu kết quả
            supabase.table("analysis_jobs").update({
                "status": "done",
                "result": result,
            }).eq("id", job_id).execute()

            log.info(f"  ✅ Xong! Điểm: {result['score']}/100 | "
                     f"Khớp: {len(result['matched_skills'])} kỹ năng | "
                     f"Thiếu: {len(result['missing_skills'])} kỹ năng\n")

        except KeyboardInterrupt:
            log.info("\n⏹ Worker dừng lại.")
            break
        except Exception:
            log.error(f"Lỗi không mong đợi:\n{traceback.format_exc()}")
            if "job_id" in dir() and job_id:
                try:
                    supabase.table("analysis_jobs").update({
                        "status": "error",
                        "error_msg": traceback.format_exc()[-300:],
                    }).eq("id", job_id).execute()
                except Exception:
                    pass
            time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
