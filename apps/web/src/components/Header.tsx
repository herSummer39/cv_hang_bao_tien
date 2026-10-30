"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/components/AuthNav";

export default function Header() {
  const pathname = usePathname();

  const isScoreActive = pathname === "/score" || pathname.startsWith("/score/");
  const isInterviewActive = pathname === "/interview" || pathname.startsWith("/dashboard/interview");
  const isBatchActive = pathname === "/batch" || pathname.startsWith("/batch/");
  const isExploreActive = pathname === "/explore";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#c4c5d7]/30 shadow-[0_1px_4px_rgba(11,28,48,0.04)]">
      <div className="h-16 w-full px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-6">
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
        <nav className="hidden md:flex items-center justify-center gap-1.5 h-16">
          <Link
            href="/score"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
              isScoreActive
                ? "bg-[#0037b0]/10 text-[#0037b0] border border-[#0037b0]/25 shadow-xs"
                : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0b1c30]"
            }`}
          >
            <span className={`material-symbols-outlined text-[17px] ${isScoreActive ? "text-[#0037b0]" : "text-[#64748b]"}`}>
              upload_file
            </span>
            <span>Đánh giá CV</span>
          </Link>

          <Link
            href="/interview"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
              isInterviewActive
                ? "bg-[#0037b0]/10 text-[#0037b0] border border-[#0037b0]/25 shadow-xs"
                : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0b1c30]"
            }`}
          >
            <span className={`material-symbols-outlined text-[17px] ${isInterviewActive ? "text-[#0037b0]" : "text-[#64748b]"}`}>
              record_voice_over
            </span>
            <span>Phỏng vấn AI</span>
          </Link>

          <Link
            href="/batch"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
              isBatchActive
                ? "bg-[#0037b0]/10 text-[#0037b0] border border-[#0037b0]/25 shadow-xs"
                : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0b1c30]"
            }`}
          >
            <span className={`material-symbols-outlined text-[17px] ${isBatchActive ? "text-[#0037b0]" : "text-[#64748b]"}`}>
              compare_arrows
            </span>
            <span>So sánh CV</span>
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-[#eff4ff] text-[#0037b0] border border-[#dce1ff]">
              HR
            </span>
          </Link>

          <Link
            href="/explore"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
              isExploreActive
                ? "bg-[#0037b0]/10 text-[#0037b0] border border-[#0037b0]/25 shadow-xs"
                : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0b1c30]"
            }`}
          >
            <span className={`material-symbols-outlined text-[17px] ${isExploreActive ? "text-[#0037b0]" : "text-[#64748b]"}`}>
              explore
            </span>
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
