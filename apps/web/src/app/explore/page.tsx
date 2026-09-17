"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// TODO: thay bằng dữ liệu thật từ Supabase — bảng `industries` và `skills`
const MOCK_DATA = [
  {
    id: "ind_1",
    name: "Công nghệ thông tin",
    desc: "Bao gồm Phát triển phần mềm, Khoa học dữ liệu, và An toàn thông tin.",
    skills: [
      { id: "sk_1", name: "Python", type: "hard" },
      { id: "sk_2", name: "ReactJS", type: "hard" },
      { id: "sk_3", name: "System Design", type: "hard" },
      { id: "sk_4", name: "Giải quyết vấn đề", type: "soft" },
      { id: "sk_5", name: "Giao tiếp", type: "soft" },
    ]
  },
  {
    id: "ind_2",
    name: "Marketing & Truyền thông",
    desc: "Digital Marketing, SEO, Sáng tạo nội dung và Quản lý chiến dịch.",
    skills: [
      { id: "sk_6", name: "SEO/SEM", type: "hard" },
      { id: "sk_7", name: "Content Strategy", type: "hard" },
      { id: "sk_8", name: "Google Analytics", type: "hard" },
      { id: "sk_9", name: "Tư duy sáng tạo", type: "soft" },
      { id: "sk_10", name: "Làm việc nhóm", type: "soft" },
    ]
  },
  {
    id: "ind_3",
    name: "Tài chính Kế toán",
    desc: "Kiểm toán, Phân tích tài chính, và Kế toán doanh nghiệp.",
    skills: [
      { id: "sk_11", name: "Báo cáo tài chính", type: "hard" },
      { id: "sk_12", name: "SAP / ERP", type: "hard" },
      { id: "sk_13", name: "Mô hình hóa tài chính", type: "hard" },
      { id: "sk_14", name: "Quản lý thời gian", type: "soft" },
      { id: "sk_15", name: "Bảo mật thông tin", type: "soft" },
    ]
  },
  {
    id: "ind_4",
    name: "Thiết kế / Sáng tạo",
    desc: "UI/UX Design, Thiết kế đồ họa, và Sản xuất video.",
    skills: [
      { id: "sk_16", name: "Figma", type: "hard" },
      { id: "sk_17", name: "Adobe Creative Suite", type: "hard" },
      { id: "sk_18", name: "Wireframing", type: "hard" },
      { id: "sk_19", name: "Thấu cảm (Empathy)", type: "soft" },
      { id: "sk_20", name: "Lắng nghe phản hồi", type: "soft" },
    ]
  },
  {
    id: "ind_5",
    name: "Quản lý nhân sự",
    desc: "Tuyển dụng, Đào tạo, và Phát triển tổ chức (C&B).",
    skills: [
      { id: "sk_21", name: "Luật lao động", type: "hard" },
      { id: "sk_22", name: "Đánh giá KPI", type: "hard" },
      { id: "sk_23", name: "Talent Acquisition", type: "hard" },
      { id: "sk_24", name: "Đàm phán", type: "soft" },
      { id: "sk_25", name: "Xử lý xung đột", type: "soft" },
    ]
  }
];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndId, setActiveIndId] = useState(MOCK_DATA[0].id);

  // Lọc ngành nghề theo từ khóa
  const filteredIndustries = MOCK_DATA.filter((ind) =>
    ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ind.skills.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeIndustry = MOCK_DATA.find(ind => ind.id === activeIndId) || MOCK_DATA[0];

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        {/* Page Header */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pt-8 pb-4">
          <div className="max-w-3xl">
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[32px] md:text-[36px] font-bold text-[#0b1c30] tracking-tight leading-[1.2]">
              Khám phá hệ thống Kỹ năng
            </h1>
            <p className="text-[16px] text-[#565e74] mt-2 leading-relaxed">
              Bản đồ kỹ năng cứng và kỹ năng mềm tiêu chuẩn cho từng ngành nghề, được tổng hợp từ hàng ngàn yêu cầu tuyển dụng (JD) thực tế.
            </p>
          </div>
        </section>

        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-4 flex-1 flex flex-col md:flex-row gap-6">
          {/* Sidebar: Danh sách ngành & Tìm kiếm */}
          <div className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 flex flex-col gap-4">
            
            {/* Thanh tìm kiếm */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm ngành nghề hoặc kỹ năng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#e5eeff] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#0b1c30] focus:outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/20 transition-all shadow-sm"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa5c0] pointer-events-none text-[20px]">
                search
              </span>
            </div>

            {/* Danh sách ngành nghề */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] overflow-hidden flex-1 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredIndustries.length > 0 ? (
                filteredIndustries.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => setActiveIndId(ind.id)}
                    className={`w-full text-left p-4 border-b border-[#e5eeff] last:border-0 transition-colors flex items-center justify-between group ${
                      activeIndId === ind.id
                        ? "bg-[#eff4ff] border-l-4 border-l-[#0037b0]"
                        : "bg-white hover:bg-[#f8f9ff] border-l-4 border-l-transparent"
                    }`}
                  >
                    <div>
                      <h3 className={`font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold ${activeIndId === ind.id ? "text-[#0037b0]" : "text-[#0b1c30]"}`}>
                        {ind.name}
                      </h3>
                      <p className="text-[12px] text-[#565e74] mt-1 line-clamp-1">{ind.desc}</p>
                    </div>
                    <span className={`material-symbols-outlined text-[18px] transition-transform ${activeIndId === ind.id ? "text-[#0037b0] translate-x-1" : "text-[#c4c5d7] group-hover:translate-x-1"}`}>
                      chevron_right
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-[#565e74] text-[14px]">
                  Không tìm thấy kết quả phù hợp.
                </div>
              )}
            </div>
          </div>

          {/* Main Content: Hiển thị chi tiết ngành đã chọn */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#e5eeff] p-6 lg:p-8">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dce1ff]/50 text-[#0037b0] text-[12px] font-semibold mb-3">
                <span className="material-symbols-outlined text-[16px]">domain</span>
                Nhóm ngành
              </div>
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[28px] font-bold text-[#0b1c30] mb-2">
                {activeIndustry.name}
              </h2>
              <p className="text-[15px] text-[#565e74] leading-relaxed">
                {activeIndustry.desc}
              </p>
            </div>

            {/* Khối Hard Skills */}
            <div className="mb-8">
              <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold text-[#0b1c30] flex items-center gap-2 mb-4 border-b border-[#e5eeff] pb-2">
                <span className="material-symbols-outlined text-[#004f35]">engineering</span>
                Kỹ năng chuyên môn (Hard Skills)
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeIndustry.skills.filter(s => s.type === "hard").map(skill => (
                  <div key={skill.id} className="bg-[#85f8c4]/30 text-[#004f35] border border-[#85f8c4]/50 px-3 py-1.5 rounded-lg text-[14px] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004f35]"></span>
                    {skill.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Khối Soft Skills */}
            <div>
              <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold text-[#0b1c30] flex items-center gap-2 mb-4 border-b border-[#e5eeff] pb-2">
                <span className="material-symbols-outlined text-[#0037b0]">psychology_alt</span>
                Kỹ năng mềm (Soft Skills)
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeIndustry.skills.filter(s => s.type === "soft").map(skill => (
                  <div key={skill.id} className="bg-[#eff4ff] text-[#0037b0] border border-[#dce1ff] px-3 py-1.5 rounded-lg text-[14px] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0037b0]"></span>
                    {skill.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
