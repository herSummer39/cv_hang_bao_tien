# ĐỀ CƯƠNG TOÀN DIỆN DỰ ÁN CAREERFIT & BỘ CÂU HỎI PHẢN BIỆN VẤN ĐÁP
> **Tài liệu chuẩn bị cho buổi báo cáo / bảo vệ đồ án trước Giảng viên & Hội đồng**  
> *Sử dụng tài liệu này để nạp vào AI (ChatGPT, Claude, Gemini) làm công cụ mô phỏng phỏng vấn, khảo hạch và phản biện.*

---

## 📌 PHẦN 1: TỔNG QUAN DỰ ÁN & BÀI TOÁN THỰC TIỄN

### 1.1. Thông tin chung
* **Tên dự án:** CareerFit — Hệ sinh thái Đánh giá Năng lực, Luyện phỏng vấn Voice AI và Tối ưu hóa Hồ sơ Tuyển dụng Chuẩn ATS.
* **Mục tiêu cốt lõi:** Xây dựng một nền tảng 2 chiều giải quyết bài toán "lệch pha" giữa Ứng viên (sinh viên/người tìm việc) và Nhà tuyển dụng (HR/Tech Lead) thông qua mô hình AI Explainable (XAI) và Voice AI.

### 1.2. Nỗi đau thị trường (Pain Points)
* **Về phía Ứng viên:**
  * Nộp CV như "ném đá vào hư không", bị hệ thống ATS tự động loại mà không biết mình sai ở đâu.
  * Không biết chính xác kỹ năng của mình đang thiếu hụt (Skill Gap) những gì so với JD mục tiêu.
  * Thiếu môi trường cọ xát, luyện phỏng vấn kỹ thuật bám sát vào đúng "lỗ hổng" của bản thân.
* **Về phía Nhà tuyển dụng:**
  * Quá tải hồ sơ: Nhận hàng trăm CV cho 1 đợt tuyển, tốn từ 3–5 phút cho 1 CV để đọc lướt thủ công.
  * Các hệ thống ATS cũ chỉ tìm từ khóa máy móc (Exact Match), dễ bỏ sót ứng viên tiềm năng dùng từ đồng nghĩa, hoặc bị "đánh lừa" bởi các thủ thuật spam từ khóa.
  * Khó đối chiếu tương quan giữa các ứng viên trong cùng một đợt tuyển.

### 1.3. Giải pháp đột phá của CareerFit
* **Đánh giá đa chiều dựa trên bằng chứng (Evidence-Based Matching):** Không chấm điểm cảm tính hay hộp đen, mà bóc tách từng dòng JD và tìm câu dẫn chứng cụ thể trong CV.
* **Trí tuệ nhân tạo có thể giải thích được (Explainable AI - XAI):** Dùng SHAP kết hợp XGBoost để bóc tách rõ: *Vì sao hồ sơ đạt 75/100 điểm? Kỹ năng đóng góp bao nhiêu %, kinh nghiệm bị trừ bao nhiêu %*.
* **Vòng lặp khép kín (End-to-End Feedback Loop):** Chấm điểm $\rightarrow$ Bóc tách Skill Gap $\rightarrow$ Sinh bài phỏng vấn Voice AI giọng nói 2 chiều đúng vào điểm yếu $\rightarrow$ Gợi ý sửa CV $\rightarrow$ Xuất PDF.

---

## 🏗️ PHẦN 2: KIẾN TRÚC KỸ THUẬT & CÔNG NGHỆ (TECH STACK)

```
[ FRONTEND WEB ]           [ BACKEND & DATABASE ]          [ AI WORKER & ML ENGINE ]
Next.js 14 (App Router)  ↔  Supabase (PostgreSQL 11 bảng) ↔  Python 3.10+ (PyTorch, Transformers)
Tailwind CSS + Lucide       Supabase Storage (CV/Audio)      PhoBERT-NER + SentenceTransformer
Web Speech API / Audio      Supabase Realtime (WebSocket)    XGBoost + SHAP + VieNeu-TTS / Whisper
```

* **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Material Symbols, Radix UI.
* **Backend BaaS & Database:** Supabase:
  * PostgreSQL với 11 bảng quan hệ chuẩn (`analysis_jobs`, `batches`, `profiles`, `industries`, `skills`, `interview_questions`, `interview_audio_jobs`...).
  * Supabase Storage lưu trữ file CV (`user-cvs`) và audio phỏng vấn.
  * Supabase Realtime (WebSocket) đẩy trạng thái xử lý tức thì về trình duyệt.
* **Lõi AI & Machine Learning:** Python 3.10+, PyTorch, Hugging Face Transformers, SentenceTransformers, XGBoost, SHAP, EasyOCR, pdfplumber, python-docx.
* **Kiến trúc phần mềm:** Kiến trúc Lục giác (**Hexagonal Architecture / Ports & Adapters**) giúp tách biệt hoàn toàn Domain Logic khỏi công nghệ lưu trữ và framework giao diện.

---

## ⚙️ PHẦN 3: LÕI AI 4 TẦNG (AI PIPELINE) — TRỌNG TÂM KỸ THUẬT

Dây chuyền xử lý tự động bất đồng bộ gồm 4 công đoạn tuần tự:

### 1. Tầng 1: Tiền xử lý & Bóc tách đa định dạng (`CvParserAdapter`)
* **Nhiệm vụ:** Đọc hiểu văn bản từ file PDF, Word (`.docx`), hoặc ảnh chụp/scan.
* **Thuật toán xử lý đặc biệt:**
  * **Chống xáo trộn CV 2 cột:** Sử dụng `pdfplumber` với thuật toán gom cụm toạ độ dòng $Y$ (Tolerance $\pm 4px$), đảm bảo đọc tuần tự cột trái xong mới sang cột phải, không bị ghép nhầm dòng kỹ năng với dòng kinh nghiệm.
  * **Fallback EasyOCR:** Tự động phát hiện trang có dưới 80 ký tự (dấu hiệu file PDF scan/ảnh) để kích hoạt OCR nhận dạng ký tự tiếng Việt.

### 2. Tầng 2: Nhận diện thực thể tiếng Việt (`M1: PhoBERT-NER`)
* **Nhiệm vụ:** Đọc lướt văn bản và tự động gán nhãn thực thể chuyên môn:
  * `SKILL`: Kỹ năng chuyên môn và công cụ (*ReactJS, Python, Docker, SEO, SAP...*).
  * `ORG`: Tổ chức, công ty cũ, trường đại học.
  * `EDU`: Trình độ học vấn, bằng cấp, chứng chỉ.
* **Mô hình nền tảng:** PhoBERT-base được tinh chỉnh (Fine-tuned) trên tập ngữ liệu tuyển dụng Việt Nam.

### 3. Tầng 3: Biểu diễn ngữ nghĩa & So khớp Cosine 768 chiều (`M2: Embedding`)
* **Nhiệm vụ:** Đo độ tương đồng ngữ nghĩa giữa CV và JD.
* **Cơ chế hoạt động:**
  * Dùng `SentenceTransformer` nén toàn bộ câu văn thành một vector gồm **768 con số toạ độ**.
  * Dùng công thức **Cosine Similarity** để đo góc lệch giữa 2 vector:
    $$\text{Cosine Similarity} = \frac{A \cdot B}{\|A\| \|B\|}$$
  * **Giá trị thực tiễn:** Hiểu được các từ đồng nghĩa và biến thể viết tắt ngành IT (*"Lập trình giao diện"* $\approx$ *"Frontend Developer"*, *"React"* $\approx$ *"ReactJS"*), giải quyết triệt để điểm yếu của các bộ lọc ATS cũ.

### 4. Tầng 4: Chấm điểm & Giải trình trọng số (`M3: XGBoost + SHAP`)
* **Nhiệm vụ:** Tổng hợp các đặc trưng thành điểm số 0–100% và minh bạch hoá quyết định của AI.
* **Cơ chế hoạt động:**
  * **XGBoost (Extreme Gradient Boosting):** Mô hình cây quyết định tăng cường, tiếp nhận 11 đặc trưng đầu vào (tỷ lệ khớp kỹ năng bắt buộc, độ lệch số năm kinh nghiệm, điểm ngữ nghĩa 768d, trình độ học vấn...).
  * **SHAP (SHapley Additive exPlanations):** Áp dụng lý thuyết trò chơi của giải Nobel kinh tế để bóc tách: *Tại sao ứng viên đạt 47 điểm? Điểm sàn thị trường là 50.8, kinh nghiệm cộng +8.9, tương đồng ngữ nghĩa cộng +7.0, nhưng thiếu kỹ năng trọng yếu bị trừ -19.6 điểm*.

---

## 📱 PHẦN 4: HAI PHÂN HỆ NGHIỆP VỤ (2 SIDES)

### 4.1. Phía Ứng viên (Candidate Side)
1. **`/score`:** Tải lên CV (PDF/DOCX), nhập JD hoặc chọn 3 Presets chuẩn hóa (Frontend, Product Lead, B2B Sales).
2. **`/score/processing`:** Chờ AI xử lý với thanh tiến trình mượt mà, kết nối Supabase Realtime phản hồi trong ~3.5 – 4.5 giây.
3. **`/score/result`:**
   * **Donut Chart % tương thích:** Đo lường tổng thể tỷ lệ đáp ứng vị trí.
   * **Mô hình giải thích SHAP:** Bảng trực quan hóa các yếu tố cộng/trừ điểm minh bạch.
   * **Ma trận đối soát năng lực:** Đối chiếu từng dòng yêu cầu của JD $\leftrightarrow$ Trích xuất câu bằng chứng (Evidence) thực tế trong CV.
   * **Gợi ý cải thiện CV:** Khuyến nghị chỉnh sửa câu từ và bổ sung từ khóa còn thiếu.
   * **Xuất PDF:** Xuất bản báo cáo chuẩn tiếng Việt bằng `jsPDF` nạp font Base64.
4. **`/interview`:** Luyện phỏng vấn tương tác giọng nói:
   * AI tự động lấy danh sách `missing_skills` từ kết quả chấm điểm để đặt câu hỏi trúng "lỗ hổng".
   * AI phát âm tiếng Việt tự nhiên (VieNeu-TTS / Web Speech).
   * Ứng viên trả lời qua Micro (nhận diện tức thì bằng Web Speech API + đối soát PhoWhisper ASR).
   * Phân tích câu trả lời, chỉ ra điểm đúng, điểm thiếu và câu trả lời mẫu.
5. **`/explore`:** Bản đồ chuẩn kỹ năng 17 nhóm ngành & 73 vị trí (xây dựng từ tập dữ liệu VietJobs), tự kiểm tra độ sẵn sàng (Readiness Checklist).

### 4.2. Phía Nhà tuyển dụng (HR / Recruiter Side)
1. **`/batch`:** Tải lên cùng lúc một lô tối đa **20 CV** và 1 bản JD tiêu chuẩn đợt tuyển.
2. **`/batch/[batchId]`:**
   * **Sàng lọc thần tốc trong 30 giây:** AI Worker xử lý ngầm, giao diện cập nhật cuốn chiếu (Streaming update) từng hồ sơ hoàn thành.
   * **Bảng xếp hạng ứng viên:** Tự động xếp từ cao xuống thấp kèm nhãn màu (*Cao $\ge 70$, Khá $\ge 40$, Cần cân nhắc $< 40$*).
   * **Ma trận kỹ năng (Skill Matrix):** Lưới đối chiếu trực quan Ứng viên $\times$ Kỹ năng JD (đánh dấu `✓` Đạt hoặc `✕` Thiếu), giúp HR ra quyết định mời phỏng vấn trong 30 giây.

---

## 🎯 PHẦN 5: BỘ 15 CÂU HỎI PHẢN BIỆN "SỐNG CÒN" CỦA HỘI ĐỒNG & ĐÁP ÁN ĐIỂM 10

### Câu 1: "Tại sao không dùng luôn ChatGPT / GPT-4 API cho nhanh mà phải tự huấn luyện PhoBERT và XGBoost?"
> **Đáp án ghi điểm:**  
> *"Dạ thưa Thầy/Cô, nhóm chọn tự xây dựng Pipeline PhoBERT + XGBoost vì 3 lý do sống còn:  
> 1. **Bảo mật dữ liệu cá nhân (Data Privacy):** CV chứa họ tên, số điện thoại, địa chỉ và lịch sử công tác. Việc gửi toàn bộ CV lên OpenAI/API nước ngoài vi phạm chính sách bảo mật doanh nghiệp (GDPR). Hệ thống của nhóm có thể chạy hoàn toàn On-Premise/Local.  
> 2. **Độ trễ và chi phí (Cost & Latency):** Gọi GPT-4 tốn khoảng 500–1.000 VNĐ/CV và mất 15–20 giây. Pipeline của nhóm chạy mất 3 giây và chi phí điện toán bằng 0.  
> 3. **Tính nhất quán và giải thích được (Determinism & Explainability):** LLM có hiện tượng ảo giác (Hallucination) và tính ngẫu nhiên (nhiệt độ temperature), cùng 1 CV chấm 2 lần có thể ra 2 điểm khác nhau. Mô hình XGBoost + SHAP của nhóm đảm bảo tính khách quan toán học 100% và giải trình được từng con số."*

### Câu 2: "Mô hình XGBoost (M3) chấm điểm dựa trên những đặc trưng (features) nào?"
> **Đáp án ghi điểm:**  
> *"Dạ, mô hình M3 tiếp nhận 11 đặc trưng kỹ thuật được trích xuất từ M1 và M2, tiêu biểu nhất gồm:  
> 1. `skill_match_ratio`: Tỷ lệ phần trăm kỹ năng bắt buộc trong JD mà CV có.  
> 2. `missing_skills_count`: Số lượng kỹ năng trọng yếu bị thiếu.  
> 3. `experience_fit`: Độ lệch giữa số năm kinh nghiệm trong CV so với yêu cầu tối thiểu của JD.  
> 4. `semantic_similarity`: Điểm tương đồng ngữ nghĩa Cosine 768 chiều từ PhoBERT.  
> 5. `education_level`: Trọng số trình độ học vấn (Đại học, Thạc sĩ, Chứng chỉ quốc tế).  
> Các đặc trưng này được đưa qua hàm dự đoán của XGBoost để cho ra điểm số từ 0 đến 100."*

### Câu 3: "Giải thích rõ hơn SHAP là gì? Tại sao tuyển dụng lại cần SHAP?"
> **Đáp án ghi điểm:**  
> *"Dạ thưa Thầy/Cô, SHAP (SHapley Additive exPlanations) là thuật toán thuộc nhánh Trí tuệ nhân tạo có thể giải thích được (Explainable AI - XAI), dựa trên lý thuyết trò chơi của nhà kinh tế học đoạt giải Nobel Lloyd Shapley.  
> Trong tuyển dụng, thuật toán hộp đen (Black-box) không được chấp nhận vì ứng viên hoặc ban giám đốc sẽ khiếu nại: 'Tại sao hồ sơ của tôi bị trượt?'.  
> SHAP tính toán mức độ đóng góp cận biên của từng tiêu chí vào điểm số cuối cùng: Hệ thống chỉ rõ hồ sơ đạt 47 điểm vì điểm sàn thị trường là 50.8, kinh nghiệm cộng +8.9, ngữ nghĩa cộng +7.0, nhưng việc thiếu 41 kỹ năng đã kéo trừ đi -19.6 điểm. Điều này đảm bảo tính minh bạch, công bằng và có cơ sở đối soát."*

### Câu 4: "SentenceTransformer 768 chiều là gì? Tại sao lại là 768 mà không phải con số khác?"
> **Đáp án ghi điểm:**  
> *"Dạ, máy tính không hiểu chữ viết nên SentenceTransformer chuyển đổi câu văn thành một vector toạ độ số học.  
> Con số **768 chiều** là kích thước không gian ẩn (Hidden Size dimension) chuẩn của kiến trúc BERT-base / PhoBERT-base do các nhà nghiên cứu của Facebook AI và Viện VinAI thiết kế (12 tầng Transformer, 12 attention heads, mỗi head có chiều $64 \times 12 = 768$).  
> Ở không gian 768 chiều này, các sắc thái ngữ nghĩa của tiếng Việt được nắm bắt trọn vẹn nhất, giúp đo khoảng cách Cosine giữa từ ngữ CV và JD chính xác."*

### Câu 5: "Làm thế nào để xử lý CV dạng 2 cột? Các thư viện thông thường đều bị lỗi đọc nhảy ngang?"
> **Đáp án ghi điểm:**  
> *"Dạ, các thư viện như PyPDF2 hay pdfplumber nếu chỉ dùng lệnh `extract_text()` thông thường sẽ đọc ngang theo trục X, dẫn đến việc chữ ở cột kỹ năng bên trái bị ghép lộn xộn vào câu kinh nghiệm bên phải.  
> Nhóm giải quyết bằng cách viết `CvParserAdapter`: Dùng thuật toán trích xuất toạ độ từng từ (`extract_words`) gồm toạ độ `top` và `x0`. Sau đó gom nhóm các từ có toạ độ `top` chênh lệch không quá $\pm 4px$ vào cùng một dòng, và sắp xếp theo thứ tự `x0`. Nếu phát hiện cấu trúc phân cột, hệ thống sẽ chia ranh giới trục dọc để xử lý trọn vẹn từng cột trước khi ghép lại."*

### Câu 6: "Hệ thống có cơ chế gì để chống hiện tượng ứng viên spam từ khóa ẩn (nhét từ khóa chữ màu trắng vào CV)?"
> **Đáp án ghi điểm:**  
> *"Dạ, đây là mẹo phổ biến để đánh lừa các bộ lọc ATS truyền thống. Tuy nhiên CareerFit không bị đánh lừa vì 2 lớp bảo vệ:  
> 1. **Lớp ngữ nghĩa (Semantic Embedding M2):** Kỹ năng nếu chỉ bị vứt rời rạc ở cuối trang mà không nằm trong ngữ cảnh câu văn (Ví dụ: 'Đã xây dựng ứng dụng với React') thì điểm ngữ nghĩa câu sẽ rất thấp.  
> 2. **Lớp trích dẫn bằng chứng (Evidence Extraction):** Bảng đối soát của hệ thống bắt buộc phải trích xuất được câu bằng chứng (Evidence) thực tế trong CV tương ứng với từng dòng yêu cầu của JD. Nếu chỉ là từ khóa rác không có ngữ cảnh công việc, hệ thống sẽ đánh dấu là 'Chưa có minh chứng' hoặc 'Thiếu ngữ cảnh xác thực'."*

### Câu 7: "Voice AI phỏng vấn xử lý thế nào để không bị trễ khi người dùng nói chuyện?"
> **Đáp án ghi điểm:**  
> *"Dạ, nhóm sử dụng kiến trúc **Hybrid 2 lớp**:  
> - **Thời gian thực (Real-time Frontend):** Tích hợp Web Speech API của trình duyệt Chrome/Edge để chuyển giọng nói thành văn bản ngay lập tức với độ trễ 0ms, chữ nhảy ra màn hình theo từng lời nói của ứng viên.  
> - **Đối soát chất lượng cao (Backend):** File âm thanh đồng thời được lưu trữ và đưa qua mô hình **PhoWhisper của VinAI** để nhận diện ngữ âm 3 miền và từ chuyên ngành công nghệ chuẩn xác trước khi chấm điểm rubric.  
> - **Phát âm AI (TTS):** Ứng dụng mô hình VieNeu-TTS với 7 chất giọng vùng miền chuẩn tiếng Việt."*

### Câu 8: "Dữ liệu ở trang 'Khám phá chuẩn kỹ năng' được lấy từ đâu? Có căn cứ khoa học không?"
> **Đáp án ghi điểm:**  
> *"Dạ, dữ liệu không phải do nhóm tự nhập tay ngẫu nhiên, mà được trích xuất từ tập dữ liệu hơn 20.000 bài đăng tuyển dụng thực tế tại Việt Nam (VietJobs Dataset cào từ TopCV, VietnamWorks, ITviec).  
> Nhóm đã áp dụng thuật toán thống kê tần suất **TF-IDF** kết hợp phân loại thực thể **PhoBERT-NER** để lọc ra các từ khóa có tần suất xuất hiện cao nhất trong từng ngành, sau đó phân cấp thành 17 nhóm ngành lớn và 73 vị trí chuyên môn lưu trong bảng `industries` và `skills` của Supabase ạ."*

### Câu 9: "Tại sao giới hạn Batch Mode ở mức 20 CV? Nếu tải 200 CV thì hệ thống có sập không?"
> **Đáp án ghi điểm:**  
> *"Dạ, con số 20 CV là ngưỡng tối ưu hóa trải nghiệm người dùng (UX) trên hạ tầng máy chủ cục bộ (CPU) hiện tại, đảm bảo thời gian trả về trong vòng 30–45 giây mà không làm tràn bộ nhớ RAM.  
> Hệ thống được thiết kế theo cơ chế Worker bất đồng bộ với hàng đợi. Nếu tải lên 200 CV, hệ thống **hoàn toàn không bị sập**, mà Worker sẽ tự động bốc từng lô để xử lý cuốn chiếu và cập nhật trạng thái thời gian thực lên giao diện. Khi triển khai Production, nhóm chỉ cần mở rộng thêm các Worker chạy song song hoặc tích hợp Message Queue (RabbitMQ) là có thể xử lý hàng nghìn CV cùng lúc."*

### Câu 10: "Hệ thống có bị thiên vị (AI Bias) theo trường học hay giới tính không?"
> **Đáp án ghi điểm:**  
> *"Dạ, đây là vấn đề nhóm rất chú trọng. Trong bộ đặc trưng (features) đưa vào mô hình XGBoost, nhóm **chủ động loại bỏ các trường thông tin nhạy cảm** như: giới tính, hình ảnh chân dung, tuổi tác, quê quán.  
> Mô hình chỉ tập trung chấm điểm dựa trên: Năng lực kỹ năng thực tế, mức độ phù hợp ngữ nghĩa với JD, và số năm kinh nghiệm làm việc thực tế, đảm bảo tính công bằng theo tiêu chuẩn tuyển dụng hiện đại."*

### Câu 11: "Kiến trúc Lục giác (Hexagonal Architecture) trong dự án được áp dụng ở đâu?"
> **Đáp án ghi điểm:**  
> *"Dạ, kiến trúc Lục giác được thể hiện rõ nhất trong gói `packages/ml-service`:  
> - **Domain Core:** Chứa các thực thể cốt lõi (`ParsedCV`, `JobMatchResult`, logic chấm điểm).  
> - **Ports (Cổng giao tiếp):** Định nghĩa interface chuẩn như `ICvParser`, `IScorer`.  
> - **Adapters (Bộ chuyển đổi):** Các lớp cài đặt cụ thể như `CvParserAdapter` (dùng pdfplumber/EasyOCR).  
> Nhờ kiến trúc này, khi nhóm muốn thay đổi từ Supabase sang PostgreSQL thuần, hoặc đổi từ EasyOCR sang Tesseract OCR, nhóm chỉ cần viết Adapter mới mà không phải sửa một dòng code nào trong lõi nghiệp vụ."*

### Câu 12: "Tại sao trang kết quả lại chuyển từ biểu đồ mạng nhện (Radar Chart) sang Donut Chart và Thanh đo SHAP?"
> **Đáp án ghi điểm:**  
> *"Dạ thưa Thầy/Cô, ban đầu nhóm thiết kế biểu đồ Radar 5 chiều. Tuy nhiên qua thử nghiệm người dùng (UX Testing), biểu đồ mạng nhện tuy đẹp mắt nhưng rất khó đọc giá trị cụ thể và chiếm nhiều diện tích.  
> Nhóm đã cải tiến giao diện theo xu hướng thiết kế Bento Box hiện đại:  
> - Dùng **Donut Chart** để người dùng nắm bắt ngay con số tương thích tổng quan.  
> - Dùng **Thanh đo phân rã SHAP (Score Bridge Flow)** để trực quan hóa giá trị cộng/trừ điểm một cách minh bạch, dễ hiểu và chuyên nghiệp hơn rất nhiều."*

### Câu 13: "Độ trễ hệ thống hiện tại là bao nhiêu? Đã được tối ưu như thế nào?"
> **Đáp án ghi điểm:**  
> *"Dạ, ban đầu độ trễ mất từ 12–15 giây do chu kỳ thăm dò (Polling) 5 giây ở cả Worker và Frontend.  
> Nhóm đã tiến hành tối ưu hóa toàn diện:  
> 1. Tích hợp **Supabase Realtime (WebSocket)**: Khi Worker ghi xong kết quả, trình duyệt nhận tín hiệu sau ~0.1 giây và chuyển trang ngay lập tức.  
> 2. Rút ngắn chu kỳ Fallback Polling từ 5s xuống 1.2s.  
> 3. Giảm thời gian nghỉ của Worker từ 1.5s xuống 0.8s.  
> Kết quả hiện tại: Thời gian phân tích hoàn chỉnh 1 CV chỉ còn **khoảng 3.5 đến 4.5 giây**!"*

### Câu 14: "Hạn chế lớn nhất của đề tài hiện tại là gì và hướng khắc phục?"
> **Đáp án ghi điểm:**  
> *"Dạ, nhóm nhìn nhận thẳng thắn 2 hạn chế thực tế:  
> 1. **Mô hình AI chạy trên CPU:** Do chạy cục bộ trên CPU nên tốc độ xử lý lô CV lớn còn phụ thuộc vào phần cứng máy chủ. Hướng giải quyết: Đóng gói Docker và triển khai lên GPU Cloud, hoặc lượng tử hóa mô hình (ONNX / INT8 Quantization).  
> 2. **Chưa có trình soạn thảo CV trực tiếp:** Hiện tại hệ thống mới đưa ra gợi ý sửa CV dạng danh sách. Hướng phát triển tiếp theo là xây dựng Smart CV Editor cho phép AI tự động viết lại câu kinh nghiệm theo chuẩn mô hình STAR trực tiếp trên web."*

### Câu 15: "Khả năng thương mại hóa và ứng dụng thực tế của dự án ra sao?"
> **Đáp án ghi điểm:**  
> *"Dạ, CareerFit có mô hình kinh doanh kết hợp B2C và B2B rõ ràng:  
> - **Mô hình B2C (Sinh viên/Ứng viên):** Miễn phí đánh giá cơ bản; thu phí gói Pro để luyện phỏng vấn Voice AI không giới hạn và nhận bản phân tích chuyên sâu sửa CV.  
> - **Mô hình B2B (Doanh nghiệp/Nhà trường):** Cung cấp tài khoản Doanh nghiệp lọc hàng loạt 20–100 CV trong 30 giây; cung cấp Dashboard cho các Trường Đại học để theo dõi bản đồ nhiệt thiếu hụt kỹ năng (Skill Gap) của sinh viên toàn khóa nhằm cải tiến giáo trình đào tạo."*

---

## 🤖 PHẦN 6: HƯỚNG DẪN DÙNG TÀI LIỆU NÀY ĐỂ LUYỆN TẬP VỚI AI

Bạn có thể copy toàn bộ nội dung file này và dán vào **ChatGPT, Claude hoặc Gemini** kèm theo các câu lệnh (Prompt) mẫu dưới đây để bắt đầu buổi luyện tập:

### Mẫu Prompt 1: Đóng vai Giảng viên phản biện khó tính (Khuyên dùng tối nay)
```text
Tôi sắp có buổi bảo vệ đồ án tốt nghiệp về dự án CareerFit. Dưới đây là toàn bộ tài liệu kỹ thuật, kiến trúc và nghiệp vụ của dự án.
Hãy đóng vai một Giảng viên phản biện công nghệ thông tin khó tính, sắc sảo.
Nhiệm vụ của bạn:
1. Hỏi tôi lần lượt từng câu hỏi một (không hỏi dồn dập).
2. Xoáy sâu vào các phần: Lõi AI (PhoBERT, XGBoost, SHAP), độ trễ, kiến trúc xử lý CV 2 cột, và tính thực tế.
3. Sau khi tôi trả lời, hãy nhận xét ngắn gọn câu trả lời của tôi (Điểm tốt, Điểm còn thiếu) và chấm điểm trên thang điểm 10, sau đó mới hỏi câu tiếp theo.
Bắt đầu bằng câu hỏi đầu tiên!
[Dán nội dung tài liệu vào đây]
```

### Mẫu Prompt 2: Dạng Trắc nghiệm & Kiểm tra nhanh kiến thức (Flashcards)
```text
Dựa vào tài liệu dự án CareerFit dưới đây, hãy tạo cho tôi 10 câu hỏi trắc nghiệm kỹ thuật (có 4 đáp án A, B, C, D) xoay quanh các công nghệ: PhoBERT-NER, Vector 768 chiều, XGBoost, SHAP, Supabase Realtime và Voice AI. 
Đưa ra từng câu một để tôi chọn, sau khi tôi chọn hãy giải thích cặn kẽ tại sao đúng/sai.
[Dán nội dung tài liệu vào đây]
```

### Mẫu Prompt 3: Luyện kịch bản thuyết trình mở đầu 3 phút
```text
Dựa vào tài liệu dự án CareerFit này, hãy đóng vai huấn luyện viên thuyết trình. Tôi sẽ gõ bài thuyết trình mở đầu (3 phút) của tôi cho bạn nghe, bạn hãy chỉnh sửa câu chữ sao cho tự tin, chuyên nghiệp, toát lên hàm lượng kỹ thuật cao và thu hút Giảng viên ngay từ phút đầu tiên.
[Dán nội dung tài liệu vào đây]
```

