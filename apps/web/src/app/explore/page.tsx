"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

interface SkillItem {
  id: string;
  name: string;
  type: "hard" | "soft";
  category?: string;
}

interface IndustryItem {
  id: string;
  name: string;
  icon: string;
  shortDesc: string;
  skills: SkillItem[];
}

// Icon mapper thông minh theo tên ngành
function resolveIndustryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("công nghệ") || n.includes("it") || n.includes("phần mềm") || n.includes("lập trình")) return "code";
  if (n.includes("marketing") || n.includes("truyền thông") || n.includes("quảng cáo")) return "campaign";
  if (n.includes("tài chính") || n.includes("kế toán") || n.includes("ngân hàng")) return "payments";
  if (n.includes("thiết kế") || n.includes("đồ họa") || n.includes("ui/ux")) return "palette";
  if (n.includes("nhân sự") || n.includes("hr") || n.includes("tuyển dụng")) return "badge";
  if (n.includes("kinh doanh") || n.includes("sales") || n.includes("bán hàng")) return "trending_up";
  if (n.includes("logistics") || n.includes("chuỗi cung ứng") || n.includes("kho")) return "local_shipping";
  if (n.includes("chăm sóc") || n.includes("khách hàng") || n.includes("vận hành")) return "support_agent";
  if (n.includes("y tế") || n.includes("dược")) return "medical_services";
  if (n.includes("giáo dục") || n.includes("đào tạo")) return "school";
  return "work";
}

const FALLBACK_DATA: IndustryItem[] = [
  {
    id: "ind_1",
    name: "Công nghệ thông tin",
    icon: "code",
    shortDesc: "Phát triển phần mềm, Dữ liệu, Cloud & An toàn thông tin",
    skills: [
      { id: "sk_1_1", name: "Python / TypeScript", type: "hard", category: "Ngôn ngữ" },
      { id: "sk_1_2", name: "React / Next.js", type: "hard", category: "Frontend" },
      { id: "sk_1_3", name: "Node.js / FastAPI", type: "hard", category: "Backend" },
      { id: "sk_1_4", name: "SQL & Cơ sở dữ liệu", type: "hard", category: "Database" },
      { id: "sk_1_5", name: "Docker & CI/CD", type: "hard", category: "DevOps" },
      { id: "sk_1_6", name: "Kiến trúc hệ thống (System Design)", type: "hard", category: "Kiến trúc" },
      { id: "sk_1_7", name: "Tư duy phân tích & Giải quyết lỗi", type: "soft" },
      { id: "sk_1_8", name: "Làm việc theo Agile / Scrum", type: "soft" },
      { id: "sk_1_9", name: "Giao tiếp kỹ thuật & Code Review", type: "soft" },
    ],
  },
  {
    id: "ind_2",
    name: "Marketing & Truyền thông",
    icon: "campaign",
    shortDesc: "Digital Marketing, SEO/SEM, Content & Tối ưu chuyển đổi",
    skills: [
      { id: "sk_2_1", name: "SEO / SEM & Từ khóa", type: "hard", category: "Tìm kiếm" },
      { id: "sk_2_2", name: "Google Analytics / GA4", type: "hard", category: "Phân tích" },
      { id: "sk_2_3", name: "Facebook & TikTok Ads", type: "hard", category: "Quảng cáo" },
      { id: "sk_2_4", name: "Content Strategy & Copywriting", type: "hard", category: "Nội dung" },
      { id: "sk_2_5", name: "Email Marketing & CRM Funnel", type: "hard", category: "Tự động hóa" },
      { id: "sk_2_6", name: "Tư duy sáng tạo & Bắt trend", type: "soft" },
      { id: "sk_2_7", name: "Phân tích dữ liệu người dùng", type: "soft" },
      { id: "sk_2_8", name: "Điều phối chiến dịch đa kênh", type: "soft" },
    ],
  },
  {
    id: "ind_3",
    name: "Tài chính & Kế toán",
    icon: "payments",
    shortDesc: "Phân tích tài chính, Kiểm toán, Thuế & Hệ thống ERP",
    skills: [
      { id: "sk_3_1", name: "Lập & Đọc Báo cáo tài chính", type: "hard", category: "Chuyên môn" },
      { id: "sk_3_2", name: "Hệ thống SAP / ERP", type: "hard", category: "Công cụ" },
      { id: "sk_3_3", name: "Mô hình hóa tài chính (Excel/Power BI)", type: "hard", category: "Phân tích" },
      { id: "sk_3_4", name: "Quy định Thuế & Chuẩn mực Kế toán", type: "hard", category: "Pháp lý" },
      { id: "sk_3_5", name: "Quản trị dòng tiền & Dự báo", type: "hard", category: "Quản trị" },
      { id: "sk_3_6", name: "Độ chính xác & Tỉ mỉ số liệu", type: "soft" },
      { id: "sk_3_7", name: "Bảo mật thông tin tài chính", type: "soft" },
      { id: "sk_3_8", name: "Tư duy giải trình kiểm toán", type: "soft" },
    ],
  },
  {
    id: "ind_4",
    name: "Thiết kế & Sáng tạo",
    icon: "palette",
    shortDesc: "UI/UX Design, Thiết kế đồ họa thương hiệu & Prototype",
    skills: [
      { id: "sk_4_1", name: "Figma & Design Systems", type: "hard", category: "UI/UX" },
      { id: "sk_4_2", name: "Adobe Creative Suite (Ps, Ai)", type: "hard", category: "Đồ họa" },
      { id: "sk_4_3", name: "Wireframing & Prototype tương tác", type: "hard", category: "UX Flow" },
      { id: "sk_4_4", name: "Nghiên cứu người dùng (User Research)", type: "hard", category: "Nghiên cứu" },
      { id: "sk_4_5", name: "Typography & Hệ thống lưới (Grid)", type: "hard", category: "Mỹ thuật" },
      { id: "sk_4_6", name: "Tư duy thấu cảm người dùng (Empathy)", type: "soft" },
      { id: "sk_4_7", name: "Lắng nghe phản hồi & Phản biện thiết kế", type: "soft" },
      { id: "sk_4_8", name: "Phối hợp chặt chẽ với Developer", type: "soft" },
    ],
  },
  {
    id: "ind_5",
    name: "Quản trị Nhân sự (HR)",
    icon: "badge",
    shortDesc: "Thu hút nhân tài (Talent Acquisition), C&B & Đào tạo nội bộ",
    skills: [
      { id: "sk_5_1", name: "Tuyển dụng & Tìm nguồn ứng viên", type: "hard", category: "Tuyển dụng" },
      { id: "sk_5_2", name: "Luật Lao động & Bảo hiểm xã hội", type: "hard", category: "Pháp lý" },
      { id: "sk_5_3", name: "Quản trị tiền lương & Đãi ngộ (C&B)", type: "hard", category: "C&B" },
      { id: "sk_5_4", name: "Thiết lập KPI / OKRs hiệu suất", type: "hard", category: "Đánh giá" },
      { id: "sk_5_5", name: "Hệ thống quản lý nhân sự (HRIS)", type: "hard", category: "Công cụ" },
      { id: "sk_5_6", name: "Kỹ năng phỏng vấn & Đàm phán đãi ngộ", type: "soft" },
      { id: "sk_5_7", name: "Giải quyết xung đột & Quan hệ nhân viên", type: "soft" },
      { id: "sk_5_8", name: "Xây dựng văn hóa tổ chức", type: "soft" },
    ],
  },
  {
    id: "ind_6",
    name: "Kinh doanh & Bán hàng (Sales)",
    icon: "trending_up",
    shortDesc: "Bán hàng B2B/B2C, Quản trị phễu khách hàng & Đàm phán",
    skills: [
      { id: "sk_6_1", name: "Phát triển khách hàng tiềm năng (Lead Gen)", type: "hard", category: "Tìm kiếm" },
      { id: "sk_6_2", name: "Sử dụng phần mềm CRM (Hubspot/Salesforce)", type: "hard", category: "Công cụ" },
      { id: "sk_6_3", name: "Kỹ năng thuyết trình giải pháp sản phẩm", type: "hard", category: "Trình bày" },
      { id: "sk_6_4", name: "Đàm phán & Chốt hợp đồng thương mại", type: "hard", category: "Chốt sale" },
      { id: "sk_6_5", name: "Lắng nghe chủ động & Nắm bắt nhu cầu", type: "soft" },
      { id: "sk_6_6", name: "Xử lý từ chối thuyết phục", type: "soft" },
      { id: "sk_6_7", name: "Chịu áp lực chỉ tiêu doanh số (KPI/Quota)", type: "soft" },
    ],
  },
];

export default function ExplorePage() {
  const [industries, setIndustries] = useState<IndustryItem[]>(FALLBACK_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndId, setActiveIndId] = useState<string>(FALLBACK_DATA[0].id);

  // Bộ kỹ năng người dùng tự đánh dấu là đã sở hữu (Interactive Self-Check)
  const [checkedSkills, setCheckedSkills] = useState<Record<string, boolean>>({});

  // Nạp dữ liệu thực tế từ Supabase (nếu có cấu hình)
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
            icon: resolveIndustryIcon(ind.name),
            shortDesc: `Hệ thống kỹ năng tiêu chuẩn cho nhóm ngành ${ind.name}.`,
            skills:
              matchedSkills.length > 0
                ? matchedSkills
                : [
                    { id: `sk_${ind.id}_1`, name: "Kỹ năng chuyên môn", type: "hard" as const },
                    { id: `sk_${ind.id}_2`, name: "Giao tiếp chuyên nghiệp", type: "soft" as const },
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
  const filteredIndustries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return industries;
    return industries.filter(
      (ind) =>
        ind.name.toLowerCase().includes(q) ||
        ind.shortDesc.toLowerCase().includes(q) ||
        ind.skills.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [industries, searchQuery]);

  const activeIndustry = useMemo(() => {
    return (
      industries.find((ind) => ind.id === activeIndId) ||
      filteredIndustries[0] ||
      industries[0]
    );
  }, [industries, activeIndId, filteredIndustries]);

  // Đảo trạng thái tự đánh giá kỹ năng
  const toggleSkill = (id: string) => {
    setCheckedSkills((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Tính tỷ lệ kỹ năng đã tích chọn trong ngành hiện tại
  const currentSkills = activeIndustry?.skills || [];
  const totalSkillsCount = currentSkills.length;
  const checkedCount = currentSkills.filter((s) => checkedSkills[s.id]).length;
  const matchPercentage = totalSkillsCount > 0 ? Math.round((checkedCount / totalSkillsCount) * 100) : 0;

  return (
    <div className="bg-[#f8f9fc] min-h-screen flex flex-col selection:bg-[#c026d3]/20 selection:text-[#0037b0]">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        {/* ── 1. Hero Banner: Súc tích, nói thẳng giá trị ── */}
        <section className="w-full px-4 sm:px-8 lg:px-12 pt-8 pb-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200/80">
            <div className="max-w-2xl lg:max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/80 text-[#0037b0] text-[12px] font-bold mb-3 shadow-2xs">
                <span className="material-symbols-outlined text-[16px] text-[#059669]">verified</span>
                <span className="tracking-wide">BẢN ĐỒ TỪ KHÓA TUYỂN DỤNG ATS VIỆT NAM</span>
              </div>
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[26px] sm:text-[32px] lg:text-[35px] font-extrabold text-[#0b1c30] tracking-tight leading-[1.25]">
                Giải Mã &ldquo;Bộ Từ Khóa Vàng&rdquo;{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0037b0] via-[#2563eb] to-[#7c3aed]">
                  Từ Hàng Nghìn JD Thực Tế
                </span>
              </h1>
              <p className="text-[14px] sm:text-[15.5px] text-[#475569] mt-2.5 leading-relaxed">
                Đừng đoán mò tiêu chí tuyển dụng. Tra cứu chuẩn kỹ năng cứng &amp; kỹ năng mềm được trích xuất từ hàng nghìn JD thực tế, tự kiểm tra độ sẵn sàng và đồng bộ ngay vào CV.
              </p>
            </div>

            {/* 3 Thẻ tóm tắt chức năng: Nhìn 3 giây là hiểu */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 lg:max-w-xl">
              <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0037b0] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">search</span>
                </div>
                <div className="text-[12px]">
                  <p className="font-bold text-[#0b1c30]">1. Chọn ngành</p>
                  <p className="text-slate-500 text-[11px]">Tra cứu từ khóa ATS</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">checklist</span>
                </div>
                <div className="text-[12px]">
                  <p className="font-bold text-[#0b1c30]">2. Tự đánh dấu</p>
                  <p className="text-slate-500 text-[11px]">Đo % kỹ năng đã có</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                </div>
                <div className="text-[12px]">
                  <p className="font-bold text-[#0b1c30]">3. Quét CV bằng AI</p>
                  <p className="text-slate-500 text-[11px]">Tìm lỗ hổng hồ sơ</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Khu vực Tương tác chính ── */}
        <section className="w-full px-4 sm:px-8 lg:px-12 py-4 pb-12 flex-1 flex flex-col lg:flex-row gap-6 items-start">
          {/* CỘT TRÁI: Tìm kiếm & Danh sách ngành dạng Card trực quan */}
          <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-3">
            {/* Thanh tìm kiếm */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm ngành nghề hoặc kỹ năng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-[13.5px] text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:border-[#0037b0] focus:ring-2 focus:ring-[#0037b0]/20 transition-all shadow-2xs"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                search
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Danh sách thẻ ngành */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Nhóm ngành ({filteredIndustries.length})</span>
                <span>Từ khóa ATS</span>
              </div>

              <div className="max-h-[580px] overflow-y-auto divide-y divide-slate-100">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                        <div className="w-9 h-9 bg-slate-200 rounded-xl"></div>
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-slate-200 rounded w-2/3"></div>
                          <div className="h-2.5 bg-slate-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredIndustries.length > 0 ? (
                  filteredIndustries.map((ind) => {
                    const isSelected = activeIndustry?.id === ind.id;
                    return (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => setActiveIndId(ind.id)}
                        className={`w-full text-left p-3.5 transition-all flex items-center gap-3 group cursor-pointer ${
                          isSelected
                            ? "bg-[#eff4ff] border-l-4 border-l-[#0037b0] shadow-inner"
                            : "bg-white hover:bg-slate-50 border-l-4 border-l-transparent"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                            isSelected
                              ? "bg-[#0037b0] text-white shadow-xs scale-105"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">{ind.icon}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2
                            className={`text-[13.5px] font-bold truncate ${
                              isSelected ? "text-[#0037b0]" : "text-[#0b1c30] group-hover:text-slate-900"
                            }`}
                          >
                            {ind.name}
                          </h2>
                          <p className="text-[11.5px] text-slate-500 truncate mt-0.5">{ind.shortDesc}</p>
                        </div>

                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isSelected
                              ? "bg-blue-200/70 text-[#0037b0]"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                          }`}
                        >
                          {ind.skills.length}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-500 text-[13px]">
                    <span className="material-symbols-outlined text-[32px] text-slate-400 block mb-2">
                      search_off
                    </span>
                    Không tìm thấy ngành khớp &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Bảng Kỹ năng tương tác & Trình tự đánh giá */}
          {activeIndustry ? (
            <div className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-7 flex flex-col justify-between">
              <div>
                {/* Header Ngành đã chọn */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0037b0] border border-blue-200/60 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[26px]">{activeIndustry.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0037b0] bg-blue-50 px-2 py-0.5 rounded-md">
                          Tiêu chuẩn tuyển dụng
                        </span>
                        <span className="text-[12px] text-slate-400">•</span>
                        <span className="text-[12px] text-slate-500 font-medium">{activeIndustry.skills.length} từ khóa cốt lõi</span>
                      </div>
                      <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[22px] sm:text-[24px] font-bold text-[#0b1c30] mt-0.5">
                        {activeIndustry.name}
                      </h2>
                    </div>
                  </div>

                  {/* Nút đối soát ngay */}
                  <Link
                    href={`/score?industry=${encodeURIComponent(activeIndustry.name)}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0037b0] text-white text-[13px] font-bold hover:bg-[#1d4ed8] shadow-xs transition-all shrink-0 active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[18px]">analytics</span>
                    <span>Đối soát với CV của bạn</span>
                  </Link>
                </div>

                {/* ── Thanh Tự Đánh Giá (Interactive Self-Check Meter) ── */}
                <div className="my-6 p-4 rounded-xl bg-gradient-to-r from-blue-50/60 via-slate-50 to-emerald-50/40 border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#0037b0]">touch_app</span>
                      <span className="text-[13px] font-bold text-[#0b1c30]">
                        Bấm vào kỹ năng bạn đã có để tự kiểm tra độ sẵn sàng:
                      </span>
                    </div>
                    <div className="text-[12.5px] font-bold text-[#0037b0]">
                      Đã đạt: <span className="font-extrabold text-[14px]">{checkedCount}</span> / {totalSkillsCount} ({matchPercentage}%)
                    </div>
                  </div>

                  {/* Thanh Progress bar */}
                  <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#2563eb] to-[#059669] transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(matchPercentage, 3)}%` }}
                    />
                  </div>

                  <p className="text-[11.5px] text-slate-500 mt-2">
                    {matchPercentage === 100
                      ? "🎉 Xuất sắc! Bạn đã sở hữu đầy đủ từ khóa vàng của ngành này. Tải CV lên để AI kiểm tra cách bạn trình bày!"
                      : matchPercentage >= 50
                      ? "👍 Rất tiềm năng! Bạn đã đáp ứng phần lớn yêu cầu. Hãy xem kỹ các từ khóa còn thiếu để bổ sung vào CV."
                      : "💡 Nhấp vào các thẻ kỹ năng bên dưới để đánh dấu những gì bạn đã học hoặc từng làm thực tế."}
                  </p>
                </div>

                {/* ── 1. Kỹ năng chuyên môn (Hard Skills) ── */}
                <div className="mb-7">
                  <div className="flex items-center justify-between mb-3.5 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#059669]"></span>
                      <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold text-[#0b1c30]">
                        Kỹ năng Chuyên môn &amp; Công cụ (Hard Skills)
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Từ khóa lọc ATS bắt buộc
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {activeIndustry.skills
                      .filter((s) => s.type === "hard")
                      .map((skill) => {
                        const isChecked = !!checkedSkills[skill.id];
                        return (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => toggleSkill(skill.id)}
                            className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer select-none group ${
                              isChecked
                                ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs ring-1 ring-emerald-300"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-[#0b1c30]"
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-[19px] shrink-0 transition-colors mt-0.5 ${
                                isChecked
                                  ? "text-[#059669]"
                                  : "text-slate-300 group-hover:text-slate-400"
                              }`}
                            >
                              {isChecked ? "check_box" : "check_box_outline_blank"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-[13px] leading-tight font-bold ${isChecked ? "text-emerald-900" : "text-[#0b1c30]"}`}>
                                {skill.name}
                              </p>
                              {skill.category && (
                                <span className="inline-block text-[10px] uppercase font-bold text-slate-400 mt-1">
                                  {skill.category}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* ── 2. Kỹ năng mềm & Năng lực hành vi (Soft Skills) ── */}
                <div>
                  <div className="flex items-center justify-between mb-3.5 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0037b0]"></span>
                      <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold text-[#0b1c30]">
                        Kỹ năng Mềm &amp; Năng lực Hành vi (Soft Skills)
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Tiêu chí phỏng vấn vòng chuyên sâu
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {activeIndustry.skills
                      .filter((s) => s.type === "soft")
                      .map((skill) => {
                        const isChecked = !!checkedSkills[skill.id];
                        return (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => toggleSkill(skill.id)}
                            className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer select-none group ${
                              isChecked
                                ? "bg-blue-50/80 border-blue-300 text-blue-950 shadow-2xs ring-1 ring-blue-300"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-[#0b1c30]"
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-[19px] shrink-0 transition-colors mt-0.5 ${
                                isChecked
                                  ? "text-[#0037b0]"
                                  : "text-slate-300 group-hover:text-slate-400"
                              }`}
                            >
                              {isChecked ? "check_box" : "check_box_outline_blank"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-[13px] leading-tight font-bold ${isChecked ? "text-blue-900" : "text-[#0b1c30]"}`}>
                                {skill.name}
                              </p>
                              <span className="inline-block text-[10px] text-slate-400 mt-1">
                                Kỹ năng hành vi
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* ── 3. Bottom CTA Box: Hướng dẫn bước tiếp theo rõ ràng ── */}
              <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-[#eff6ff] via-[#f8fafc] to-[#ecfdf5] border border-blue-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#0037b0] border border-blue-200 shadow-2xs flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">psychology</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[14.5px] text-[#0b1c30]">
                      Bạn muốn kiểm tra xem bản CV hiện tại đã có đủ các từ khóa này chưa?
                    </h4>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Tải file CV lên để AI phân tích độ khớp, chỉ ra các từ khóa còn thiếu và gợi ý câu sửa đổi cụ thể.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <Link
                    href={`/interview`}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0b1c30] text-[12.5px] font-bold transition-all text-center"
                  >
                    Luyện phỏng vấn
                  </Link>
                  <Link
                    href={`/score?industry=${encodeURIComponent(activeIndustry.name)}`}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0037b0] text-white text-[12.5px] font-bold hover:bg-[#1d4ed8] shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Quét CV ngay</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
