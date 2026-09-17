import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        {/* Hero Section */}
        <section className="w-full bg-[#0b1c30] text-white pt-20 pb-24 text-center">
          <div className="max-w-4xl mx-auto px-6">
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[40px] md:text-[52px] font-bold mb-6">
              Về CareerFit
            </h1>
            <p className="text-[18px] md:text-[20px] text-[#8fa5c0] max-w-3xl mx-auto leading-relaxed">
              Dự án tốt nghiệp với sứ mệnh xây dựng nền tảng đánh giá và phát triển năng lực ứng viên dựa trên AI tiếng Việt chuyên sâu, giúp thu hẹp khoảng cách giữa nhu cầu tuyển dụng và kỹ năng ứng viên.
            </p>
          </div>
        </section>

        {/* The Problem & Solution */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 -mt-10">
          <div className="bg-white rounded-2xl shadow-md p-8 md:p-12 flex flex-col md:flex-row gap-12">
            <div className="flex-1">
              <div className="w-12 h-12 rounded-xl bg-[#ffdad6] text-[#93000a] flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[24px]">trending_down</span>
              </div>
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[24px] font-bold text-[#0b1c30] mb-4">
                Vấn đề hiện tại
              </h2>
              <p className="text-[15px] text-[#565e74] leading-relaxed">
                Các nền tảng ATS và đánh giá CV hiện nay chủ yếu tối ưu cho tiếng Anh. Khi áp dụng vào thị trường Việt Nam, khả năng hiểu ngữ cảnh, đồng nghĩa và nhận diện kỹ năng (NER) thường không chính xác. Ứng viên Việt Nam thiếu một công cụ khách quan để định vị bản thân và luyện tập phỏng vấn một cách sát thực tế.
              </p>
            </div>
            <div className="hidden md:block w-[1px] bg-[#e5eeff]"></div>
            <div className="flex-1">
              <div className="w-12 h-12 rounded-xl bg-[#85f8c4]/60 text-[#004f35] flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[24px]">model_training</span>
              </div>
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[24px] font-bold text-[#0b1c30] mb-4">
                Giải pháp của chúng tôi
              </h2>
              <p className="text-[15px] text-[#565e74] leading-relaxed">
                Tự huấn luyện mô hình PhoBERT riêng (M1) cho bài toán NER tiếng Việt, kết hợp Sentence Embedding (M2) và XGBoost (M3) để đối chiếu ngữ nghĩa chính xác. Đồng thời, tích hợp PhoWhisper cho phép phỏng vấn giả lập bằng giọng nói tự nhiên, mang lại phản hồi sâu sắc và tức thì.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="w-full max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[32px] font-bold text-[#0b1c30] mb-12">
            Đội ngũ phát triển
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { name: "Tiến", role: "Thành viên", img: "/tienvip.jpg" },
              { name: "Hằng", role: "Thành viên", img: "/hangg.jpg" },
              { name: "Bảo", role: "Thành viên", img: "/bao.jpg" }
            ].map((member, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] hover:shadow-md transition-shadow">
                <div className="w-24 h-24 rounded-full bg-[#dce1ff] mx-auto mb-4 flex items-center justify-center text-[#0037b0] overflow-hidden relative">
                  <Image src={member.img} alt={member.name} fill className="object-cover" />
                </div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold text-[#0b1c30] mb-1">
                  {member.name}
                </h3>
                <p className="text-[14px] text-[#565e74] font-medium mb-3">{member.role}</p>
                <div className="text-[13px] text-[#8fa5c0] flex justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px] hover:text-[#0037b0] cursor-pointer">link</span>
                  <span className="material-symbols-outlined text-[18px] hover:text-[#0037b0] cursor-pointer">mail</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technology Stack */}
        <section className="w-full bg-white border-y border-[#e5eeff] py-20 mt-10">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[32px] font-bold text-[#0b1c30] mb-6">
              Công nghệ ứng dụng
            </h2>
            <p className="text-[16px] text-[#565e74] mb-12 max-w-2xl mx-auto">
              Hệ thống được xây dựng trên kiến trúc hiện đại, phân tách rõ ràng giữa Web Application và Machine Learning Worker.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              {[
                { name: "Next.js (App Router)", type: "Frontend" },
                { name: "Tailwind CSS v4", type: "Styling" },
                { name: "Supabase", type: "Database & Auth" },
                { name: "Python FastAPI", type: "ML API" },
                { name: "PhoBERT", type: "NLP / NER" },
                { name: "SentenceTransformers", type: "Embedding" },
                { name: "XGBoost", type: "Scoring Model" },
                { name: "PhoWhisper", type: "Speech-to-Text" },
                { name: "EasyOCR", type: "Image OCR" },
              ].map((tech) => (
                <div key={tech.name} className="flex flex-col items-center bg-[#eff4ff] px-6 py-4 rounded-xl border border-[#dce1ff]">
                  <span className="font-bold text-[#0b1c30] text-[16px]">{tech.name}</span>
                  <span className="text-[12px] text-[#565e74] font-medium uppercase tracking-wider mt-1">{tech.type}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
