import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="bg-[#f8f9ff] min-h-screen font-sans flex flex-col">
      {/* Mini Header for Landing Page */}
      <header className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#e5eeff]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0037b0] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-white text-[18px]">model_training</span>
            </div>
            <span className="font-bold text-[20px] text-[#0b1c30] tracking-tight">CareerFit</span>
          </div>
          <Link
            href="/score"
            className="px-5 py-2 rounded-lg bg-[#0037b0] text-white text-[14px] font-semibold hover:bg-[#1d4ed8] transition-all shadow-sm"
          >
            Bắt đầu miễn phí
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full max-w-4xl mx-auto px-6 pt-24 pb-16 text-center relative">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#0037b0]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
          
          <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[44px] md:text-[56px] font-extrabold text-[#0b1c30] tracking-tight leading-[1.2] mb-6">
            Tuyển dụng đúng người,
            <br />
            <span className="text-[#0037b0]">Nắm bắt đúng việc</span>
          </h1>
          <p className="text-[18px] text-[#565e74] max-w-2xl mx-auto leading-relaxed mb-10">
            Ứng dụng AI phân tích CV đa chiều theo chuẩn thị trường Việt Nam. Tiết kiệm 80% thời gian sàng lọc hồ sơ và tăng 300% cơ hội trúng tuyển.
          </p>
          <div className="flex justify-center">
            <Link
              href="/score"
              className="px-8 py-4 rounded-xl bg-[#0037b0] text-white font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold hover:bg-[#1d4ed8] transition-all shadow-xl hover:-translate-y-1 flex items-center gap-2"
            >
              Phân tích CV ngay
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* 3 Core Highlights */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "rule",
                color: "text-[#0037b0]",
                bg: "bg-[#dce1ff]",
                title: "Đối chiếu cực chuẩn",
                desc: "Chấm điểm CV dựa trên 35+ tiêu chí năng lực, phát hiện chính xác lỗ hổng kỹ năng so với Job Description."
              },
              {
                icon: "tips_and_updates",
                color: "text-[#004f35]",
                bg: "bg-[#85f8c4]/60",
                title: "Gợi ý thông minh",
                desc: "Tư vấn lộ trình học tập và bổ sung kinh nghiệm cá nhân hóa để CV hoàn hảo hơn."
              },
              {
                icon: "mic",
                color: "text-[#5c3b00]",
                bg: "bg-[#ffe8b8]",
                title: "Phỏng vấn giả lập",
                desc: "Luyện tập 1-1 với AI bot tiếng Việt, mô phỏng các câu hỏi xoáy sâu vào điểm yếu của hồ sơ."
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-8 shadow-sm border border-[#e5eeff] text-center flex flex-col items-center hover:shadow-md transition-shadow">
                <div className={`w-16 h-16 rounded-2xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6`}>
                  <span className="material-symbols-outlined text-[32px]">{feature.icon}</span>
                </div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-bold text-[#0b1c30] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[15px] text-[#565e74] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="w-full bg-[#0b1c30] py-20 mt-10">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[36px] font-bold text-white mb-6">
              Bạn đã sẵn sàng để bứt phá?
            </h2>
            <p className="text-[16px] text-[#8fa5c0] mb-10 max-w-xl mx-auto">
              Chỉ mất 3 giây để AI đọc và phân tích toàn bộ CV của bạn. Không cần cài đặt, sử dụng trực tiếp trên trình duyệt.
            </p>
            <Link
              href="/score"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-white text-[#0037b0] font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold hover:bg-[#f0f4ff] transition-all shadow-lg hover:-translate-y-1"
            >
              <span className="material-symbols-outlined">rocket_launch</span>
              Bắt đầu đánh giá miễn phí
            </Link>
          </div>
        </section>
      </main>
      
      {/* Simple Footer */}
      <footer className="w-full bg-white border-t border-[#e5eeff] py-6 text-center text-[13px] text-[#565e74]">
        <p>© 2026 CareerFit Team. Đồ án môn học.</p>
      </footer>
    </div>
  );
}
