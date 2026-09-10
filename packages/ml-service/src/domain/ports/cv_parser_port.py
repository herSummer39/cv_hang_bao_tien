"""
Domain Port: ICvParser
Định nghĩa interface cho bất kỳ adapter nào muốn parse CV.
Không phụ thuộc vào thư viện cụ thể — đúng Hexagonal Architecture.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedCV:
    """Value Object — kết quả parse CV, bất biến."""
    raw_text: str           # Toàn bộ text đã trích xuất
    file_type: str          # "pdf" | "docx" | "image"
    page_count: int         # Số trang
    char_count: int         # Số ký tự (dùng đánh giá chất lượng)
    is_scanned: bool        # True nếu dùng OCR (chất lượng thấp hơn)
    confidence: float       # 0.0–1.0 — độ tin cậy extract (OCR score)

    def is_usable(self) -> bool:
        """CV có đủ text để AI xử lý không? (tối thiểu 200 ký tự)"""
        return self.char_count >= 200 and self.confidence >= 0.4


class ICvParser(ABC):
    """Port interface — adapter phải implement."""

    @abstractmethod
    def parse(self, file_bytes: bytes, filename: str) -> ParsedCV:
        """
        Parse file CV thành ParsedCV.

        Args:
            file_bytes: Nội dung file dạng bytes
            filename:   Tên file gốc (dùng để detect định dạng)

        Returns:
            ParsedCV với raw_text đã chuẩn hóa UTF-8

        Raises:
            CvParseError: Khi không thể đọc file
        """
        ...


class CvParseError(Exception):
    """Domain exception — lỗi parse CV."""
    pass
