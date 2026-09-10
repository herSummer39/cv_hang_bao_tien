"""
Section Parser — Cấu trúc hóa raw text CV thành JSON hoàn chỉnh.
Không dùng AI/model, chỉ dùng regex + heuristic tiếng Việt.
Không mất bất kỳ thông tin nào — toàn bộ text gốc vẫn được giữ.
"""
import re
from dataclasses import dataclass, field, asdict
from typing import Optional


# ─── Section header keywords (tiếng Việt + tiếng Anh) ────────────────────────

SECTION_PATTERNS = {
    "objective":   r"(mục\s*tiêu|objective|career\s*goal|giới\s*thiệu\s*bản\s*thân|summary)",
    "education":   r"(học\s*vấn|education|trình\s*độ\s*học\s*vấn|đào\s*tạo)",
    "experience":  r"(kinh\s*nghiệm|experience|work\s*history|lịch\s*sử\s*công\s*tác)",
    "skills":      r"(kỹ\s*năng|skills|năng\s*lực|competenc)",
    "projects":    r"(dự\s*án|project|sản\s*phẩm|portfolio|công\s*trình)",
    "awards":      r"(giải\s*thưởng|award|chứng\s*chỉ|certificate|thành\s*tích)",
    "languages":   r"(ngoại\s*ngữ|language|ngôn\s*ngữ)",
    "activities":  r"(hoạt\s*động|activit|tình\s*nguyện|volunteer)",
    "references":  r"(tham\s*khảo|reference|người\s*tham\s*chiếu)",
}

# ─── Dataclasses ──────────────────────────────────────────────────────────────

@dataclass
class ContactInfo:
    full_name:  str = ""
    phone:      list[str] = field(default_factory=list)
    email:      list[str] = field(default_factory=list)
    github:     str = ""
    linkedin:   str = ""
    website:    str = ""
    address:    str = ""

@dataclass
class ExperienceEntry:
    company:     str = ""
    role:        str = ""
    start_date:  str = ""
    end_date:    str = ""
    description: list[str] = field(default_factory=list)

@dataclass
class EducationEntry:
    school:      str = ""
    major:       str = ""
    degree:      str = ""
    start_date:  str = ""
    end_date:    str = ""
    description: list[str] = field(default_factory=list)

@dataclass
class ProjectEntry:
    name:        str = ""
    url:         str = ""
    start_date:  str = ""
    end_date:    str = ""
    role:        str = ""
    tech_stack:  list[str] = field(default_factory=list)
    description: list[str] = field(default_factory=list)

@dataclass
class SkillGroup:
    category:   str = ""
    items:      list[str] = field(default_factory=list)

@dataclass
class StructuredCV:
    # Thông tin cơ bản
    contact:     ContactInfo = field(default_factory=ContactInfo)
    objective:   str = ""

    # Sections chính
    education:   list[EducationEntry]  = field(default_factory=list)
    experience:  list[ExperienceEntry] = field(default_factory=list)
    projects:    list[ProjectEntry]    = field(default_factory=list)
    skills:      list[SkillGroup]      = field(default_factory=list)
    all_skills_flat: list[str]         = field(default_factory=list)  # Flat list cho NER

    # Sections phụ (không mất thông tin)
    awards:      list[str] = field(default_factory=list)
    languages:   list[str] = field(default_factory=list)
    activities:  list[str] = field(default_factory=list)
    references:  list[str] = field(default_factory=list)
    other:       list[str] = field(default_factory=list)  # Phần không nhận dạng được

    # Meta
    raw_text:    str = ""  # Giữ lại toàn bộ raw text gốc


# ─── Regex helpers ─────────────────────────────────────────────────────────────

_RE_PHONE   = re.compile(r"(?:\+?84|0)[0-9]{8,9}")
_RE_EMAIL   = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_RE_GITHUB  = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[\w\-\.]+", re.IGNORECASE)
_RE_LINKEDIN= re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+", re.IGNORECASE)
_RE_URL     = re.compile(r"https?://[\S]+|www\.[\S]+", re.IGNORECASE)
_RE_DATE    = re.compile(
    r"(\d{1,2}/\d{4}|\d{4}|tháng\s*\d{1,2}[\s,/]\d{4}|"
    r"hiện\s*tại|nay|present|current)",
    re.IGNORECASE
)
_RE_DATE_RANGE = re.compile(
    r"(\d{1,2}/\d{4}|\d{4}|tháng\s*\d+\s*[\w,/]*\s*\d{4})"
    r"\s*[-–—to/tới\s]+\s*"
    r"(\d{1,2}/\d{4}|\d{4}|hiện\s*tại|nay|present|current)",
    re.IGNORECASE
)


def _is_section_header(line: str) -> Optional[str]:
    """Kiểm tra dòng có phải section header không. Trả về key hoặc None."""
    clean = line.strip().rstrip(":").upper()
    # Section header thường: IN HOA, ngắn < 60 ký tự, không phải câu
    if len(clean) > 60 or len(clean) < 3:
        return None
    for section_key, pattern in SECTION_PATTERNS.items():
        if re.search(pattern, clean, re.IGNORECASE):
            return section_key
    return None


def _extract_date_range(text: str) -> tuple[str, str]:
    """Trích xuất cặp ngày (start, end) từ chuỗi text."""
    m = _RE_DATE_RANGE.search(text)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    dates = _RE_DATE.findall(text)
    if len(dates) >= 2:
        return str(dates[0]), str(dates[1])
    if len(dates) == 1:
        return str(dates[0]), ""
    return "", ""


def _clean_bullet(text: str) -> str:
    """Xóa ký tự bullet đầu dòng."""
    return re.sub(r"^[\s•·▪▸►\-\*]+", "", text).strip()


# ─── Contact extractor ─────────────────────────────────────────────────────────

def _extract_contact(all_lines: list[str]) -> tuple[ContactInfo, int]:
    """
    Trích xuất thông tin liên hệ bằng cách quét TOÀN BỘ text.
    Trả về (ContactInfo, số dòng header đã consume).
    """
    contact = ContactInfo()
    consumed = 0

    # ── Tên người: quét các dòng đầu (header), không có số/email ──
    for i, line in enumerate(all_lines[:10]):
        line_s = line.strip()
        if not line_s or _RE_PHONE.search(line_s) or _RE_EMAIL.search(line_s):
            continue
        # Bỏ qua section headers
        if _is_section_header(line_s):
            break
        words = line_s.split()
        # Tên: 2-5 từ, mỗi từ bắt đầu bằng chữ hoa, không quá dài
        if (2 <= len(words) <= 5
                and all(w and w[0].isupper() for w in words)
                and len(line_s) < 50):
            contact.full_name = line_s
            consumed = i + 1
            break

    # ── Quét TOÀN BỘ document để lấy contact info ──
    full_text = "\n".join(all_lines)

    phones = _RE_PHONE.findall(full_text)
    contact.phone = list(dict.fromkeys(phones))  # dedup, giữ thứ tự

    emails = _RE_EMAIL.findall(full_text)
    contact.email = list(dict.fromkeys(emails))

    gh = _RE_GITHUB.search(full_text)
    if gh:
        raw = gh.group(0)
        contact.github = raw if raw.startswith("http") else "https://" + raw

    li = _RE_LINKEDIN.search(full_text)
    if li:
        raw = li.group(0)
        contact.linkedin = raw if raw.startswith("http") else "https://" + raw

    # Website (không phải github/linkedin)
    for url in _RE_URL.findall(full_text):
        ul = url.lower()
        if "github" not in ul and "linkedin" not in ul:
            contact.website = url
            break

    # Địa chỉ
    addr_re = re.compile(
        r"(quận|huyện|tp\.|thành\s*phố|tỉnh|district|city|đường|phường)",
        re.IGNORECASE
    )
    for line in all_lines:
        if addr_re.search(line) and not contact.address:
            # Loại bỏ ký tự đặc biệt đầu dòng
            contact.address = re.sub(r"^[^\w]+", "", line).strip()
            break

    return contact, consumed


# ─── Section splitter ──────────────────────────────────────────────────────────

def _split_into_sections(lines: list[str]) -> dict[str, list[str]]:
    """Tách raw lines thành dict {section_key: [lines]}."""
    sections: dict[str, list[str]] = {"_header": []}
    current = "_header"

    for line in lines:
        header_key = _is_section_header(line)
        if header_key:
            current = header_key
            if current not in sections:
                sections[current] = []
        else:
            sections.setdefault(current, []).append(line)

    return sections


# ─── Sub-parsers ───────────────────────────────────────────────────────────────

def _parse_skills_section(lines: list[str]) -> tuple[list[SkillGroup], list[str]]:
    """Parse section kỹ năng — hỗ trợ cả dạng nhóm và dạng flat."""
    groups: list[SkillGroup] = []
    all_skills: list[str] = []

    CATEGORY_RE = re.compile(r"^([\w\s/&]+):\s*(.*)$")

    for line in lines:
        line = line.strip()
        if not line:
            continue
        m = CATEGORY_RE.match(line)
        if m:
            category = m.group(1).strip()
            items_str = m.group(2).strip()
        else:
            category = "Khác"
            items_str = line

        # Split items bằng dấu phẩy hoặc "|" hoặc "/"
        raw_items = re.split(r"[,|/、]", items_str)
        items = [_clean_bullet(i) for i in raw_items if i.strip()]
        items = [i for i in items if len(i) > 1]

        if items:
            # Ghép vào group nếu cùng category
            existing = next((g for g in groups if g.category == category), None)
            if existing:
                existing.items.extend(items)
            else:
                groups.append(SkillGroup(category=category, items=items))
            all_skills.extend(items)

    return groups, list(set(all_skills))


def _parse_experience_section(lines: list[str]) -> list[ExperienceEntry]:
    """Parse section kinh nghiệm làm việc."""
    entries: list[ExperienceEntry] = []
    current: Optional[ExperienceEntry] = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        date_match = _RE_DATE_RANGE.search(line)
        has_date = bool(date_match or _RE_DATE.search(line))

        # Heuristic: dòng có tên công ty thường CÓ ngày hoặc là dòng IN HOA ngắn
        is_company_line = (
            has_date and len(line) < 80
            or (line.isupper() and 3 < len(line) < 60)
        )

        if is_company_line and current is None:
            current = ExperienceEntry()
            # Tách tên công ty và ngày
            date_part = date_match.group(0) if date_match else ""
            company_part = line.replace(date_part, "").strip()
            current.company = company_part
            start, end = _extract_date_range(line)
            current.start_date, current.end_date = start, end
            entries.append(current)

        elif current is not None and not current.role and not has_date and len(line) < 80:
            # Dòng liền sau tên công ty thường là tên role/vị trí
            current.role = _clean_bullet(line)

        elif current is not None:
            # Các dòng mô tả
            bullet = _clean_bullet(line)
            if bullet:
                current.description.append(bullet)

    return entries


def _parse_education_section(lines: list[str]) -> list[EducationEntry]:
    """Parse section học vấn."""
    entries: list[EducationEntry] = []
    current: Optional[EducationEntry] = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        has_date = bool(_RE_DATE.search(line))

        if has_date and len(line) < 100:
            if current:
                entries.append(current)
            current = EducationEntry()
            start, end = _extract_date_range(line)
            current.start_date, current.end_date = start, end
            # Tên trường thường là phần còn lại sau khi xóa ngày
            school_part = _RE_DATE_RANGE.sub("", line).strip()
            school_part = _RE_DATE.sub("", school_part).strip().strip("-–—").strip()
            if school_part:
                current.school = school_part
        elif current is not None:
            bullet = _clean_bullet(line)
            if bullet:
                if not current.major:
                    current.major = bullet
                else:
                    current.description.append(bullet)

    if current:
        entries.append(current)
    return entries


def _parse_projects_section(lines: list[str]) -> list[ProjectEntry]:
    """Parse section dự án / sản phẩm."""
    entries: list[ProjectEntry] = []
    current: Optional[ProjectEntry] = None

    TECH_RE = re.compile(r"(công\s*nghệ|tech\s*stack|sử\s*dụng|framework|tool)", re.IGNORECASE)
    URL_LINE = re.compile(r"(website|url|link|demo).*:", re.IGNORECASE)

    for line in lines:
        line = line.strip()
        if not line:
            continue

        has_date = bool(_RE_DATE.search(line))
        url_m = _RE_URL.search(line)

        # Dòng tiêu đề dự án: có ngày hoặc chứa tên project
        if has_date and current is None or (has_date and len(line) < 100):
            if current:
                entries.append(current)
            current = ProjectEntry()
            start, end = _extract_date_range(line)
            current.start_date, current.end_date = start, end
            name_part = _RE_DATE_RANGE.sub("", line).strip().strip("-–—|").strip()
            if name_part:
                current.name = name_part
            entries.append(current)
            continue

        if current is None:
            current = ProjectEntry()
            current.name = _clean_bullet(line)
            entries.append(current)
            continue

        if url_m and not current.url:
            current.url = url_m.group(0)
        elif TECH_RE.search(line):
            # Trích tech stack
            tech_part = re.split(r"[:：]", line, maxsplit=1)[-1]
            techs = re.split(r"[,，、;]", tech_part)
            current.tech_stack.extend([t.strip() for t in techs if t.strip()])
        else:
            bullet = _clean_bullet(line)
            if bullet:
                current.description.append(bullet)

    return entries


# ─── Main parser ───────────────────────────────────────────────────────────────

def parse_cv_sections(raw_text: str) -> StructuredCV:
    """
    Hàm chính: raw text → StructuredCV.
    Không mất thông tin — các phần không nhận dạng được lưu vào other[].
    """
    lines = raw_text.splitlines()
    lines = [l for l in lines if l.strip()]

    # 1. Trích contact từ phần đầu
    contact, header_consumed = _extract_contact(lines)

    # 2. Tách sections
    sections = _split_into_sections(lines[header_consumed:])

    # 3. Parse từng section
    cv = StructuredCV(raw_text=raw_text, contact=contact)

    if "objective" in sections:
        cv.objective = " ".join(l.strip() for l in sections["objective"] if l.strip())

    if "education" in sections:
        cv.education = _parse_education_section(sections["education"])

    if "experience" in sections:
        cv.experience = _parse_experience_section(sections["experience"])

    if "projects" in sections:
        cv.projects = _parse_projects_section(sections["projects"])

    if "skills" in sections:
        cv.skills, cv.all_skills_flat = _parse_skills_section(sections["skills"])

    if "awards" in sections:
        cv.awards = [_clean_bullet(l) for l in sections["awards"] if l.strip()]

    if "languages" in sections:
        cv.languages = [_clean_bullet(l) for l in sections["languages"] if l.strip()]

    if "activities" in sections:
        cv.activities = [_clean_bullet(l) for l in sections["activities"] if l.strip()]

    if "references" in sections:
        cv.references = [_clean_bullet(l) for l in sections["references"] if l.strip()]

    # 4. Phần không nhận dạng — giữ lại không mất
    for key, lines_list in sections.items():
        if key not in list(SECTION_PATTERNS.keys()) + ["_header", "objective",
                          "education", "experience", "projects", "skills",
                          "awards", "languages", "activities", "references"]:
            cv.other.extend([_clean_bullet(l) for l in lines_list if l.strip()])

    return cv


def structured_cv_to_dict(cv: StructuredCV) -> dict:
    """Chuyển StructuredCV thành dict để JSON serialize."""
    return asdict(cv)
