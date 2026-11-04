# CAREERFIT — HỆ THỐNG AI ĐÁNH GIÁ CV & MÔ PHỎNG PHỎNG VẤN ĐA NGÀNH
**TÀI LIỆU TÓM TẮT DỰ ÁN DÀNH CHO HỘI ĐỒNG / GIÁO VIÊN HƯỚNG DẪN (EXECUTIVE HANDOUT)**

> **Đồ án môn học:** Xây dựng ứng dụng AI đánh giá CV và mô phỏng phỏng vấn cho sinh viên đa ngành dựa trên Deep Learning và NLP  
> **Đơn vị đào tạo:** Viện Trí tuệ Nhân tạo & Chuyển đổi số — Khoa CNTT, Robot & AI (Đại học Bình Dương)  
> **Giảng viên hướng dẫn:** ThS. Nguyễn Hồ Hải  
> **Sinh viên thực hiện:** Trần Thị Ngọc Hằng (23050115) • Hạ Chí Tiền (23050117) • Lê Gia Bảo (23050110) — Lớp 26TH02  

---

## 1. TỔNG QUAN BÀI TOÁN & GIÁ TRỊ CỐT LÕI
* **Nỗi đau thực tế (Problem):**
  * **Sinh viên:** Viết CV cảm tính, không biết CV có vượt qua được hệ thống lọc tự động (ATS) của doanh nghiệp hay không; thiếu kỹ năng phản xạ khi phỏng vấn thực tế bằng tiếng Việt.
  * **Nhà tuyển dụng (HR):** Tốn hàng chục giờ đọc thủ công hàng trăm CV; các hệ thống ATS truyền thống chỉ lọc từ khóa cứng (*Keyword Matching*), dễ loại nhầm ứng viên tiềm năng nếu họ dùng từ đồng nghĩa hoặc cách diễn đạt khác.
* **Giải pháp CareerFit (Solution):** Nền tảng AI hỗ trợ 2 chiều (Ứng viên & Tuyển dụng) giải quyết bài toán tuyển dụng bằng **Xử lý ngôn ngữ tự nhiên (NLP) tiếng Việt chuyên sâu** kết hợp mô phỏng phỏng vấn bằng giọng nói thời gian thực.

---

## 2. KIẾN TRÚC HỆ THỐNG & PIPELINE AI 3 TẦNG (CORE TECH STACK)

```
[Tệp CV (PDF/DOCX/Ảnh)] 
       │
       ▼
[CvParserAdapter (Hexagonal Architecture + EasyOCR dự phòng)]
       │
       ▼
[TẦNG 1: M1 - PhoBERT-NER] ──► Trích xuất SKILL (kỹ năng), ORG (công ty), EDU (học vấn)
       │
       ▼
[TẦNG 2: M2 - Sentence Embedding 768d] ──► So khớp ngữ nghĩa Cosine Similarity CV ↔ JD, lọc nhiễu
       │
       ▼
[TẦNG 3: M3 - XGBoost Scorer + SHAP] ──► Chấm điểm 0-100% & Phân rã trọng số đóng góp
       │
       ▼
[Supabase Realtime WebSocket ──► Frontend Next.js 16 (App Router)]
```

1. **Module Bóc tách đa định dạng (`CvParserAdapter`):** Thiết kế theo Kiến trúc Lục giác (Hexagonal Architecture). Tự động phân tách layout PDF 2 cột chống lộn dòng, trích xuất bảng biểu trong DOCX, và tự động kích hoạt **EasyOCR** khi gặp file ảnh scan.
2. **Pipeline AI 3 tầng xử lý CV ↔ JD:**
   * **Tầng 1 (M1 — PhoBERT-NER):** Nhận diện thực thể tên riêng chuyên ngành tiếng Việt (Kỹ năng, Kinh nghiệm, Học vấn, Đơn vị công tác) với độ tin cậy 0.85 – 0.99.
   * **Tầng 2 (M2 — Sentence Embedding 768 chiều):** Vector hóa ngữ nghĩa văn bản bằng PhoBERT, tính toán độ tương đồng Cosine giữa CV và JD, tự động lọc bỏ các đoạn văn bản nhiễu (lương bổng, phúc lợi công ty).
   * **Tầng 3 (M3 — XGBoost Scorer & SHAP Explainer):** Tổng hợp 11 chỉ số đặc trưng để chấm điểm tương thích (0 – 100%); đồng thời trích xuất giá trị SHAP để giải thích minh bạch vì sao hồ sơ được cộng hoặc bị trừ điểm.
3. **Voice AI Engine (Phỏng vấn 2 chiều):**
   * **TTS:** Tích hợp **VieNeu-TTS** phát âm câu hỏi bằng giọng đọc AI tự nhiên đa vùng miền (Bắc, Trung, Nam).
   * **ASR:** Tích hợp **PhoWhisper-base** (ASR tiếng Việt offline) kết hợp **Web Speech API** trên trình duyệt để nhận dạng giọng nói thời gian thực (0ms độ trễ tương tác).
4. **Hạ tầng bất đồng bộ (Async Queue):** Next.js 16 (App Router) + Supabase (PostgreSQL 11 bảng, Auth, Storage, Realtime WebSocket) + Python Async Worker chạy ngầm, không gây nghẽn giao diện.

---

## 3. CÁC LUỒNG CHỨC NĂNG THỰC TẾ TRÊN 2 PHÍA (2-SIDED WORKFLOW)

### PHÍA 1: ỨNG VIÊN / SINH VIÊN (JOB SEEKER SIDE) — ĐANG CHẠY 100%
* **Đánh giá & Chấm điểm CV so với JD (`/score` → `/score/result`):**
  * Tải file CV (kéo-thả PDF/DOCX) và dán JD tuyển dụng (hoặc chọn nhanh từ mẫu Preset 3 ngành chính: Frontend, Product Lead, B2B Sales).
  * Worker AI chạy ngầm xử lý 3 tầng, giao diện `/score/processing` cập nhật log động từng giây qua WebSocket.
  * Trả ra Báo cáo chi tiết: **Điểm số tổng quan**, **Biểu đồ Radar 5 chiều năng lực**, **Bảng đối soát từng dòng JD (Evidence Matching)**, **Khoảng trống kỹ năng (Skill Gap)** và **Gợi ý viết lại CV chuẩn ATS**.
  * Hỗ trợ xuất Báo cáo kết quả ra tệp **PDF chuẩn tiếng Việt**.
* **Phòng Luyện Phỏng Vấn Giả Lập Voice AI (`/interview`):**
  * Tự động cá nhân hóa bộ câu hỏi phỏng vấn xoáy sâu vào đúng các kỹ năng bị thiếu (*Skill Gap*) phát hiện từ bước chấm CV (truy vấn từ ngân hàng 141 câu hỏi chuẩn hóa).
  * Phỏng vấn viên AI phát âm câu hỏi bằng tiếng Việt tự nhiên (7 chất giọng tùy chọn).
  * Ứng viên bấm micro trả lời trực tiếp bằng giọng nói; hệ thống ghi âm, nhận dạng chữ tức thì và chấm điểm câu trả lời theo rubric tiêu chuẩn.
* **Bản Đồ Kỹ Năng Chuẩn Ngành (`/explore`):**
  * Tra cứu cây kỹ năng cho 17 nhóm ngành và 73 vị trí việc làm trọng điểm tại Việt Nam.
  * Tích hợp công cụ **Tự kiểm tra độ sẵn sàng (Interactive Self-Check Checklist)**: Ứng viên click chọn các kỹ năng đã có để đo tỷ lệ %, sau đó chuyển thẳng sang AI để quét CV.
* **Dashboard Cá Nhân (`/dashboard`):**
  * Theo dõi lịch sử phân tích, biểu đồ đường tiến bộ điểm số qua từng lần sửa CV, các chỉ số tích lũy cá nhân.

---

### PHÍA 2: NHÀ TUYỂN DỤNG / HR (RECRUITER SIDE) — ĐANG CHẠY 100%
* **Sàng Lọc CV Hàng Loạt — Batch Mode (`/batch`):**
  * HR tải lên đồng thời tối đa 20 file CV ứng viên cùng 1 bản mô tả công việc (JD).
  * Worker AI xử lý song song, bóc tách và tính điểm cho toàn bộ danh sách.
* **Bảng Xếp Hạng & Ma Trận Kỹ Năng Đa Chiều (`/batch/[batchId]`):**
  * Tự động xếp hạng ứng viên từ cao xuống thấp kèm nhãn đánh giá trực quan (Xanh: Phù hợp cao ≥ 70, Vàng: Khá, Đỏ: Cần cân nhắc).
  * Xuất **Ma trận Kỹ năng (Skill Matrix)** dạng lưới giữa Danh sách ứng viên và Các yêu cầu cốt lõi của JD: Đánh dấu rõ ứng viên nào có (✓), thiếu (✕), giúp HR ra quyết định mời phỏng vấn chỉ trong 30 giây thay vì mất nhiều ngày lọc sơ loại.

---

## 4. KỊCH BẢN DEMO THỰC TẾ TRONG BUỔI BÁO CÁO (5 – 7 PHÚT)

| Thời gian | Luồng thao tác trên màn hình | Điểm nhấn kỹ thuật cần báo cáo với Giáo viên |
| :---: | :--- | :--- |
| **00:00 – 01:30** | Mở Trang chủ → Vào `/score`, chọn Preset *"Frontend Engineer"*, tải lên 1 file CV mẫu dạng 2 cột. Bấm **Phân tích CV**. | Nhấn mạnh: `CvParserAdapter` tự nhận dạng layout 2 cột; giao diện chuyển sang `processing` lắng nghe Supabase Realtime không cần reload. |
| **01:30 – 03:00** | Trang kết quả `/score/result`: Xem điểm số, biểu đồ Radar, bảng Evidence Matching và SHAP weights. Bấm **Tải báo cáo PDF**. | Nhấn mạnh: Điểm số minh bạch nhờ mô hình M3 XGBoost + SHAP (không phải điểm số ngẫu nhiên/hardcoded); xuất PDF nhúng font tiếng Việt chuẩn. |
| **03:00 – 04:30** | Bấm CTA chuyển thẳng sang `/interview`: AI đọc câu hỏi phỏng vấn dựa trên Skill Gap vừa phát hiện. Bật Micro trả lời thử 1 câu. | Nhấn mạnh: Voice-to-Voice 2 chiều; AI nhận dạng giọng nói tiếng Việt tức thì và phân tích câu trả lời. |
| **04:30 – 06:00** | Chuyển sang `/batch`: Tải lên lô 5 CV mẫu cho vị trí IT/Marketing. Xem **Bảng xếp hạng & Ma trận Kỹ năng**. | Nhấn mạnh: Khả năng giải quyết bài toán thực tế cho HR, tự động tổng hợp Ma trận kỹ năng đa ứng viên. |
| **06:00 – 07:00** | Vào `/explore` kiểm tra Bản đồ kỹ năng ngành & `/dashboard` xem lịch sử lưu trữ. | Nhấn mạnh: Tính hoàn thiện khép kín của sản phẩm từ tra cứu, chuẩn hóa hồ sơ đến quản lý tiến trình. |

---

## 5. BẢNG ĐỐI CHIẾU THỰC TẾ & CÁC HẠN CHẾ KỸ THUẬT (LIMITATIONS & TRADE-OFFS)

> *Ghi chú trung thực: Nhóm chủ động phân tích các rào cản kỹ thuật thực tế để có phương án tối ưu thay vì che giấu khuyết điểm trước Hội đồng.*

| Thành phần kỹ thuật | Mức độ chạy thực tế | Hạn chế kỹ thuật gặp phải | Giải pháp kỹ thuật đã áp dụng |
| :--- | :---: | :--- | :--- |
| **Bóc tách CV đa định dạng** | **Đang chạy tốt** | Các file CV scan/ảnh chụp bị nghiêng, mờ, độ phân giải < 150 DPI khiến EasyOCR nhận diện sai dấu tiếng Việt. | Xây dựng pipeline tiền xử lý: Tự động phát hiện text layer trước; chỉ kích hoạt EasyOCR khi không có text layer để tối ưu tốc độ. |
| **Pipeline AI 3 tầng (M1, M2, M3)** | **Đang chạy tốt** | Mô hình PhoBERT và SentenceTransformer nặng, nếu chạy trên CPU máy cá nhân có thể mất 4 – 8 giây/lượt phân tích. | Thiết kế kiến trúc **Async Worker** qua hàng đợi Supabase; frontend hiển thị log xử lý từng giây để tạo trải nghiệm minh bạch cho người dùng. |
| **Chấm điểm bằng XGBoost** | **Đang chạy tốt** | Tập dữ liệu huấn luyện M3 tập trung vào 73 vị trí chuẩn hóa; nếu người dùng nhập JD ngành nghề quá dị biệt thì độ chính xác điểm số có thể suy giảm. | Tích hợp thư viện mẫu 73 vị trí (Quick Presets) và chuẩn hóa danh mục 17 nhóm ngành để điều hướng người dùng vào vùng dữ liệu tối ưu. |
| **Nhận dạng giọng nói (ASR)** | **Đang chạy tốt** | Mô hình PhoWhisper-base chạy offline yêu cầu tài nguyên phần cứng lớn, độ trễ xử lý file âm thanh có thể từ 2 – 3 giây. | Tích hợp **cơ chế Dual-Engine**: Ưu tiên **Web Speech API tiếng Việt** trực tiếp trên trình duyệt để phản hồi thời gian thực 0ms; PhoWhisper chạy nền để đối soát độ chính xác. |
| **Phát âm AI (TTS)** | **Đang chạy tốt** | Engine VieNeu-TTS chạy local tốn RAM khi sinh audio dài cho nhiều câu hỏi liên tiếp. | Tự động sinh audio câu hỏi theo dạng stream hoặc nạp trước (pre-fetch) từng câu thay vì render toàn bộ cùng một lúc. |
| **Môi trường triển khai** | **Đang chạy tốt** | Frontend chạy trên Vercel Cloud, nhưng Worker AI (Python ML) hiện chạy trên Local Server/Máy trạm do giới hạn chi phí thuê server GPU Cloud. | Kiến trúc tách rời hoàn toàn (*Decoupled*): Frontend kết nối Supabase Cloud; Worker ở bất kỳ máy tính nào có GPU/CPU chỉ cần trỏ API Key là nhận việc tự động. |

---

## 6. ĐỊNH HƯỚNG PHÁT TRIỂN TIẾP THEO (FUTURE ROADMAP)
1. Đóng gói Worker Python thành Docker Container và triển khai lên hạ tầng GPU Cloud (RunPod / AWS EC2) để phục vụ đồng thời hàng ngàn người dùng.
2. Tích hợp mô hình sinh tự động (LLM tiếng Việt finetuned) để sửa trực tiếp câu từ vào file CV và cho phép tải về bản `.docx` đã được tối ưu ATS tự động.
3. Mở rộng ngân hàng câu hỏi phỏng vấn từ 141 câu lên 1.000+ câu hỏi tình huống thực tế theo từng cấp bậc chuyên môn (Junior, Mid, Senior).

