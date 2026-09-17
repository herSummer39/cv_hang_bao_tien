import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        {/* Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pt-20 pb-16 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0037b0]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#dce1ff]/60 text-[#0037b0] text-[13px] font-semibold mb-6 uppercase tracking-wider shadow-sm">
            <span className="material-symbols-outlined text-[16px]">model_training</span>
            Nền tảng AI Phân tích CV & Phỏng vấn giả lập
          </div>

          <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[48px] md:text-[64px] font-bold text-[#0b1c30] tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Nâng tầm sự nghiệp với
            <br />
            <span className="text-[#0037b0]">Trí tuệ Nhân tạo</span>
          </h1>

          <p className="text-[18px] md:text-[20px] text-[#565e74] mt-6 max-w-3xl mx-auto leading-[1.6]">
            CareerFit giúp bạn thấu hiểu điểm mạnh yếu của hồ sơ, đối chiếu chuẩn xác với yêu cầu tuyển dụng, và tự tin chinh phục vòng phỏng vấn bằng các mô hình AI tiếng Việt chuyên sâu.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/score"
              className="px-8 py-4 rounded-xl bg-[#0037b0] text-white font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold hover:bg-[#1d4ed8] transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              Đánh giá CV miễn phí
            </Link>
            <Link
              href="/explore"
              className="px-8 py-4 rounded-xl bg-white text-[#0b1c30] font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold hover:bg-[#eff4ff] transition-all shadow-sm border border-[#c4c5d7]/50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">explore</span>
              Khám phá ngành nghề
            </Link>
          </div>
        </section>

        {/* Thống kê (Statistics) */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-10 border-y border-[#e5eeff] bg-white/50">
          <div className="flex flex-wrap justify-center md:justify-between gap-8 max-w-5xl mx-auto">
            {/* TODO: thay bằng dữ liệu thật từ Supabase — đếm tổng jobs, users... */}
            {[
              { value: "48k+", label: "JD Tiếng Việt đã phân tích" },
              { value: "88%", label: "Độ chính xác tương thích" },
              { value: "3s", label: "Thời gian trả kết quả" },
              { value: "1.600+", label: "Câu hỏi phỏng vấn tạo ra" },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-4">
                <div className="font-[family-name:var(--font-plus-jakarta)] text-[36px] md:text-[42px] font-bold text-[#0037b0]">
                  {stat.value}
                </div>
                <div className="text-[14px] text-[#565e74] mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tính năng (Features) */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[36px] font-bold text-[#0b1c30] mb-4">
              Hệ sinh thái tính năng toàn diện
            </h2>
            <p className="text-[16px] text-[#565e74] max-w-2xl mx-auto">
              Từ bước tinh chỉnh CV ban đầu đến lúc ngồi trước nhà tuyển dụng, CareerFit luôn đồng hành cùng bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "rule",
                color: "bg-[#dce1ff] text-[#0037b0]",
                title: "Đánh giá mức độ phù hợp",
                desc: "Upload CV và Job Description để AI chấm điểm 0-100, trích xuất điểm mạnh và các lỗ hổng kỹ năng chi tiết.",
                link: "/score",
              },
              {
                icon: "tips_and_updates",
                color: "bg-[#ffe8b8] text-[#5c3b00]",
                title: "Tư vấn cải thiện (AI Advise)",
                desc: "Nhận lời khuyên cá nhân hoá về cách bổ sung kinh nghiệm, học thêm chứng chỉ để đạt yêu cầu JD.",
                link: "/score", // Advise is part of score result
              },
              {
                icon: "mic",
                color: "bg-[#85f8c4]/60 text-[#004f35]",
                title: "Phỏng vấn giả lập",
                desc: "Trải nghiệm phỏng vấn bằng giọng nói với AI. Hệ thống tự tạo câu hỏi xoáy sâu vào điểm yếu của CV.",
                link: "/interview",
              },
              {
                icon: "checklist_rtl",
                color: "bg-[#ffdad6]/60 text-[#93000a]",
                title: "So sánh nhiều CV (Batch)",
                desc: "Dành cho nhà tuyển dụng: Chấm điểm và xếp hạng hàng loạt CV cùng lúc cho một vị trí công việc.",
                link: "/batch",
              },
              {
                icon: "travel_explore",
                color: "bg-[#dae2fd] text-[#565e74]",
                title: "Khám phá bản đồ ngành nghề",
                desc: "Tra cứu hệ thống kỹ năng cứng và mềm cho 17 nhóm ngành lớn tại thị trường Việt Nam.",
                link: "/explore",
              },
              {
                icon: "groups",
                color: "bg-white border border-[#e5eeff] text-[#0b1c30]",
                title: "Về đội ngũ phát triển",
                desc: "Tìm hiểu về kiến trúc kỹ thuật và những người đứng sau mô hình AI của CareerFit.",
                link: "/about",
              },
            ].map((f) => (
              <Link key={f.title} href={f.link} className="group block bg-white rounded-2xl p-8 shadow-sm hover:shadow-md border border-transparent hover:border-[#dce1ff] transition-all relative overflow-hidden">
                <div className={`w-14 h-14 rounded-xl ${f.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined text-[28px]">{f.icon}</span>
                </div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-bold text-[#0b1c30] mb-3">
                  {f.title}
                </h3>
                <p className="text-[15px] text-[#565e74] leading-relaxed mb-6">
                  {f.desc}
                </p>
                <div className="absolute bottom-6 right-8 text-[#0037b0] opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  <span className="material-symbols-outlined">arrow_forward</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cách hoạt động (How it works) */}
        <section className="w-full bg-[#0b1c30] text-white py-20 mt-10">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[36px] font-bold mb-4">
                Hành trình chinh phục công việc
              </h2>
              <p className="text-[16px] text-[#8fa5c0] max-w-2xl mx-auto">
                Quy trình 4 bước đơn giản giúp bạn chuẩn bị hoàn hảo nhất trước mọi cơ hội.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {/* Đường nối giữa các bước (chỉ hiện trên màn hình lớn) */}
              <div className="hidden md:block absolute top-8 left-12 right-12 h-[2px] bg-[#1d3557] z-0"></div>

              {[
                { step: "01", title: "Tải lên CV & JD", desc: "Cung cấp hồ sơ của bạn và mô tả công việc mong muốn." },
                { step: "02", title: "AI Phân tích", desc: "Hệ thống bóc tách dữ liệu và đối chiếu kỹ năng đa chiều." },
                { step: "03", title: "Xem báo cáo", desc: "Nhận điểm số, lỗ hổng kỹ năng và gợi ý cải thiện." },
                { step: "04", title: "Luyện phỏng vấn", desc: "Thực hành trả lời câu hỏi khó với AI Voicebot." },
              ].map((w) => (
                <div key={w.step} className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#0037b0] border-4 border-[#0b1c30] flex items-center justify-center font-[family-name:var(--font-plus-jakarta)] font-bold text-[20px] mb-6 shadow-xl">
                    {w.step}
                  </div>
                  <h4 className="text-[18px] font-bold mb-2">{w.title}</h4>
                  <p className="text-[14px] text-[#8fa5c0] leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Cuối trang */}
        <section className="w-full max-w-5xl mx-auto px-4 lg:px-8 py-24 text-center">
          <div className="bg-gradient-to-br from-[#0037b0] to-[#1d4ed8] rounded-3xl p-10 md:p-16 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[32px] md:text-[40px] font-bold text-white mb-6">
                Sẵn sàng nâng cấp CV của bạn?
              </h2>
              <p className="text-[16px] text-white/80 max-w-2xl mx-auto mb-10">
                Gia nhập cộng đồng người tìm việc thông minh. Bắt đầu miễn phí ngay hôm nay để không bỏ lỡ bất kỳ cơ hội nghề nghiệp nào.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/login"
                  className="px-8 py-4 rounded-xl bg-white text-[#0037b0] font-[family-name:var(--font-plus-jakarta)] text-[16px] font-bold hover:bg-[#f0f4ff] transition-all shadow-md"
                >
                  Đăng ký tài khoản
                </Link>
                <Link
                  href="/score"
                  className="px-8 py-4 rounded-xl bg-transparent text-white border-2 border-white/30 font-[family-name:var(--font-plus-jakarta)] text-[16px] font-bold hover:bg-white/10 transition-all"
                >
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
