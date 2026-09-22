# -*- coding: utf-8 -*-
"""
industry_skills_source.py
==========================
Nguồn skill DUY NHẤT cho các script sinh data training (M1 NER, M2 Embedding),
parse trực tiếp từ 3 file SQL đã chạy thật vào Supabase:
  - migration_v3_industry_taxonomy.sql   (17 nhóm lớn)
  - migration_v4_industry_branches.sql   (56 nhánh nhỏ, có parent_slug)
  - migration_v5_skills_seed.sql         (573 skill gốc + 35 soft skill)
  - migration_v10_skills_seed_v2.sql     (192 skill bổ sung, 58 nganh)
  - migration_v11_skills_expand_all.sql  (730 skill bổ sung, 73/73 nganh)

KHÔNG tự bịa thêm ngành/skill nào — chỉ đọc lại đúng những gì đã có trong
Supabase (qua các file migration này), để data training luôn khớp với DB thật.

Dùng:
    from industry_skills_source import load_industries
    industries = load_industries()
    # industries["bat-dong-san-moi-gioi"] = {
    #   "name": "Môi giới / Tư vấn BĐS", "level": "branch",
    #   "parent_slug": "bat-dong-san",
    #   "skills": [("Môi giới bất động sản", ["real estate agent", ...]), ...],
    # }
"""
import re
from functools import lru_cache
from pathlib import Path

SUPABASE_DIR = Path(__file__).parent.parent.parent.parent / "apps" / "web" / "supabase"

GROUP_FILE = SUPABASE_DIR / "migration_v3_industry_taxonomy.sql"
BRANCH_FILE = SUPABASE_DIR / "migration_v4_industry_branches.sql"
SKILL_FILES = [
    SUPABASE_DIR / "migration_v5_skills_seed.sql",
    SUPABASE_DIR / "migration_v10_skills_seed_v2.sql",
    SUPABASE_DIR / "migration_v11_skills_expand_all.sql",
]

_STR = r"'((?:[^'\\]|\\.)*)'"
_GROUP_RE = re.compile(
    r"\(null,\s*'group',\s*" + _STR + r",\s*" + _STR
)
_BRANCH_RE = re.compile(
    r"\(\(select id from public\.industries where slug = " + _STR + r"\),\s*'branch',\s*"
    + _STR + r",\s*" + _STR
)
_SKILL_RE = re.compile(
    r"\(\(select id from public\.industries where slug = " + _STR + r"\),\s*'hard',\s*"
    + _STR + r",\s*ARRAY\[(.*?)\]\)",
    re.DOTALL,
)
_SOFT_RE = re.compile(
    r"\(null,\s*'soft',\s*" + _STR + r",\s*ARRAY\[(.*?)\]\)",
    re.DOTALL,
)
_ALIAS_ITEM_RE = re.compile(r"'((?:[^'\\]|\\.)*)'")


def _unescape(s: str) -> str:
    return s.replace("\\'", "'").replace("''", "'")


def _parse_aliases(raw: str) -> list[str]:
    return [_unescape(m.group(1)) for m in _ALIAS_ITEM_RE.finditer(raw)]


@lru_cache(maxsize=1)
def load_industries() -> dict:
    """Trả về {slug: {"name","level","parent_slug","skills":[(name,aliases),...]}}"""
    industries: dict[str, dict] = {}

    group_sql = GROUP_FILE.read_text(encoding="utf-8")
    for m in _GROUP_RE.finditer(group_sql):
        name, slug = _unescape(m.group(1)), m.group(2)
        industries[slug] = {"name": name, "level": "group", "parent_slug": None, "skills": []}

    branch_sql = BRANCH_FILE.read_text(encoding="utf-8")
    for m in _BRANCH_RE.finditer(branch_sql):
        parent_slug, name, slug = m.group(1), _unescape(m.group(2)), m.group(3)
        industries[slug] = {"name": name, "level": "branch", "parent_slug": parent_slug, "skills": []}

    soft_skills: list[tuple[str, list[str]]] = []
    for path in SKILL_FILES:
        sql = path.read_text(encoding="utf-8")
        for m in _SKILL_RE.finditer(sql):
            slug, name, alias_raw = m.group(1), _unescape(m.group(2)), m.group(3)
            if slug not in industries:
                continue  # an toàn: bỏ qua slug lạ (không nên xảy ra)
            industries[slug]["skills"].append((name, _parse_aliases(alias_raw)))
        for m in _SOFT_RE.finditer(sql):
            name, alias_raw = _unescape(m.group(1)), m.group(2)
            soft_skills.append((name, _parse_aliases(alias_raw)))

    # Khử trùng skill theo tên (không phân biệt hoa/thường) trong cùng 1 ngành
    for slug, info in industries.items():
        seen = set()
        deduped = []
        for name, aliases in info["skills"]:
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append((name, aliases))
        info["skills"] = deduped

    industries["__soft__"] = {"name": "Kỹ năng mềm (chung)", "level": "soft",
                               "parent_slug": None, "skills": soft_skills}
    return industries


if __name__ == "__main__":
    data = load_industries()
    groups = [s for s, v in data.items() if v["level"] == "group"]
    branches = [s for s, v in data.items() if v["level"] == "branch"]
    print(f"Nhom lon : {len(groups)}")
    print(f"Nhanh nho: {len(branches)}")
    print(f"Soft skill (chung): {len(data['__soft__']['skills'])}")
    empty = [s for s in groups + branches if not data[s]["skills"]]
    print(f"Slug KHONG co skill nao: {empty if empty else 'khong co'}")
    total_skills = sum(len(data[s]["skills"]) for s in groups + branches)
    print(f"Tong skill (hard, 73 nganh): {total_skills}")
    print("\nVi du 'bat-dong-san-moi-gioi':")
    ex = data["bat-dong-san-moi-gioi"]
    print(f"  name={ex['name']!r} parent={ex['parent_slug']!r} so_skill={len(ex['skills'])}")
    print(f"  3 skill dau: {ex['skills'][:3]}")
