"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AuthNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  // Tự động tắt trạng thái loading khi route đã chuyển thành công
  useEffect(() => {
    setIsDashboardLoading(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, plan")
          .eq("id", user.id)
          .single();
        setDisplayName(data?.full_name ?? user.email?.split("@")[0] ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
        setIsPro(data?.plan === "pro");
      }
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const initial = displayName ? displayName[0].toUpperCase() : "U";

  if (user) {
    const isDashboardActive = pathname === "/dashboard";

    return (
      <div className="flex items-center gap-2.5 sm:gap-3">
        {isPro && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-fuchsia-50 text-[#c026d3] border border-fuchsia-200 rounded-full text-[11px] font-bold">
            <span className="material-symbols-outlined text-[14px] leading-none">workspace_premium</span>
            Pro
          </div>
        )}

        {/* Nút Dashboard với Instant Loading Feedback */}
        <Link
          href="/dashboard"
          onClick={() => {
            if (pathname !== "/dashboard") {
              setIsDashboardLoading(true);
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer select-none ${
            isDashboardActive
              ? "bg-[#0037b0]/10 text-[#0037b0] border border-[#0037b0]/25 font-bold shadow-2xs"
              : isDashboardLoading
              ? "bg-blue-50 text-[#0037b0] border border-blue-200 font-bold shadow-2xs ring-2 ring-blue-500/20"
              : "text-slate-700 hover:bg-slate-100 hover:text-[#0037b0]"
          }`}
          aria-label="Truy cập Bảng điều khiển cá nhân"
        >
          {isDashboardLoading ? (
            <span className="material-symbols-outlined text-[16px] animate-spin text-[#0037b0]">
              progress_activity
            </span>
          ) : (
            <span
              className={`material-symbols-outlined text-[16px] ${
                isDashboardActive ? "text-[#0037b0]" : "text-slate-500"
              }`}
            >
              dashboard
            </span>
          )}
          <span>{isDashboardLoading ? "Đang mở..." : "Dashboard"}</span>
        </Link>

        {/* User Avatar & Logout */}
        <div className="flex items-center pl-1 border-l border-slate-200 gap-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#0037b0] text-[13px] font-bold">
              {initial}
            </div>
          )}
          <button
            onClick={handleSignOut}
            title="Đăng xuất"
            className="p-1 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined leading-none text-[18px]">logout</span>
          </button>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="px-3.5 py-1.5 rounded-xl text-slate-700 text-[13px] font-semibold hover:bg-slate-100 hover:text-[#0037b0] transition-colors whitespace-nowrap"
      >
        Đăng nhập
      </Link>
      <Link
        href="/register"
        className="btn-primary px-3.5 py-1.5 text-[13px] font-semibold shadow-xs whitespace-nowrap"
      >
        Đăng ký miễn phí
      </Link>
    </div>
  );
}
