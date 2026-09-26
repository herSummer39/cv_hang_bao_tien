"""
CareerFit Worker — Chạy trên máy local để xử lý AI jobs từ Supabase
====================================================================
Cách chạy:
  1. Đặt SUPABASE_URL và SUPABASE_KEY vào file .env.worker (xem .env.worker.example)
  2. python worker.py

Worker tự poll Supabase mỗi 5 giây, lấy job pending → M1+M2+M3 → lưu kết quả
"""
import os, sys, time, json, logging, base64, tempfile, traceback
from pathlib import Path
from dotenv import load_dotenv
import industry_lookup
import interview_tts
import interview_asr

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

# Kiểm tra thư mục models trước khi load
missing_models = [str(p) for p in [M1_PATH, M2_PATH, M3_PATH] if not p.exists()]
if missing_models:
    log.error("❌ Không tìm thấy thư mục/file models:")
    for m in missing_models:
        log.error(f"   • {m}")
    log.error("👉 Bạn cần kéo models về máy từ DVC bằng lệnh:")
    log.error("   dvc pull packages/ml-service/models.dvc")
    log.error("   (hoặc copy thư mục models/ từ thành viên trong team)\n")
    sys.exit(1)

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

# OCR — EasyOCR (khởi tạo 1 lần nếu có)
ocr_reader = None
try:
    import easyocr
    ocr_reader = easyocr.Reader(['vi', 'en'], gpu=False)
    log.info("  ✅ EasyOCR loaded")
except Exception as e:
    log.warning(f"  ⚠️ EasyOCR chưa sẵn sàng ({e}). Xử lý ảnh OCR tạm thời bị tắt.")

log.info("✅ Tất cả models cốt lõi sẵn sàng!\n")

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

def extract_text_from_docx_b64(b64_str: str) -> str:
    """Decode base64 DOCX → extract text bằng python-docx (đoạn văn + bảng)."""
    try:
        from docx import Document
        docx_bytes = base64.b64decode(b64_str)
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            tmp.write(docx_bytes)
            tmp_path = tmp.name
        doc = Document(tmp_path)
        parts = [p.text for p in doc.paragraphs if p.text.strip()]
        # Nhiều CV dùng bảng (table) để dàn layout — phải quét luôn, không chỉ paragraph
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        parts.append(cell.text)
        os.unlink(tmp_path)
        return "\n".join(parts).strip()
    except Exception as e:
        log.warning(f"DOCX extract error: {e}")
        return ""

def detect_file_type(b64_str: str, filename: str | None = None) -> str:
    """Xác định loại file — ưu tiên phần mở rộng của tên file (đáng tin cậy hơn),
    fallback về magic bytes của base64 string nếu không có/không nhận ra tên file."""
    if filename and "." in filename:
        ext = filename.lower().rsplit(".", 1)[-1]
        if ext == "pdf":
            return "pdf"
        if ext == "docx":
            return "docx"
        if ext in ("jpg", "jpeg"):
            return "jpg"
        if ext == "png":
            return "png"
    try:
        header = base64.b64decode(b64_str[:24])  # 24 chia hết cho 4 → decode an toàn, đủ ~18 byte để check magic bytes
        if header.startswith(b"%PDF"):
            return "pdf"
        elif header.startswith(b"\xff\xd8"):
            return "jpg"
        elif header.startswith(b"\x89PNG"):
            return "png"
        elif header.startswith(b"PK\x03\x04"):
            # DOCX (và các file Office khác) là zip — an toàn vì frontend chỉ nhận .pdf/.docx/ảnh
            return "docx"
    except Exception:
        pass
    return "unknown"

def extract_text_from_image_b64(b64_str: str) -> str:
    """Decode base64 Image → extract text bằng EasyOCR."""
    if not ocr_reader:
        log.warning("EasyOCR không khả dụng, bỏ qua trích xuất text từ ảnh.")
        return ""
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

import re as _re
from functools import lru_cache as _lru_cache

@_lru_cache(maxsize=None)
def _keyword_pattern(word: str) -> "_re.Pattern":
    """Compile 1 lần/từ: match theo RANH GIỚI TỪ, không phải chuỗi con thô.

    Trước đây dùng `kw in text_lower` nên "java" khớp nhầm vào "javascript",
    "sql" khớp nhầm vào "mysql"/"postgresql" — làm sai lệch matched/missing
    skills (và cả câu hỏi phỏng vấn trích từ đó). Nếu ký tự đầu/cuối từ đã
    không phải chữ/số (VD "c++", "c#", "ci/cd") thì tự nó đã có ranh giới rồi,
    không cần thêm \b nhân tạo ở phía đó.
    """
    escaped = _re.escape(word)
    left = r"(?<!\w)" if word[0].isalnum() else ""
    right = r"(?!\w)" if word[-1].isalnum() else ""
    return _re.compile(left + escaped + right, _re.IGNORECASE | _re.UNICODE)

# Hư từ tiếng Việt + tiền tố khuôn mẫu hay gặp trong tên skill (VD "Kỹ năng chốt
# hợp đồng") — bỏ đi khi tách skill nhiều từ thành các từ có nghĩa, để không bắt
# buộc phải thấy "kỹ"/"năng" xuất hiện thì mới tính là khớp (2 từ này quá chung,
# gần như câu nào cũng có, sẽ làm sai mục đích so khớp).
_VN_STOPWORDS = {"và", "của", "cho", "về", "các", "những", "trong", "khi", "là",
                 "có", "được", "này", "đó", "với", "theo", "để", "một", "hay"}
_SKILL_FILLER_PREFIXES = ("kỹ năng ", "khả năng ", "năng lực ")

@_lru_cache(maxsize=None)
def _keyword_tokens(keyword: str) -> tuple:
    """Tách 1 skill/keyword nhiều từ thành các từ có nghĩa để so khớp mềm."""
    k = keyword.lower()
    for prefix in _SKILL_FILLER_PREFIXES:
        if k.startswith(prefix):
            k = k[len(prefix):]
            break
    return tuple(w for w in k.split() if w not in _VN_STOPWORDS and len(w) > 1)

_LINE_SPLIT_RE = _re.compile(r"[\n\r•●▪·\|]+|(?<=[.!?;])\s+")

@_lru_cache(maxsize=4)
def _split_lines(text: str) -> tuple:
    """Chia text thành từng dòng/câu ngắn — giới hạn phạm vi so khớp 'đủ từ,
    không cần liền nhau' trong CÙNG 1 dòng, tránh 2 từ của 1 skill nằm ở 2 chỗ
    hoàn toàn không liên quan bị tính nhầm là khớp."""
    return tuple(_LINE_SPLIT_RE.split(text))

def keyword_extract_skills(text: str, domain_keywords: list | None = None) -> list:
    """Keyword fallback. Dùng domain_keywords nếu có, ngược lại dùng ALL_DOMAIN_KEYWORDS.

    - Skill 1 từ có nghĩa (VD "java", "c++"): match ranh giới từ như cũ, chính xác.
    - Skill nhiều từ (VD "dự án chung cư"): KHÔNG còn đòi đúng nguyên cụm liền
      nhau — chỉ cần TẤT CẢ từ có nghĩa của skill đó cùng xuất hiện trong 1
      dòng/câu (không cần liền nhau, không cần đúng thứ tự). VD alias "dự án
      chung cư" vẫn khớp được câu "...các dự án CĂN HỘ chung cư..." dù bị chèn
      thêm 1 từ ở giữa — trước đây (so khớp nguyên cụm) sẽ bị bỏ sót.
    """
    pool = domain_keywords if domain_keywords is not None else ALL_DOMAIN_KEYWORDS
    found = []
    lines = None  # lazy — chỉ tách dòng khi thực sự có skill nhiều từ cần dùng
    for kw in pool:
        tokens = _keyword_tokens(kw)
        if len(tokens) <= 1:
            if _keyword_pattern(kw).search(text):
                found.append(kw)
            continue
        if lines is None:
            lines = _split_lines(text)
        patterns = [_keyword_pattern(t) for t in tokens]
        if any(all(p.search(line) for p in patterns) for line in lines):
            found.append(kw)
    return found

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
    """Trích xuất số năm kinh nghiệm từ CV.

    Ưu tiên câu nói rõ "X năm kinh nghiệm". Nhiều CV thật không viết câu này mà
    chỉ liệt kê lịch sử công việc theo mốc thời gian (VD "06/2021 - 03/2024",
    "2020 - hiện tại") — nên khi không tìm được câu nói rõ, suy ra số năm kinh
    nghiệm từ khoảng cách giữa năm sớm nhất và năm muộn nhất (hoặc năm hiện tại
    nếu CV có từ "hiện tại/hiện nay/present") xuất hiện trong text.
    """
    import re
    from datetime import datetime

    patterns = [r"(\d+)\s*(?:\+?\s*)?(?:năm|years?)\s*(?:kinh nghiệm|experience)",
                r"(?:kinh nghiệm|experience)[:\s]+(\d+)\s*(?:năm|years?)"]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return float(m.group(1))

    # Fallback: suy ra từ các mốc năm trong lịch sử công việc
    current_year = datetime.now().year
    years_found = [int(y) for y in re.findall(r"(?:19|20)\d{2}", text)
                   if 1990 <= int(y) <= current_year]
    if years_found:
        has_present = bool(re.search(r"hiện tại|hiện nay|present|now\b", text, re.IGNORECASE))
        earliest = min(years_found)
        latest = current_year if has_present else max(years_found)
        span = latest - earliest
        if 0 < span <= 40:
            return float(span)

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

def generate_cv_suggestions(missing: list, matched: list, exp_gap: float,
                            jd_exp_min: float, jd_exp_max: float, cv_exp: float,
                            similarity: float, job_title: str) -> list[dict]:
    """Gợi ý cải thiện CV để khớp JD hơn — HOÀN TOÀN rule-based, không dùng LLM.

    Áp dụng khung 3 bước (tham khảo ý tưởng từ dự án Resume-Matcher, tự viết lại
    bằng rule để không cần gọi model sinh văn bản):
      1) Tìm khoảng trống thật đã tính được ở analyze() (missing skills, gap kinh
         nghiệm, similarity thấp) — không tự suy diễn thêm khoảng trống nào khác.
      2) Diễn đạt lại thành hành động cụ thể (thêm ở đâu, viết thế nào), không chỉ
         liệt kê suông "bạn thiếu X" như phần `gaps` đang làm.
      3) KHÔNG BỊA: câu gợi ý luôn ở dạng điều kiện ("nếu bạn thực sự có kinh
         nghiệm với X") — không bao giờ khẳng định ứng viên đã có kỹ năng/kinh
         nghiệm nào mà CV chưa thể hiện.
    """
    suggestions = []

    # Bước 2: chèn từ khóa còn thiếu — tối đa 3 kỹ năng quan trọng nhất (giữ gọn UI)
    for skill in missing[:3]:
        suggestions.append({
            "type": "skill",
            "title": f'Bổ sung "{skill}" vào CV nếu bạn thực sự có kinh nghiệm',
            "desc": (f'Vị trí {job_title} yêu cầu "{skill}" nhưng CV hiện chưa thể hiện. '
                     f'Nếu bạn đã từng dùng qua, hãy thêm vào phần Kỹ năng VÀ mô tả cụ thể '
                     f'trong phần Kinh nghiệm (dự án nào, dùng để làm gì) — tránh chỉ liệt kê '
                     f'tên suông vì nhà tuyển dụng sẽ hỏi sâu ở buổi phỏng vấn. Nếu chưa có '
                     f'kinh nghiệm thật với kỹ năng này, không nên tự thêm vào CV.'),
        })

    # Gợi ý về khoảng cách kinh nghiệm
    if exp_gap > 0:
        suggestions.append({
            "type": "experience",
            "title": "Nhấn mạnh chiều sâu thay vì chỉ số năm kinh nghiệm",
            "desc": (f'JD yêu cầu {jd_exp_min:.0f}-{jd_exp_max:.0f} năm, CV bạn đang thể hiện '
                     f'{cv_exp:.0f} năm. Hãy làm rõ quy mô dự án, vai trò cụ thể và kết quả đo '
                     f'lường được (số liệu, % cải thiện, quy mô hệ thống...) trong phần Kinh '
                     f'nghiệm để bù lại phần thiếu về số năm — nhà tuyển dụng thường quan tâm '
                     f'chất lượng đóng góp hơn là con số năm thuần túy.'),
        })

    # Gợi ý về cách diễn đạt / từ khóa (dựa trên similarity M2 thấp)
    if similarity < 0.4:
        suggestions.append({
            "type": "phrasing",
            "title": "Dùng đúng từ khóa/thuật ngữ của JD",
            "desc": ('Ngôn ngữ CV hiện đang khác với cách JD diễn đạt. Hãy đối chiếu JD và '
                     'thay các từ đồng nghĩa trong CV bằng chính thuật ngữ JD sử dụng (VD JD '
                     'ghi "quản lý dự án" thì CV nên viết đúng cụm đó thay vì chỉ viết "điều '
                     'phối công việc") — giúp cả hệ thống lọc CV tự động và nhà tuyển dụng dễ '
                     'nhận ra sự phù hợp hơn.'),
        })

    # Không phát hiện khoảng trống nào đáng kể — vẫn cho 1 gợi ý mang tính xây dựng
    if not suggestions:
        suggestions.append({
            "type": "phrasing",
            "title": "CV đã khá bám sát JD",
            "desc": ('Không phát hiện khoảng trống lớn về từ khóa hay kinh nghiệm. Bạn có thể '
                     'tập trung làm nổi bật số liệu định lượng (kết quả cụ thể, quy mô) trong '
                     'phần Kinh nghiệm để tăng sức thuyết phục thêm nữa.'),
        })

    return suggestions

def analyze(cv_text: str, jd_text: str, job_title: str,
            domain_keywords: list | None = None,
            industry_display_name: str | None = None,
            industry_category: str | None = None) -> dict:
    """Chay toan bo pipeline M1->M2->M3 va tra ve ket qua.

    Args:
        domain_keywords: keyword đặc thù ngành (từ industry_lookup).
            None → dùng ALL_DOMAIN_KEYWORDS (tương thích ngược).
        industry_display_name: tên ngành đã detect (VD "Kế toán thuế"), dùng
            để câu hỏi phỏng vấn nêu rõ ngành thay vì chỉ job_title chung.
            None nếu không detect được ngành (giữ hành vi cũ).
        industry_category: 1 trong 7 nhóm rộng (xem industry_lookup.GROUP_CATEGORY),
            dùng để chọn cách diễn đạt câu hỏi phù hợp bối cảnh ngành (VD không
            dùng từ "production" cho ngành kế toán/bán hàng). None → dùng
            cách diễn đạt trung tính chung.
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

    # Gợi ý cải thiện CV — dùng lại đúng các tín hiệu thật vừa tính (missing/matched/
    # exp_gap/similarity), không tính lại/suy diễn thêm gì mới.
    cv_suggestions = generate_cv_suggestions(
        missing=missing, matched=matched, exp_gap=exp_gap,
        jd_exp_min=jd_exp_min, jd_exp_max=jd_exp_max, cv_exp=cv_exp,
        similarity=similarity, job_title=job_title,
    )

    # ── Bộ 5 câu hỏi phỏng vấn giả lập — LUÔN đủ 5 câu, mỗi câu bám vào 1 tín hiệu
    # THẬT đã tính toán ở trên (missing/matched skills, kinh nghiệm, similarity M2,
    # score M3, gap lớn nhất) — không có câu nào bị bỏ trống hay dùng nội dung
    # tự bịa; khi thiếu 1 loại tín hiệu (VD không có skill thiếu) thì dùng nhánh
    # else bám vào tín hiệu thật khác (VD tổng số skill JD yêu cầu) thay thế.
    total_jd_skills = len(jd_skills)

    questions = []

    # Câu 1 — kỹ năng còn thiếu (hoặc xác nhận năng lực nếu không thiếu gì)
    industry_suffix = f" (ngành {industry_display_name})" if industry_display_name else ""
    if missing:
        q1_category = "Xác minh kỹ năng còn thiếu"
        q1_question = f'"Vị trí {job_title}{industry_suffix} yêu cầu {", ".join(missing[:3])}. Bạn có kinh nghiệm thực tế với các yêu cầu này không? Hãy mô tả dự án/công việc cụ thể."'
        q1_expected = [
            "Ứng viên có thể mô tả dự án thực tế liên quan.",
            "Thể hiện khả năng tự học và tiếp thu công nghệ mới.",
        ]
        q1_red = [
            "Chỉ biết lý thuyết, không có project thực tế.",
            "Không thể giải thích cơ chế hoạt động cơ bản.",
        ]
    else:
        q1_category = "Xác nhận năng lực đáp ứng JD"
        q1_question = f'"CV của bạn đã thể hiện đủ {total_jd_skills} kỹ năng chính mà JD {job_title}{industry_suffix} yêu cầu. Trong số đó, kỹ năng nào bạn tự tin nhất và vì sao?"'
        q1_expected = [
            "Chọn được kỹ năng thực sự liên quan trọng tâm của JD.",
            "Giải thích lý do thuyết phục, có ví dụ cụ thể.",
        ]
        q1_red = [
            "Chọn kỹ năng không liên quan đến JD.",
            "Không đưa ra được ví dụ minh chứng.",
        ]
    questions.append({
        "id": "01",
        "category": q1_category,
        "categoryColor": "bg-[#dce1ff] text-[#001551]",
        "badgeBg": "bg-[#1d4ed8]",
        "duration": "3 phút",
        "weight": "20%",
        "weightColor": "text-[#0037b0]",
        "question": q1_question,
        "expected": q1_expected,
        "redFlags": q1_red,
    })

    # Câu 2 — đào sâu kỹ năng thế mạnh (hoặc kỹ năng tương đương nếu không match gì)
    _CATEGORY_CONTEXT_PHRASE = {
        "technical":  "trong môi trường production",
        "office":     "trong công việc thực tế tại doanh nghiệp",
        "sales":      "trong công việc bán hàng/tư vấn khách hàng thực tế",
        "service":    "khi phục vụ khách hàng thực tế",
        "healthcare": "trong công việc khám/điều trị thực tế",
        "education":  "trong giảng dạy/đào tạo thực tế",
        "labor":      "trong công việc thực tế tại hiện trường",
    }
    context_phrase = _CATEGORY_CONTEXT_PHRASE.get(industry_category, "trong công việc thực tế")
    if matched:
        q2_category = "Đào sâu kỹ năng thế mạnh"
        q2_question = f'"Bạn đã dùng {", ".join(matched[:2])} {context_phrase} như thế nào? Kết quả đo lường được là gì?"'
        q2_expected = [
            "Nêu được metrics cụ thể (tốc độ, scale, uptime...).",
            "Hiểu được trade-off của giải pháp đã chọn.",
        ]
        q2_red = [
            "Không nhớ kết quả cụ thể.",
            "Chỉ dùng ở side project nhỏ.",
        ]
    else:
        q2_category = "Kỹ năng tương đương / chuyển đổi"
        q2_question = f'"CV chưa thể hiện kỹ năng nào trùng khớp trực tiếp với {total_jd_skills} kỹ năng JD {job_title} yêu cầu. Bạn có kỹ năng tương đương hoặc gần nào có thể áp dụng cho vị trí này không?"'
        q2_expected = [
            "Nêu được kỹ năng tương đương có liên hệ hợp lý với JD.",
            "Thể hiện khả năng chuyển đổi/áp dụng kiến thức sang lĩnh vực mới.",
        ]
        q2_red = [
            "Không liên hệ được kỹ năng nào với JD.",
            "Chỉ nói chung, không cụ thể.",
        ]
    questions.append({
        "id": "02",
        "category": q2_category,
        "categoryColor": "bg-[#85f8c4] text-[#002114]",
        "badgeBg": "bg-[#004f35]",
        "duration": "3 phút",
        "weight": "20%",
        "weightColor": "text-[#004f35]",
        "question": q2_question,
        "expected": q2_expected,
        "redFlags": q2_red,
    })

    # Câu 3 — kinh nghiệm thực tế, bám vào cv_exp / jd_exp_min / jd_exp_max THẬT
    if exp_gap > 0:
        q3_question = f'"JD vị trí {job_title} yêu cầu {jd_exp_min:.0f}-{jd_exp_max:.0f} năm kinh nghiệm, CV của bạn thể hiện {cv_exp:.0f} năm. Bạn dự định bù đắp khoảng cách kinh nghiệm này như thế nào để đáp ứng vai trò?"'
        q3_expected = [
            "Có kế hoạch cụ thể (học thêm, làm dự án thực tế, mentor...).",
            "Nhận thức đúng về khoảng cách kinh nghiệm của bản thân.",
        ]
        q3_red = [
            "Không nhận ra khoảng cách kinh nghiệm.",
            "Kế hoạch mơ hồ, không khả thi.",
        ]
    elif cv_exp > jd_exp_max:
        q3_question = f'"Bạn có {cv_exp:.0f} năm kinh nghiệm, vượt mức {jd_exp_max:.0f} năm JD {job_title} yêu cầu. Kinh nghiệm dư ra đó đã giúp bạn xử lý tình huống khó nào trong công việc?"'
        q3_expected = [
            "Mô tả được tình huống thực tế, cụ thể.",
            "Thể hiện chiều sâu kinh nghiệm tương xứng với số năm nêu ra.",
        ]
        q3_red = [
            "Không kể được tình huống cụ thể.",
            "Kinh nghiệm nêu ra không tương xứng với số năm.",
        ]
    else:
        q3_question = f'"Với {cv_exp:.0f} năm kinh nghiệm phù hợp yêu cầu {jd_exp_min:.0f}-{jd_exp_max:.0f} năm của JD {job_title}, hãy mô tả dự án tiêu biểu nhất thể hiện năng lực của bạn."'
        q3_expected = [
            "Dự án mô tả đúng quy mô, vai trò rõ ràng.",
            "Có kết quả/đóng góp cụ thể.",
        ]
        q3_red = [
            "Không có dự án tiêu biểu cụ thể.",
            "Vai trò trong dự án không rõ ràng.",
        ]
    questions.append({
        "id": "03",
        "category": "Kinh nghiệm thực tế",
        "categoryColor": "bg-[#ffe8b8] text-[#5c3b00]",
        "badgeBg": "bg-[#8a5700]",
        "duration": "3 phút",
        "weight": "20%",
        "weightColor": "text-[#8a5700]",
        "question": q3_question,
        "expected": q3_expected,
        "redFlags": q3_red,
    })

    # Câu 4 — hiểu vai trò & mức độ phù hợp, bám vào similarity THẬT từ M2
    if similarity >= 0.5:
        q4_question = f'"Chỉ số phù hợp ngữ nghĩa giữa CV và JD của bạn đạt {similarity*100:.0f}%. Theo bạn, trách nhiệm chính của vị trí {job_title} là gì, và vì sao CV bạn thể hiện sự phù hợp đó?"'
        q4_expected = [
            "Nêu đúng trọng tâm trách nhiệm của vị trí.",
            "Liên hệ được với kinh nghiệm/kỹ năng thực tế trong CV.",
        ]
        q4_red = [
            "Trả lời chung, không liên hệ được với vị trí cụ thể.",
            "Không hiểu đúng trách nhiệm chính của vai trò.",
        ]
    else:
        q4_question = f'"Chỉ số phù hợp ngữ nghĩa giữa CV và JD vị trí {job_title} hiện chỉ đạt {similarity*100:.0f}%, khá thấp. Bạn nghĩ vì sao CV chưa thể hiện rõ sự phù hợp, và sẽ điều chỉnh nội dung CV như thế nào?"'
        q4_expected = [
            "Nhận diện đúng nguyên nhân (thiếu từ khoá, kinh nghiệm chưa liên quan...).",
            "Đưa ra hướng điều chỉnh CV cụ thể, khả thi.",
        ]
        q4_red = [
            "Không nhận ra vấn đề của CV.",
            "Đổ lỗi hoàn toàn cho JD/nhà tuyển dụng.",
        ]
    questions.append({
        "id": "04",
        "category": "Hiểu vai trò & mức độ phù hợp",
        "categoryColor": "bg-[#e9ddff] text-[#2c0a63]",
        "badgeBg": "bg-[#5b21b6]",
        "duration": "3 phút",
        "weight": "20%",
        "weightColor": "text-[#5b21b6]",
        "question": q4_question,
        "expected": q4_expected,
        "redFlags": q4_red,
    })

    # Câu 5 — tổng hợp: bám vào score M3 THẬT + khoảng trống lớn nhất đã phân tích (gaps[0])
    top_gap_title = gaps[0]["title"] if gaps else None
    if top_gap_title:
        q5_question = f'"Điểm tổng thể phân tích của bạn cho vị trí {job_title} là {score:.0f}/100. Khoảng trống lớn nhất được ghi nhận: "{top_gap_title}". Nếu được nhận vào vị trí này, bạn sẽ giải quyết vấn đề đó trong 3 tháng đầu như thế nào?"'
    else:
        q5_question = f'"Điểm tổng thể phân tích của bạn cho vị trí {job_title} là {score:.0f}/100, hồ sơ khá phù hợp với JD. Bạn sẽ tạo ra giá trị gì trong 3 tháng đầu nếu được nhận vào vị trí này?"'
    questions.append({
        "id": "05",
        "category": "Kế hoạch hành động & động lực",
        "categoryColor": "bg-[#ffdad6] text-[#5c0007]",
        "badgeBg": "bg-[#93000a]",
        "duration": "3 phút",
        "weight": "20%",
        "weightColor": "text-[#93000a]",
        "question": q5_question,
        "expected": [
            "Đưa ra kế hoạch/hành động cụ thể, khả thi trong 3 tháng.",
            "Liên hệ trực tiếp với khoảng trống hoặc yêu cầu thực tế của JD.",
        ],
        "redFlags": [
            "Kế hoạch chung, không cụ thể, không liên hệ JD.",
            "Không đưa ra được hành động rõ ràng.",
        ],
    })

    return {
        "score": round(score, 1),
        "similarity": round(similarity, 3),
        "matched_skills": matched,
        "missing_skills": missing,
        "cv_exp_years": cv_exp,
        "job_title": job_title,
        "strengths": strengths or [{"title": "Chưa phát hiện thế mạnh rõ ràng", "desc": "CV chưa thể hiện đủ kỹ năng, kinh nghiệm hoặc ngữ cảnh phù hợp với JD này để ghi nhận điểm mạnh."}],
        "gaps": gaps or [{"title": "Không phát hiện khoảng trống rõ ràng", "desc": "CV khá phù hợp với JD."}],
        "cv_suggestions": cv_suggestions,
        "questions": questions,
        "features": features,
    }

# ─── Main Loop ───────────────────────────────────────────────────────────────

# Poll nhanh khi rảnh — job giọng nói (TTS/ASR) cần phản hồi gần như tức thì
# vì người dùng đang chờ trực tiếp trong lúc phỏng vấn.
IDLE_SLEEP = float(os.environ.get("IDLE_SLEEP", "1.5"))


def _process_one_asr_job(supabase) -> bool:
    """Nhận diện giọng nói 1 câu trả lời (ưu tiên cao nhất — ứng viên đang chờ
    chữ hiện ra ngay trong lúc trả lời). Trả về True nếu có job được xử lý."""
    resp = (
        supabase.table("interview_asr_jobs")
        .select("id, audio_path")
        .eq("status", "pending")
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    jobs = resp.data or []
    if not jobs:
        return False
    job = jobs[0]
    job_id = job["id"]
    try:
        supabase.table("interview_asr_jobs").update({"status": "processing"}).eq("id", job_id).execute()
        t0 = time.time()
        wav_bytes = supabase.storage.from_(interview_asr.ANSWER_BUCKET).download(job["audio_path"])
        text = interview_asr.transcribe(wav_bytes)
        supabase.table("interview_asr_jobs").update({
            "status": "done",
            "transcript": text,
        }).eq("id", job_id).execute()
        log.info(f"🎙️ ASR {job_id[:8]}... xong trong {time.time() - t0:.1f}s: {text[:60]!r}")
    except Exception:
        log.error(f"Lỗi ASR:\n{traceback.format_exc()}")
        try:
            supabase.table("interview_asr_jobs").update({
                "status": "error",
                "error_msg": traceback.format_exc()[-300:],
            }).eq("id", job_id).execute()
        except Exception:
            pass
    finally:
        # Không giữ lại bản ghi âm giọng nói của ứng viên sau khi đã nhận diện xong
        try:
            supabase.storage.from_(interview_asr.ANSWER_BUCKET).remove([job["audio_path"]])
        except Exception:
            pass
    return True


def _process_one_tts_step(supabase) -> bool:
    """Sinh audio cho ĐÚNG 1 câu hỏi tiếp theo của job TTS cũ nhất chưa xong,
    cập nhật audio_urls ngay (FE thấy từng câu một). Trả về True nếu có việc."""
    resp = (
        supabase.table("interview_audio_jobs")
        .select("id, voice, questions, audio_urls, status")
        .in_("status", ["pending", "processing"])
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    jobs = resp.data or []
    if not jobs:
        return False
    job = jobs[0]
    job_id = job["id"]
    try:
        questions = job.get("questions") or []
        urls = list(job.get("audio_urls") or [])
        idx = len(urls)
        if idx >= len(questions):
            supabase.table("interview_audio_jobs").update({"status": "done"}).eq("id", job_id).execute()
            return True

        voice = job.get("voice") or interview_tts.DEFAULT_VOICE_CODE
        t0 = time.time()
        urls.append(interview_tts.synthesize_one(supabase, job_id, idx, questions[idx], voice))
        is_last = len(urls) >= len(questions)
        supabase.table("interview_audio_jobs").update({
            "status": "done" if is_last else "processing",
            "audio_urls": urls,
        }).eq("id", job_id).execute()
        log.info(f"🔊 TTS {job_id[:8]}... câu {idx + 1}/{len(questions)} ({voice}) xong trong {time.time() - t0:.1f}s")
    except Exception:
        log.error(f"Lỗi sinh audio phỏng vấn:\n{traceback.format_exc()}")
        try:
            supabase.table("interview_audio_jobs").update({
                "status": "error",
                "error_msg": traceback.format_exc()[-300:],
            }).eq("id", job_id).execute()
        except Exception:
            pass
    return True


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

    # Load sẵn model giọng nói ngay lúc khởi động (không để lần phỏng vấn đầu
    # tiên phải chờ load model). Thiếu thư viện thì chỉ cảnh báo, worker vẫn
    # chạy phần phân tích CV/JD bình thường.
    for name, mod in (("TTS (VieNeu)", interview_tts), ("ASR (PhoWhisper)", interview_asr)):
        try:
            mod.warm_up()
        except Exception as e:
            log.warning(f"⚠️ Không load được {name}: {e} — tính năng này sẽ báo lỗi trên web.")
    print()

    while True:
        try:
            # Ưu tiên: ASR (đang chờ chữ) > TTS (từng câu một) > phân tích CV/JD.
            # Có việc thì lặp lại ngay, không sleep.
            if _process_one_asr_job(supabase):
                continue
            if _process_one_tts_step(supabase):
                continue

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
                time.sleep(min(POLL_INTERVAL, IDLE_SLEEP))
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
                file_type = detect_file_type(job["cv_b64"], job.get("cv_filename"))
                if file_type == "pdf":
                    log.info("  📄 Đang extract text từ PDF...")
                    cv_text = extract_text_from_pdf_b64(job["cv_b64"])
                    log.info(f"  ✅ Extracted {len(cv_text)} ký tự từ PDF")
                elif file_type == "docx":
                    log.info("  📝 Đang extract text từ DOCX...")
                    cv_text = extract_text_from_docx_b64(job["cv_b64"])
                    log.info(f"  ✅ Extracted {len(cv_text)} ký tự từ DOCX")
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

            # Tra ten hien thi + category (7 nhom rong) tu industry_id (du di tu
            # detect_industry() hay tu job.industry_id da co san) - dung de cau
            # hoi phong van bam sat dung ngành, khong con chung chung/lech nganh
            # (VD khong dung tu "production" cho nganh ke toan/ban hang).
            industry_display_name, industry_category = (
                industry_lookup.resolve_display_name_and_category(industry_id)
            )

            # Chạy AI pipeline — truyền domain_keywords (None = hành vi cũ)
            log.info("  🤖 Đang phân tích M1 → M2 → M3...")
            result = analyze(
                cv_text=cv_text,
                jd_text=jd_text,
                job_title=job_title,
                domain_keywords=domain_keywords,
                industry_display_name=industry_display_name,
                industry_category=industry_category,
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
