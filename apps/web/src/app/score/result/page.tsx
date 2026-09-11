"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgressStepper from "@/components/ProgressStepper";
import Link from "next/link";

const STRENGTHS = [
  {
    title: "TypeScript & Type Safety Vững chắc",
    desc: "Thực thi Generic cấp cao, Monorepo tooling với Nx & Turborepo.",
  },
  {
    title: "Kiến trúc Micro-frontend Độc lập",
    desc: "Module Federation trên Webpack 5 phục vụ 12 squad thanh toán.",
  },
  {
    title: "Tối ưu hóa Core Web Vitals",
    desc: "LCP < 1.2s, INP đạt chuẩn tối đa cho luồng checkout 30k RPS.",
  },
  {
    title: "Quản lý trạng thái phân tán",
    desc: "Zustand, TanStack Query kết hợp Event-driven Web Workers.",
  },
];

const GAPS = [
  {
    title: "Kinh nghiệm GraphQL Federation còn hạn chế",
    desc: "Chỉ đề cập REST API và tRPC; JD Core Banking yêu cầu Apollo Federation Subgraphs.",
  },
  {
    title: "Kiểm thử E2E Playwright/Cypress chuyên sâu",
    desc: "Chưa thấy bằng chứng xây dựng chiến lược Visual Regression Testing trên CI/CD.",
  },
  {
    title: "Thâm niên quản lý kỹ thuật nhóm lớn (>15 người)",
    desc: "Quy mô nhóm hiện tại dừng lại ở 6-8 kỹ sư; vai trò thuần về Tech Lead hơn là People Manager.",
  },
];

const QUESTIONS = [
  {
    id: "01",
    category: "Xác thực kỹ thuật chuyên sâu (Technical Depth)",
    categoryColor: "bg-[#dce1ff] text-[#001551]",
    badgeBg: "bg-[#1d4ed8]",
    duration: "20 phút",
    weight: "40%",
    weightColor: "text-[#0037b0]",
    question:
      '"Ứng viên thể hiện hiểu biết rất tốt về Next.js SSR và Edge Runtime. Hãy yêu cầu ứng viên giải thích chiến lược xử lý Cache Revalidation (ISR/Tag-based) và Distributed State khi hệ thống cổng ngân hàng chịu tải đột biến 50.000 người dùng đồng thời (50k CCU)?"',
    expected: [
      "Phân định rõ lớp Stale-While-Revalidate ở cấp độ CDN (Cloudflare/Fastly) so với Node.js cluster.",
      "Hiểu bài toán Race Condition khi nhiều workers cùng trigger On-demand Revalidation.",
      "Đề xuất giải pháp Fallback UI an toàn và kịch bản Circuit Breaker khi API core banking suy giảm hiệu năng.",
    ],
    redFlags: [
      "Chỉ phụ thuộc hoàn toàn vào cấu hình mặc định của Vercel/Next.js mà không nắm cơ chế cache headers.",
      "Không đề cập đến việc bảo mật dữ liệu nhạy cảm (PII) trên lớp Edge Caching.",
    ],
  },
  {
    id: "02",
    category: "Thăm dò khoảng trống năng lực (Gap Exploration)",
    categoryColor: "bg-[#85f8c4] text-[#002114]",
    badgeBg: "bg-[#004f35]",
    duration: "20 phút",
    weight: "35%",
    weightColor: "text-[#004f35]",
    question:
      '"Trong hồ sơ của anh chưa đề cập sâu đến việc triển khai GraphQL Federation ở quy mô lớn. Anh hãy phân tích ưu và nhược điểm khi chuyển đổi từ API Gateway RESTful sang GraphQL Subgraphs giữa 5 dịch vụ nghiệp vụ tài chính độc lập?"',
    expected: [
      "Khả năng định nghĩa @key, @extends trên các entities dùng chung giữa các domain squads.",
      "Tư duy giải quyết bài toán N+1 query bằng DataLoader hoặc batched resolving.",
      "Hiểu rõ trade-off về độ trễ mạng (latency overhead) và độ phức tạp khi giám sát Distributed Tracing.",
    ],
    redFlags: [
      "Xem GraphQL chỉ là giải pháp thay thế UI không cần quan tâm đến tải cơ sở dữ liệu hạ tầng phía sau.",
      "Chưa từng đối mặt với bài toán Breaking Changes của schema trên môi trường Production.",
    ],
  },
  {
    id: "03",
    category: "Lãnh đạo kỹ thuật & Giải quyết xung đột (Leadership & Culture)",
    categoryColor: "bg-[#dae2fd] text-[#131b2e]",
    badgeBg: "bg-[#565e74]",
    duration: "15 phút",
    weight: "25%",
    weightColor: "text-[#565e74]",
    question:
      '"Hãy chia sẻ một tình huống thực tế khi anh phải thuyết phục Product Owner hoặc các Tech Lead khác chuyển đổi một chuẩn kiến trúc công nghệ lớn (như từ Monolith sang Micro-frontends) mà vấp phải sự phản đối gay gắt vì lo ngại rủi ro tiến độ? Anh đã giải quyết thế nào?"',
    expected: [
      "Dùng số liệu thực nghiệm (PoC, A/B Testing, thời gian build CI/CD) thay vì quan điểm cảm tính.",
      "Lập lộ trình di chuyển dần (Strangler Fig Pattern) không làm gián đoạn release tính năng kinh doanh.",
      "Tôn trọng góc nhìn của stakeholders và sẵn sàng lắng nghe phản biện chuyên môn.",
    ],
    redFlags: [
      "Áp đặt quyền lực chuyên môn hoặc đổ lỗi cho ban quản lý thiếu tầm nhìn công nghệ.",
      "Không có kế hoạch rollback nếu quá trình chuyển đổi gặp sự cố nghiêm trọng.",
    ],
  },
];

export default function ResultPage() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveDone, setSaveDone] = useState(false);

  // Đọc kết quả thật từ API (lưu trong sessionStorage)
  const [apiResult, setApiResult] = useState<{
    score?: number;
    similarity?: number;
    strengths?: Array<{title: string; desc: string}>;
    gaps?: Array<{title: string; desc: string}>;
    questions?: Array<{id: string; category: string; categoryColor: string; badgeBg: string; duration: string; weight: string; weightColor: string; question: string; expected: string[]; redFlags: string[]}>;
    job_title?: string;
    matched_skills?: string[];
    missing_skills?: string[];
    cv_exp_years?: number;
  } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("cf_result");
    console.log("[ResultPage] cf_result from sessionStorage:", raw ? JSON.parse(raw) : null);
    if (raw) {
      try { setApiResult(JSON.parse(raw)); } catch (e) { console.error("Parse error:", e); }
    }
  }, []);

  // Dùng data thật nếu có, fallback về mock data
  const strengths = apiResult?.strengths || STRENGTHS;
  const gaps      = apiResult?.gaps      || GAPS;
  const questions = apiResult?.questions || QUESTIONS;
  const finalScore = apiResult?.score ?? 82;

  function handleExport() {
    setExportLoading(true);
    setExportDone(false);
    setTimeout(() => {
      setExportLoading(false);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2500);
    }, 1200);
  }

  function handleSave() {
    setSaveLoading(true);
    setSaveDone(false);
    setTimeout(() => {
      setSaveLoading(false);
      setSaveDone(true);
      setTimeout(() => setSaveDone(false), 2500);
    }, 1000);
  }

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        <ProgressStepper activeStep={3} sessionId="EVAL-2026-0849-VN" />

        {/* Candidate strip */}
        <section className="w-full bg-[#eff4ff] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#dce1ff] flex items-center justify-center ring-2 ring-[#d3e4fe] shadow-sm">
                    <span className="material-symbols-outlined text-[#0037b0] text-[32px]">person</span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#006948] ring-2 ring-white" title="Hồ sơ đã xác minh" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[24px] font-bold text-[#0b1c30] tracking-tight">
                      Nguyễn Văn An
                    </h1>
                    <span className="px-2 py-0.5 rounded-full bg-[#dce1ff] text-[#001551] text-[11px] font-semibold">
                      Senior L6 Track
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#d3e4fe] text-[#434655] text-[11px]">
                      8.5 năm kinh nghiệm
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[#434655] text-[14px] flex-wrap">
                    <span className="flex items-center gap-1 text-[#0037b0] font-medium">
                      <span className="material-symbols-outlined text-[18px]">business_center</span>
                      Vị trí tuyển chọn:
                    </span>
                    <span className="font-semibold text-[#0b1c30]">
                      {apiResult?.job_title || "Kiến trúc sư Frontend Cấp cao (Lead Frontend Architect L6)"}
                    </span>
                    <span className="text-[#c4c5d7]">•</span>
                    <span className="text-[#565e74] text-[13px]">Khối Kỹ nghệ Nền tảng Core Banking</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 rounded-xl bg-white text-[#0b1c30] text-[13px] font-medium hover:bg-[#f0f0f0] transition-all flex items-center gap-2 shadow-sm"
                >
                  {exportLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin text-[#565e74]">progress_activity</span>
                      <span>Đang tạo PDF...</span>
                    </>
                  ) : exportDone ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] text-[#004f35]">check</span>
                      <span>Đã xuất thành công!</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px] text-[#565e74]">picture_as_pdf</span>
                      <span>Xuất PDF Báo cáo</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-[#0037b0] text-white text-[13px] font-medium hover:bg-[#1d4ed8] transition-all flex items-center gap-2 shadow-md"
                >
                  {saveLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Đang lưu...</span>
                    </>
                  ) : saveDone ? (
                    <>
                      <span className="material-symbols-outlined text-[18px]">done_all</span>
                      <span>Đã lưu vào kho ứng viên</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
                      <span>Lưu vào Hồ sơ tuyển dụng</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Metric Tri-Core Bento */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Overall Score */}
            <div className="md:col-span-12 lg:col-span-4 bg-white rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#565e74]">
                    Chỉ số đối soát tổng thể
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#85f8c4] text-[#002114] text-[11px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    Độ tương thích cao
                  </span>
                </div>

                {/* Donut */}
                <div className="flex items-center gap-6 mt-4">
                  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" fill="transparent" r="40" stroke="#E5EEFF" strokeWidth="10" />
                      <circle
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="40"
                        stroke="#004F35"
                        strokeDasharray="221.16 251.32"
                        strokeLinecap="round"
                        strokeWidth="10"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-[family-name:var(--font-plus-jakarta)] text-[36px] font-bold text-[#004f35] leading-none tracking-tight">
                        {finalScore}<span className="text-[16px]">%</span>
                      </span>
                      <span className="text-[11px] text-[#565e74] uppercase font-semibold">Tương thích</span>
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold text-[#0b1c30]">
                      Đạt chuẩn năng lực
                    </p>
                    <p className="text-[13px] text-[#434655] mt-1">
                      Hồ sơ thỏa mãn 14/16 tiêu chí then chốt của vị trí L6 Frontend Architect.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pillar scores */}
              <div className="mt-6 pt-4 bg-[#eff4ff] p-4 rounded-xl space-y-3">
                {[
                  { label: "Kỹ thuật chuyên sâu", icon: "terminal", pct: 92, color: "#0037b0", bar: "bg-[#0037b0]" },
                  { label: "Thâm niên & Dự án thực tế", icon: "history_edu", pct: 85, color: "#004f35", bar: "bg-[#004f35]" },
                  { label: "Văn hóa & Lối tư duy kỹ nghệ", icon: "groups", pct: 86, color: "#565e74", bar: "bg-[#565e74]" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="text-[#0b1c30] font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]" style={{ color: item.color }}>
                          {item.icon}
                        </span>
                        {item.label}
                      </span>
                      <span className="font-semibold" style={{ color: item.color }}>{item.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e5eeff] rounded-full overflow-hidden">
                      <div className={`h-full ${item.bar} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            <div className="md:col-span-6 lg:col-span-4 bg-white rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#004f35] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Thế mạnh vượt trội (Strengths)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#85f8c4]/40 text-[#002114] text-[12px] font-semibold">
                    4 Trụ cột
                  </span>
                </div>
                <p className="text-[13px] text-[#434655] mb-4">
                  Các năng lực được minh chứng rõ ràng thông qua sản phẩm quy mô lớn trong CV:
                </p>
                <div className="space-y-2">
                  {STRENGTHS.map((s) => (
                    <div key={s.title} className="p-3 rounded-lg bg-[#eff4ff] flex items-start gap-2">
                      <span className="material-symbols-outlined text-[#004f35] text-[18px] shrink-0 mt-0.5">verified</span>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-semibold text-[#0b1c30]">{s.title}</h4>
                        <p className="text-[12px] text-[#434655]">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-[#004f35] bg-[#85f8c4]/20 px-3 py-2 rounded-lg font-semibold">
                <span>Mức độ tự tin phân tích:</span>
                <span>96% (Xác thực chéo 4 dự án)</span>
              </div>
            </div>

            {/* Gaps */}
            <div className="md:col-span-6 lg:col-span-4 bg-white rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#93000a] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">warning</span>
                    Khoảng trống & Điểm cần xác thực
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[12px] font-semibold">
                    3 Điểm chú ý
                  </span>
                </div>
                <p className="text-[13px] text-[#434655] mb-4">
                  Những vùng thông tin thiếu hụt hoặc cần đối thoại làm rõ ở vòng Phỏng vấn Chuyên sâu:
                </p>
                <div className="space-y-2">
                  {GAPS.map((g) => (
                    <div key={g.title} className="p-3 rounded-lg bg-[#ffdad6]/20 flex items-start gap-2">
                      <span className="material-symbols-outlined text-[#ba1a1a] text-[18px] shrink-0 mt-0.5">pending_actions</span>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-semibold text-[#0b1c30]">{g.title}</h4>
                        <p className="text-[12px] text-[#434655]">{g.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-[#93000a] bg-[#ffdad6]/40 px-3 py-2 rounded-lg font-semibold">
                <span>Mức độ rủi ro tuyển dụng:</span>
                <span>Thấp - Trung bình (Có thể đào tạo)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Interview Questions */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pb-12">
          <div className="bg-white rounded-xl shadow-sm p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0037b0] text-[24px]">psychology_alt</span>
                  <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[24px] font-bold text-[#0b1c30]">
                    Bộ câu hỏi phỏng vấn đề xuất theo khoảng trống năng lực
                  </h2>
                </div>
                <p className="text-[14px] text-[#434655] mt-1">
                  Được cấu trúc hoá tự động dựa trên phân tích ma trận đối soát giữa CV của Nguyễn Văn An và bản mô tả vị trí L6 Frontend Architect.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="px-3 py-2 rounded-xl bg-[#e5eeff] text-[#434655] text-[13px] font-medium hover:text-[#0b1c30] hover:bg-[#dce9ff] transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  Sao chép toàn bộ
                </button>
                <button className="px-3 py-2 rounded-xl bg-[#0037b0]/10 text-[#0037b0] text-[13px] font-medium hover:bg-[#0037b0]/20 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  Tinh chỉnh tiêu chí
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {QUESTIONS.map((q) => (
                <div key={q.id} className="bg-[#eff4ff] rounded-xl p-6 transition-all hover:shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg ${q.badgeBg} text-white text-[11px] flex items-center justify-center font-bold`}>
                        {q.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${q.categoryColor} text-[11px] font-semibold uppercase`}>
                        {q.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[#565e74] text-[11px]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">timer</span>
                        Thời lượng dự kiến: {q.duration}
                      </span>
                      <span className="text-[#c4c5d7]">•</span>
                      <span className={`${q.weightColor} font-semibold`}>Trọng số: {q.weight}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                    <p className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold text-[#0b1c30] leading-relaxed">
                      {q.question}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#e5eeff] p-3 rounded-lg">
                      <p className="text-[11px] font-semibold text-[#004f35] flex items-center gap-1 mb-2">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Kỳ vọng câu trả lời đạt chuẩn (L6 Senior Lead):
                      </p>
                      <ul className="text-[13px] text-[#0b1c30] space-y-1 pl-4 list-disc">
                        {q.expected.map((e) => <li key={e}>{e}</li>)}
                      </ul>
                    </div>
                    <div className="bg-[#e5eeff] p-3 rounded-lg">
                      <p className="text-[11px] font-semibold text-[#ba1a1a] flex items-center gap-1 mb-2">
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        Tín hiệu cảnh báo rủi ro (Red Flags):
                      </p>
                      <ul className="text-[13px] text-[#0b1c30] space-y-1 pl-4 list-disc">
                        {q.redFlags.map((r) => <li key={r}>{r}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Digital Rubric Sheet CTA */}
            <div className="mt-8 p-4 bg-[#e5eeff] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0037b0]/10 flex items-center justify-center text-[#0037b0] shrink-0">
                  <span className="material-symbols-outlined">assignment_turned_in</span>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold text-[#0b1c30]">
                    Tạo biểu mẫu phỏng vấn số hóa (Digital Rubric Sheet)
                  </p>
                  <p className="text-[13px] text-[#434655]">
                    Hội đồng có thể nhập điểm trực tiếp trong lúc phỏng vấn để hệ thống tự động tổng hợp kết quả theo thang đo L6.
                  </p>
                </div>
              </div>
              <div className="shrink-0 w-full sm:w-auto">
                <Link
                  href="/interview"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1d4ed8] text-white text-[13px] font-medium hover:bg-[#0037b0] transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">quiz</span>
                  Mở Phiếu Phỏng Vấn Số Hóa
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
