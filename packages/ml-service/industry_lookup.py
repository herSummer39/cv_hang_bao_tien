"""
industry_lookup.py
==================
Module tra cứu ngành + kỹ năng theo industry-aware approach.

Public API:
  init_cache(supabase_client)                     -- gọi 1 lần khi worker khởi động
  detect_industry(job_title, jd_text) -> dict|None -- tự đoán ngành từ text
  get_skills_for_industry(industry_id) -> dict     -- {"hard":[...], "soft":[...]}

Hoạt động KHÔNG có Supabase (offline / main.py) khi supabase_client=None:
  fallback về local skills dict (build từ ALL_DOMAIN_KEYWORDS theo ngành).
"""
import re
import sys
import time
import logging
import unicodedata
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)

# ── Import classify() từ scripts/build_industry_map_v2.py ────────────────────
_SCRIPTS_DIR = Path(__file__).parent / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from build_industry_map_v2 import (
    NHOM_LON, KEYWORD_MAP, _SORTED_KEYS, _strip_accents, classify
)

# ── Map NHOM_LON index → group slug (khớp với migration_v3) ──────────────────
NHOM_IDX_TO_GROUP_SLUG: dict[int, str] = {
    0:  "kinh-doanh-ban-hang",
    1:  "marketing-truyen-thong",
    2:  "cntt",
    3:  "ke-toan-tai-chinh",
    4:  "nhan-su-hanh-chinh",
    5:  "dich-vu-khach-hang",
    6:  "thiet-ke-kien-truc",
    7:  "khach-san-nha-hang-du-lich",
    8:  "y-te-duoc",
    9:  "xay-dung",
    10: "dien-dien-tu-vien-thong",
    11: "bat-dong-san",
    12: "co-khi-che-tao",
    13: "van-tai-logistics",
    14: "san-xuat-qa-qc",
    15: "giao-duc-dao-tao",
    16: "lao-dong-pho-thong",
}

# ── Map (group_idx, branch_name_normalized) → branch slug ────────────────────
# branch_name_normalized = _strip_accents(branch_name.lower()).strip()
def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", " ", _strip_accents(s.lower())).strip()

_RAW_BRANCH_MAP: list[tuple[int, str, str]] = [
    # (group_idx, raw_branch_name_from_KEYWORD_MAP, branch_slug)
    (0,  "Kinh doanh tong hop",          "kinh-doanh-ban-hang-tong-hop"),
    (0,  "Ban hang",                      "kinh-doanh-ban-hang-ban-hang"),
    (0,  "Sale/Dai dien kinh doanh",      "kinh-doanh-ban-hang-sale"),
    (0,  "Telesale",                      "kinh-doanh-ban-hang-sale"),
    (0,  "Ban le - Ban si",               "kinh-doanh-ban-hang-ban-le-si"),
    (0,  "Thu ngan",                      "kinh-doanh-ban-hang-thu-ngan"),
    (1,  "Marketing tong hop",            "marketing-tong-hop"),
    (1,  "Truyen thong / PR",             "marketing-truyen-thong-pr"),
    (1,  "Quang cao",                     "marketing-tong-hop"),
    (1,  "Content",                       "marketing-tong-hop"),
    (1,  "SEO/Digital",                   "marketing-seo-digital"),
    (1,  "Bao chi - Truyen hinh",         "marketing-bao-chi-truyen-hinh"),
    (1,  "Bien - Phien dich",             "marketing-bien-phien-dich"),
    (1,  "To chuc su kien",               "marketing-to-chuc-su-kien"),
    (2,  "Phat trien phan mem",           "cntt-phat-trien-phan-mem"),
    (2,  "Phan cung / Mang",              "cntt-phan-cung-mang"),
    (2,  "QA/Tester",                     "cntt-phat-trien-phan-mem"),
    (2,  "Data/AI",                       "cntt-phat-trien-phan-mem"),
    (3,  "Ke toan",                       "ke-toan-tai-chinh-ke-toan"),
    (3,  "Kiem toan",                     "ke-toan-tai-chinh-kiem-toan"),
    (3,  "Ngan hang",                     "ke-toan-tai-chinh-ngan-hang"),
    (3,  "Tai chinh / Dau tu",            "ke-toan-tai-chinh-tai-chinh"),
    (3,  "Bao hiem",                      "ke-toan-tai-chinh"),
    (3,  "Chung khoan / Dau tu",          "ke-toan-tai-chinh-chung-khoan"),
    (4,  "Tuyen dung / C&B",              "nhan-su-tuyen-dung-cb"),
    (4,  "Hanh chinh van phong",          "nhan-su-hanh-chinh-van-phong"),
    (4,  "Thu ky / Tro ly",               "nhan-su-thu-ky-tro-ly"),
    (4,  "Phap ly / Phap che",            "nhan-su-phap-ly-phap-che"),
    (5,  "CSKH",                          "dich-vu-khach-hang-cskh"),
    (5,  "CSKH qua dien thoai",           "dich-vu-khach-hang-cskh"),
    (6,  "Thiet ke do hoa",               "thiet-ke-do-hoa"),
    (6,  "Thiet ke noi that",             "thiet-ke-noi-that"),
    (6,  "Kien truc",                     "thiet-ke-kien-truc-kien-truc"),
    (6,  "My thuat / Nghe thuat",         "thiet-ke-my-thuat"),
    (7,  "Khach san",                     "khach-san-khach-san"),
    (7,  "Nha hang / F&B",               "khach-san-nha-hang-fb"),
    (7,  "Du lich / Le hanh",             "khach-san-du-lich-le-hanh"),
    (7,  "Spa / Lam dep",                 "khach-san-spa-lam-dep"),
    (7,  "Le tan",                        "khach-san-khach-san"),
    (7,  "Bep / Am thuc",                 "khach-san-nha-hang-fb"),
    (7,  "Pha che / Bar",                 "khach-san-nha-hang-fb"),
    (8,  "Y te",                          "y-te-duoc-y-te"),
    (8,  "Duoc pham",                     "y-te-duoc-duoc-pham"),
    (8,  "Dieu duong",                    "y-te-duoc-y-te"),
    (8,  "Trinh duoc vien",               "y-te-duoc-duoc-pham"),
    (9,  "Ky su / Giam sat xay dung",     "xay-dung-ky-su"),
    (9,  "Du toan / QS",                  "xay-dung-ky-su"),
    (9,  "Cau duong",                     "xay-dung-ky-su"),
    (10, "Vien thong",                    "dien-dien-tu-vien-thong-vt"),
    (10, "Buu chinh",                     "dien-dien-tu-vien-thong-vt"),
    (10, "Dien lanh",                     "dien-dien-tu-dien-lanh"),
    (10, "Dien cong nghiep",              "dien-dien-tu-dien-lanh"),
    (11, "Moi gioi / Tu van BDS",         "bat-dong-san-moi-gioi"),
    (12, "Co khi che tao",                "co-khi-che-tao-co-khi"),
    (12, "Tu dong hoa",                   "co-khi-tu-dong-hoa"),
    (12, "O to",                          "co-khi-o-to"),
    (13, "Logistics / Kho van",           "van-tai-logistics-kho-van"),
    (13, "Xuat nhap khau",                "van-tai-xuat-nhap-khau"),
    (13, "Giao nhan / Van chuyen",        "van-tai-giao-nhan"),
    (14, "Quan ly san xuat",              "san-xuat-quan-ly"),
    (14, "QA/QC",                         "san-xuat-qa-qc-qa-qc"),
    (14, "Det may / Da giay",             "san-xuat-det-may"),
    (14, "Thuc pham / Do uong (SX)",      "san-xuat-thuc-pham"),
    (14, "My pham / Trang suc",           "san-xuat-my-pham"),
    (14, "Nong - Lam - Ngu",              "san-xuat-nong-nghiep"),
    (14, "Moi truong / Xu ly chat thai",  "san-xuat-moi-truong"),
    (14, "Dau khi / Hoa chat",            "san-xuat-qa-qc"),       # fallback group
    (14, "Hang khong / Hang hai",         "san-xuat-qa-qc"),       # fallback group
    (14, "In an / Xuat ban",              "san-xuat-qa-qc"),       # fallback group
    (15, "Giang day",                     "giao-duc-giang-day"),
    (15, "Dao tao noi bo",                "giao-duc-giang-day"),
    (15, "Tro giang",                     "giao-duc-giang-day"),
    (15, "Gia su",                        "giao-duc-giang-day"),
    (16, "Cong nhan",                     "lao-dong-pho-thong-cong-nhan"),
    (16, "Bao ve",                        "lao-dong-pho-thong-bao-ve"),
    (16, "Tap vu / Giup viec",            "lao-dong-pho-thong-tap-vu"),
    (16, "Lai xe (khong uu tien train)",  "lao-dong-pho-thong-lai-xe"),
    (16, "Lao dong pho thong khac",       "lao-dong-pho-thong-cong-nhan"),
    (16, "Phu xe",                        "lao-dong-pho-thong-lai-xe"),
    (16, "Boc xep",                       "lao-dong-pho-thong-cong-nhan"),
]

BRANCH_TO_SLUG: dict[tuple[int, str], str] = {
    (idx, _norm(branch)): slug
    for idx, branch, slug in _RAW_BRANCH_MAP
}


# ══════════════════════════════════════════════════════════════════════════════
# Cache — load từ Supabase, TTL = 10 phút
# ══════════════════════════════════════════════════════════════════════════════
_CACHE_TTL = 600  # giây

class _Cache:
    def __init__(self):
        self._industries: list[dict] = []  # [{id, parent_id, level, name, slug}, ...]
        self._skills: list[dict] = []      # [{id, industry_id, skill_type, name, aliases}, ...]
        self._questions: list[dict] = []   # ngân hàng câu hỏi phỏng vấn (migration v15)
        self._by_slug: dict[str, dict] = {}   # slug → industry row
        self._by_id: dict[str, dict] = {}     # id   → industry row
        self._loaded_at: float = 0.0
        self._supabase = None

    def is_stale(self) -> bool:
        return time.time() - self._loaded_at > _CACHE_TTL

    def init(self, supabase_client) -> None:
        self._supabase = supabase_client
        self._reload()

    def _reload(self) -> None:
        if self._supabase is None:
            return
        try:
            ind_resp = self._supabase.table("industries").select("*").execute()
            sk_resp  = self._supabase.table("skills").select("*").execute()
            self._industries = ind_resp.data or []
            self._skills     = sk_resp.data or []
            self._by_slug    = {r["slug"]: r for r in self._industries}
            self._by_id      = {r["id"]:   r for r in self._industries}
            self._loaded_at  = time.time()
            log.info(f"[industry_lookup] Loaded {len(self._industries)} industries, "
                     f"{len(self._skills)} skills from Supabase")
        except Exception as e:
            log.warning(f"[industry_lookup] Reload thất bại: {e}")
        # Ngân hàng câu hỏi — tách riêng: chưa chạy migration v15 thì chỉ cảnh báo,
        # worker vẫn chạy (câu hỏi phỏng vấn dùng lại cách sinh cũ).
        try:
            q_resp = (self._supabase.table("interview_questions")
                      .select("id, industry_id, skill_tag, question_type, difficulty, question, expected, red_flags")
                      .execute())
            self._questions = q_resp.data or []
            log.info(f"[industry_lookup] Loaded {len(self._questions)} câu hỏi phỏng vấn theo ngành")
        except Exception as e:
            self._questions = []
            log.warning(f"[industry_lookup] Chưa tải được ngân hàng câu hỏi (đã chạy migration v15?): {e}")

    def refresh_if_stale(self) -> None:
        if self.is_stale():
            self._reload()

    def get_industry_by_slug(self, slug: str) -> dict | None:
        self.refresh_if_stale()
        return self._by_slug.get(slug)

    def get_industry_by_id(self, iid: str) -> dict | None:
        self.refresh_if_stale()
        return self._by_id.get(iid)

    def get_parent(self, industry: dict) -> dict | None:
        pid = industry.get("parent_id")
        if not pid:
            return None
        return self._by_id.get(pid)

    @property
    def skills(self) -> list[dict]:
        self.refresh_if_stale()
        return self._skills

    @property
    def questions(self) -> list[dict]:
        self.refresh_if_stale()
        return self._questions

    @property
    def loaded(self) -> bool:
        return bool(self._industries)


_CACHE = _Cache()


# ══════════════════════════════════════════════════════════════════════════════
# Public API — init
# ══════════════════════════════════════════════════════════════════════════════

def init_cache(supabase_client) -> None:
    """Gọi 1 lần trong worker khi khởi động, truyền đúng supabase client."""
    _CACHE.init(supabase_client)


# ══════════════════════════════════════════════════════════════════════════════
# Public API — detect_industry
# ══════════════════════════════════════════════════════════════════════════════

def detect_industry(job_title: str, jd_text: str) -> dict | None:
    """
    Tự đoán ngành từ job_title + JD text.

    Trả về dict gồm:
      {
        "group_slug":  str,        # slug nhóm lớn
        "branch_slug": str | None, # slug nhánh nhỏ (nếu detect được)
        "group_id":    str | None, # UUID trong bảng industries (None nếu offline)
        "branch_id":   str | None,
        "nhom_lon":    str,        # tên nhóm lớn (không dấu)
        "nhanh_nho":   str,        # tên nhánh nhỏ (không dấu)
      }
    Trả về None nếu không match được gì.
    """
    probe = f"{job_title} {jd_text[:600]}"
    nhom_lon_name, nhanh_nho_name = classify(probe)
    if nhom_lon_name is None:
        return None

    # Tìm group index
    try:
        group_idx = NHOM_LON.index(nhom_lon_name)
    except ValueError:
        return None

    group_slug  = NHOM_IDX_TO_GROUP_SLUG.get(group_idx)
    if group_slug is None:
        return None

    # Tìm branch slug
    branch_key  = (group_idx, _norm(nhanh_nho_name))
    branch_slug = BRANCH_TO_SLUG.get(branch_key)

    # Tra UUID từ cache (nếu có Supabase)
    group_id  = None
    branch_id = None
    if _CACHE.loaded:
        g = _CACHE.get_industry_by_slug(group_slug)
        if g:
            group_id = g["id"]
        if branch_slug:
            b = _CACHE.get_industry_by_slug(branch_slug)
            if b:
                branch_id = b["id"]

    return {
        "group_slug":  group_slug,
        "branch_slug": branch_slug,
        "group_id":    group_id,
        "branch_id":   branch_id,
        "nhom_lon":    nhom_lon_name,
        "nhanh_nho":   nhanh_nho_name,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Public API — get_skills_for_industry
# ══════════════════════════════════════════════════════════════════════════════

def get_skills_for_industry(industry_id: str | None) -> dict:
    """
    Trả về {"hard": [str,...], "soft": [str,...]}

    - soft: luôn lấy toàn bộ soft skill (industry_id = null)
    - hard:
        * Nếu industry_id là nhánh nhỏ → hard của nhánh đó
          + fallback lên hard của nhóm lớn cha nếu nhánh không có skill riêng
        * Nếu industry_id là nhóm lớn → hard của nhóm đó
        * Nếu industry_id là None     → hard = [] (caller tự dùng ALL_DOMAIN_KEYWORDS)

    Mỗi hard/soft skill được expand thành [name] + aliases để tăng recall.
    """
    soft_kws: list[str] = []
    hard_kws: list[str] = []

    if not _CACHE.loaded:
        # offline — trả rỗng để caller fallback
        return {"hard": [], "soft": []}

    # ── Soft skills (always) ──────────────────────────────────────────────────
    for sk in _CACHE.skills:
        if sk.get("industry_id") is None and sk.get("skill_type") == "soft":
            soft_kws.extend(_expand_skill(sk))

    # ── Hard skills (industry-specific) ──────────────────────────────────────
    if industry_id is not None:
        ind = _CACHE.get_industry_by_id(industry_id)
        if ind:
            # Lấy hard skill của chính industry này
            hard_kws = _hard_skills_for_id(industry_id)

            # Nếu là branch và không có hard skill riêng → fallback lên parent group
            if not hard_kws and ind.get("level") == "branch":
                parent = _CACHE.get_parent(ind)
                if parent:
                    hard_kws = _hard_skills_for_id(parent["id"])

            # Luôn gộp thêm hard skill của group (nếu đang ở branch)
            if ind.get("level") == "branch":
                parent = _CACHE.get_parent(ind)
                if parent:
                    parent_hard = _hard_skills_for_id(parent["id"])
                    existing = set(k.lower() for k in hard_kws)
                    for kw in parent_hard:
                        if kw.lower() not in existing:
                            hard_kws.append(kw)
                            existing.add(kw.lower())

    return {
        "hard": list(set(k.lower() for k in hard_kws)),
        "soft": list(set(k.lower() for k in soft_kws)),
    }


def _expand_skill(sk: dict) -> list[str]:
    """Trả về [name] + tất cả aliases của 1 skill row."""
    terms = [sk["name"]]
    aliases = sk.get("aliases") or []
    if isinstance(aliases, list):
        terms.extend(aliases)
    return [t.lower() for t in terms if t]


def _hard_skills_for_id(industry_id: str) -> list[str]:
    """Collect tất cả hard skill terms (name + aliases) cho 1 industry_id cụ thể."""
    result = []
    for sk in _CACHE.skills:
        if sk.get("industry_id") == industry_id and sk.get("skill_type") == "hard":
            result.extend(_expand_skill(sk))
    return result


# ══════════════════════════════════════════════════════════════════════════════
# Tiện ích: resolve industry_id ưu tiên branch > group
# ══════════════════════════════════════════════════════════════════════════════

def resolve_best_industry_id(detect_result: dict) -> str | None:
    """
    Từ kết quả detect_industry(), trả về:
      - branch_id nếu có
      - group_id nếu không có branch_id
      - None nếu không có gì
    """
    if detect_result is None:
        return None
    return detect_result.get("branch_id") or detect_result.get("group_id")


# ══════════════════════════════════════════════════════════════════════════════
# Tiện ích: category rộng (7 nhóm) cho 17 nhóm ngành lớn — dùng để chọn cách
# diễn đạt câu hỏi phỏng vấn phù hợp bối cảnh ngành (VD: không dùng từ "production"
# cho ngành kế toán/bán hàng). Đồng bộ với GROUP_CATEGORY trong
# scripts/generate_training_data_v2.py — nếu sửa 1 chỗ thì sửa luôn chỗ kia.
# ══════════════════════════════════════════════════════════════════════════════
GROUP_CATEGORY = {
    "kinh-doanh-ban-hang":        "sales",
    "marketing-truyen-thong":     "office",
    "cntt":                       "office",
    "ke-toan-tai-chinh":          "office",
    "nhan-su-hanh-chinh":         "office",
    "dich-vu-khach-hang":         "service",
    "thiet-ke-kien-truc":         "office",
    "khach-san-nha-hang-du-lich": "service",
    "y-te-duoc":                  "healthcare",
    "xay-dung":                   "technical",
    "dien-dien-tu-vien-thong":    "technical",
    "bat-dong-san":               "sales",
    "co-khi-che-tao":             "technical",
    "van-tai-logistics":          "technical",
    "san-xuat-qa-qc":             "technical",
    "giao-duc-dao-tao":           "education",
    "lao-dong-pho-thong":         "labor",
}


def resolve_display_name_and_category(industry_id: str | None) -> tuple[str | None, str | None]:
    """
    Từ industry_id (group hoặc branch, đã resolve xong), trả về:
      (display_name, category)
    - display_name: tên ngành để hiển thị trong câu hỏi phỏng vấn (VD "Kế toán
      thuế" nếu là branch, hoặc tên nhóm lớn nếu là group).
    - category: 1 trong 7 nhóm rộng (GROUP_CATEGORY) — dùng để chọn cách diễn
      đạt câu hỏi phù hợp bối cảnh ngành.
    Trả về (None, None) nếu không tra được (không có Supabase / industry_id lạ).
    """
    if not industry_id or not _CACHE.loaded:
        return None, None
    ind = _CACHE.get_industry_by_id(industry_id)
    if not ind:
        return None, None
    display_name = ind.get("name")
    group_slug = ind.get("slug")
    if ind.get("level") == "branch":
        parent = _CACHE.get_parent(ind)
        if parent:
            group_slug = parent.get("slug")
    category = GROUP_CATEGORY.get(group_slug)
    return display_name, category


def get_interview_bank(industry_id: str | None) -> dict:
    """Câu hỏi phỏng vấn cho ngành của job: {"industry": [...], "general": [...], "group_name": str|None}.

    Câu hỏi gắn ở cấp nhóm lớn → nếu industry_id là nhánh nhỏ thì lấy theo nhóm cha,
    cộng thêm câu gắn riêng cho nhánh (nếu có). "general" = câu không gắn ngành."""
    qs = _CACHE.questions
    general = [q for q in qs if not q.get("industry_id")]
    if not industry_id or not _CACHE.loaded:
        return {"industry": [], "general": general, "group_name": None}
    ind = _CACHE.get_industry_by_id(industry_id)
    if not ind:
        return {"industry": [], "general": general, "group_name": None}
    ids = {ind["id"]}
    group = ind
    if ind.get("level") == "branch":
        parent = _CACHE.get_parent(ind)
        if parent:
            ids.add(parent["id"])
            group = parent
    return {
        "industry": [q for q in qs if q.get("industry_id") in ids],
        "general": general,
        "group_name": group.get("name"),
    }
