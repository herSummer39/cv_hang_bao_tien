"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgressStepper from "@/components/ProgressStepper";
import { createClient } from "@/lib/supabase/client";

const STAGES = [
  {
    id: 1,
    label: "Trích xuất ma trận năng lực kỹ thuật",
    sublabel: "Hoàn tất ✓ • 18 Kỹ năng khớp định danh",
    status: "done",
  },
  {
    id: 2,
    label: "Đối chiếu thâm niên & lãnh đạo",
    sublabel: "Đang xử lý",
    status: "running",
  },
  {
    id: 3,
    label: "Đánh giá khoảng trống & phỏng vấn",
    sublabel: "Chờ xử lý sau vòng đối chiếu...",
    status: "pending",
  },
];

const LOG_MESSAGES = [
  "Word-segment tiếng Việt (VnCoreNLP)... ✓ 1.247 từ đã tách",
  "NER PhoBERT đang trích xuất entity: kỹ năng, kinh nghiệm, học vấn...",
  "BKAI bi-encoder: embedding CV chunks vào pgvector không gian 768 chiều...",
  "Top-20 JD chunks retrieved · Cross-encoder re-rank top-5...",
  "Feature engineering: tính 35 features từ entity + vector similarity...",
  "Đối sánh từ khóa: 'Performance Budget' ↔ 'Core Web Vitals INP/LCP': Trùng khớp 94%",
  "XGBoost (M3) đang tính điểm tổng thể + SHAP values...",
  "Lưu kết quả vào Supabase (bảng score_results)...",
];

export default function ProcessingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [currentLog, setCurrentLog] = useState(LOG_MESSAGES[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Animation log tuần tự
    const logTimer = setInterval(() => {
      setLogIndex((prev) => {
        const next = (prev + 1) % LOG_MESSAGES.length;
        setCurrentLog(LOG_MESSAGES[next]);
        return next;
      });
    }, 2500);

    // Animate progress chậm (tối đa 85% trước khi có kết quả)
    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + 0.3, 85));
    }, 150);

    // Poll Supabase chờ worker xử lý xong
    async function pollJob() {
      const jobId = sessionStorage.getItem("cf_job_id");
      if (!jobId) {
        setError("Không tìm thấy job ID. Vui lòng quay lại và thử lại.");
        clearInterval(progressTimer);
        return;
      }

      const supabase = createClient();
      let attempts = 0;
      const maxAttempts = 120; // 10 phút (120 × 5s)

      const poll = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(poll);
          setError("Hết thời gian chờ. Worker có thể đang offline.");
          clearInterval(progressTimer);
          return;
        }

        const { data, error: dbErr } = await supabase
          .from("analysis_jobs")
          .select("status, result, error_msg")
          .eq("id", jobId)
          .single();

        if (dbErr) return; // Bỏ qua lỗi mạng tạm thời

        if (data?.status === "done" && data.result) {
          clearInterval(poll);
          clearInterval(progressTimer);
          // Lưu kết quả vào sessionStorage để result page dùng
          sessionStorage.setItem("cf_result", JSON.stringify(data.result));
          setProgress(100);
          setTimeout(() => router.push("/score/result"), 800);
        } else if (data?.status === "error") {
          clearInterval(poll);
          clearInterval(progressTimer);
          setError("Worker báo lỗi: " + (data.error_msg || "Lỗi không xác định"));
          setProgress(100);
        }
        // status === "pending" hoặc "processing" → tiếp tục poll
      }, 5000); // poll mỗi 5 giây

      return () => clearInterval(poll);
    }

    pollJob();
    return () => {
      clearInterval(logTimer);
      clearInterval(progressTimer);
    };
  }, [router]);

  const clampedProgress = Math.min(Math.round(progress), 100);
  const isDone = clampedProgress >= 100;

  if (error) {
    return (
      <div className="bg-[#f8f9ff] min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
        <h2 className="text-xl font-bold text-red-600">Lỗi phân tích</h2>
        <p className="text-gray-600 max-w-md text-center">{error}</p>
        <p className="text-sm text-gray-400">Kiểm tra FastAPI server đang chạy tại localhost:8000</p>
        <button onClick={() => window.history.back()}
          className="px-6 py-2 bg-[#1d4ed8] text-white rounded-xl hover:bg-blue-700 transition">
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        <ProgressStepper activeStep={2} sessionId="EVAL-2026-0849-VN" />

        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col gap-6">
          {/* Header block */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[#1d4ed8] mb-1">
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ animation: isDone ? "none" : "spin 1s linear infinite" }}
                >
                  {isDone ? "check_circle" : "sync"}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Trình khớp dữ liệu thông minh v3.4
                </span>
              </div>
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[24px] font-semibold text-[#0b1c30] tracking-tight">
                {isDone
                  ? "Phân tích hoàn tất — Đang tải báo cáo..."
                  : "Đang phân tích và đối soát hồ sơ ứng viên..."}
              </h1>
              <p className="text-[14px] text-[#434655] mt-1">
                Hệ thống đang bóc tách cú pháp kinh nghiệm thực chiến từ CV so với bảng tiêu chuẩn năng lực L6.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#004f35] animate-pulse" />
              <span className="text-[12px] font-medium text-[#0b1c30]">Phiên làm việc #CF-8942-ARCH</span>
            </div>
          </div>

          {/* 50/50 split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* LEFT: CV summary */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold text-[#0b1c30]">
                    1. Hồ sơ ứng viên (CV)
                  </span>
                  <span className="text-[12px] px-1.5 py-0.5 rounded bg-[#d3e4fe] text-[#0037b0] font-semibold">
                    PDF Định dạng chuẩn
                  </span>
                </div>
                <span className="text-[11px] text-[#004f35] flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  Sẵn sàng phân tích
                </span>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 pb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-[#e5eeff] flex items-center justify-center shrink-0 text-[#1d4ed8]">
                      <span className="material-symbols-outlined text-[24px]">description</span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-[16px] text-[#0b1c30] truncate block">
                        Nguyen_Van_An_Senior_Frontend_Architect.pdf
                      </span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[#434655] text-[13px]">
                        <span>2.8 MB</span>
                        <span>•</span>
                        <span>1.620 từ khóa đã quét</span>
                        <span>•</span>
                        <span className="text-[#004f35] font-medium">Cấu trúc AST hợp lệ</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#eff4ff] rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[#434655] text-[11px]">
                    <span className="uppercase tracking-wide font-medium">Thực thể chính trích xuất</span>
                    <span>Độ tin cậy ngữ nghĩa: 98.4%</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[
                      "Frontend System Design",
                      "React 19 & Next.js SSR",
                      "Micro-frontends",
                      "TypeScript Strict Mode",
                      "L6 Tech Lead (8+ năm)",
                      "Core Web Vitals",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-white text-[#0b1c30] text-[11px] font-semibold shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-lg bg-white border border-[#e5eeff]">
                  <div className="flex items-center justify-between text-[#565e74] text-[11px] mb-1">
                    <span>ĐOẠN TRÍCH YẾU TỐ KINH NGHIỆM</span>
                    <span>Trang 1 / 4</span>
                  </div>
                  <p className="text-[13px] text-[#0b1c30] italic leading-relaxed">
                    "Chủ trì tái thiết kế kiến trúc phân tán nền tảng E-commerce phục vụ 4.2 triệu người dùng thường nhật. Chuẩn hóa Design Tokens, áp dụng Module Federation giảm 42% thời gian biên dịch CI/CD và nâng chỉ số LCP từ 3.8s xuống còn 1.1s..."
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: JD summary */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold text-[#0b1c30]">
                    2. Bản mô tả công việc &amp; Yêu cầu
                  </span>
                  <span className="text-[12px] px-1.5 py-0.5 rounded bg-[#d3e4fe] text-[#0037b0] font-semibold">
                    156 từ • L6 Standard
                  </span>
                </div>
                <span className="text-[13px] text-[#565e74] font-medium">Phòng Ban Kỹ Thuật Lõi</span>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-semibold text-[#0b1c30] block">
                      Kiến trúc sư Frontend Cấp cao (L6)
                    </span>
                    <span className="text-[13px] text-[#434655]">
                      Tiêu chuẩn tuyển trạch kỹ thuật: Q3/2025 • Mã vị trí: ARCH-FE-L6
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded bg-[#e5eeff] text-[#0037b0] text-[11px] font-semibold">
                    Toàn thời gian
                  </span>
                </div>

                <div className="bg-[#eff4ff] rounded-lg p-4 text-[#0b1c30] text-[13px] flex flex-col gap-2 leading-relaxed max-h-[260px] overflow-y-auto">
                  <p className="font-semibold">Mục tiêu vai trò:</p>
                  <p>
                    Chịu trách nhiệm toàn diện về cấu trúc nền tảng giao diện, chiến lược triển khai micro-frontends quy mô lớn và duy trì trải nghiệm chuẩn mực cho toàn bộ hệ sinh thái sản phẩm.
                  </p>
                  <p className="font-semibold pt-1">Yêu cầu cốt lõi &amp; Năng lực bắt buộc:</p>
                  <ul className="list-disc list-inside space-y-1 text-[#434655]">
                    <li>Ít nhất 7+ năm phát triển giao diện hiện đại, trong đó có tối thiểu 2 năm dẫn dắt cấu trúc hệ thống cấp L6.</li>
                    <li>Làm chủ chuyên sâu hệ sinh thái React, Next.js (App Router, Server Actions) và TypeScript.</li>
                    <li>Thấu suốt tiêu chuẩn khả năng tiếp cận WCAG 2.1 Cấp AA.</li>
                    <li>Kiểm soát nghiêm ngặt hiệu năng render dưới 100ms.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Processing status hub */}
          <div className="bg-white rounded-xl p-6 shadow-md flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <button
                  disabled
                  className="cursor-not-allowed w-full lg:w-auto px-6 py-3 rounded-lg bg-[#1d4ed8] text-white font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold flex items-center justify-center gap-2 shadow-sm"
                >
                  {!isDone && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                  <span>
                    {isDone ? "Hoàn tất! Đang tải báo cáo..." : `Đang phân tích độ tương thích (${clampedProgress}%)...`}
                  </span>
                </button>
                {!isDone && (
                  <span className="hidden md:inline-block text-[13px] text-[#434655]">
                    Ước tính còn lại: ~{Math.max(0, Math.round((100 - clampedProgress) / 1.2 * 0.06))}s
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 self-stretch lg:self-auto justify-end">
                <div className="bg-[#eff4ff] px-3 py-1 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#565e74] text-sm">storage</span>
                  <span className="text-[12px] text-[#565e74]">Token Vector: 768 chiều</span>
                </div>
                <div className="bg-[#eff4ff] px-3 py-1 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#565e74] text-sm">model_training</span>
                  <span className="text-[12px] text-[#565e74]">PhoBERT + XGBoost</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#e5eeff] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#1d4ed8] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>

            {/* Stages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STAGES.map((stage) => (
                <div
                  key={stage.id}
                  className={`flex items-start gap-2 p-3 rounded-lg ${
                    stage.status === "done"
                      ? "bg-[#eff4ff]"
                      : stage.status === "running"
                      ? "bg-[#dce9ff]"
                      : "bg-[#eff4ff] opacity-60"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      stage.status === "done"
                        ? "bg-[#85f8c4] text-[#002114]"
                        : stage.status === "running"
                        ? "bg-[#1d4ed8] text-white"
                        : "bg-[#e5eeff] text-[#565e74]"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-sm ${stage.status === "running" ? "animate-spin" : ""}`}
                    >
                      {stage.status === "done" ? "done" : stage.status === "running" ? "refresh" : "hourglass_empty"}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] text-[#0b1c30] font-semibold truncate">{stage.label}</span>
                    <span
                      className={`text-[11px] mt-0.5 ${
                        stage.status === "running" ? "text-[#1d4ed8] font-medium" : "text-[#565e74]"
                      }`}
                    >
                      {stage.sublabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Log stream */}
            <div className="bg-[#eff4ff] rounded-lg p-3 text-[12px] text-[#434655] flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-[#1d4ed8] animate-ping shrink-0" />
                <span className="text-[#565e74]">[LOG: {new Date().toLocaleTimeString("vi-VN")}]</span>
                <span className="truncate">{currentLog}</span>
              </div>
              <span className="hidden sm:inline-block shrink-0 text-[#1d4ed8] font-medium">Đang đồng bộ</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
