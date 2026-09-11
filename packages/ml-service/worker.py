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
M2_PATH      = BASE_DIR / "models" / "m2_embedding_quick" / "final"
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
    m3_model = pickle.load(f)
log.info("  ✅ M3 XGBoost loaded")

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

# ─── Pipeline AI ─────────────────────────────────────────────────────────────

def extract_skills(text: str) -> list[str]:
    """M1: trích xuất SKILL entities từ text."""
    if not text.strip():
        return []
    try:
        entities = m1_ner(text[:2000])  # giới hạn 2000 ký tự cho NER
        return list({e["word"].strip() for e in entities
                     if e.get("entity_group") in ("SKILL", "B-SKILL", "I-SKILL")
                     and len(e["word"].strip()) > 1})
    except Exception:
        return []

def compute_similarity(text_a: str, text_b: str) -> float:
    """M2: tính cosine similarity giữa 2 đoạn text."""
    try:
        emb_a = m2_model.encode(text_a[:512], convert_to_tensor=True)
        emb_b = m2_model.encode(text_b[:512], convert_to_tensor=True)
        return float(util.cos_sim(emb_a, emb_b)[0][0])
    except Exception:
        return 0.0

def compute_score(skill_overlap: float, exp_ok: int, exp_gap: float, similarity: float) -> float:
    """M3: tính điểm tổng thể."""
    try:
        features = np.array([[skill_overlap, exp_ok, exp_gap, similarity]])
        return float(m3_model.predict(features)[0])
    except Exception:
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

def extract_required_exp(jd_text: str) -> float:
    """Trích xuất số năm kinh nghiệm yêu cầu từ JD."""
    import re
    patterns = [r"(?:ít nhất|tối thiểu|minimum|at least)[^\d]*(\d+)\s*(?:năm|years?)",
                r"(\d+)\+?\s*(?:năm|years?)\s*(?:kinh nghiệm|experience)"]
    for pat in patterns:
        m = re.search(pat, jd_text, re.IGNORECASE)
        if m:
            return float(m.group(1))
    return 2.0

def analyze(cv_text: str, jd_text: str, job_title: str) -> dict:
    """Chạy toàn bộ pipeline M1→M2→M3 và trả về kết quả."""
    # Trích xuất skills
    cv_skills  = set(extract_skills(cv_text))
    jd_skills  = set(extract_skills(jd_text))

    # Overlap
    matched    = list(cv_skills & jd_skills)
    missing    = list(jd_skills - cv_skills)
    skill_overlap = len(matched) / max(len(jd_skills), 1)

    # Kinh nghiệm
    cv_exp  = extract_exp_years(cv_text)
    req_exp = extract_required_exp(jd_text)
    exp_ok  = 1 if cv_exp >= req_exp else 0
    exp_gap = max(0.0, req_exp - cv_exp)

    # M2 similarity
    similarity = compute_similarity(cv_text[:512], jd_text[:512])

    # M3 score (0–100)
    raw_score = compute_score(skill_overlap, exp_ok, exp_gap, similarity)
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
    }

# ─── Main Loop ───────────────────────────────────────────────────────────────

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("❌ Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong .env.worker!")
        log.error("   Tạo file .env.worker từ .env.worker.example rồi chạy lại.")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info(f"🚀 Worker khởi động! Poll mỗi {POLL_INTERVAL}s")
    log.info(f"   Supabase: {SUPABASE_URL[:40]}...\n")

    while True:
        try:
            # Lấy 1 job pending cũ nhất
            resp = (
                supabase.table("analysis_jobs")
                .select("id, cv_text, cv_b64, cv_filename, jd_text, job_title")
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
                log.info("  📄 Đang extract text từ PDF...")
                cv_text = extract_text_from_pdf_b64(job["cv_b64"])
                log.info(f"  ✅ Extracted {len(cv_text)} ký tự từ PDF")

            # Chạy AI pipeline
            log.info("  🤖 Đang phân tích M1 → M2 → M3...")
            result = analyze(
                cv_text=cv_text,
                jd_text=job.get("jd_text", ""),
                job_title=job.get("job_title", "Vị trí không xác định"),
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
