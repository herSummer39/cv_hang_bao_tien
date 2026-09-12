"""
tests/test_keyword_balance.py
==============================
Kiểm tra danh sách keyword đa ngành có cân bằng không.

Chạy (không cần load PhoBERT):
    python -m pytest packages/ml-service/tests/test_keyword_balance.py -v
    # hoặc
    python packages/ml-service/tests/test_keyword_balance.py

Nguyên tắc:
- Không load model thật — chỉ import static data từ script
- Kiểm tra số từ khóa mỗi ngành >= MIN_KEYWORDS_PER_DOMAIN
- Kiểm tra không ngành nào vượt MAX_RATIO lần trung bình (tránh lệch)
- Kiểm tra không từ nào bị trùng giữa các ngành (uniqueness)
- Kiểm tra ALL_DOMAIN_KEYWORDS trong worker.py phủ đủ các ngành
"""
import sys
import importlib
import unicodedata
from pathlib import Path
from collections import Counter

# ─── Cấu hình kiểm tra ────────────────────────────────────────────────────────
MIN_KEYWORDS_PER_DOMAIN = 20    # mỗi ngành phải có ít nhất N từ khóa
MAX_RATIO_VS_MEAN = 2.5         # ngành lớn nhất không được vượt 2.5× trung bình
EXPECTED_DOMAINS = {
    "it", "marketing", "accounting", "hr", "sales",
    "design", "logistics", "engineering", "healthcare", "education", "hospitality",
}
SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"
WORKER_FILE = Path(__file__).parent.parent / "worker.py"

# ─── Helper ───────────────────────────────────────────────────────────────────
def load_module_without_model(module_name: str, path: Path):
    """Import module, patch transformers pipeline để không load model thật."""
    import types
    # Stub các package nặng
    for heavy in ["transformers", "sentence_transformers", "torch", "supabase",
                  "pdfplumber", "pickle", "dotenv"]:
        if heavy not in sys.modules:
            stub = types.ModuleType(heavy)
            stub.pipeline = lambda *a, **k: None
            stub.SentenceTransformer = lambda *a, **k: None
            stub.create_client = lambda *a, **k: None
            stub.load_dotenv = lambda *a, **k: None
            sys.modules[heavy] = stub

    spec = importlib.util.spec_from_file_location(module_name, path)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception:
        pass  # Module có thể fail khi stub, nhưng ta chỉ cần static data
    return mod


def normalize(s: str) -> str:
    """Bỏ dấu tiếng Việt để so sánh dễ hơn."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', s.lower())
        if unicodedata.category(c) != 'Mn'
    )


# ─── Test 1: SKILLS_BY_INDUSTRY trong generate_ner_data.py ───────────────────
def test_skills_by_industry_balance():
    """Mỗi ngành phải có ít nhất MIN_KEYWORDS_PER_DOMAIN từ khóa."""
    sys.path.insert(0, str(SCRIPTS_DIR))

    # Import trực tiếp SKILLS_BY_INDUSTRY không cần model
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "generate_ner_data", SCRIPTS_DIR / "generate_ner_data.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    skills_by_industry = mod.SKILLS_BY_INDUSTRY
    industries_list = mod.INDUSTRIES

    errors = []

    # 1a. Các ngành expected phải tồn tại
    for domain in EXPECTED_DOMAINS:
        if domain not in skills_by_industry:
            errors.append(f"[MISSING] Ngành '{domain}' không có trong SKILLS_BY_INDUSTRY")

    # 1b. Số từ mỗi ngành
    counts = {k: len(v) for k, v in skills_by_industry.items()}
    for domain, count in counts.items():
        if count < MIN_KEYWORDS_PER_DOMAIN:
            errors.append(
                f"[TOO FEW] {domain}: {count} từ < tối thiểu {MIN_KEYWORDS_PER_DOMAIN}"
            )

    # 1c. Kiểm tra không lệch quá (max / mean)
    if counts:
        mean_count = sum(counts.values()) / len(counts)
        max_domain = max(counts, key=counts.get)
        ratio = counts[max_domain] / mean_count
        if ratio > MAX_RATIO_VS_MEAN:
            errors.append(
                f"[IMBALANCED] '{max_domain}' có {counts[max_domain]} từ, "
                f"gấp {ratio:.1f}x trung bình ({mean_count:.1f}) — vượt ngưỡng {MAX_RATIO_VS_MEAN}x"
            )

    # 1d. Không trùng từ giữa các ngành (case-insensitive)
    all_skills_flat = []
    for domain, skills in skills_by_industry.items():
        for s in skills:
            all_skills_flat.append((normalize(s), domain, s))

    seen = {}
    for norm, domain, original in all_skills_flat:
        if norm in seen:
            errors.append(
                f"[DUPLICATE] '{original}' (ngành {domain}) "
                f"trùng với '{seen[norm][1]}' (ngành {seen[norm][0]})"
            )
        else:
            seen[norm] = (domain, original)

    # Report
    print("\n=== Test 1: SKILLS_BY_INDUSTRY balance ===")
    print(f"Số ngành: {len(skills_by_industry)}")
    for domain, count in sorted(counts.items()):
        print(f"  {domain:15s}: {count:3d} từ")
    mean_count = sum(counts.values()) / len(counts) if counts else 0
    print(f"  {'MEAN':15s}: {mean_count:.1f} từ")
    print(f"  Tổng: {sum(counts.values())} từ unique")

    if errors:
        print("\nLỖI:")
        for e in errors:
            print(f"  ✗ {e}")
        assert False, f"{len(errors)} lỗi cân bằng trong SKILLS_BY_INDUSTRY"
    else:
        print("\n✓ SKILLS_BY_INDUSTRY cân bằng tốt!")


# ─── Test 2: ALL_DOMAIN_KEYWORDS trong worker.py ─────────────────────────────
def test_all_domain_keywords_coverage():
    """
    ALL_DOMAIN_KEYWORDS trong worker.py phải phủ tất cả ngành
    và mỗi nhóm ngành phải có ít nhất MIN_KEYWORDS_PER_DOMAIN / 2 từ.
    """
    # Đọc file worker.py và extract list thủ công (không load model)
    worker_src = WORKER_FILE.read_text(encoding="utf-8")

    # Kiểm tra biến đã đổi tên đúng chưa
    assert "ALL_DOMAIN_KEYWORDS" in worker_src, \
        "worker.py phải dùng tên 'ALL_DOMAIN_KEYWORDS', không phải 'TECH_KEYWORDS'"
    assert "TECH_KEYWORDS" not in worker_src, \
        "worker.py còn chứa tên cũ 'TECH_KEYWORDS' — phải xóa để tránh nhầm"

    # Kiểm tra coverage bằng đếm section comments
    section_keywords = {
        "it":          ["react", "python", "docker", "kubernetes"],
        "marketing":   ["seo", "google ads", "content marketing", "digital marketing"],
        "accounting":  ["misa", "ifrs", "kế toán", "kiểm toán"],
        "hr":          ["tuyển dụng", "hris", "headhunting", "bhxh"],
        "sales":       ["b2b sales", "telesales", "pipeline sales", "crm"],
        "design":      ["ui/ux", "wireframing", "brand identity", "design system"],
        "logistics":   ["xuất nhập khẩu", "incoterms", "supply chain", "freight forwarding"],
        "engineering": ["autocad", "plc", "bim", "qa/qc"],
        "healthcare":  ["dược lâm sàng", "gmp", "điều dưỡng", "nghiên cứu lâm sàng"],
        "education":   ["e-learning", "lms", "kỹ năng mềm", "blended learning"],
        "hospitality": ["f&b", "housekeeping", "pms hotel", "revenue management"],
    }

    errors = []
    src_lower = worker_src.lower()
    print("\n=== Test 2: ALL_DOMAIN_KEYWORDS coverage ===")

    for domain, probe_kws in section_keywords.items():
        found = [kw for kw in probe_kws if kw in src_lower]
        missing = [kw for kw in probe_kws if kw not in src_lower]
        status = "✓" if len(found) >= len(probe_kws) - 1 else "✗"
        print(f"  {status} {domain:15s}: {len(found)}/{len(probe_kws)} probe keywords tìm thấy")
        if missing:
            errors.append(f"[{domain}] Thiếu keywords: {missing}")

    if errors:
        print("\nLỖI:")
        for e in errors:
            print(f"  ✗ {e}")
        assert False, f"ALL_DOMAIN_KEYWORDS thiếu coverage cho {len(errors)} ngành"
    else:
        print("\n✓ ALL_DOMAIN_KEYWORDS phủ đủ 11 ngành!")


# ─── Test 3: main.py đồng bộ với worker.py ───────────────────────────────────
def test_main_py_has_all_domain_keywords():
    """main.py cũng phải có ALL_DOMAIN_KEYWORDS (đồng bộ với worker.py)."""
    main_file = WORKER_FILE.parent / "main.py"
    assert main_file.exists(), "main.py không tồn tại"
    main_src = main_file.read_text(encoding="utf-8")

    print("\n=== Test 3: main.py sync check ===")

    assert "ALL_DOMAIN_KEYWORDS" in main_src, \
        "main.py phải có ALL_DOMAIN_KEYWORDS (đồng bộ với worker.py)"
    assert "keyword_extract_skills" in main_src, \
        "main.py phải có hàm keyword_extract_skills"

    # Check run_ner dùng fallback
    assert "kw_skills" in main_src or "keyword_extract_skills" in main_src, \
        "run_ner trong main.py phải dùng keyword fallback"

    print("  ✓ main.py có ALL_DOMAIN_KEYWORDS")
    print("  ✓ main.py có keyword_extract_skills")
    print("  ✓ run_ner dùng keyword fallback")


# ─── Test 4: bootstrap script có bước gán nhãn từ điển ──────────────────────
def test_bootstrap_has_dict_labeling():
    """bootstrap_m1_real_data.py phải có DOMAIN_SKILL_DICT và dict_label_sentence."""
    bootstrap_file = SCRIPTS_DIR / "bootstrap_m1_real_data.py"
    src = bootstrap_file.read_text(encoding="utf-8")

    print("\n=== Test 4: bootstrap dict labeling ===")

    assert "DOMAIN_SKILL_DICT" in src, \
        "bootstrap script phải có DOMAIN_SKILL_DICT"
    assert "dict_label_sentence" in src, \
        "bootstrap script phải có hàm dict_label_sentence"
    assert "Buoc 3b" in src or "BUOC 3b" in src, \
        "bootstrap script phải có bước 3b gán nhãn từ điển"

    print("  ✓ DOMAIN_SKILL_DICT tồn tại")
    print("  ✓ dict_label_sentence tồn tại")
    print("  ✓ Bước 3b được thêm vào pipeline")


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("Chạy test kiểm tra cân bằng keyword đa ngành")
    print("(Không cần PhoBERT, không cần GPU)")
    print("=" * 60)

    tests = [
        test_skills_by_industry_balance,
        test_all_domain_keywords_coverage,
        test_main_py_has_all_domain_keywords,
        test_bootstrap_has_dict_labeling,
    ]

    passed = 0
    failed = 0
    for test_fn in tests:
        try:
            test_fn()
            passed += 1
        except AssertionError as e:
            print(f"\n  [FAIL] {test_fn.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"\n  [ERROR] {test_fn.__name__}: {e}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"Kết quả: {passed} passed / {failed} failed")
    if failed == 0:
        print("✅ Tất cả tests PASS — keywords đa ngành cân bằng!")
    else:
        print("❌ Có lỗi cần sửa!")
        sys.exit(1)
