"""
Kiểm tra nhanh phần phân tích chi tiết (đối chiếu yêu cầu JD + giải thích điểm)
với model THẬT trên máy, không cần web/Supabase.

Chạy từ thư mục packages/ml-service:
    python scripts/test_detail_analysis.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import worker  # noqa: E402  (load M1/M2/M3 giống lúc chạy worker.py)

JD = """MÔ TẢ CÔNG VIỆC:
- Tư vấn, giới thiệu các dự án căn hộ chung cư cho khách hàng
- Chăm sóc khách hàng tiềm năng, chốt hợp đồng mua bán

YÊU CẦU ỨNG VIÊN:
- Tốt nghiệp Cao đẳng trở lên chuyên ngành Kinh tế, Marketing
- Có ít nhất 1 năm kinh nghiệm bán hàng bất động sản
- Kỹ năng giao tiếp, đàm phán tốt
- Sử dụng thành thạo CRM
- Ưu tiên ứng viên biết tiếng Anh

QUYỀN LỢI:
- Lương cứng 8 triệu + hoa hồng
"""

CV = """NGUYỄN VĂN A
Chuyên viên kinh doanh bất động sản
Học vấn: Cử nhân Quản trị kinh doanh - Đại học Kinh tế TP.HCM (2019 - 2023)
Kinh nghiệm làm việc:
- 2023 - nay: Nhân viên kinh doanh tại Công ty CP BĐS Hưng Thịnh
  • Tư vấn căn hộ chung cư dự án Q7 Saigon Riverside cho hơn 200 khách hàng
  • Đàm phán và chốt 12 hợp đồng mua bán căn hộ trong năm 2024
  • Chăm sóc khách hàng sau bán, xử lý khiếu nại
Kỹ năng: giao tiếp, đàm phán, thuyết trình, tin học văn phòng
"""

if __name__ == "__main__":
    res = worker.analyze(cv_text=CV, jd_text=JD, job_title="Nhân viên kinh doanh BĐS")
    print(f"\nĐIỂM: {res['score']}  |  similarity M2 (toàn văn): {res['similarity']}")
    print("\n=== GIẢI THÍCH ĐIỂM ===")
    print(json.dumps(res.get("score_breakdown"), ensure_ascii=False, indent=2))
    print("\n=== ĐỐI CHIẾU TỪNG YÊU CẦU ===")
    for r in res.get("requirements", []):
        print(f"[{r['status']:7}] {r['match']:.2f} ({r['priority']}) {r['text']}")
        if r.get("evidence"):
            print(f"          ↳ CV: {r['evidence']}")
    print("\nTóm tắt:", res.get("requirement_summary"))
