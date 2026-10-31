"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

interface SkillItem {
  id: string;
  name: string;
  type: "hard" | "soft";
}

interface IndustryItem {
  id: string;
  name: string;
  desc: string;
  skills: SkillItem[];
}

const FALLBACK_DATA: IndustryItem[] = [
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
    ],
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
    ],
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
    ],
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
    ],
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
    ],
  },
];

export default function ExplorePage() {
  const [industries, setIndustries] = useState<IndustryItem[]>(FALLBACK_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndId, setActiveIndId] = useState<string>(FALLBACK_DATA[0].id);

  // Nạp dữ liệu thực tế từ Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadRealData() {
      try {
        const supabase = createClient();
        const { data: indRows, error: indErr } = await supabase
          .from("industries")
          .select("id, name, slug, parent_id, sort_order")
          .is("parent_id", null)
          .order("sort_order", { ascending: true });

        if (indErr || !indRows || indRows.length === 0) {
          if (isMounted) setLoading(false);
          return;
        }

        const { data: skillRows } = await supabase
          .from("skills")
          .select("id, industry_id, skill_type, name");

        const realList: IndustryItem[] = indRows.map((ind) => {
          const matchedSkills = (skillRows || [])
            .filter((s) => s.industry_id === ind.id || (!s.industry_id && s.skill_type === "soft"))
            .map((s) => ({
              id: s.id,
              name: s.name,
              type: (s.skill_type === "soft" ? "soft" : "hard") as "hard" | "soft",
            }));

          return {
            id: ind.id,
            name: ind.name,
            desc: `Hệ thống kỹ năng tiêu chuẩn và từ khóa chuyên môn cho nhóm ngành ${ind.name}.`,
            skills:
              matchedSkills.length > 0
                ? matchedSkills
                : [
                    { id: `sk_${ind.id}_1`, name: "Kỹ năng chuyên môn", type: "hard" },
                    { id: `sk_${ind.id}_2`, name: "Giao tiếp chuyên nghiệp", type: "soft" },
                  ],
          };
        });

        if (isMounted && realList.length > 0) {
          setIndustries(realList);
          setActiveIndId(realList[0].id);
        }
      } catch (e) {
        console.warn("Không tải được dữ liệu động ngành nghề, dùng fallback:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRealData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Lọc ngành nghề theo từ khóa
  const filteredIndustries = industries.filter(
    (ind) =>
      ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.skills.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeIndustry =
    industries.find((ind) => ind.id === activeIndId) || filteredIndustries[0] || industries[0];

  return (
    <div className="bg-[#f8f9fc] min-h-screen flex flex-col selection:bg-[#c026d3]/20 selection:text-[#0037b0]">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        {/* Page Header */}
        <section className="w-full px-4 sm:px-8 lg:px-12 pt-8 pb-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff4ff] border border-[#dce1ff] text-[#0037b0] text-[12px] font-bold mb-3 shadow-xs">
              <span className="material-symbols-outlined text-[15px]">account_tree</span>
              <span>Bản đồ Năng lực &amp; Chuẩn kỹ năng Quốc gia</span>
            </div>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[30px] md:text-[36px] font-extrabold text-[#0b1c30] tracking-tight leading-[1.2]">
              Khám phá hệ thống Kỹ năng chuẩn
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[#565e74] mt-2 leading-relaxed">
              Bản đồ kỹ năng cứng và kỹ năng mềm tiêu chuẩn cho từng ngành nghề, được tổng hợp từ hàng ngàn yêu cầu tuyển dụng (JD) thực tế tại thị trường Việt Nam.
            </p>
          </div>
        </section>

        <section className="w-full px-4 sm:px-8 lg:px-12 py-4 flex-1 flex flex-col md:flex-row gap-6">
          {/* Sidebar: Danh sách ngành & Tìm kiếm */}
          <div className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 flex flex-col gap-4">
            {/* Thanh tìm kiếm */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm ngành nghề hoặc kỹ năng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#e2e8f0] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/20 transition-all shadow-sm"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none text-[20px]">
                search
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0b1c30]"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Danh sách ngành nghề với Skeleton Loader */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden flex-1 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse space-y-2 p-3 rounded-lg bg-[#f8fafc]">
                      <div className="h-4 bg-[#e2e8f0] rounded-md w-3/4"></div>
                      <div className="h-3 bg-[#e2e8f0] rounded-md w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : filteredIndustries.length > 0 ? (
                filteredIndustries.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => setActiveIndId(ind.id)}
                    className={`w-full text-left p-4 border-b border-[#f1f5f9] last:border-0 transition-colors flex items-center justify-between group cursor-pointer ${
                      activeIndustry?.id === ind.id
                        ? "bg-[#eff4ff] border-l-4 border-l-[#0037b0]"
                        : "bg-white hover:bg-[#f8fafc] border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <h3
                        className={`font-[family-name:var(--font-plus-jakarta)] text-[14px] font-bold truncate ${
                          activeIndustry?.id === ind.id ? "text-[#0037b0]" : "text-[#0b1c30]"
                        }`}
                      >
                        {ind.name}
                      </h3>
                      <p className="text-[12px] text-[#64748b] mt-0.5 line-clamp-1">{ind.desc}</p>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[18px] shrink-0 transition-transform ${
                        activeIndustry?.id === ind.id
                          ? "text-[#0037b0] translate-x-0.5"
                          : "text-[#cbd5e1] group-hover:translate-x-0.5"
                      }`}
                    >
                      chevron_right
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-[#64748b] text-[13px]">
                  <span className="material-symbols-outlined text-[32px] text-[#94a3b8] block mb-2">
                    search_off
                  </span>
                  Không tìm thấy kết quả phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
                </div>
              )}
            </div>
          </div>

          {/* Main Content: Hiển thị chi tiết ngành đã chọn */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 lg:p-8 flex flex-col justify-between">
            {activeIndustry ? (
              <div>
                <div className="mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dce1ff]/50 text-[#0037b0] text-[12px] font-bold mb-3">
                    <span className="material-symbols-outlined text-[16px]">domain</span>
                    Nhóm ngành nghề
                  </div>
                  <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[26px] sm:text-[30px] font-extrabold text-[#0b1c30] mb-2 tracking-tight">
                    {activeIndustry.name}
                  </h2>
                  <p className="text-[14px] sm:text-[15px] text-[#475569] leading-relaxed">
                    {activeIndustry.desc}
                  </p>
                </div>

                {/* Khối Hard Skills */}
                <div className="mb-8">
                  <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[16px] sm:text-[17px] font-bold text-[#0b1c30] flex items-center gap-2 mb-3.5 border-b border-[#f1f5f9] pb-2.5">
                    <span className="material-symbols-outlined text-[#059669]">engineering</span>
                    Kỹ năng chuyên môn (Hard Skills)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeIndustry.skills
                      .filter((s) => s.type === "hard")
                      .map((skill) => (
                        <div
                          key={skill.id}
                          className="bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 shadow-2xs hover:bg-[#d1fae5] transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                          {skill.name}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Khối Soft Skills */}
                <div>
                  <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[16px] sm:text-[17px] font-bold text-[#0b1c30] flex items-center gap-2 mb-3.5 border-b border-[#f1f5f9] pb-2.5">
                    <span className="material-symbols-outlined text-[#0037b0]">psychology_alt</span>
                    Kỹ năng mềm (Soft Skills)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeIndustry.skills
                      .filter((s) => s.type === "soft")
                      .map((skill) => (
                        <div
                          key={skill.id}
                          className="bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 shadow-2xs hover:bg-[#dbeafe] transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0037b0]"></span>
                          {skill.name}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* CTA Liên kết sang Đánh giá CV */}
            {activeIndustry && (
              <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-[#eff6ff] via-[#f0f9ff] to-[#ecfdf5] border border-[#bfdbfe]/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-[15px] text-[#0b1c30]">
                    CV của bạn đã đáp ứng bao nhiêu % kỹ năng ngành {activeIndustry.name}?
                  </h4>
                  <p className="text-[12px] text-[#64748b] mt-0.5">
                    Tải lên hồ sơ để AI đối soát tự động với bộ từ khóa chuyên môn của ngành này.
                  </p>
                </div>
                <Link
                  href={`/score?industry=${encodeURIComponent(activeIndustry.name)}`}
                  className="w-full sm:w-auto btn-primary px-5 py-2.5 text-[13px] font-bold shadow-sm hover:shadow-md shrink-0"
                >
                  <span>Đối soát CV ngay</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
