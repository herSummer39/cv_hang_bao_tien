import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import time
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from worker import extract_text_from_image_b64

def create_sample_image() -> bytes:
    img = Image.new('RGB', (600, 300), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 36)
    except IOError:
        font = ImageFont.load_default()
    
    text = "Nguyễn Văn A\nKỹ năng: Python, quản lý dự án\n3 năm kinh nghiệm"
    d.text((20, 20), text, fill=(0, 0, 0), font=font)
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return buffered.getvalue()

def main():
    print("🎨 Đang tạo ảnh test...")
    img_bytes = create_sample_image()
    b64_str = base64.b64encode(img_bytes).decode('utf-8')
    
    print("⏳ Bắt đầu OCR (chạy thử qua EasyOCR)...")
    start_time = time.time()
    extracted_text = extract_text_from_image_b64(b64_str)
    elapsed = time.time() - start_time
    
    print("=" * 40)
    print("Văn bản trích xuất được:")
    print("-" * 40)
    print(extracted_text)
    print("=" * 40)
    print(f"⏱️ Thời gian xử lý: {elapsed:.2f} giây")

    sample_dir = Path(__file__).resolve().parent.parent / "sample_cvs"
    for img_file in sample_dir.glob("*.[jp][pn]*"):
        if img_file.suffix.lower() in [".jpg", ".jpeg", ".png"]:
            print(f"\n📂 Thử với file có sẵn: {img_file.name}")
            with open(img_file, "rb") as f:
                b64_str = base64.b64encode(f.read()).decode('utf-8')
            start = time.time()
            text = extract_text_from_image_b64(b64_str)
            elapsed = time.time() - start
            print("-" * 40)
            print(text)
            print("-" * 40)
            print(f"⏱️ Thời gian xử lý: {elapsed:.2f} giây")

if __name__ == "__main__":
    main()
