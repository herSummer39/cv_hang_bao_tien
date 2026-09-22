"""
Script test nâng cấp — parse CV ra JSON có cấu trúc đầy đủ.
Chạy: python test_parser.py <file_cv>
"""
import sys
import json
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from adapters.outbound.cv_parser_adapter import CvParserAdapter
from adapters.outbound.section_parser import parse_cv_sections, structured_cv_to_dict
from domain.ports.cv_parser_port import CvParseError


def test_file(filepath: str) -> None:
    path = Path(filepath)
    if not path.exists():
        print(f"[ERROR] File khong ton tai: {filepath}")
        return

    sep = "=" * 62
    print(f"\n{sep}")
    print(f"FILE:  {path.name}  ({path.stat().st_size / 1024:.1f} KB)")
    print(sep)

    parser = CvParserAdapter()
    file_bytes = path.read_bytes()

    # ── Bước 1: Extract raw text ───────────────────────────────────
    t0 = time.time()
    try:
        parsed = parser.parse(file_bytes, path.name)
    except CvParseError as e:
        print(f"[PARSE ERROR] {e}")
        return

    print(f"\n[STEP 1] RAW TEXT EXTRACTION  ({time.time()-t0:.2f}s)")
    print(f"  Dinh dang : {parsed.file_type.upper()}")
    print(f"  So trang  : {parsed.page_count}")
    print(f"  So ky tu  : {parsed.char_count:,}")
    print(f"  La scan   : {'Co (OCR)' if parsed.is_scanned else 'Khong (text layer)'}")
    print(f"  Tin cay   : {parsed.confidence:.0%}")
    print(f"  Dung duoc : {'Co' if parsed.is_usable() else 'Khong (qua it text)'}")

    # ── Bước 2: Section parsing ────────────────────────────────────
    t1 = time.time()
    cv = parse_cv_sections(parsed.raw_text)
    print(f"\n[STEP 2] STRUCTURED PARSING   ({time.time()-t1:.2f}s)")
    print(f"\n  TEN        : {cv.contact.full_name or '(chua phat hien)'}")
    print(f"  SDT        : {', '.join(cv.contact.phone) or '(chua co)'}")
    print(f"  EMAIL      : {', '.join(cv.contact.email) or '(chua co)'}")
    print(f"  GITHUB     : {cv.contact.github or '(chua co)'}")
    print(f"  WEBSITE    : {cv.contact.website or '(chua co)'}")
    print(f"  DIA CHI    : {cv.contact.address or '(chua co)'}")

    print(f"\n  MUC TIEU   : {cv.objective[:120]}..." if len(cv.objective) > 120 else f"\n  MUC TIEU   : {cv.objective}")

    print(f"\n  HOC VAN    : {len(cv.education)} muc")
    for e in cv.education:
        print(f"    - {e.school} | {e.major} | {e.start_date} - {e.end_date}")

    print(f"\n  KINH NGHIEM: {len(cv.experience)} muc")
    for e in cv.experience:
        print(f"    - [{e.start_date}-{e.end_date}] {e.company} / {e.role}")
        for d in e.description[:2]:
            print(f"        • {d[:80]}")

    print(f"\n  DU AN      : {len(cv.projects)} muc")
    for p in cv.projects:
        print(f"    - {p.name[:60]} | {p.start_date}-{p.end_date}")
        if p.tech_stack:
            print(f"        Tech: {', '.join(p.tech_stack[:5])}")

    print(f"\n  KY NANG FLAT ({len(cv.all_skills_flat)} ky nang):")
    if cv.all_skills_flat:
        print(f"    {', '.join(cv.all_skills_flat[:20])}")
        if len(cv.all_skills_flat) > 20:
            print(f"    ... va {len(cv.all_skills_flat)-20} ky nang khac")

    for g in cv.skills:
        print(f"    [{g.category}]: {', '.join(g.items[:8])}")

    if cv.awards:
        print(f"\n  GIAI THUONG: {len(cv.awards)} muc")
    if cv.other:
        print(f"\n  PHAN KHAC  : {len(cv.other)} dong (khong mat)")

    # ── Lưu JSON đầy đủ ───────────────────────────────────────────
    out_dict = structured_cv_to_dict(cv)
    out_path = path.with_suffix(".structured.json")
    out_path.write_text(
        json.dumps(out_dict, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"\n[SAVED] {out_path}")
    print(f"[TOTAL] {time.time()-t0:.2f}s\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Cach dung: python test_parser.py <file>")
        print("Vi du   : python test_parser.py sample_cvs/cv.pdf")
        sys.exit(1)
    for f in sys.argv[1:]:
        test_file(f)
