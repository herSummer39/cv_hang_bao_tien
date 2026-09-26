"""
interview_builder.py — Chọn 5 câu hỏi phỏng vấn BÁM SÁT NGÀNH + CV + JD.

Không dùng LLM: chọn từ ngân hàng câu hỏi do người viết theo từng ngành
(bảng interview_questions, migration v15), rồi gắn với dữ liệu THẬT của lượt
phân tích (kỹ năng khớp/thiếu của M1, câu bằng chứng trong CV và yêu cầu JD còn
thiếu của M2). Mỗi câu kèm rubric (expected/redFlags) để trang phỏng vấn chấm.

Cấu trúc 5 câu:
  01 Chuyên môn ngành   — câu kỹ thuật của ngành, ưu tiên đúng kỹ năng CV đã có
  02 Đào sâu CV         — trích nguyên câu trong CV, yêu cầu kể bối cảnh/vai trò/kết quả
  03 Yêu cầu JD còn thiếu — đúng dòng yêu cầu bắt buộc CV chưa đáp ứng (hoặc kỹ năng thiếu)
  04 Tình huống thực tế — tình huống đặc thù của ngành
  05 Hành vi / nghề nghiệp — câu hành vi của ngành (hoặc câu chung)
Thiếu dữ liệu cho câu nào thì dùng lại câu tương ứng của cách sinh cũ (legacy).
"""
import hashlib
import random
import re
import unicodedata

_STYLE = [
    ("bg-[#dce1ff] text-[#001551]", "bg-[#1d4ed8]", "text-[#0037b0]"),
    ("bg-[#85f8c4] text-[#002114]", "bg-[#004f35]", "text-[#004f35]"),
    ("bg-[#ffe8b8] text-[#5c3b00]", "bg-[#8a5700]", "text-[#8a5700]"),
    ("bg-[#e9ddff] text-[#2c0a63]", "bg-[#5b21b6]", "text-[#5b21b6]"),
    ("bg-[#ffdad6] text-[#5c0007]", "bg-[#93000a]", "text-[#93000a]"),
]


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").lower().replace("đ", "d"))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9+#.]+", " ", s).strip()


def _skill_match(tag: str, skill: str) -> bool:
    a, b = _norm(tag), _norm(skill)
    if not a or not b:
        return False
    if a in b or b in a:
        return True
    ta, tb = set(a.split()), set(b.split())
    return len(ta & tb) / max(len(ta | tb), 1) >= 0.5


def _target_difficulty(cv_exp: float) -> str:
    return "junior" if cv_exp < 2 else "mid" if cv_exp <= 5 else "senior"


def _quote(s: str) -> str:
    return f'"{s}"'


def _short(s: str, n: int = 90) -> str:
    s = (s or "").strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def build_questions(*, bank: dict | None, job_title: str, industry_name: str | None,
                    matched: list, missing: list, requirements: list, cv_exp: float,
                    seed_text: str, legacy: list) -> list:
    bank = bank or {}
    pool = list(bank.get("industry") or [])
    general = list(bank.get("general") or [])
    group = bank.get("group_name") or industry_name
    rng = random.Random(int(hashlib.md5(seed_text.encode("utf-8")).hexdigest()[:8], 16))
    diff = _target_difficulty(cv_exp)
    used: set = set()

    def pick(cands: list) -> dict | None:
        cands = [q for q in cands if q.get("question") and q["question"] not in used]
        if not cands:
            return None
        same = [q for q in cands if q.get("difficulty") == diff]
        choice = rng.choice(same or cands)
        used.add(choice["question"])
        return choice

    def by_type(t: str) -> list:
        return [q for q in pool if q.get("question_type") == t]

    def with_skill(cands: list, skills: list) -> list:
        out = []
        for q in cands:
            tag = q.get("skill_tag")
            if tag and any(_skill_match(tag, s) for s in skills):
                out.append(q)
        return out

    def matched_skill_for(tag: str, skills: list) -> str | None:
        return next((s for s in skills if _skill_match(tag, s)), None)

    slots: list = [None] * 5

    # ── 01 Chuyên môn ngành (ưu tiên kỹ năng CV đã có — kiểm tra độ sâu thật) ──
    q = pick(with_skill(by_type("technical"), matched)) or pick(by_type("technical"))
    if q:
        sk = matched_skill_for(q.get("skill_tag") or "", matched) if q.get("skill_tag") else None
        prefix = f"CV của bạn có kỹ năng “{sk}”. " if sk else ""
        label = f"Chuyên môn: {q['skill_tag']}" if q.get("skill_tag") else f"Chuyên môn ngành {group or ''}".strip()
        slots[0] = (label, _quote(prefix + q["question"]), q.get("expected") or [], q.get("red_flags") or [])

    # ── 02 Đào sâu một câu cụ thể trong CV ──
    with_ev = sorted(
        [r for r in requirements if r.get("evidence") and r.get("status") in ("met", "partial")],
        key=lambda r: -r.get("match", 0),
    )
    if with_ev:
        r = with_ev[0]
        ev = r["evidence"]
        slots[1] = (
            "Đào sâu kinh nghiệm trong CV",
            _quote(f"Trong CV bạn viết: “{ev}”. Hãy kể cụ thể bối cảnh, việc chính bạn trực tiếp làm, "
                   f"cách làm và kết quả đo được bằng số liệu."),
            [f"Giải thích chi tiết, nhất quán với nội dung đã ghi: {_short(ev, 80)}",
             "Nêu rõ vai trò cá nhân: việc bạn trực tiếp làm, không chỉ kể chung cả nhóm",
             "Kết quả đo được bằng số liệu, phần trăm hoặc tác động cụ thể"],
            ["Không giải thích được nội dung chính mình ghi trong CV",
             "Kể chung chung, không có số liệu hay kết quả"],
        )

    # ── 03 Yêu cầu JD còn thiếu ──
    miss_req = [r for r in requirements if r.get("status") == "missing"]
    miss_req.sort(key=lambda r: (0 if r.get("priority") == "required" else 1, 0 if r.get("section") == "requirement" else 1))
    miss_skills = list(missing)
    for r in miss_req:
        miss_skills += [s["name"] for s in r.get("skills", []) if not s.get("matched")]
    q = pick(with_skill(by_type("technical"), miss_skills))
    if q:
        sk = matched_skill_for(q["skill_tag"], miss_skills) or q["skill_tag"]
        slots[2] = (
            f"Kỹ năng JD yêu cầu, CV chưa có: {sk}",
            _quote(f"JD yêu cầu “{sk}” nhưng CV của bạn chưa thể hiện. {q['question']}"),
            q.get("expected") or [], q.get("red_flags") or [],
        )
    elif miss_req:
        r = miss_req[0]
        slots[2] = (
            "Yêu cầu JD chưa đáp ứng",
            _quote(f"JD yêu cầu: “{r['text']}”. CV của bạn chưa thể hiện điểm này. Bạn đã từng làm việc gì liên quan chưa? "
                   f"Nếu chưa, bạn sẽ đáp ứng yêu cầu này trong 1–2 tháng đầu như thế nào?"),
            ["Trả lời trung thực mức độ kinh nghiệm hiện có",
             f"Liên hệ trực tiếp với yêu cầu: {_short(r['text'], 80)}",
             "Kế hoạch học hỏi, bù đắp cụ thể và khả thi trong thời gian ngắn"],
            ["Nhận là có kinh nghiệm nhưng không đưa được ví dụ", "Kế hoạch mơ hồ, không khả thi"],
        )
    else:
        q = pick(by_type("technical"))
        if q:
            slots[2] = (f"Chuyên môn: {q['skill_tag']}" if q.get("skill_tag") else "Chuyên môn ngành",
                        _quote(q["question"]), q.get("expected") or [], q.get("red_flags") or [])

    # ── 04 Tình huống thực tế của ngành ──
    q = pick(by_type("situational"))
    if q:
        slots[3] = (f"Tình huống thực tế — {group}" if group else "Tình huống thực tế",
                    _quote(q["question"]), q.get("expected") or [], q.get("red_flags") or [])

    # ── 05 Hành vi / nghề nghiệp ──
    q = pick(by_type("behavioral")) or pick(general)
    if q:
        slots[4] = ("Hành vi & kinh nghiệm nghề", _quote(q["question"]), q.get("expected") or [], q.get("red_flags") or [])

    questions = []
    for i in range(5):
        cls, badge, wcolor = _STYLE[i]
        if slots[i]:
            category, text, expected, red = slots[i]
            questions.append({
                "id": f"0{i + 1}", "category": category, "categoryColor": cls, "badgeBg": badge,
                "duration": "3 phút", "weight": "20%", "weightColor": wcolor,
                "question": text, "expected": list(expected), "redFlags": list(red),
                "source": "bank" if i != 1 else "cv",
            })
        elif i < len(legacy):
            questions.append({**legacy[i], "id": f"0{i + 1}", "source": "legacy"})
    return questions
