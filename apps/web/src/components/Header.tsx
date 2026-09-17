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
          <nav className="hidden lg:flex items-center gap-6 h-16">
            <Link href="/score" className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors">
              Đánh giá CV
            </Link>
            <Link href="/advise" className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors">
              Tư vấn cải thiện
            </Link>
            <Link href="/interview" className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors">
              Phỏng vấn giả lập
            </Link>
            <Link href="/batch" className="h-full flex items-center text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] transition-colors">
              So sánh CV
            </Link>
          </nav>
        </div>

        {/* Auth state — Client Component */}
        <AuthNav />
      </div>
    </header>
  );
}
