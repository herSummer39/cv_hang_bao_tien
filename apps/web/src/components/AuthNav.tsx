"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

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
    return (
      <div className="flex items-center gap-3">
        {isPro && (
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#ede9fe]/60 text-[#7c3aed] border border-[#c4b5fd]/40 rounded-full text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[14px] leading-none">workspace_premium</span>
            Pro
          </div>
        )}
        <Link
          href="/dashboard"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#434655] text-[13px] font-medium hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">dashboard</span>
          Dashboard
        </Link>
        <div className="flex items-center pl-1 border-l border-[#c4c5d7]/40 gap-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#dce1ff] flex items-center justify-center text-[#0037b0] text-[13px] font-bold">
              {initial}
            </div>
          )}
          <button
            onClick={handleSignOut}
            title="Đăng xuất"
            className="p-1 rounded-xl text-[#434655] hover:bg-[#ffe5e5] hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined leading-none text-[18px]">logout</span>
          </button>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập
  return (
    <div className="flex items-center gap-2.5">
      <Link
        href="/login"
        className="px-3.5 py-1.5 rounded-xl text-[#434655] text-[13px] font-medium hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors whitespace-nowrap"
      >
        Đăng nhập
      </Link>
      <Link
        href="/register"
        className="px-4 py-1.5 rounded-xl bg-[#0037b0] text-white text-[13px] font-semibold hover:bg-[#1d4ed8] transition-all shadow-sm whitespace-nowrap"
      >
        Đăng ký miễn phí
      </Link>
    </div>
  );
}
