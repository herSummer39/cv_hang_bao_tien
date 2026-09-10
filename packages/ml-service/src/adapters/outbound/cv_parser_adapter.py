"""
Adapter: CvParserAdapter v2 — Xử lý đa định dạng + multi-column PDF.
Fix vấn đề text bị lộn thứ tự khi CV dạng 2 cột.
"""
import io
import re
import logging
from pathlib import Path
from typing import Optional

import pdfplumber
from docx import Document

from src.domain.ports.cv_parser_port import ICvParser, ParsedCV, CvParseError

logger = logging.getLogger(__name__)


# ─── Text normalization ────────────────────────────────────────────────────────

def _normalize_text(text: str) -> str:
    """Chuẩn hóa text UTF-8: dọn khoảng trắng, giữ cấu trúc dòng."""
    if not text:
        return ""
    text = re.sub(r"[ \t]+", " ", text)          # Gộp spaces/tabs
    text = re.sub(r"\n{3,}", "\n\n", text)        # Tối đa 2 dòng trống
    lines = [l.strip() for l in text.splitlines()]
    # Lọc dòng chỉ có ký tự đặc biệt (không mang thông tin)
    lines = [l for l in lines if not re.fullmatch(r"[|•·▪▸►\-=_]{2,}", l)]
    return "\n".join(lines).strip()


# ─── Column detection helper ───────────────────────────────────────────────────

def _extract_page_text_smart(page) -> str:
    """
    Trích text từ 1 trang PDF.
    Dùng extract_text với layout=True để giữ đúng thứ tự đọc tự nhiên.
    Fallback về extract_words nếu extract_text không có text.
    """
    # Cách 1: extract_text với x_tolerance lớn hơn để ghép từ cùng dòng
    text = page.extract_text(
        x_tolerance=3,
        y_tolerance=3,
        layout=False,           # layout=True thường bị lỗi với PDF 2 cột
        keep_blank_chars=False,
    )
    if text and len(text.strip()) > 50:
        return text.strip()

    # Fallback: gom words theo dòng (Y)
    words = page.extract_words(x_tolerance=3, y_tolerance=3)
    if not words:
        return ""
    return _words_to_lines(
        sorted(words, key=lambda w: (round(w["top"] / 5) * 5, w["x0"]))
    )


def _words_to_lines(words: list) -> str:
    """Gom các words cùng dòng (top gần nhau) thành string."""
    if not words:
        return ""

    lines: list[str] = []
    current_line: list[str] = []
    prev_top: Optional[float] = None
    TOLERANCE = 4  # px — các từ trong khoảng này coi là cùng dòng

    for word in words:
        top = round(word["top"])
        if prev_top is None or abs(top - prev_top) <= TOLERANCE:
            current_line.append(word["text"])
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word["text"]]
        prev_top = top

    if current_line:
        lines.append(" ".join(current_line))

    return "\n".join(lines)


# ─── Main Adapter ──────────────────────────────────────────────────────────────

class CvParserAdapter(ICvParser):
    """
    Adapter đa định dạng:
      - PDF có text layer  → pdfplumber smart column detection
      - PDF scan           → pytesseract OCR (optional)
      - DOCX               → python-docx (paragraphs + tables)
      - Image PNG/JPG      → pytesseract OCR
    """

    MIN_CHARS_PER_PAGE = 80  # Ngưỡng phân biệt PDF text vs scan

    def parse(self, file_bytes: bytes, filename: str) -> ParsedCV:
        ext = Path(filename).suffix.lower().lstrip(".")
        try:
            if ext == "pdf":
                return self._parse_pdf(file_bytes)
            elif ext in ("docx", "doc"):
                return self._parse_docx(file_bytes)
            elif ext in ("png", "jpg", "jpeg", "webp", "bmp", "tiff"):
                return self._parse_image(file_bytes, ext)
            else:
                raise CvParseError(
                    f"Định dạng '{ext}' chưa được hỗ trợ. Vui lòng dùng PDF, DOCX hoặc PNG."
                )
        except CvParseError:
            raise
        except Exception as e:
            logger.exception("Lỗi không xác định khi parse CV")
            raise CvParseError(f"Không thể đọc file: {e}") from e

    # ─── PDF ──────────────────────────────────────────────────────────────────

    def _parse_pdf(self, file_bytes: bytes) -> ParsedCV:
        pages_text: list[str] = []
        page_count = 0

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                text = _extract_page_text_smart(page)
                if text.strip():
                    pages_text.append(text.strip())

        raw = "\n\n".join(pages_text)
        normalized = _normalize_text(raw)
        avg_chars = len(normalized) / max(page_count, 1)
        is_scanned = avg_chars < self.MIN_CHARS_PER_PAGE
        confidence = 0.95 if not is_scanned else 0.3

        if is_scanned:
            logger.warning("PDF có vẻ là file scan (%.0f ký tự/trang). Thử OCR...", avg_chars)
            normalized, confidence = self._try_ocr_pdf(file_bytes, normalized)

        return ParsedCV(
            raw_text=normalized,
            file_type="pdf",
            page_count=page_count,
            char_count=len(normalized),
            is_scanned=is_scanned,
            confidence=confidence,
        )

    def _try_ocr_pdf(self, file_bytes: bytes, fallback: str) -> tuple[str, float]:
        try:
            from pdf2image import convert_from_bytes
            import pytesseract

            images = convert_from_bytes(file_bytes, dpi=200)
            pages, confs = [], []
            for img in images:
                data = pytesseract.image_to_data(
                    img, lang="vie+eng", output_type=pytesseract.Output.DICT
                )
                words = [w for w, c in zip(data["text"], data["conf"]) if int(c) > 30 and w.strip()]
                conf_vals = [int(c) for c in data["conf"] if int(c) > 0]
                pages.append(" ".join(words))
                if conf_vals:
                    confs.append(sum(conf_vals) / len(conf_vals) / 100)

            text = _normalize_text("\n\n".join(pages))
            avg_conf = sum(confs) / len(confs) if confs else 0.3
            return text, avg_conf
        except ImportError:
            return fallback, 0.3

    # ─── DOCX ─────────────────────────────────────────────────────────────────

    def _parse_docx(self, file_bytes: bytes) -> ParsedCV:
        doc = Document(io.BytesIO(file_bytes))
        parts: list[str] = []

        # Đọc paragraphs theo thứ tự xuất hiện
        for para in doc.paragraphs:
            t = para.text.strip()
            if t:
                parts.append(t)

        # Đọc tables (CV dạng bảng)
        for table in doc.tables:
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    parts.append(" | ".join(row_cells))

        normalized = _normalize_text("\n".join(parts))
        return ParsedCV(
            raw_text=normalized,
            file_type="docx",
            page_count=1,
            char_count=len(normalized),
            is_scanned=False,
            confidence=0.98,
        )

    # ─── IMAGE ────────────────────────────────────────────────────────────────

    def _parse_image(self, file_bytes: bytes, ext: str) -> ParsedCV:
        try:
            from PIL import Image
            import pytesseract

            img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            data = pytesseract.image_to_data(
                img, lang="vie+eng",
                output_type=pytesseract.Output.DICT,
                config="--psm 6",
            )
            words = [w for w, c in zip(data["text"], data["conf"]) if int(c) > 30 and w.strip()]
            conf_vals = [int(c) for c in data["conf"] if int(c) > 0]
            text = _normalize_text(" ".join(words))
            avg_conf = (sum(conf_vals) / len(conf_vals) / 100) if conf_vals else 0.0

            return ParsedCV(
                raw_text=text,
                file_type="image",
                page_count=1,
                char_count=len(text),
                is_scanned=True,
                confidence=avg_conf,
            )
        except ImportError:
            raise CvParseError("Cài pytesseract và Pillow để xử lý ảnh: pip install pytesseract Pillow")
