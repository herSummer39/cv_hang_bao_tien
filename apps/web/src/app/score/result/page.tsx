"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import ProgressStepper from "@/components/ProgressStepper";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  RequirementMatchCard,
  ScoreBreakdownCard,
  type RequirementItem,
  type RequirementSummary,
  type ScoreBreakdown,
} from "./DetailSections";

// Chuyển ArrayBuffer (font tải bằng fetch) sang base64 để nạp vào jsPDF VFS
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export default function ResultPage() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [showInterviewPrep, setShowInterviewPrep] = useState(false);

  // Đọc kết quả thật từ API (lưu trong sessionStorage)
  const [apiResult, setApiResult] = useState<{
    score?: number;
    similarity?: number;
    strengths?: Array<{ title: string; desc: string }>;
    gaps?: Array<{ title: string; desc: string }>;
    cv_suggestions?: Array<{ type?: string; title: string; desc: string }>;
    questions?: Array<{
      id: string;
      category: string;
      categoryColor: string;
      badgeBg: string;
      duration: string;
      weight: string;
      weightColor: string;
      question: string;
      expected: string[];
      redFlags: string[];
    }>;
    job_title?: string;
    matched_skills?: string[];
    missing_skills?: string[];
    cv_exp_years?: number;
    features?: { skill_ratio?: number; exp_ratio?: number;[key: string]: number | undefined };
    requirements?: RequirementItem[];
    requirement_summary?: RequirementSummary | null;
    score_breakdown?: ScoreBreakdown | null;
  } | null>(null);

  useEffect(() => {
    async function loadResult() {
      try {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const jobId = params.get("id") || params.get("job_id");

          if (jobId) {
            sessionStorage.setItem("cf_job_id", jobId);
            const supabase = createClient();
            const { data, error } = await supabase
              .from("analysis_jobs")
              .select("result, job_title")
              .eq("id", jobId)
              .single();

            if (!error && data?.result) {
              const res = data.result as typeof apiResult;
              if (res && data.job_title && !res.job_title) {
                res.job_title = data.job_title;
              }
              setApiResult(res);
              sessionStorage.setItem("cf_result", JSON.stringify(res));
              setLoaded(true);
              return;
            }
          }
        }

        const raw = sessionStorage.getItem("cf_result");
        if (raw) {
          try {
            setApiResult(JSON.parse(raw));
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load result:", err);
      } finally {
        setLoaded(true);
      }
    }

    loadResult();
  }, []);

  // Lấy tên thật của người dùng đang đăng nhập từ Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setCandidateName(data?.full_name ?? user.email?.split("@")[0] ?? "");
    });
  }, []);

  // Dữ liệu từ apiResult
  const strengths = apiResult?.strengths ?? [];
  const gaps = apiResult?.gaps ?? [];
  const cvSuggestions = apiResult?.cv_suggestions ?? [];
  const questions = apiResult?.questions ?? [];
  const finalScore = apiResult?.score ?? 0;
  const matchedCount = apiResult?.matched_skills?.length ?? 0;
  const missingCount = apiResult?.missing_skills?.length ?? 0;
  const totalSkillCount = matchedCount + missingCount;
  const skillRatioPct = Math.round((apiResult?.features?.skill_ratio ?? 0) * 100);
  const expFitPct = Math.round(Math.min(apiResult?.features?.exp_ratio ?? 0, 1) * 100);
  const similarityPct = Math.round((apiResult?.similarity ?? 0) * 100);
  const requirements = apiResult?.requirements ?? [];
  const reqSummary = apiResult?.requirement_summary ?? null;
  const breakdown = apiResult?.score_breakdown ?? null;
  const isLegacyResult =
    !!apiResult && apiResult.requirements === undefined && apiResult.score_breakdown === undefined;

  function scoreTier(score: number) {
    if (score >= 70)
      return {
        label: "Độ tương thích cao",
        badge: "bg-emerald-50 text-emerald-800 border border-emerald-200",
        heading: "Đạt chuẩn năng lực",
        risk: "Thấp",
      };
    if (score >= 40)
      return {
        label: "Độ tương thích trung bình",
        badge: "bg-amber-50 text-amber-800 border border-amber-200",
        heading: "Cần cải thiện thêm",
        risk: "Trung bình",
      };
    return {
      label: "Độ tương thích thấp",
      badge: "bg-rose-50 text-rose-800 border border-rose-200",
      heading: "Chưa đạt chuẩn",
      risk: "Cao",
    };
  }
  const tier = scoreTier(finalScore);

  // Helper: Tách danh sách kỹ năng từ chuỗi mô tả (VD: "Bao gồm: A, B, C và X kỹ năng khác." hoặc "Cần bổ sung: A, B, C...")
  function parseSkillTags(desc: string): { skills: string[]; extraCount: number; cleanText: string } {
    const match = desc.match(/(?:Bao gồm|Cần bổ sung):\s*([^.]+?)(?:\s*và\s*(\d+)\s*kỹ năng khác)?\./i);
    if (match) {
      const rawSkills = match[1].split(",").map((s) => s.trim()).filter(Boolean);
      const extraCount = match[2] ? parseInt(match[2], 10) : 0;
      return { skills: rawSkills, extraCount, cleanText: desc };
    }
    return { skills: [], extraCount: 0, cleanText: desc };
  }

  // Helper: Tách ví dụ trích dẫn đối chiếu từ mô tả (VD: 'VD: "Yêu cầu JD" — CV có: "Minh chứng CV".')
  function parseEvidenceComparison(desc: string): { jdText: string; cvText: string } | null {
    const match = desc.match(/VD:\s*"(.*?)"\s*—\s*CV có:\s*"(.*?)"/i);
    if (match) {
      return { jdText: match[1], cvText: match[2] };
    }
    return null;
  }

  async function handleExport() {
    if (!apiResult) {
      alert("Chưa có dữ liệu phân tích để xuất báo cáo.");
      return;
    }
    setExportLoading(true);
    setExportDone(false);

    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Nạp font Noto Sans (đủ dấu tiếng Việt)
      const [regularBuf, boldBuf] = await Promise.all([
        fetch("/fonts/NotoSans-Regular.ttf").then((r) => r.arrayBuffer()),
        fetch("/fonts/NotoSans-Bold.ttf").then((r) => r.arrayBuffer()),
      ]);
      doc.addFileToVFS("NotoSans-Regular.ttf", arrayBufferToBase64(regularBuf));
      doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      doc.addFileToVFS("NotoSans-Bold.ttf", arrayBufferToBase64(boldBuf));
      doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
      doc.setFont("NotoSans", "normal");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 15;
      const maxWidth = pageWidth - marginX * 2;
      let y = 20;

      const ensureSpace = (lines: number, lineHeight = 6) => {
        if (y + lines * lineHeight > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
      };

      const addTitle = (text: string, size = 14) => {
        ensureSpace(2, 10);
        doc.setFontSize(size);
        doc.setFont("NotoSans", "bold");
        doc.text(text, marginX, y);
        y += size >= 16 ? 10 : 8;
        doc.setFont("NotoSans", "normal");
      };

      const addBody = (text: string, size = 11) => {
        doc.setFontSize(size);
        doc.setFont("NotoSans", "normal");
        const lines = doc.splitTextToSize(text, maxWidth);
        ensureSpace(lines.length);
        doc.text(lines, marginX, y);
        y += lines.length * 6;
      };

      const addSpacer = (h = 4) => {
        y += h;
      };

      // 1. Tiêu đề
      addTitle("CareerFit — Báo cáo đánh giá độ phù hợp", 17);
      addBody(
        `Ứng viên: ${candidateName || "Chưa xác định"}   |   Vị trí: ${apiResult.job_title || "Chưa xác định"
        }   |   Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`,
        10
      );
      addSpacer(4);

      // 2. Điểm tổng thể
      addTitle(`Điểm tổng thể: ${finalScore}/100 — ${tier.heading}`, 14);
      addSpacer(2);

      // 3. Ba chỉ số trụ cột
      addBody(`Kỹ năng khớp JD: ${skillRatioPct}%`);
      addBody(`Đáp ứng yêu cầu kinh nghiệm: ${expFitPct}%`);
      addBody(`Tương đồng ngữ nghĩa CV ↔ JD: ${similarityPct}%`);
      addSpacer(4);

      // 3b. Giải thích điểm (M3 · SHAP)
      if (breakdown) {
        addTitle("Vì sao được số điểm này", 13);
        addBody(
          `Mức nền ${breakdown.base.toFixed(1)} ` +
          breakdown.factors
            .map(
              (f) =>
                `${f.contribution >= 0 ? "+" : "−"} ${Math.abs(f.contribution).toFixed(1)} (${f.label})`
            )
            .join(" ") +
          ` = ${Math.round(breakdown.final)} điểm`
        );
        breakdown.factors.forEach((f) => addBody(`• ${f.label}: ${f.detail}`));
        addSpacer(4);
      }

      // 3c. Đối chiếu từng yêu cầu JD
      if (reqSummary && requirements.length > 0) {
        addTitle(
          `Đối chiếu yêu cầu JD: đáp ứng ${reqSummary.met}/${reqSummary.total}, một phần ${reqSummary.partial}, chưa có ${reqSummary.missing}`,
          13
        );
        const label = { met: "ĐÁP ỨNG", partial: "MỘT PHẦN", missing: "CHƯA CÓ" } as const;
        requirements.forEach((r) => {
          addBody(`[${label[r.status]}] ${r.text}${r.priority === "preferred" ? " (ưu tiên)" : ""}`);
          if (r.evidence) addBody(`   → CV: "${r.evidence}"`);
        });
        addSpacer(4);
      }

      // 4. Thế mạnh
      addTitle("Thế mạnh", 13);
      if (strengths.length === 0) addBody("Không có dữ liệu.");
      strengths.forEach((s) => addBody(`• ${s.title}: ${s.desc}`));
      addSpacer(4);

      // 5. Khoảng trống
      addTitle("Khoảng trống cần lưu ý", 13);
      if (gaps.length === 0) addBody("Không có dữ liệu.");
      gaps.forEach((g) => addBody(`• ${g.title}: ${g.desc}`));
      addSpacer(4);

      // 5b. Gợi ý cải thiện CV
      addTitle("Gợi ý cải thiện CV", 13);
      if (cvSuggestions.length === 0) addBody("Không có dữ liệu.");
      cvSuggestions.forEach((s) => addBody(`• ${s.title}: ${s.desc}`));
      addSpacer(4);

      // 6. Kỹ năng khớp / thiếu
      addTitle("Kỹ năng", 13);
      addBody(`Khớp (${matchedCount}): ${apiResult.matched_skills?.join(", ") || "Không có"}`);
      addBody(`Thiếu (${missingCount}): ${apiResult.missing_skills?.join(", ") || "Không có"}`);
      addSpacer(4);

      // 7. Câu hỏi phỏng vấn đề xuất
      addTitle("Câu hỏi phỏng vấn đề xuất", 13);
      if (questions.length === 0) {
        addBody("Không có dữ liệu.");
      } else {
        questions.forEach((q) => addBody(`${q.id}. ${q.question}`));
      }

      const safeName = (candidateName || "UngVien")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "");
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`CareerFit_BaoCao_${safeName}_${dateStr}.pdf`);

      setExportLoading(false);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2500);
    } catch (e) {
      console.error("Lỗi xuất PDF:", e);
      setExportLoading(false);
      alert("Có lỗi khi xuất PDF, vui lòng thử lại.");
    }
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

        {/* ── Candidate Strip (Hồ sơ ứng viên) ── */}
        <section className="w-full bg-white border-b border-slate-200/80 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start sm:items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563EB]/15 to-[#7C3AED]/20 border border-blue-200/60 flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[#0037b0] text-[28px]">person</span>
                  </div>
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 ring-2 ring-white"
                    title="Hồ sơ đã phân tích"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[22px] sm:text-[24px] font-extrabold text-[#0b1c30] tracking-tight">
                      {candidateName || "Ứng viên"}
                    </h1>
                    {typeof apiResult?.cv_exp_years === "number" && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0037b0] border border-blue-200/80 text-[11px] font-bold">
                        {apiResult.cv_exp_years} năm kinh nghiệm (theo CV)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-slate-500 text-[13px] sm:text-[14px] flex-wrap">
                    <span className="flex items-center gap-1 text-[#0037b0] font-semibold">
                      <span className="material-symbols-outlined text-[17px]">business_center</span>
                      Vị trí tuyển chọn:
                    </span>
                    <span className="font-bold text-[#0b1c30]">
                      {apiResult?.job_title || "Chưa xác định"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-4 py-2.5 rounded-xl bg-white text-slate-700 text-[13px] font-semibold hover:bg-slate-50 border border-slate-200/90 transition-all flex items-center gap-2 shadow-2xs hover:shadow-xs"
                >
                  {exportLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[17px] animate-spin text-slate-500">
                        progress_activity
                      </span>
                      <span>Đang tạo PDF...</span>
                    </>
                  ) : exportDone ? (
                    <>
                      <span className="material-symbols-outlined text-[17px] text-emerald-600">check</span>
                      <span>Đã xuất thành công!</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[17px] text-slate-500">
                        picture_as_pdf
                      </span>
                      <span>Xuất PDF Báo cáo</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1d4ed8] hover:to-[#6d28d9] text-white text-[13px] font-bold transition-all flex items-center gap-2 shadow-xs hover:shadow-sm"
                >
                  {saveLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[17px] animate-spin">progress_activity</span>
                      <span>Đang lưu...</span>
                    </>
                  ) : saveDone ? (
                    <>
                      <span className="material-symbols-outlined text-[17px]">done_all</span>
                      <span>Đã lưu vào kho ứng viên</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[17px]">bookmark_add</span>
                      <span>Lưu vào Hồ sơ tuyển dụng</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {loaded && !apiResult && (
          <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pt-6">
            <div className="bg-[#fff4e5] border border-[#ffd9a0] text-[#7a4b00] rounded-2xl p-4 text-[13px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span>
                Không tìm thấy kết quả phân tích thật cho phiên này (worker có thể chưa xử lý xong, hoặc đây là trang cũ). Các số liệu dưới đây sẽ trống cho tới khi có kết quả thật từ hệ thống.
              </span>
              <Link
                href="/score"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#0037b0] text-white text-[13px] font-medium hover:bg-[#1d4ed8] transition-colors"
              >
                Thực hiện đánh giá mới
              </Link>
            </div>
          </section>
        )}

        {/* ── METRIC TRI-CORE BENTO: THIẾT KẾ LẠI GỌN GÀNG, RÕ Ý NỔI BẬT ── */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* CỘT 1: CHỈ SỐ ĐỐI SOÁT TỔNG THỂ */}
            <div className="md:col-span-12 lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Chỉ số đối soát tổng thể
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${tier.badge}`}>
                    <span className="material-symbols-outlined text-[13px]">bolt</span>
                    {tier.label}
                  </span>
                </div>

                {/* Donut & Verdict */}
                <div className="flex items-center gap-5 my-5">
                  <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f1f5f9" strokeWidth="7" />
                      <circle
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="40"
                        stroke={finalScore >= 70 ? "#059669" : finalScore >= 40 ? "#d97706" : "#dc2626"}
                        strokeDasharray={`${((Math.max(0, Math.min(finalScore, 100)) / 100) * 251.33).toFixed(2)} 251.33`}
                        strokeLinecap="round"
                        strokeWidth="7"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                      <div className="flex items-baseline justify-center font-bold tracking-tight text-[#0b1c30] leading-none">
                        <span className="text-[24px] sm:text-[26px] font-extrabold font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] tabular-nums">
                          {typeof finalScore === "number" ? Number(finalScore.toFixed(1)) : finalScore}
                        </span>
                        <span className="text-[13px] text-slate-400 font-bold ml-0.5">%</span>
                      </div>
                      <span className="text-[9.5px] text-slate-400 uppercase font-extrabold tracking-wider mt-1">
                        Tương thích
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[17px] font-bold text-[#0b1c30]">
                      {tier.heading}
                    </h3>
                    <p className="text-[13px] text-slate-600 mt-1 leading-snug">
                      {totalSkillCount > 0
                        ? `Khớp ${matchedCount}/${totalSkillCount} kỹ năng trọng yếu của vị trí.`
                        : "Chưa có dữ liệu phân tích kỹ năng."}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Trụ cột đánh giá */}
              <div className="bg-[#f8faff] p-3.5 rounded-xl border border-blue-100/60 space-y-2.5">
                {[
                  {
                    label: "Kỹ năng khớp JD",
                    icon: "terminal",
                    pct: skillRatioPct,
                    color: "#0037b0",
                    bar: "bg-[#0037b0]",
                  },
                  {
                    label: "Đáp ứng kinh nghiệm",
                    icon: "history_edu",
                    pct: expFitPct,
                    color: "#00875a",
                    bar: "bg-[#00875a]",
                  },
                  {
                    label: "Tương đồng ngữ nghĩa CV ↔ JD",
                    icon: "psychology",
                    pct: similarityPct,
                    color: "#7c3aed",
                    bar: "bg-[#7c3aed]",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]" style={{ color: item.color }}>
                          {item.icon}
                        </span>
                        {item.label}
                      </span>
                      <span className="font-bold font-mono" style={{ color: item.color }}>
                        {item.pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.bar} rounded-full transition-all duration-700`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CỘT 2: THẾ MẠNH VƯỢT TRỘI (STRENGTHS) */}
            <div className="md:col-span-6 lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    Thế mạnh vượt trội
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                    {strengths.length} Trụ cột
                  </span>
                </div>

                <p className="text-[12px] text-slate-500 mb-3">
                  Năng lực được chứng minh rõ ràng thông qua dữ liệu trong CV:
                </p>

                {/* Danh sách thẻ vi mô cấu trúc gọn gàng */}
                <div className="space-y-2.5">
                  {strengths.map((s, idx) => {
                    const quote = parseEvidenceComparison(s.desc);
                    const skillData = parseSkillTags(s.desc);

                    return (
                      <div
                        key={`${s.title}-${idx}`}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-200 transition-all shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[13px]">verified</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[13px] font-bold text-[#0b1c30] leading-snug">{s.title}</h4>

                            {/* So sánh trích dẫn yêu cầu & minh chứng */}
                            {quote ? (
                              <div className="mt-2 space-y-1 text-[12px]">
                                <div className="text-slate-600 line-clamp-1">
                                  <span className="font-semibold text-slate-700">Yêu cầu JD: </span>
                                  <span className="italic">“{quote.jdText}”</span>
                                </div>
                                <div className="p-1.5 rounded-lg bg-white border border-emerald-100 text-emerald-900 text-[11px]">
                                  <span className="font-semibold text-emerald-700">CV có: </span>
                                  <span>“{quote.cvText}”</span>
                                </div>
                              </div>
                            ) : skillData.skills.length > 0 ? (
                              /* Kỹ năng phù hợp dạng Chip/Tags */
                              <div className="mt-2 flex flex-wrap items-center gap-1">
                                {skillData.skills.map((sk) => (
                                  <span
                                    key={sk}
                                    className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">check</span>
                                    {sk}
                                  </span>
                                ))}
                                {skillData.extraCount > 0 && (
                                  <span className="text-[11px] font-medium text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded-md">
                                    +{skillData.extraCount} khác
                                  </span>
                                )}
                              </div>
                            ) : (
                              /* Mô tả kinh nghiệm / ngữ nghĩa */
                              <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">{s.desc}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50/70 border border-emerald-100 px-3 py-2 rounded-xl font-semibold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-emerald-600">compare_arrows</span>
                  Độ tương đồng ngữ nghĩa:
                </span>
                <span className="font-mono font-bold">{similarityPct}%</span>
              </div>
            </div>

            {/* CỘT 3: KHOẢNG TRỐNG & ĐIỂM CẦN XÁC THỰC (GAPS) */}
            <div className="md:col-span-6 lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-rose-600">warning</span>
                    Khoảng trống cần xác thực
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                    {gaps.length} Điểm chú ý
                  </span>
                </div>

                <p className="text-[12px] text-slate-500 mb-3">
                  Thông tin thiếu hụt hoặc cần đối thoại làm rõ khi phỏng vấn:
                </p>

                {/* Danh sách thẻ vi mô cấu trúc gọn gàng */}
                <div className="space-y-2.5">
                  {gaps.map((g, idx) => {
                    const skillData = parseSkillTags(g.desc);

                    return (
                      <div
                        key={`${g.title}-${idx}`}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-rose-200 transition-all shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[13px]">pending_actions</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[13px] font-bold text-[#0b1c30] leading-snug">{g.title}</h4>

                            {/* Nếu có danh sách kỹ năng thiếu -> hiển thị dạng chip tag cloud */}
                            {skillData.skills.length > 0 ? (
                              <div className="mt-2 flex flex-wrap items-center gap-1">
                                {skillData.skills.map((sk) => (
                                  <span
                                    key={sk}
                                    className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">close</span>
                                    {sk}
                                  </span>
                                ))}
                                {skillData.extraCount > 0 && (
                                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-md">
                                    +{skillData.extraCount} khác
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">{g.desc}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer: Thước đo rủi ro tuyển dụng (Risk Gauge) */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1 text-slate-500">
                    <span className="material-symbols-outlined text-[14px]">shield</span>
                    Rủi ro tuyển dụng:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${tier.risk === "Thấp"
                        ? "bg-emerald-100 text-emerald-800"
                        : tier.risk === "Trung bình"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                  >
                    {tier.risk}
                  </span>
                </div>
                {/* Visual Gauge Bar */}
                <div className="grid grid-cols-3 gap-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
                  <div className={`h-full rounded-sm ${tier.risk === "Thấp" ? "bg-emerald-500" : "bg-slate-200"}`} />
                  <div className={`h-full rounded-sm ${tier.risk === "Trung bình" ? "bg-amber-500" : "bg-slate-200"}`} />
                  <div className={`h-full rounded-sm ${tier.risk === "Cao" ? "bg-rose-500" : "bg-slate-200"}`} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Phân tích chi tiết: giải thích điểm (M3·SHAP) + đối chiếu từng yêu cầu JD (M2) */}
        {isLegacyResult && (
          <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pb-6">
            <div className="bg-[#eff4ff] border border-[#dce1ff] text-[#0037b0] rounded-xl p-4 text-[13px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px]">info</span>
                Kết quả này được phân tích trước khi có phần giải thích điểm và đối chiếu từng yêu cầu JD. Phân tích lại CV để xem đầy đủ.
              </span>
              <Link
                href="/score"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#0037b0] text-white text-[13px] font-medium hover:bg-[#1d4ed8] transition-colors"
              >
                Phân tích lại
              </Link>
            </div>
          </section>
        )}

        {breakdown && (
          <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pb-6">
            <ScoreBreakdownCard data={breakdown} />
          </section>
        )}

        {reqSummary && requirements.length > 0 && (
          <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pb-6">
            <RequirementMatchCard items={requirements} summary={reqSummary} />
          </section>
        )}

        {/* ── GỢI Ý CẢI THIỆN CV (AI ADVISE) — ACTION CARDS GỌN GÀNG ── */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pb-6">
          <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
                </span>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold text-[#0b1c30]">
                  Gợi ý hành động cải thiện CV (AI Advise)
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                {cvSuggestions.length} khuyến nghị
              </span>
            </div>
            <p className="text-[13px] text-slate-600 mb-5 leading-relaxed">
              Các khuyến nghị cụ thể để CV bám sát tiêu chuẩn của JD — chỉ áp dụng nếu đúng với năng lực và kinh nghiệm thực tế của bạn:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {cvSuggestions.map((s, i) => {
                const icon =
                  s.type === "skill"
                    ? "add_circle"
                    : s.type === "experience"
                      ? "history_edu"
                      : s.type === "phrasing"
                        ? "translate"
                        : "tips_and_updates";
                return (
                  <div
                    key={`${s.title}-${i}`}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-all flex items-start gap-3 shadow-2xs"
                  >
                    <span className="w-8 h-8 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-bold text-[#0b1c30] leading-snug">{s.title}</h4>
                      <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PHỎNG VẤN GIẢ LẬP THEO KHOẢNG TRỐNG NĂNG LỰC ── */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pb-12">
          {!showInterviewPrep ? (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB]/15 to-[#7C3AED]/20 border border-blue-200/60 flex items-center justify-center text-[#0037b0] shrink-0">
                  <span className="material-symbols-outlined text-[26px]">psychology_alt</span>
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold text-[#0b1c30]">
                    Phỏng vấn giả lập theo khoảng trống năng lực
                  </h2>
                  <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                    {questions.length} câu hỏi được tạo dựa trên chính CV/JD này — nhập câu trả lời trực tiếp, có tính giờ từng câu, hệ thống tự chấm điểm và lưu lại kết quả.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <Link
                  href="/interview"
                  aria-disabled={questions.length === 0}
                  onClick={(e) => {
                    if (questions.length === 0) e.preventDefault();
                  }}
                  className={`px-5 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${questions.length === 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1d4ed8] hover:to-[#6d28d9] text-white shadow-xs hover:shadow-sm"
                    }`}
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  Bắt đầu phỏng vấn giả lập
                </Link>
                <button
                  type="button"
                  onClick={() => setShowInterviewPrep(true)}
                  disabled={questions.length === 0}
                  className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 border border-slate-200 transition-colors ${questions.length === 0
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                  Xem trước câu hỏi
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 lg:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0037b0] text-[24px]">
                      psychology_alt
                    </span>
                    <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[22px] font-bold text-[#0b1c30]">
                      Bộ câu hỏi phỏng vấn đề xuất theo khoảng trống năng lực
                    </h2>
                  </div>
                  <p className="text-[13px] text-slate-600 mt-1">
                    Cấu trúc tự động dựa trên ma trận đối soát giữa CV của {candidateName || "ứng viên"} và vị trí {apiResult?.job_title || "chưa xác định"}.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowInterviewPrep(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-[13px] font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">expand_less</span>
                    Thu gọn
                  </button>
                </div>
              </div>

              <div className="space-y-5 mt-6">
                {questions.map((q) => (
                  <div key={q.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg ${q.badgeBg} text-white text-[11px] flex items-center justify-center font-bold`}>
                          {q.id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full ${q.categoryColor} text-[11px] font-bold uppercase`}>
                          {q.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">timer</span>
                          Thời lượng: {q.duration}
                        </span>
                        <span>•</span>
                        <span className={`${q.weightColor} font-bold`}>Trọng số: {q.weight}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs mb-4">
                      <p className="font-[family-name:var(--font-plus-jakarta)] text-[15px] sm:text-[16px] font-bold text-[#0b1c30] leading-relaxed">
                        {q.question}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-xl">
                        <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mb-2">
                          <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                          Kỳ vọng câu trả lời đạt chuẩn:
                        </p>
                        <ul className="text-[12px] text-slate-700 space-y-1 pl-4 list-disc">
                          {q.expected.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-rose-50/70 border border-rose-100 p-3.5 rounded-xl">
                        <p className="text-[11px] font-bold text-rose-800 flex items-center gap-1 mb-2">
                          <span className="material-symbols-outlined text-[15px] text-rose-600">cancel</span>
                          Tín hiệu cảnh báo rủi ro (Red Flags):
                        </p>
                        <ul className="text-[12px] text-slate-700 space-y-1 pl-4 list-disc">
                          {q.redFlags.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Digital Rubric Sheet CTA */}
              <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50/40 border border-blue-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#0037b0] flex items-center justify-center border border-blue-200 shadow-2xs shrink-0">
                    <span className="material-symbols-outlined">assignment_turned_in</span>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold text-[#0b1c30]">
                      Sẵn sàng thử trả lời thật chưa?
                    </p>
                    <p className="text-[12px] text-slate-600">
                      Vào phòng phỏng vấn giả lập để nhập câu trả lời trực tiếp, có bấm giờ và chấm điểm tự động.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 w-full sm:w-auto">
                  <Link
                    href="/interview"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#1d4ed8] hover:to-[#6d28d9] text-white text-[13px] font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    Bắt đầu phỏng vấn giả lập
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── BƯỚC TIẾP THEO DÀNH CHO BẠN (NEXT ACTION JOURNEY) ── */}
          <section className="mt-8 p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0037b0] bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-full">
                  Lộ trình tiếp theo
                </span>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-bold text-[#0b1c30] mt-2">
                  Bạn muốn làm gì tiếp theo?
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Dựa trên kết quả đối chiếu năng lực, hãy chọn bước đi phù hợp nhất với kế hoạch của bạn.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Action 1 */}
              <Link
                href="/interview"
                className="group p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/30 hover:from-blue-50 hover:to-indigo-50 border border-blue-200/70 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">mic</span>
                  </div>
                  <h4 className="font-bold text-[15px] text-[#0b1c30] mb-1">
                    Luyện phỏng vấn thử 1-1
                  </h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Tập dượt trả lời các câu hỏi dựa trên lỗ hổng và từ khóa thực tế của vị trí này.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-[12px] font-bold text-[#0037b0]">
                  <span>Vào phòng phỏng vấn</span>
                  <span className="material-symbols-outlined text-[16px] ml-1 group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </Link>

              {/* Action 2 */}
              <Link
                href="/score"
                className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#0037b0] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                  </div>
                  <h4 className="font-bold text-[15px] text-[#0b1c30] mb-1">
                    Sửa CV &amp; Chấm điểm lại
                  </h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Bổ sung từ khóa gợi ý và tải lại CV bản mới để kiểm tra điểm số có tăng không.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-[12px] font-bold text-[#0037b0]">
                  <span>Chấm lại CV</span>
                  <span className="material-symbols-outlined text-[16px] ml-1 group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </Link>

              {/* Action 3 */}
              <Link
                href="/dashboard"
                className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[20px]">dashboard</span>
                  </div>
                  <h4 className="font-bold text-[15px] text-[#0b1c30] mb-1">
                    Về trang Dashboard
                  </h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Xem biểu đồ tiến trình năng lực, lịch sử phân tích và các chỉ số tích lũy.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-[12px] font-bold text-slate-600 group-hover:text-slate-900">
                  <span>Về Dashboard</span>
                  <span className="material-symbols-outlined text-[16px] ml-1 group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </Link>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
