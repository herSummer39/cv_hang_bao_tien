import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        {/* Hero */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#dce1ff]/60 text-[#0037b0] text-[12px] font-semibold mb-6 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            AI Đánh giá CV · Tiếng Việt từ đầu
          </div>

          <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[48px] md:text-[64px] font-bold text-[#0b1c30] tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Đánh giá CV ↔ JD
            <span className="text-[#0037b0]"> thông minh</span>
            <br />
            bằng tiếng Việt
          </h1>

          <p className="text-[18px] text-[#565e74] mt-4 max-w-2xl mx-auto leading-[28px]">
            CareerFit phân tích độ phù hợp giữa CV và vị trí tuyển dụng, tư vấn cải thiện có dẫn nguồn, và luyện phỏng vấn giả lập — tất cả bằng tiếng Việt.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/score"
              className="px-8 py-4 rounded-xl bg-[#0037b0] text-white font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold hover:bg-[#1d4ed8] transition-all shadow-lg flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              Đánh giá CV ngay
            </Link>
            <Link
              href="/score/result"
              className="px-8 py-4 rounded-xl bg-white text-[#0b1c30] font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold hover:bg-[#eff4ff] transition-all shadow-sm border border-[#c4c5d7]/50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">visibility</span>
              Xem demo kết quả
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-14">
            {[
              { value: "48k+", label: "JD tiếng Việt" },
              { value: "88%", label: "Độ tương thích trung bình" },
              { value: "3s", label: "Thời gian phân tích" },
              { value: "1.600+", label: "Câu hỏi phỏng vấn" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-[family-name:var(--font-plus-jakarta)] text-[36px] font-bold text-[#0037b0]">
                  {stat.value}
                </div>
                <div className="text-[13px] text-[#565e74] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-16">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[32px] font-bold text-[#0b1c30] text-center mb-12">
            3 tính năng cốt lõi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "analytics",
                color: "bg-[#dce1ff] text-[#0037b0]",
                title: "Chấm điểm CV",
                desc: "Upload CV (PDF) + JD → Điểm 0–100, phân tích từng tiêu chí rõ ràng, minh bạch. Tư vấn trải nghiệm bằng AI.",
                link: "/score",
                linkLabel: "Thử ngay",
                linkColor: "text-[#0037b0]",
              },
              {
                icon: "lightbulb",
                color: "bg-[#85f8c4]/50 text-[#004f35]",
                title: "Tư vấn cải thiện",
                desc: "Gợi ý cụ thể dựa trên điểm yếu của CV, có dẫn nguồn từ ngân hàng JD tiếng Việt. Tư vấn trải nghiệm bằng AI.",
                link: "/advise",
                linkLabel: "Khám phá",
                linkColor: "text-[#004f35]",
              },
              {
                icon: "quiz",
                color: "bg-[#dae2fd] text-[#565e74]",
                title: "Phỏng vấn giả lập",
                desc: "5–8 câu hỏi được cá nhân hóa theo ngành nghề và điểm yếu. Chấm điểm tức thì. Tư vấn trải nghiệm bằng AI.",
                link: "/interview",
                linkLabel: "Bắt đầu",
                linkColor: "text-[#565e74]",
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm flex flex-col relative">
                {/* "?" badge — cơ chế đang update */}
                <div className="absolute top-4 right-4 group">
                  <div className="w-6 h-6 rounded-full bg-[#e5eeff] text-[#0037b0] flex items-center justify-center text-[12px] font-bold cursor-help border border-[#c4c5d7]/50 hover:bg-[#dce1ff] transition-colors">
                    ?
                  </div>
                  <div className="absolute right-0 top-8 z-10 hidden group-hover:block w-44 bg-[#0b1c30] text-white text-[11px] rounded-lg px-3 py-2 shadow-lg leading-relaxed">
                    Đang update
                  </div>
                </div>

                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <span className="material-symbols-outlined text-[24px]">{f.icon}</span>
                </div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-semibold text-[#0b1c30] mb-2">
                  {f.title}
                </h3>
                <p className="text-[14px] text-[#565e74] leading-relaxed flex-1">{f.desc}</p>
                <Link
                  href={f.link}
                  className={`mt-4 text-[13px] font-semibold ${f.linkColor} flex items-center gap-1 hover:opacity-80 transition-opacity`}
                >
                  {f.linkLabel}
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="w-full bg-[#0037b0] py-16">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 text-center">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[36px] font-bold text-white mb-4">
              Bắt đầu miễn phí ngay hôm nay
            </h2>
            <p className="text-[#b7c4ff] text-[16px] mb-8">
              Không cần đăng ký thẻ tín dụng · Phân tích đầu tiên hoàn toàn miễn phí
            </p>
            <Link
              href="/score"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-[#0037b0] font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold hover:bg-[#eff4ff] transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
              Đánh giá CV của tôi
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
