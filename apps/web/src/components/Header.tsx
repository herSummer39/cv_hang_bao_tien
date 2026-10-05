import Link from "next/link";
import AuthNav from "@/components/AuthNav";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#c4c5d7]/30 shadow-[0_1px_4px_rgba(11,28,48,0.04)]">
      <div className="h-16 w-full max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-2 md:grid-cols-[auto_1fr_auto] items-center gap-4">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#0037b0] flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-[18px]">psychology</span>
            </div>
            <span className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-bold text-[#0037b0] tracking-tight">
              CareerFit
            </span>
          </Link>
        </div>

        {/* Center: Navigation Menu */}
        <nav className="hidden md:flex items-center justify-center gap-2 h-16">
          <Link
            href="/score"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0037b0]/10 text-[#0037b0] text-[13px] font-bold border border-[#0037b0]/20 hover:bg-[#0037b0]/15 transition-all whitespace-nowrap shadow-xs"
          >
            <span className="material-symbols-outlined text-[17px] text-[#0037b0]">upload_file</span>
            <span>Đánh giá CV</span>
          </Link>
          <Link
            href="/interview"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[#334155] text-[13px] font-medium hover:bg-[#f1f5f9] hover:text-[#0b1c30] transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[17px] text-[#64748b]">record_voice_over</span>
            <span>Phỏng vấn AI</span>
          </Link>
          <Link
            href="/batch"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[#334155] text-[13px] font-medium hover:bg-[#f1f5f9] hover:text-[#0b1c30] transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[17px] text-[#64748b]">compare_arrows</span>
            <span>So sánh CV</span>
          </Link>
          <Link
            href="/explore"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[#334155] text-[13px] font-medium hover:bg-[#f1f5f9] hover:text-[#0b1c30] transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[17px] text-[#64748b]">explore</span>
            <span>Khám phá</span>
          </Link>
        </nav>

        {/* Right: Auth State */}
        <div className="flex items-center justify-end shrink-0">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
