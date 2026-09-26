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

_HEAD_REQ = re.compile(r"yêu cầu|requirement|qualification|tiêu chuẩn|kỹ năng|kĩ năng|năng lực|kinh nghiệm|skills?", re.I)
_HEAD_RESP = re.compile(r"mô tả công việc|trách nhiệm|nhiệm vụ|responsibilit|job description|công việc chính|bạn sẽ làm", re.I)
_HEAD_SKIP = re.compile(
    r"quyền lợi|phúc lợi|benefit|chế độ|thu nhập|mức lương|lương|đãi ngộ|địa điểm|nơi làm việc|thời gian làm việc|"
    r"liên hệ|hồ sơ|cách thức ứng tuyển|ứng tuyển|giới thiệu công ty|về chúng tôi|about us|hạn nộp", re.I)
_PREFERRED = re.compile(r"ưu tiên|là (?:một )?lợi thế|lợi thế|điểm cộng|nice to have|preferred|is a plus|\bplus\b", re.I)
_LINE_SKIP = re.compile(r"lương|thưởng|bảo hiểm|nghỉ phép|du lịch|team ?building|salary|insurance|bonus|đóng bhxh|phụ cấp", re.I)


def _norm(text: str) -> str:
    return unicodedata.normalize("NFC", text or "")


def _is_heading(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    words = s.rstrip(":").split()
    return (s.endswith(":") and len(words) <= 8) or (len(words) <= 6 and s.upper() == s and any(c.isalpha() for c in s))


def _clean(line: str) -> str:
    return _BULLET_RE.sub("", line).strip(" \t:;,.-")


def split_jd_requirements(jd_text: str) -> list[dict]:
    """Tách JD thành các dòng yêu cầu có nghĩa, gắn nhóm (requirement/responsibility)
    và mức độ (required/preferred). Bỏ qua quyền lợi, lương, thông tin liên hệ..."""
    reqs, section = [], None
    for raw in _norm(jd_text).splitlines():
        line = raw.strip()
        if not line:
            continue
        if _is_heading(line):
            if _HEAD_SKIP.search(line):
                section = "skip"
            elif _HEAD_RESP.search(line):
                section = "responsibility"
            elif _HEAD_REQ.search(line):
                section = "requirement"
            continue
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


def split_cv_chunks(cv_text: str) -> list[str]:
    chunks, seen = [], set()
    for part in _SPLIT_RE.split(_norm(cv_text)):
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
        if _is_heading(line):
            skip = bool(_HEAD_SKIP.search(line))
            continue
        if skip:
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
            j = int(np.argmax(sims[i]))
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

            results.append({
                **r,
                "status": status,
                "match": round(score, 3),
                "evidence": cv_chunks[j][:240] if status != "missing" else None,
                "closest": cv_chunks[j][:240] if status == "missing" and score >= 0.3 else None,
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
