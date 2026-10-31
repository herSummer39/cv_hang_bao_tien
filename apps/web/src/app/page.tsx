import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="bg-[#f8f9fc] min-h-screen flex flex-col selection:bg-[#c026d3]/20 selection:text-[#0037b0]">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        {/* Hero Section */}
        <section className="w-full px-4 sm:px-8 lg:px-12 pt-20 pb-16 text-center relative overflow-hidden">
          {/* Subtle Ambient Brand Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#0037b0]/8 via-[#c026d3]/6 to-[#ff791b]/8 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#eff4ff] border border-[#dce1ff] text-[#0037b0] text-[13px] font-semibold mb-6 shadow-xs">
            <span className="material-symbols-outlined text-[17px] text-[#0037b0]">auto_awesome</span>
            <span>Nền tảng AI Phân tích CV & Phỏng vấn giả lập</span>
          </div>

          <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[44px] sm:text-[56px] md:text-[68px] font-extrabold text-[#0b1c30] tracking-tight leading-[1.12] max-w-5xl mx-auto">
            Nâng tầm sự nghiệp với{" "}
            <br className="hidden sm:inline" />
            <span className="text-brand-gradient">Trí tuệ Nhân tạo</span>
          </h1>

          <p className="text-[17px] md:text-[19px] text-[#475569] mt-6 max-w-3xl mx-auto leading-[1.6]">
            CareerFit giúp bạn thấu hiểu điểm mạnh yếu của hồ sơ, đối chiếu chuẩn xác với yêu cầu tuyển dụng, và tự tin chinh phục vòng phỏng vấn bằng các mô hình AI tiếng Việt chuyên sâu.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/score"
              className="btn-gradient-cta px-8 py-4 text-[16px] shadow-lg hover:shadow-xl w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              Đánh giá CV miễn phí
            </Link>
            <Link
              href="/explore"
              className="btn-secondary px-8 py-4 text-[16px] shadow-xs w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-[20px] text-[#3724c9]">explore</span>
              Khám phá ngành nghề
            </Link>
          </div>
        </section>

        {/* Thống kê (Data & Stats with Brand Colors) */}
        <section className="w-full px-4 sm:px-8 lg:px-12 py-10 border-y border-slate-200/80 bg-white/70 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { value: "48k+", label: "JD Tiếng Việt đã phân tích", color: "text-[#0037b0]", bg: "bg-blue-50/60" },
              { value: "88%", label: "Độ chính xác tương thích", color: "text-[#c026d3]", bg: "bg-fuchsia-50/60" },
              { value: "3s", label: "Thời gian trả kết quả", color: "text-[#ea580c]", bg: "bg-orange-50/60" },
              { value: "1.600+", label: "Câu hỏi phỏng vấn tạo ra", color: "text-[#059669]", bg: "bg-emerald-50/60" },
            ].map((stat) => (
              <div key={stat.label} className={`p-4 rounded-2xl ${stat.bg} border border-slate-100 transition-transform hover:-translate-y-0.5`}>
                <div className={`font-[family-name:var(--font-plus-jakarta)] text-[34px] sm:text-[40px] font-extrabold ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-[13px] sm:text-[14px] text-slate-600 mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tính năng (Features) */}
        <section className="w-full px-4 sm:px-8 lg:px-12 py-20 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-bold mb-3 uppercase tracking-wider">
              Tính năng nổi bật
            </div>
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[32px] sm:text-[40px] font-bold text-[#0b1c30] mb-4">
              Hệ sinh thái tính năng toàn diện
            </h2>
            <p className="text-[16px] text-slate-600 max-w-2xl mx-auto">
              Từ bước tinh chỉnh CV ban đầu đến lúc ngồi trước nhà tuyển dụng, CareerFit luôn đồng hành cùng bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "rule",
                color: "bg-blue-50 text-[#0037b0] border-blue-100",
                badge: "Phổ biến nhất",
                title: "Đánh giá mức độ phù hợp",
                desc: "Upload CV và Job Description để AI chấm điểm 0-100, trích xuất điểm mạnh và các lỗ hổng kỹ năng chi tiết.",
                link: "/score",
              },
              {
                icon: "tips_and_updates",
                color: "bg-amber-50 text-[#d97706] border-amber-100",
                badge: null,
                title: "Tư vấn cải thiện (AI Advise)",
                desc: "Nhận lời khuyên cá nhân hoá về cách bổ sung kinh nghiệm, học thêm chứng chỉ để đạt yêu cầu JD.",
                link: "/score",
              },
              {
                icon: "mic",
                color: "bg-fuchsia-50 text-[#c026d3] border-fuchsia-100",
                badge: "Voice AI",
                title: "Phỏng vấn giả lập",
                desc: "Trải nghiệm phỏng vấn bằng giọng nói với AI chuẩn ngữ điệu Việt Nam. Đánh giá câu trả lời tức thì.",
                link: "/interview",
              },
              {
                icon: "checklist_rtl",
                color: "bg-indigo-50 text-[#4f46e5] border-indigo-100",
                badge: "Dành cho HR",
                title: "So sánh nhiều CV (Batch)",
                desc: "Chấm điểm và xếp hạng tự động hàng loạt hồ sơ ứng viên theo đúng tiêu chuẩn công việc.",
                link: "/batch",
              },
              {
                icon: "travel_explore",
                color: "bg-cyan-50 text-[#0891b2] border-cyan-100",
                badge: null,
                title: "Khám phá bản đồ ngành nghề",
                desc: "Tra cứu hệ thống kỹ năng cứng và mềm cho 17 nhóm ngành lớn tại thị trường tuyển dụng Việt Nam.",
                link: "/explore",
              },
              {
                icon: "groups",
                color: "bg-rose-50 text-[#e11d48] border-rose-100",
                badge: null,
                title: "Về đội ngũ phát triển",
                desc: "Tìm hiểu về kiến trúc kỹ thuật và những người đứng sau mô hình AI của dự án CareerFit.",
                link: "/about",
              },
            ].map((f) => (
              <Link
                key={f.title}
                href={f.link}
                className="group block bg-white rounded-2xl p-7 shadow-xs hover:shadow-md border border-slate-200/70 hover:border-indigo-300 transition-all relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-13 h-13 rounded-xl ${f.color} border flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <span className="material-symbols-outlined text-[26px]">{f.icon}</span>
                  </div>
                  {f.badge && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {f.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[19px] font-bold text-[#0b1c30] mb-2 group-hover:text-[#0037b0] transition-colors">
                  {f.title}
                </h3>
                <p className="text-[14px] text-slate-600 leading-relaxed mb-4">
                  {f.desc}
                </p>
                <div className="flex items-center gap-1 text-[13px] font-semibold text-[#0037b0] opacity-90 group-hover:translate-x-1 transition-transform">
                  <span>Trải nghiệm ngay</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cách hoạt động (How it works - Gradient Journey) */}
        <section className="w-full bg-[#0b1c30] text-white py-20 mt-6 relative overflow-hidden">
          <div className="w-full px-4 sm:px-8 lg:px-12 max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-[12px] font-bold mb-3 uppercase tracking-wider">
                Quy trình chuẩn
              </div>
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[32px] sm:text-[40px] font-bold mb-4">
                Hành trình chinh phục công việc
              </h2>
              <p className="text-[15px] sm:text-[16px] text-slate-300 max-w-2xl mx-auto">
                Quy trình 4 bước đơn giản giúp bạn chuẩn bị hoàn hảo nhất trước mọi cơ hội.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {/* Connector line for desktop */}
              <div className="hidden md:block absolute top-7 left-14 right-14 h-[2px] bg-gradient-to-r from-[#0037b0] via-[#c026d3] to-[#ff791b] opacity-40 z-0" />

              {[
                { step: "01", title: "Tải lên CV & JD", desc: "Cung cấp hồ sơ của bạn và mô tả công việc mong muốn.", bg: "bg-[#0037b0]" },
                { step: "02", title: "AI Phân tích", desc: "Hệ thống bóc tách dữ liệu và đối chiếu kỹ năng đa chiều.", bg: "bg-[#3724c9]" },
                { step: "03", title: "Xem báo cáo", desc: "Nhận điểm số, lỗ hổng kỹ năng và gợi ý cải thiện.", bg: "bg-[#c026d3]" },
                { step: "04", title: "Luyện phỏng vấn", desc: "Thực hành trả lời câu hỏi khó với AI Voicebot.", bg: "bg-[#ff791b]" },
              ].map((w) => (
                <div key={w.step} className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-2xl ${w.bg} border-4 border-[#0b1c30] flex items-center justify-center font-[family-name:var(--font-plus-jakarta)] font-extrabold text-[18px] text-white mb-5 shadow-xl`}>
                    {w.step}
                  </div>
                  <h4 className="text-[17px] font-bold mb-2 text-white">{w.title}</h4>
                  <p className="text-[13px] text-slate-300 leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Cuối trang */}
        <section className="w-full px-4 sm:px-8 lg:px-12 py-16 text-center max-w-6xl mx-auto">
          <div className="w-full bg-gradient-to-br from-[#0037b0] via-[#3724c9] to-[#c026d3] rounded-3xl p-10 md:p-16 shadow-xl relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#ff791b]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[30px] md:text-[42px] font-extrabold text-white mb-4 tracking-tight">
                Sẵn sàng nâng cấp CV của bạn?
              </h2>
              <p className="text-[15px] md:text-[17px] text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
                Gia nhập cộng đồng người tìm việc thông minh. Bắt đầu miễn phí ngay hôm nay để không bỏ lỡ bất kỳ cơ hội nghề nghiệp nào.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-[#0037b0] font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold hover:bg-slate-50 hover:shadow-lg transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Đăng ký tài khoản
                </Link>
                <Link
                  href="/score"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/15 backdrop-blur-sm text-white border border-white/40 font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold hover:bg-white/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  Dùng thử ngay
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
