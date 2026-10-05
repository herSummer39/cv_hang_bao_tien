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
        <nav className="hidden md:flex items-center justify-center gap-8 h-16">
          <Link
            href="/score"
            className="h-full flex items-center text-[#0037b0] text-[13px] font-semibold hover:text-[#1d4ed8] transition-colors whitespace-nowrap relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0037b0]"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">upload_file</span>
            Đánh giá CV
          </Link>
          <Link
            href="/interview"
            className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 text-[#8fa5c0]">record_voice_over</span>
            Phỏng vấn AI
          </Link>
          <Link
            href="/batch"
            className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 text-[#8fa5c0]">compare_arrows</span>
            So sánh CV
          </Link>
          <Link
            href="/explore"
            className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 text-[#8fa5c0]">explore</span>
            Khám phá
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
