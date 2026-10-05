import Link from "next/link";
import AuthNav from "@/components/AuthNav";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#c4c5d7]/30 shadow-[0_1px_8px_rgba(11,28,48,0.03)]">
      <div className="h-16 w-full max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0037b0] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">psychology</span>
            </div>
            <span className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-semibold text-[#0037b0] tracking-tight">
              CareerFit
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden lg:flex items-center gap-5 h-16">
            <Link
              href="/score"
              className="h-full flex items-center text-[#0037b0] text-[13px] font-semibold hover:text-[#1d4ed8] transition-colors relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0037b0]"
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">upload_file</span>
              Đánh giá CV
            </Link>
            <Link href="/interview" className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors">
              <span className="material-symbols-outlined text-[16px] mr-1 text-[#8fa5c0]">record_voice_over</span>
              Phỏng vấn giả lập
            </Link>
            <Link href="/batch" className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors">
              <span className="material-symbols-outlined text-[16px] mr-1 text-[#8fa5c0]">compare_arrows</span>
              So sánh CV
            </Link>
            <Link href="/explore" className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors">
              <span className="material-symbols-outlined text-[16px] mr-1 text-[#8fa5c0]">explore</span>
              Khám phá việc làm
            </Link>
          </nav>
        </div>

        {/* Auth state + CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/score"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0037b0] text-white text-[13px] font-semibold hover:bg-[#1d4ed8] shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Chấm điểm CV mới</span>
          </Link>
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
