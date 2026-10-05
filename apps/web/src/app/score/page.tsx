"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgressStepper from "@/components/ProgressStepper";
import IndustrySelect from "@/components/IndustrySelect";
import { createClient } from "@/lib/supabase/client";

type Preset = "frontend" | "pm" | "sales";

const PRESETS: Record<Preset, { title: string; jd: string }> = {
  frontend: {
    title: "Kỹ sư Frontend Cao cấp (Senior Frontend Engineer)",
    jd: `Yêu cầu chuyên môn:
- Tối thiểu 5 năm kinh nghiệm phát triển ứng dụng web hiện đại với React, TypeScript, Next.js.
- Thành thạo kiến trúc Micro-frontend, tối ưu hóa Web Vitals, Responsive Layout và Accessibility (WCAG).
- Kinh nghiệm thực chiến với Tailwind CSS, Redux Toolkit, React Query.
- Nắm vững quy trình CI/CD, viết Unit Test (Jest/Playwright) và tư duy thiết kế hệ thống UI linh hoạt.`,
  },
  pm: {
    title: "Trưởng nhóm Sản phẩm (Product Lead)",
    jd: `Yêu cầu chuyên môn:
- Ít nhất 4 năm làm Product Manager cho các sản phẩm công nghệ B2B SaaS hoặc Fintech.
- Năng lực phân tích dữ liệu chuyên sâu (SQL, Amplitude, Mixpanel), định hình Product Roadmap và OKRs.
- Khả năng lãnh đạo liên phòng ban (Engineering, Design, Business & Marketing).
- Kỹ năng giao tiếp xuất sắc và giải quyết bài toán trải nghiệm người dùng phức tạp.`,
  },
  sales: {
    title: "Chuyên viên Kinh doanh B2B Cao cấp",
    jd: `Yêu cầu chuyên môn:
- 3+ năm kinh nghiệm bán hàng giải pháp công nghệ cho nhóm khách hàng doanh nghiệp vừa và lớn.
- Kỹ năng thuyết trình giải pháp, đàm phán hợp đồng thương mại và quản trị phễu khách hàng qua CRM.
- Khả năng tự chủ tìm kiếm khách hàng tiềm năng và hoàn thành định mức doanh số quý/năm.`,
  },
};

export default function ScorePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasFile, setHasFile] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [showRawCV, setShowRawCV] = useState(false);
  const [rawCV, setRawCV] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jdContent, setJdContent] = useState("");

  const cvReady = hasFile || rawCV.trim().length > 20;
  const jdReady = jdContent.trim().length > 30;
  const formReady = cvReady && jdReady;

  // ── State chọn ngành ─────────────────────────────────────────────────────
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);

  // ── Prefill preferred_industry_id từ profile (nếu đã đăng nhập) ──────────
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_industry_id")
        .eq("id", user.id)
        .single();
      if (profile?.preferred_industry_id) {
        setSelectedIndustryId(profile.preferred_industry_id);
      }
    })();
  }, []);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB • Đã sẵn sàng`);
    setHasFile(true);
  }

  function removeFile(e: React.MouseEvent) {
    e.stopPropagation();
    setHasFile(false);
    setFileName("");
    setFileSize("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyPreset(type: Preset) {
    const p = PRESETS[type];
    setJobTitle(p.title);
    setJdContent(p.jd);
  }

  async function handleAnalyze() {
    if (!formReady) return;

    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    let cvB64: string | null = null;
    let cvText: string | null = null;
    let cvFilename: string | null = null;
    let cvStoragePath: string | null = null;

    // Encode PDF → base64 hoặc dùng raw text
    if (hasFile && fileInputRef.current?.files?.[0]) {
      const file = fileInputRef.current.files[0];
      cvFilename = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      cvB64 = btoa(binary);

      // Lưu file CV gốc vào Storage (bucket user-cvs) nếu đã đăng nhập.
      // Không chặn luồng phân tích chính nếu upload lỗi — cv_b64 vẫn đủ để worker xử lý.
      if (currentUser) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const MIME: Record<string, string> = {
          pdf: "application/pdf",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          doc: "application/msword",
        };
        const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("user-cvs")
          .upload(path, file, { contentType: file.type || MIME[ext] || "application/octet-stream" });
        if (uploadError) {
          console.warn("Không lưu được CV vào Storage (không ảnh hưởng phân tích):", uploadError.message);
        } else {
          cvStoragePath = path;
        }
      }
    } else if (rawCV.trim()) {
      cvText = rawCV.trim();
    }

    // Tạo job trong Supabase — ghi kèm industry_id (null nếu user chọn "tự đoán")
    const { data, error } = await supabase
      .from("analysis_jobs")
      .insert({
        cv_text: cvText,
        cv_b64: cvB64,
        cv_filename: cvFilename,
        cv_storage_path: cvStoragePath,
        user_id: currentUser?.id ?? null,
        jd_text: jdContent,
        job_title: jobTitle,
        status: "pending",
        industry_id: selectedIndustryId ?? null,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      alert("Lỗi kết nối Supabase: " + (error?.message || "unknown"));
      return;
    }

    // Upsert preferred_industry_id vào profiles nếu user đã đăng nhập + đã chọn ngành
    if (selectedIndustryId && currentUser) {
      await supabase
        .from("profiles")
        .update({ preferred_industry_id: selectedIndustryId } as Record<string, unknown>)
        .eq("id", currentUser.id);
    }

    // Lưu jobId để processing page dùng
    sessionStorage.setItem("cf_job_id", data.id);
    router.push("/score/processing");
  }

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        <ProgressStepper activeStep={1} />

        {/* Page Header */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pt-7 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
            {/* Title & Description */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff4ff] border border-[#dce1ff] text-[#0037b0] text-[12px] font-bold mb-3 shadow-xs">
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                <span>Động cơ AI đối soát kỹ năng &amp; Chuẩn ATS</span>
              </div>
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[28px] sm:text-[34px] font-extrabold text-[#0b1c30] tracking-tight leading-tight">
                Đánh giá mức độ phù hợp giữa CV &amp; Vị trí tuyển dụng
              </h1>
              <p className="text-[14px] sm:text-[15px] text-[#475569] mt-2 leading-relaxed">
                Tải lên CV và cung cấp yêu cầu công việc để AI phân tích tỷ lệ tương thích, phát hiện lỗ hổng kỹ năng và đề xuất tối ưu.
              </p>
            </div>

            {/* Quick Preset Card */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm shrink-0 lg:max-w-md w-full lg:w-auto">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="material-symbols-outlined text-[16px] text-[#f59e0b]">lightbulb</span>
                <span className="text-[12px] font-bold text-[#0f172a] uppercase tracking-wide">
                  Chưa có sẵn JD? Thử ngay vị trí mẫu:
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["frontend", "pm", "sales"] as Preset[]).map((type) => {
                  const isFE = type === "frontend";
                  const isPM = type === "pm";

                  return (
                    <button
                      key={type}
                      onClick={() => applyPreset(type)}
                      type="button"
                      className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                        isFE
                          ? "bg-[#eff6ff] hover:bg-[#dbeafe] border-[#bfdbfe] text-[#1e40af]"
                          : isPM
                          ? "bg-[#f0fdf4] hover:bg-[#dcfce7] border-[#bbf7d0] text-[#166534]"
                          : "bg-[#faf5ff] hover:bg-[#f3e8ff] border-[#e9d5ff] text-[#6b21a8]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px] shrink-0 group-hover:scale-110 transition-transform">
                        {isFE ? "terminal" : isPM ? "view_kanban" : "trending_up"}
                      </span>
                      <span className="text-[12px] font-bold leading-tight truncate">
                        {isFE ? "Frontend" : isPM ? "Product Lead" : "Sales B2B"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 50/50 Dual Column */}
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-2 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* LEFT: CV Upload */}
            <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-[#e5eeff] p-6 relative">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[13px] font-bold ${
                    cvReady ? "bg-[#85f8c4]/50 text-[#004f35]" : "bg-[#0037b0] text-white"
                  }`}>
                    {cvReady ? <span className="material-symbols-outlined text-[16px]">check</span> : "1"}
                  </span>
                  <div>
                    <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold text-[#0b1c30]">
                      Bước 1: Tải lên hồ sơ (CV)
                    </h2>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  cvReady ? "bg-[#85f8c4]/40 text-[#004f35]" : "bg-[#ffe8b8] text-[#5c3b00]"
                }`}>
                  {cvReady ? "Đã sẵn sàng" : "Cần chọn file"}
                </span>
              </div>
              <p className="text-[13px] text-[#565e74] mb-4">
                Hệ thống sẽ trích xuất học vấn, lịch sử công tác, dự án và bộ kỹ năng cứng / mềm từ tài liệu.
              </p>

              {/* Drop zone */}
              <div
                className="relative flex-1 min-h-[380px] bg-[#eff4ff]/50 hover:bg-[#eff4ff] rounded-xl transition-all flex flex-col items-center justify-center p-8 text-center group cursor-pointer overflow-hidden shadow-inner"
                id="cv-drop-zone"
              >
                <input
                  ref={fileInputRef}
                  accept=".pdf,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="cv-file-input"
                  onChange={handleFileSelected}
                  type="file"
                />
                {/* Dashed SVG border */}
                <svg
                  className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none rounded-lg"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    className={`transition-colors ${
                      hasFile ? "text-[#004f35]" : "text-[#c4c5d7] group-hover:text-[#0037b0]"
                    }`}
                    fill="none"
                    height="100%"
                    rx="8"
                    stroke="currentColor"
                    strokeDasharray="6 6"
                    strokeWidth="1.5"
                    width="100%"
                  />
                </svg>

                {!hasFile ? (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#0037b0] group-hover:scale-105 transition-transform mb-4 z-0">
                      <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                    </div>
                    <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold text-[#0b1c30] mb-1 z-0">
                      Kéo và thả tệp CV vào đây, hoặc Duyệt tệp
                    </h3>
                    <p className="text-[13px] text-[#565e74] mb-4 max-w-sm z-0">
                      Hỗ trợ định dạng PDF, DOCX tối đa 25MB. Hồ sơ được mã hóa và xóa bộ đệm sau phiên làm việc.
                    </p>
                    <button
                      className="relative z-0 px-4 py-2 bg-white hover:bg-[#f8f9ff] text-[#0b1c30] text-[13px] font-medium rounded-xl shadow-sm transition-all flex items-center gap-1"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">attachment</span>
                      Chọn tài liệu từ thiết bị
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-white p-6 flex flex-col justify-between z-20 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#dce1ff]/30 text-[#0037b0] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[28px]">description</span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-[16px] text-[#0b1c30] truncate max-w-[240px]">
                            {fileName}
                          </h4>
                          <p className="text-[13px] text-[#565e74]">{fileSize}</p>
                        </div>
                      </div>
                      <button
                        className="p-1 rounded-lg hover:bg-[#e5eeff] text-[#565e74] hover:text-[#ba1a1a] transition-colors"
                        onClick={removeFile}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                    <div className="p-4 rounded-xl bg-[#eff4ff] text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-[#565e74] uppercase">
                          Trạng thái trích xuất
                        </span>
                        <span className="text-[11px] font-semibold text-[#004f35] bg-[#85f8c4]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Hợp lệ
                        </span>
                      </div>
                      <p className="text-[13px] text-[#0b1c30]">
                        Đã nhận diện: Cấu trúc hồ sơ 4 mục tiêu chuẩn, 12 từ khóa kỹ năng cốt lõi.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        className="text-[13px] text-[#565e74] hover:text-[#0037b0] transition-colors"
                        onClick={removeFile}
                        type="button"
                      >
                        Thay đổi tệp khác
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Raw text toggle */}
              <div className="mt-4 pt-2 flex items-center justify-between">
                <button
                  className="inline-flex items-center gap-1 text-[13px] text-[#565e74] hover:text-[#0037b0] transition-colors"
                  onClick={() => setShowRawCV(!showRawCV)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Hoặc dán văn bản thô từ CV</span>
                </button>
                <span className="text-[11px] text-[#747686]">OCR v4.2 chủ động trích xuất</span>
              </div>
              {showRawCV && (
                <div className="mt-2">
                  <textarea
                    className="w-full bg-[#eff4ff] rounded-xl p-3 text-[13px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:bg-[#e5eeff] transition-all resize-none"
                    rows={5}
                    value={rawCV}
                    onChange={(e) => setRawCV(e.target.value)}
                    placeholder="Dán toàn bộ nội dung text của CV vào đây nếu không có file sẵn..."
                  />
                </div>
              )}
            </div>

            {/* RIGHT: JD */}
            <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-[#e5eeff] p-6 relative">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[13px] font-bold ${
                    jdReady ? "bg-[#85f8c4]/50 text-[#004f35]" : "bg-[#0037b0] text-white"
                  }`}>
                    {jdReady ? <span className="material-symbols-outlined text-[16px]">check</span> : "2"}
                  </span>
                  <div>
                    <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold text-[#0b1c30]">
                      Bước 2: Vị trí &amp; Mô tả công việc (JD)
                    </h2>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  jdReady ? "bg-[#85f8c4]/40 text-[#004f35]" : "bg-[#ffe8b8] text-[#5c3b00]"
                }`}>
                  {jdReady ? "Đã sẵn sàng" : "Cần nhập JD"}
                </span>
              </div>
              <p className="text-[13px] text-[#565e74] mb-4">
                Cung cấp tiêu chí kỳ vọng, yêu cầu kỹ thuật và bối cảnh nhóm để thiết lập thang đo phù hợp.
              </p>

              {/* Role + Industry */}
              <div className="mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#565e74] uppercase tracking-wider mb-1" htmlFor="job-title">
                    Chức danh công việc (Tùy chọn)
                  </label>
                  <div className="relative">
                    <input
                      id="job-title"
                      className="w-full bg-[#eff4ff] rounded-xl px-3 py-2 text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:bg-[#e5eeff] transition-all"
                      placeholder="VD: Senior Frontend Engineer..."
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                    <span className="material-symbols-outlined text-[#747686] text-[18px] absolute right-3 top-2.5">
                      badge
                    </span>
                  </div>
                </div>
              </div>

              {/* Industry Select — 2-level dropdown */}
              <IndustrySelect
                value={selectedIndustryId}
                onChange={setSelectedIndustryId}
                className="mb-3"
              />

              {/* JD Textarea */}
              <div className="flex-1 flex flex-col min-h-[280px]">
                <label className="block text-[11px] font-semibold text-[#565e74] uppercase tracking-wider mb-1" htmlFor="jd-content">
                  Nội dung chi tiết (JD) <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="flex-1 relative flex flex-col">
                  <textarea
                    id="jd-content"
                    className="w-full flex-1 min-h-[220px] bg-[#eff4ff] rounded-xl p-4 text-[14px] text-[#0b1c30] placeholder:text-[#747686]/70 focus:outline-none focus:bg-[#e5eeff] transition-all resize-none"
                    placeholder="Dán nội dung Bản mô tả công việc (Job Description) vào đây... Hoặc chọn 1 vị trí mẫu ở đầu trang."
                    value={jdContent}
                    onChange={(e) => setJdContent(e.target.value)}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[13px] text-[#565e74]">
                    <span className="inline-flex items-center gap-1 text-[#747686]">
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      Gợi ý: Tối thiểu 30 ký tự để AI phân tích chính xác
                    </span>
                    <span className={`text-[12px] font-medium ${jdReady ? "text-[#004f35]" : "text-[#747686]"}`}>
                      {jdContent.length} ký tự {jdReady ? "✓" : "(cần ≥ 30)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Matching config */}
              <div className="mt-3 pt-2 bg-[#eff4ff]/40 rounded-xl p-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#565e74]">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span className="text-[13px]">
                    Độ khắt khe: <strong>Tiêu chuẩn (Khuyến nghị)</strong>
                  </span>
                </div>
                <button className="text-[11px] text-[#0037b0] hover:underline" type="button">
                  Tùy chỉnh
                </button>
              </div>
            </div>
          </div>

          {/* Action Bar & Readiness Checklist */}
          <div className="mt-6 flex flex-col lg:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-[#e5eeff] shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#0037b0] shrink-0">
                <span className="material-symbols-outlined text-[24px]">checklist</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold text-[#0b1c30]">
                  Điều kiện bắt đầu phân tích
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                  <span className={`inline-flex items-center gap-1 font-medium ${cvReady ? "text-[#004f35]" : "text-[#ba1a1a]"}`}>
                    <span className="material-symbols-outlined text-[16px]">{cvReady ? "check_circle" : "cancel"}</span>
                    {cvReady ? "Đã có tệp CV / nội dung CV" : "Chưa tải file CV"}
                  </span>
                  <span className={`inline-flex items-center gap-1 font-medium ${jdReady ? "text-[#004f35]" : "text-[#ba1a1a]"}`}>
                    <span className="material-symbols-outlined text-[16px]">{jdReady ? "check_circle" : "cancel"}</span>
                    {jdReady ? "Đã nhập nội dung JD" : "Chưa nhập JD (tối thiểu 30 ký tự)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end w-full lg:w-auto shrink-0">
              <button
                id="analyze-btn"
                disabled={!formReady}
                onClick={handleAnalyze}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-[family-name:var(--font-plus-jakarta)] text-[16px] font-bold flex items-center justify-center gap-2 transition-all ${
                  formReady
                    ? "bg-[#0037b0] hover:bg-[#1d4ed8] text-white shadow-lg shadow-[#0037b0]/20 cursor-pointer active:scale-[0.99]"
                    : "bg-[#e5eeff] text-[#8fa5c0] cursor-not-allowed shadow-none"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">analytics</span>
                <span>Bắt đầu phân tích độ phù hợp</span>
              </button>
            </div>
          </div>

          {/* Trust signals */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pb-8">
            {[
              {
                icon: "troubleshoot",
                color: "text-[#0037b0]",
                bg: "bg-[#dce1ff]/40",
                title: "Độ chuẩn xác đối chiếu kỹ năng",
                desc: "Thuật toán ngữ nghĩa nhận diện tương đồng kỹ năng thực tế (Synonym Mapping), không chỉ so khớp từ khóa máy móc.",
                link: "Khảo sát đối soát đa chiều",
                linkColor: "text-[#0037b0]",
              },
              {
                icon: "gavel",
                color: "text-[#004f35]",
                bg: "bg-[#85f8c4]/50",
                title: "Tuân thủ không định kiến ISO-27001",
                desc: "Ẩn danh thông tin nhân khẩu học (tuổi tác, giới tính, hình ảnh) đảm bảo phân tích hoàn toàn dựa trên năng lực khách quan.",
                link: "Chuẩn mực thẩm định công bằng",
                linkColor: "text-[#004f35]",
              },
              {
                icon: "shield_lock",
                color: "text-[#565e74]",
                bg: "bg-[#dae2fd]/50",
                title: "Bảo mật dữ liệu ứng viên 100%",
                desc: "Hồ sơ nhân sự không được dùng để huấn luyện mô hình bên ngoài. Dữ liệu mã hóa AES-256 nội bộ trong suốt quá trình xử lý.",
                link: "Chứng thực an toàn dữ liệu",
                linkColor: "text-[#565e74]",
              },
            ].map((card) => (
              <div key={card.title} className="p-6 rounded-xl bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-3`}>
                    <span className="material-symbols-outlined text-[24px]">{card.icon}</span>
                  </div>
                  <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold text-[#0b1c30] mb-1">
                    {card.title}
                  </h3>
                  <p className="text-[13px] text-[#565e74] leading-relaxed">{card.desc}</p>
                </div>
                <div className={`mt-4 pt-2 text-[11px] font-semibold ${card.linkColor} flex items-center gap-1`}>
                  <span>{card.link}</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
