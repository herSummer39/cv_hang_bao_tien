import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#c4c5d7]/30 shadow-[0_1px_8px_rgba(11,28,48,0.03)]">
      <div className="h-16 w-full max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0037b0] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">
                psychology
              </span>
            </div>
            <span className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-semibold text-[#0037b0] tracking-tight">
              CareerFit
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden lg:flex items-center gap-6 h-16">
            <Link
              href="/score"
              className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors"
            >
              Đánh giá CV
            </Link>
            <Link
              href="/advise"
              className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors"
            >
              Tư vấn cải thiện
            </Link>
            <Link
              href="/interview"
              className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors"
            >
              Phỏng vấn giả lập
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Stat badge */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#85f8c4]/40 text-[#002114] border border-[#68dba9]/40 rounded-full text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[#004f35] text-[14px] leading-none">
              auto_awesome
            </span>
            <span>48 Lượt phân tích</span>
          </div>

          <button
            aria-label="Trợ giúp"
            className="p-1 rounded-xl text-[#434655] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined leading-none text-[20px]">
              help
            </span>
          </button>

          <button
            aria-label="Thông báo"
            className="p-1 rounded-xl text-[#434655] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors relative"
          >
            <span className="material-symbols-outlined leading-none text-[20px]">
              notifications
            </span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ba1a1a]" />
          </button>

          <div className="flex items-center pl-1 border-l border-[#c4c5d7]/40">
            <div className="w-8 h-8 rounded-full bg-[#dce1ff] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#0037b0] text-[18px]">
                person
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
