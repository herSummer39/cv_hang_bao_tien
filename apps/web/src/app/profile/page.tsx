"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// TODO: thay bằng dữ liệu thật từ Supabase — table `industries`
const MOCK_INDUSTRIES = [
  { id: "ind_1", name: "Công nghệ thông tin" },
  { id: "ind_2", name: "Marketing & Truyền thông" },
  { id: "ind_3", name: "Tài chính Kế toán" },
  { id: "ind_4", name: "Quản trị kinh doanh" },
  { id: "ind_5", name: "Thiết kế / Sáng tạo" },
];

export default function ProfilePage() {
  // TODO: thay bằng dữ liệu thật từ Supabase — table `profiles`
  const [fullName, setFullName] = useState("Nguyễn Văn A");
  const [email] = useState("nguyenvana@example.com"); // Email read-only
  const [industryId, setIndustryId] = useState("ind_1");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    // Mock lưu dữ liệu (delay 1s)
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      // Tắt thông báo sau 3s
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // TODO: gọi Supabase cập nhật `profiles` (full_name, preferred_industry_id) tại đây.
    }, 1000);
  };

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col items-center">
        <div className="w-full max-w-3xl px-4 lg:px-8 pt-10 pb-20">
          
          <div className="mb-8">
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[32px] font-bold text-[#0b1c30]">
              Hồ sơ cá nhân
            </h1>
            <p className="text-[15px] text-[#565e74] mt-1">
              Quản lý thông tin tài khoản và tùy chọn cá nhân hóa hệ thống.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#e5eeff] overflow-hidden">
            <div className="p-8">
              {/* Avatar Section */}
              <div className="flex items-center gap-6 mb-10 pb-8 border-b border-[#e5eeff]">
                <div className="relative w-20 h-20 rounded-full bg-[#dce1ff] flex items-center justify-center text-[#0037b0] overflow-hidden border-2 border-white shadow-sm">
                  {/* TODO: Load avatar_url thực tế từ profiles nếu có */}
                  <span className="material-symbols-outlined text-[40px]">account_circle</span>
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#0b1c30]">{fullName || "Người dùng"}</h2>
                  <p className="text-[14px] text-[#565e74]">Gói tài khoản: <span className="font-semibold text-[#004f35]">Cơ bản (Free)</span></p>
                  <button className="mt-2 text-[13px] font-semibold text-[#0037b0] hover:underline">
                    Đổi ảnh đại diện
                  </button>
                </div>
              </div>

              {/* Form Section */}
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#565e74] mb-2">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#f8f9ff] border border-[#dce1ff] rounded-xl px-4 py-3 text-[14px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/20 transition-all"
                      placeholder="Nhập họ và tên của bạn"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#565e74] mb-2 flex items-center gap-1">
                      Email đăng nhập
                      <span className="material-symbols-outlined text-[14px] text-[#8fa5c0]" title="Không thể thay đổi email">lock</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full bg-[#e5eeff]/50 border border-[#e5eeff] rounded-xl px-4 py-3 text-[14px] text-[#565e74] cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#565e74] mb-2">
                    Ngành nghề quan tâm (Mặc định)
                  </label>
                  <div className="relative">
                    <select
                      value={industryId}
                      onChange={(e) => setIndustryId(e.target.value)}
                      className="w-full bg-[#f8f9ff] border border-[#dce1ff] rounded-xl pl-4 pr-10 py-3 text-[14px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Chọn ngành nghề</option>
                      {MOCK_INDUSTRIES.map(ind => (
                        <option key={ind.id} value={ind.id}>{ind.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#8fa5c0] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                  <p className="text-[12px] text-[#8fa5c0] mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Dùng để tự động điền (prefill) khi bạn phân tích CV mới.
                  </p>
                </div>

                <div className="pt-6 border-t border-[#e5eeff] flex items-center justify-end gap-4">
                  {saveSuccess && (
                    <span className="text-[13px] font-medium text-[#004f35] bg-[#85f8c4]/30 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Đã lưu thành công
                    </span>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-6 py-3 rounded-xl font-[family-name:var(--font-plus-jakarta)] text-[14px] font-bold flex items-center gap-2 transition-all ${
                      isSaving
                        ? "bg-[#dce1ff] text-[#0037b0] cursor-wait"
                        : "bg-[#0037b0] text-white hover:bg-[#1d4ed8] shadow-md"
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
          
        </div>
      </main>

      <Footer />
    </div>
  );
}
