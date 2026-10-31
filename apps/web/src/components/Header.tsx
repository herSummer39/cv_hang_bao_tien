"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthNav from "@/components/AuthNav";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tự động đóng menu mobile khi chuyển route
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isScoreActive = pathname === "/score" || pathname.startsWith("/score/");
  const isInterviewActive = pathname === "/interview" || pathname.startsWith("/dashboard/interview");
  const isBatchActive = pathname === "/batch" || pathname.startsWith("/batch/");
  const isExploreActive = pathname === "/explore";

  const navItems = [
    {
      href: "/score",
      label: "Đánh giá CV",
      icon: "upload_file",
      active: isScoreActive,
      badge: null,
    },
    {
      href: "/interview",
      label: "Phỏng vấn AI",
      icon: "record_voice_over",
      active: isInterviewActive,
      badge: null,
    },
    {
      href: "/batch",
      label: "So sánh CV",
      icon: "compare_arrows",
      active: isBatchActive,
      badge: "HR",
    },
    {
      href: "/explore",
      label: "Khám phá",
      icon: "explore",
      active: isExploreActive,
      badge: null,
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#c4c5d7]/30 shadow-[0_1px_4px_rgba(11,28,48,0.04)]">
      <div className="h-16 w-full px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-4">
        {/* Left: Logo & Mobile Toggle Button */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Toggle (Mobile) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            aria-expanded={mobileMenuOpen}
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[#475569] hover:text-[#0b1c30] hover:bg-[#f1f5f9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0037b0]"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>

          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#0037b0] flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-[18px]">psychology</span>
            </div>
            <span className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-bold text-[#0037b0] tracking-tight">
              CareerFit
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Menu */}
        <nav className="hidden md:flex items-center justify-center gap-1.5 h-16">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${
                item.active
                  ? "bg-[#0037b0]/10 text-[#0037b0] border border-[#0037b0]/25 shadow-xs"
                  : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0b1c30]"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[17px] ${
                  item.active ? "text-[#0037b0]" : "text-[#64748b]"
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-[#eff4ff] text-[#0037b0] border border-[#dce1ff]">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right: Auth State */}
        <div className="flex items-center justify-end shrink-0">
          <AuthNav />
        </div>
      </div>

      {/* Mobile Navigation Drawer (Dropdown Overlay) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e2e8f0] bg-white px-4 py-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                  item.active
                    ? "bg-[#0037b0]/10 text-[#0037b0] border border-[#0037b0]/25 font-extrabold"
                    : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0b1c30]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      item.active ? "text-[#0037b0]" : "text-[#64748b]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#eff4ff] text-[#0037b0] border border-[#dce1ff]">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
