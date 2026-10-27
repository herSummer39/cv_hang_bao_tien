"""
detail_analysis.py — Phân tích CHI TIẾT cho kết quả CV ↔ JD, dùng lại đúng các
model đã train (M2 bi-encoder, M3 XGBoost). KHÔNG train thêm, KHÔNG gọi LLM/API.

1) doc_similarity(): độ tương đồng M2 trên TOÀN BỘ CV và JD. Trước đây chỉ so
   ~500 ký tự đầu (thường là họ tên/liên hệ) → điểm tương đồng sai lệch.
   Cách mới: tách thành từng câu/dòng, encode tất cả, lấy trung bình embedding
   của CV so với trung bình embedding của JD.

2) match_requirements(): tách JD thành từng dòng yêu cầu, với mỗi dòng tìm câu
   trong CV khớp nhất (M2) → Đáp ứng / Một phần / Chưa có, kèm câu CV làm bằng
   chứng và % tương đồng. Kết hợp thêm tín hiệu kỹ năng (M1/keyword) để không
   đánh "Đáp ứng" cho yêu cầu nêu kỹ năng mà CV hoàn toàn không có.

3) explain_score(): tách điểm M3 thành đóng góp của từng yếu tố bằng chức năng
   có sẵn của XGBoost (pred_contribs — giá trị SHAP), gom thành nhóm dễ hiểu.
"""
import os
import re
import unicodedata

import numpy as np

# Ngưỡng tương đồng M2 cho từng yêu cầu — chỉnh được qua .env.worker nếu cần
REQ_MET = float(os.environ.get("REQ_MET_THRESHOLD", "0.60"))
REQ_PARTIAL = float(os.environ.get("REQ_PARTIAL_THRESHOLD", "0.45"))
MAX_REQUIREMENTS = 20
MAX_CV_CHUNKS = 160

_BULLET_RE = re.compile(r"^\s*(?:[-•*+–—▪►●○◦✓✔]|\d{1,2}[.)]|[a-zA-Z][.)])\s*")
_SPLIT_RE = re.compile(r"[\n\r]+|(?<=[.!?;])\s+(?=[A-ZĐÀ-Ỹ0-9•\-])|\s[•▪►●]\s")

# Tiêu đề mục trong JD — chỉ nhận là tiêu đề khi từ khoá nằm ở ĐẦU dòng (sau số thứ
# tự/gạch đầu dòng/emoji), để dòng nội dung như "Kinh nghiệm 1 năm..." không bị
# nhầm là tiêu đề.
_HEAD_SKIP = re.compile(
    r"^(quyền lợi|phúc lợi|benefits?|chế độ|đãi ngộ|thu nhập|mức lương|lương|địa điểm|nơi làm việc|"
    r"thời gian làm việc|giờ làm việc|liên hệ|hồ sơ|cách thức ứng tuyển|cách ứng tuyển|ứng tuyển|"
    r"giới thiệu (?:công ty|về)|về chúng tôi|về\s+[A-Za-z0-9_\s&.\-]+|about|hạn nộp|thông tin (khác|chung|liên hệ)|why join|what we offer|tại sao)", re.I)
_HEAD_RESP = re.compile(
    r"^(mô tả công việc|mô tả|chi tiết công việc|trách nhiệm|nhiệm vụ|responsibilit|job description|"
    r"công việc chính|bạn sẽ làm|what you.?ll do)", re.I)
_HEAD_REQ = re.compile(
    r"^(yêu cầu|requirements?|qualifications?|tiêu chuẩn|điều kiện|kỹ năng cần có|ứng viên cần|"
    r"what we.?re looking|who you are)", re.I)
# Tiêu đề yếu: chỉ tính khi dòng kết thúc bằng ":" hoặc viết HOA toàn bộ
_HEAD_REQ_WEAK = re.compile(r"^(kỹ năng|kĩ năng|năng lực|kinh nghiệm|skills?)", re.I)
_PREFERRED = re.compile(r"ưu tiên|là (?:một )?lợi thế|lợi thế|điểm cộng|nice to have|preferred|is a plus|\bplus\b", re.I)
# Lưới an toàn: dòng mang nội dung quyền lợi/đãi ngộ thì bỏ dù nằm ở mục nào
# (Viết cụ thể theo NGỮ CẢNH đãi ngộ — tránh xoá nhầm yêu cầu của ngành bảo hiểm,
# du lịch, nhân sự tính lương, kế toán thuế thu nhập...)
_LINE_SKIP = re.compile(
    r"mức lương|lương (?:cứng|cơ bản|tháng 13|thưởng|từ|up|upto|hấp dẫn|cạnh tranh|khởi điểm|\d)|tăng lương|"
    r"thưởng (?:nóng|doanh số|lễ|tết|hấp dẫn|theo|kpi|cuối năm)|"
    r"(?:tổng )?thu nhập (?:từ|đến|lên|upto|up to|hấp dẫn|không giới hạn|trung bình|cạnh tranh|\d)|"
    r"hoa hồng|\d+\s*(?:-|–|~|đến)?\s*\d*\s*(?:tr|triệu)\b|vnđ|usd|\$|hỗ trợ chi phí|chi phí marketing|"
    r"được (?:đào tạo|hưởng|cấp|tham gia|nghỉ|hỗ trợ|thưởng|tăng lương|xét|cung cấp|đóng)|thăng tiến|"
    r"lộ trình phát triển|môi trường làm việc|nghỉ (?:lễ|phép|mát)|phép năm|khám sức khỏe|khám sức khoẻ|"
    r"phụ cấp|bhxh|bhyt|bảo hiểm (?:xã hội|y tế|sức khỏe|sức khoẻ|đầy đủ|theo)|du lịch (?:hằng|hàng) năm|"
    r"team ?building|đồng phục|công việc ổn định|salary|bonus|allowance|commission",
    re.I)
_LEAD_RE = re.compile(r"^(?:[#*\-•▪►●○◦✓✔➢➤→=]+|\d{1,2}[.)]|[ivxIVX]{1,4}[.)])?\s*[^\wÀ-ỹ]*")

# Phát hiện câu giới thiệu doanh nghiệp / công ty để không đưa vào yêu cầu bắt buộc
_COMPANY_INTRO_RE = re.compile(
    r"(?i)^(?:công\s+ty|tập\s+đoàn|chúng\s+tôi|về\s+chúng\s+tôi|về\s+[A-Za-z0-9_\s&.\-]+|doanh\s+nghiệp).*?"
    r"(?:là\s+đơn\s+vị|là\s+doanh\s+nghiệp|chuyên\s+phân\s+phối|thuộc\s+hệ\s+sinh\s+thái|được\s+thành\s+lập|hoạt\s+động\s+trong|tự\s+hào|tiên\s+phong)",
    re.I
)


def _norm(text: str) -> str:
    return unicodedata.normalize("NFC", text or "")


def _heading(line: str):
    """(section | None, phần nội dung còn lại sau dấu ':' nếu có).
    section: "skip" | "responsibility" | "requirement" | None (không phải tiêu đề)."""
    s = _LEAD_RE.sub("", line.strip()).strip()
    if not s:
        return None, ""
    head, sep, rest = s.partition(":")
    words = head.split()
    short = len(words) <= 8
    if not short:
        return None, ""
    strong = bool(sep) or s.upper() == s or len(s.split()) <= 6
    rest = rest.strip()
    if _HEAD_SKIP.match(head) and strong:
        return "skip", rest
    if _HEAD_RESP.match(head) and strong:
        return "responsibility", rest
    if _HEAD_REQ.match(head) and strong:
        return "requirement", rest
    if _HEAD_REQ_WEAK.match(head) and (sep or s.upper() == s) and not rest:
        return "requirement", ""
    return None, ""


def _clean(line: str) -> str:
    return _BULLET_RE.sub("", line).strip(" \t:;,.-")


def parse_jd_age_range(text: str) -> tuple[float | None, float | None] | None:
    """Trích xuất khoảng tuổi yêu cầu trong JD (min_age, max_age) hoặc None."""
    if not re.search(r"(?i)\b(độ\s*tuổi|tuổi|năm\s*sinh|age)\b", text):
        return None
    m_range = re.search(r"(?i)(?:từ\s*)?(\d{2})\s*(?:-|–|đến|to)\s*(\d{2})\s*(?:tuổi)?", text)
    if m_range:
        return float(m_range.group(1)), float(m_range.group(2))
    m_min = re.search(r"(?i)(?:từ|trên|tối thiểu|>=?)\s*(\d{2})\s*(?:tuổi)?", text)
    if m_min:
        return float(m_min.group(1)), None
    m_max = re.search(r"(?i)(?:dưới|tối đa|<=?)\s*(\d{2})\s*(?:tuổi)?", text)
    if m_max:
        return None, float(m_max.group(1))
    m_single = re.search(r"(?i)(\d{2})\s*tuổi", text)
    if m_single:
        return float(m_single.group(1)), None
    return None


def extract_candidate_age_and_evidence(cv_text: str) -> tuple[float | None, str | None]:
    """Tìm năm sinh hoặc số tuổi trong CV, tính tuổi ứng viên (năm chuẩn 2026)."""
    current_year = 2026
    for raw in cv_text.splitlines():
        line = raw.strip()
        if not line:
            continue
        m_dob = re.search(r"(?i)(?:sinh|dob|birth|ngày\s*sinh|năm\s*sinh)[^0-9\n\r]*(\d{1,2}[/-]\d{1,2}[/-](19\d{2}|20\d{2}))", line)
        if m_dob:
            byear = int(m_dob.group(2))
            return float(current_year - byear), line
        m_year = re.search(r"(?i)(?:sinh|dob|birth|năm\s*sinh)[^0-9\n\r]*(19\d{2}|20\d{2})\b", line)
        if m_year:
            byear = int(m_year.group(1))
            return float(current_year - byear), line
        m_age = re.search(r"(?i)\b(\d{2})\s*tuổi\b", line)
        if m_age:
            age = float(m_age.group(1))
            if 18 <= age <= 70:
                return age, line
    m_date = re.search(r"\b\d{1,2}[/-]\d{1,2}[/-](19\d{2}|200\d)\b", cv_text)
    if m_date:
        byear = int(m_date.group(1))
        for line in cv_text.splitlines():
            if m_date.group(0) in line:
                return float(current_year - byear), line.strip()
    return None, None


def check_vehicle_equipment_match(req_text: str, cv_text: str) -> tuple[float, str | None] | None:
    """Kiểm tra đối chiếu phương tiện đi lại và thiết bị/công cụ làm việc."""
    req_lower = req_text.lower()
    needs_vehicle = bool(re.search(r"(?i)(phương tiện|xe máy|ô tô|xe cá nhân|di chuyển|đi lại)", req_lower))
    needs_laptop = bool(re.search(r"(?i)(laptop|máy tính)", req_lower))
    needs_phone = bool(re.search(r"(?i)(smartphone|điện thoại)", req_lower))

    if not (needs_vehicle or needs_laptop or needs_phone):
        return None

    cv_lower = cv_text.lower()
    has_vehicle = bool(re.search(r"(?i)(phương tiện|xe máy|ô tô|xe cá nhân|di chuyển)", cv_lower))
    has_laptop = bool(re.search(r"(?i)(laptop|máy tính)", cv_lower))
    has_phone = bool(re.search(r"(?i)(smartphone|điện thoại|số điện thoại|zalo|hotline|\b0\d{9}\b)", cv_lower))

    checks = []
    if needs_vehicle:
        checks.append(has_vehicle)
    if needs_laptop:
        checks.append(has_laptop)
    if needs_phone:
        checks.append(has_phone)

    if checks and all(checks):
        evidence = None
        for line in cv_text.splitlines():
            l_strip = line.strip()
            if re.search(r"(?i)(phương tiện|laptop|xe máy|ô tô)", l_strip):
                evidence = l_strip
                break
        return 0.90, evidence or "Có đầy đủ phương tiện đi lại, laptop và điện thoại/smartphone"
    elif checks and any(checks):
        return 0.60, None
    return None


def split_jd_requirements(jd_text: str) -> list[dict]:
    """Tách JD thành các dòng yêu cầu có nghĩa, gắn nhóm (requirement/responsibility)
    và mức độ (required/preferred). Bỏ qua quyền lợi, lương, thông tin liên hệ, giới thiệu công ty..."""
    reqs, section = [], None
    for raw in _norm(jd_text).splitlines():
        line = raw.strip()
        if not line:
            continue
        sec, rest = _heading(line)
        if sec:
            section = sec
            if not rest:
                continue
            line = rest  # "Yêu cầu: có 1 năm kinh nghiệm..." → xử lý phần sau dấu ":"
        if section == "skip":
            continue
        # 1 dòng dài có thể chứa nhiều ý ngăn bởi ";" hoặc " - "
        # (kể cả JD dán liền 1 đoạn không xuống dòng: tách thêm theo dấu câu, gạch đầu dòng giữa câu)
        for part in re.split(r";|\s[-–•▪]\s|(?<=[.!?])\s+", line):
            text = _clean(part)
            if len(text) < 12 or len(text.split()) < 3 or len(text) > 320:
                continue
            if _LINE_SKIP.search(text):
                continue
            # Bỏ qua câu giới thiệu công ty/tập đoàn nếu không chứa từ khóa yêu cầu ứng viên
            if _COMPANY_INTRO_RE.search(text) and not re.search(r"(?i)\b(yêu cầu|ứng viên|cần có|tiêu chuẩn|kinh nghiệm|trách nhiệm|nhiệm vụ)\b", text):
                continue
            reqs.append({
                "text": text,
                "section": section or "requirement",
                "priority": "preferred" if _PREFERRED.search(text) else "required",
            })
    # Loại trùng, ưu tiên nhóm "yêu cầu" trước "nhiệm vụ"
    seen, uniq = set(), []
    for r in sorted(reqs, key=lambda r: 0 if r["section"] == "requirement" else 1):
        key = r["text"].lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append(r)
    return uniq[:MAX_REQUIREMENTS]


def _join_wrapped_lines(text: str) -> str:
    """PDF xuống dòng giữa câu (VD "...cập nhật\ntin thị trường, thông tin sản phẩm")
    → nối lại thành câu trọn vẹn: dòng trước chưa kết thúc bằng dấu câu và dòng
    sau bắt đầu bằng chữ thường thì là phần tiếp theo của cùng một câu."""
    out: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            out.append("")
            continue
        if out and out[-1] and not re.search(r"[.!?:;]$", out[-1]) and line[0].islower():
            out[-1] = out[-1] + " " + line
        else:
            out.append(line)
    return "\n".join(out)


def split_cv_chunks(cv_text: str) -> list[str]:
    chunks, seen = [], set()
    for part in _SPLIT_RE.split(_join_wrapped_lines(_norm(cv_text))):
        text = _clean(part or "")
        if len(text) < 12 or len(text.split()) < 3:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        chunks.append(text[:400])
        if len(chunks) >= MAX_CV_CHUNKS:
            break
    return chunks


def _jd_chunks_all(jd_text: str) -> list[str]:
    """Toàn bộ dòng có nghĩa của JD (trừ quyền lợi/liên hệ) — dùng cho similarity tổng."""
    out, skip = [], False
    for raw in _norm(jd_text).splitlines():
        line = raw.strip()
        if not line:
            continue
        sec, rest = _heading(line)
        if sec:
            skip = sec == "skip"
            if not rest:
                continue
            line = rest
        if skip or _LINE_SKIP.search(line):
            continue
        text = _clean(line)
        if len(text) >= 12 and len(text.split()) >= 3:
            out.append(text[:400])
    return out[:80]


def analyze_detail(model, util, cv_text: str, jd_text: str, jd_skills: list, matched_skills: list,
                   skill_finder) -> dict:
    """Chạy M2 một lần cho tất cả câu → similarity tổng + đối chiếu từng yêu cầu.

    skill_finder(text) -> list tên kỹ năng (dùng đúng bộ so khớp kỹ năng của worker).
    Trả về {"similarity": float | None, "requirements": [...], "summary": {...}}.
    """
    cv_chunks = split_cv_chunks(cv_text)
    jd_all = _jd_chunks_all(jd_text)
    reqs = split_jd_requirements(jd_text)
    if not cv_chunks or not (jd_all or reqs):
        return {"similarity": None, "requirements": [], "summary": None}

    req_texts = [r["text"] for r in reqs]
    cv_emb = model.encode(cv_chunks, convert_to_tensor=True, batch_size=32, show_progress_bar=False)
    jd_emb = model.encode(jd_all or req_texts, convert_to_tensor=True, batch_size=32, show_progress_bar=False)

    similarity = float(util.cos_sim(cv_emb.mean(dim=0, keepdim=True), jd_emb.mean(dim=0, keepdim=True))[0][0])

    matched_lower = {s.lower() for s in matched_skills}
    results = []
    if reqs:
        req_emb = model.encode(req_texts, convert_to_tensor=True, batch_size=32, show_progress_bar=False)
        sims = util.cos_sim(req_emb, cv_emb).cpu().numpy()
        for i, r in enumerate(reqs):
            # Ưu tiên câu kinh nghiệm thực tế hơn dòng tiêu đề ngắn
            sims_row = sims[i].copy()
            if r.get("section") == "responsibility":
                for k, chunk in enumerate(cv_chunks):
                    if re.search(r"(?i)^(vị trí ứng tuyển|mục tiêu nghề nghiệp|họ và tên|thông tin liên hệ)", chunk.strip()) or len(chunk.split()) <= 6:
                        sims_row[k] -= 0.25
            j = int(np.argmax(sims_row))
            score = float(sims[i][j])
            skills = sorted(set(skill_finder(r["text"])), key=str.lower)
            skill_items = [{"name": s, "matched": s.lower() in matched_lower} for s in skills]
            have = sum(1 for s in skill_items if s["matched"])

            if score >= REQ_MET:
                status = "met"
            elif score >= REQ_PARTIAL:
                status = "partial"
            else:
                status = "missing"
            if skill_items:
                if have == len(skill_items):
                    # Kỹ năng yêu cầu có đủ trong CV → ít nhất "một phần"
                    status = "met" if score >= REQ_PARTIAL else max(status, "partial", key=_rank)
                elif have == 0 and status == "met":
                    # Câu CV nghe giống nhưng không hề có kỹ năng JD nêu → chỉ "một phần"
                    status = "partial"

            evidence_text = cv_chunks[j][:240] if status != "missing" else None
            closest_text = cv_chunks[j][:240] if status == "missing" and score >= 0.3 else None

            # ── Override 1: Đối chiếu độ tuổi (nếu JD nêu yêu cầu độ tuổi) ──
            age_range = parse_jd_age_range(r["text"])
            if age_range is not None:
                min_a, max_a = age_range
                cand_age, age_ev = extract_candidate_age_and_evidence(cv_text)
                if cand_age is not None:
                    is_ok = (min_a is None or cand_age >= min_a) and (max_a is None or cand_age <= max_a)
                    if is_ok:
                        score = 0.95
                        status = "met"
                        evidence_text = age_ev or f"Năm sinh ứng viên tương ứng {cand_age:.0f} tuổi (đạt yêu cầu)"
                        closest_text = None
                    else:
                        score = 0.25
                        status = "missing"
                        evidence_text = None
                        closest_text = age_ev or f"Ứng viên {cand_age:.0f} tuổi (chưa khớp yêu cầu)"

            # ── Override 2: Đối chiếu phương tiện đi lại & công cụ/thiết bị ──
            eq_match = check_vehicle_equipment_match(r["text"], cv_text)
            if eq_match is not None:
                eq_score, eq_ev = eq_match
                if eq_score >= 0.85:
                    score = eq_score
                    status = "met"
                    if eq_ev:
                        evidence_text = eq_ev
                    closest_text = None
                elif eq_score >= 0.5:
                    score = max(score, eq_score)
                    if status == "missing":
                        status = "partial"

            results.append({
                **r,
                "status": status,
                "match": round(score, 3),
                "evidence": evidence_text,
                "closest": closest_text,
                "skills": skill_items,
            })

    required = [r for r in results if r["priority"] == "required"]
    summary = {
        "total": len(results),
        "met": sum(r["status"] == "met" for r in results),
        "partial": sum(r["status"] == "partial" for r in results),
        "missing": sum(r["status"] == "missing" for r in results),
        "required_total": len(required),
        "required_met": sum(r["status"] == "met" for r in required),
        "thresholds": {"met": REQ_MET, "partial": REQ_PARTIAL},
    }
    return {"similarity": similarity, "requirements": results, "summary": summary}


def _rank(status: str) -> int:
    return {"missing": 0, "partial": 1, "met": 2}[status]


# ─── Giải thích điểm M3 ─────────────────────────────────────────────────────
FEATURE_GROUP = {
    "skill_overlap_count": "skills", "skill_ratio": "skills", "jd_skill_count": "skills", "cv_skill_count": "skills",
    "cv_exp_years": "experience", "jd_exp_min": "experience", "jd_exp_max": "experience",
    "exp_ok": "experience", "exp_gap": "experience", "exp_ratio": "experience",
    "m2_similarity": "semantic",
}
FEATURE_LABEL = {
    "skill_overlap_count": "Số kỹ năng khớp", "skill_ratio": "Tỷ lệ kỹ năng khớp",
    "jd_skill_count": "Số kỹ năng JD yêu cầu", "cv_skill_count": "Số kỹ năng trong CV",
    "cv_exp_years": "Số năm kinh nghiệm trong CV", "jd_exp_min": "Kinh nghiệm tối thiểu JD",
    "jd_exp_max": "Kinh nghiệm tối đa JD", "exp_ok": "Đạt khoảng kinh nghiệm yêu cầu",
    "exp_gap": "Số năm còn thiếu", "exp_ratio": "Tỷ lệ kinh nghiệm / yêu cầu",
    "m2_similarity": "Tương đồng nội dung (M2)",
}


def _fmt_years(v: float) -> str:
    return f"{v:.0f}" if float(v).is_integer() else f"{v:.1f}"


def explain_score(m3_model, m3_keys: list, features: dict, final_score: float) -> dict | None:
    """Tách điểm M3 = mức nền + tổng đóng góp từng đặc trưng (SHAP của XGBoost)."""
    try:
        import xgboost as xgb
        booster = m3_model.get_booster()
        x = np.array([[float(features[k]) for k in m3_keys]], dtype=float)
        names = booster.feature_names
        dm = xgb.DMatrix(x, feature_names=list(names) if names else None)
        contribs = booster.predict(dm, pred_contribs=True)[0]
    except Exception:
        return None

    base = float(contribs[-1])
    per = {k: float(contribs[i]) for i, k in enumerate(m3_keys)}
    f = features
    groups = {
        "skills": {
            "label": "Kỹ năng khớp JD",
            "icon": "terminal",
            "detail": f"Khớp {int(f['skill_overlap_count'])}/{int(f['jd_skill_count'])} kỹ năng JD yêu cầu "
                      f"({f['skill_ratio'] * 100:.0f}%) · CV có {int(f['cv_skill_count'])} kỹ năng được nhận diện",
        },
        "experience": {
            "label": "Kinh nghiệm",
            "icon": "history_edu",
            "detail": f"CV thể hiện {_fmt_years(f['cv_exp_years'])} năm · JD yêu cầu "
                      f"{_fmt_years(f['jd_exp_min'])}–{_fmt_years(f['jd_exp_max'])} năm"
                      + (f" · thiếu {_fmt_years(f['exp_gap'])} năm" if f["exp_gap"] > 0 else ""),
        },
        "semantic": {
            "label": "Tương đồng nội dung CV ↔ JD",
            "icon": "psychology",
            "detail": f"M2 đo nội dung toàn bộ CV giống JD {f['m2_similarity'] * 100:.0f}%",
        },
    }
    factors = []
    for key, g in groups.items():
        contribution = sum(v for k, v in per.items() if FEATURE_GROUP.get(k) == key)
        factors.append({"key": key, **g, "contribution": round(contribution, 1)})
    raw = base + sum(per.values())
    return {
        "base": round(base, 1),
        "factors": factors,
        "features": [
            {"key": k, "label": FEATURE_LABEL.get(k, k), "value": round(float(features[k]), 3),
             "contribution": round(per[k], 2), "group": FEATURE_GROUP.get(k)}
            for k in m3_keys
        ],
        "raw": round(raw, 1),
        "final": round(final_score, 1),
        "clamped": abs(raw - final_score) > 0.05,
    }
