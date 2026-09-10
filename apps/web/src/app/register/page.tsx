"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0b1c30] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-green-400 text-[40px]">mark_email_read</span>
          </div>
          <h2 className="text-[28px] font-bold text-white mb-3">Kiểm tra email!</h2>
          <p className="text-[#8fa5c0] mb-6">
            Chúng tôi đã gửi link xác nhận đến <strong className="text-white">{email}</strong>.
            Bấm vào link đó để kích hoạt tài khoản.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0037b0] text-white font-semibold hover:bg-[#1d4ed8] transition-all">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1c30] flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#0037b0]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#0037b0]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#0037b0] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[18px]">analytics</span>
          </div>
          <span className="font-bold text-[20px] text-white tracking-tight">CareerFit</span>
        </Link>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-[28px] font-bold text-white mb-1">Tạo tài khoản</h1>
          <p className="text-[#8fa5c0] text-[14px] mb-6">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-[#5a8fff] hover:underline font-medium">
              Đăng nhập
            </Link>
          </p>

          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[15px] font-medium transition-all mb-5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Đăng ký với Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[#8fa5c0] text-[12px]">hoặc</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-[13px] text-[#8fa5c0] font-medium mb-1.5 block">Họ và tên</label>
              <input
                id="register-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-[#4a6080] text-[15px] outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/30 transition-all"
              />
            </div>

            <div>
              <label className="text-[13px] text-[#8fa5c0] font-medium mb-1.5 block">Email</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-[#4a6080] text-[15px] outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/30 transition-all"
              />
            </div>

            <div>
              <label className="text-[13px] text-[#8fa5c0] font-medium mb-1.5 block">Mật khẩu</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/8 border border-white/15 text-white placeholder-[#4a6080] text-[15px] outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/30 transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8fa5c0] hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{showPass ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[13px] text-[#8fa5c0] font-medium mb-1.5 block">Xác nhận mật khẩu</label>
              <input
                id="register-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Nhập lại mật khẩu"
                className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-[#4a6080] text-[15px] outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/30 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[13px]">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0037b0] hover:bg-[#1d4ed8] text-white font-semibold text-[15px] transition-all shadow-lg shadow-[#0037b0]/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang tạo tài khoản...
                </>
              ) : "Tạo tài khoản miễn phí"}
            </button>
          </form>
        </div>

        <p className="text-center text-[#4a6080] text-[13px] mt-6">
          © 2025 CareerFit · Bảo mật bởi Supabase
        </p>
      </div>
    </div>
  );
}
