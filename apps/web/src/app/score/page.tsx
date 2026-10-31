"use client";
import { useRouter, useSearchParams } from "next/navigation";
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
  const [isDragging, setIsDragging] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  const cvReady = hasFile || rawCV.trim().length > 20;
  const jdReady = jdContent.trim().length >= 30;
  const formReady = cvReady && jdReady;

  // ── State chọn ngành ─────────────────────────────────────────────────────
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);

  // ── Đọc query param ?industry= từ trang Khám phá ─────────────────────────
  const searchParams = useSearchParams();
  const industryNameFromExplore = searchParams.get("industry") ?? "";

  // ── Prefill preferred_industry_id từ profile ─────────────────────────────
  useEffect(() => {
    if (industryNameFromExplore) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setToastError(null);
    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB • Đã sẵn sàng`);
    setHasFile(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setToastError("Chỉ hỗ trợ tệp định dạng PDF hoặc DOCX. Vui lòng thử lại!");
      return;
    }

    setToastError(null);
    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB • Đã sẵn sàng`);
    setHasFile(true);

    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    }
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
    setToastError(null);

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

    // Tạo job trong Supabase
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
      setToastError("Không thể tạo phiên phân tích: " + (error?.message || "Lỗi kết nối cơ sở dữ liệu"));
      return;
    }

    if (selectedIndustryId && currentUser) {
      await supabase
        .from("profiles")
        .update({ preferred_industry_id: selectedIndustryId } as Record<string, unknown>)
        .eq("id", currentUser.id);
    }

    sessionStorage.setItem("cf_job_id", data.id);
    router.push("/score/processing");
  }

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        <ProgressStepper activeStep={1} />

        {/* Page Header */}
        <section className="w-full px-4 sm:px-8 lg:px-12 pt-7 pb-2">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff4ff] border border-[#dce1ff] text-[#0037b0] text-[12px] font-bold mb-3 shadow-xs">
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
              <span>Động cơ AI đối soát năng lực &amp; Chuẩn ATS</span>
            </div>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[26px] sm:text-[32px] font-extrabold text-[#0b1c30] tracking-tight leading-tight">
              Đánh giá mức độ phù hợp giữa CV &amp; Vị trí tuyển dụng
            </h1>
            <p className="text-[14px] sm:text-[15px] text-[#475569] mt-2 leading-relaxed">
              Tải lên CV của bạn và cung cấp yêu cầu tuyển dụng để AI phân tích độ tương thích, phát hiện lỗ hổng kỹ năng và đề xuất tối ưu.
            </p>
          </div>
        </section>

        {/* 50/50 Dual Column */}
        <section className="w-full px-4 sm:px-8 lg:px-12 py-3 flex-1">
          {/* Toast thông báo lỗi hiện đại */}
          {toastError && (
            <div className="mb-4 p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[13px] flex items-center justify-between shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#dc2626]">error</span>
                <span className="font-medium">{toastError}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastError(null)}
                className="p-1 hover:bg-[#fee2e2] rounded-lg transition-colors text-[#dc2626]"
                aria-label="Đóng thông báo lỗi"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* LEFT: CV Upload */}
            <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 relative">
              {/* Header Cột CV */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#f1f5f9] mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${cvReady ? "bg-[#ecfdf5] text-[#059669]" : "bg-[#eff4ff] text-[#0037b0]"
                    }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {cvReady ? "task_alt" : "description"}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[16px] sm:text-[17px] font-bold text-[#0b1c30]">
                      Hồ sơ của bạn (CV)
                    </h2>
                    <p className="text-[12px] text-[#64748b]">Đính kèm file PDF hoặc DOCX</p>
                  </div>
                </div>

                {cvReady ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    Đã sẵn sàng
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-1 rounded-full">
                    PDF / DOCX
                  </span>
                )}
              </div>

              {/* Drop zone với Drag & Drop tương tác */}
              <div
                id="cv-drop-zone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex-1 min-h-[360px] rounded-xl transition-all flex flex-col items-center justify-center p-6 text-center group cursor-pointer overflow-hidden border ${isDragging
                    ? "bg-[#eff6ff] border-2 border-dashed border-[#0037b0] scale-[1.01] shadow-md"
                    : "bg-[#f8fafc] hover:bg-[#eff4ff]/40 border-[#e2e8f0]"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  accept=".pdf,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="cv-file-input"
                  onChange={handleFileSelected}
                  type="file"
                  aria-label="Chọn tệp CV định dạng PDF hoặc DOCX"
                />

                {!hasFile ? (
                  isDragging ? (
                    <div className="flex flex-col items-center gap-2 text-[#0037b0] animate-bounce z-0">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-[#bfdbfe] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[36px] text-[#0037b0]">download</span>
                      </div>
                      <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-bold text-[#0037b0] mt-2">
                        Thả tệp CV vào đây ngay
                      </h3>
                      <p className="text-[12px] text-[#1d4ed8]">Hệ thống sẽ tự động tiếp nhận tệp của bạn</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-[#e2e8f0] flex items-center justify-center text-[#0037b0] group-hover:scale-110 group-hover:border-[#bfdbfe] transition-all mb-3 z-0">
                        <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                      </div>
                      <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[15px] font-semibold text-[#0b1c30] mb-1 z-0">
                        Kéo thả tệp CV vào đây, hoặc click để chọn
                      </h3>
                      <p className="text-[12px] text-[#64748b] mb-4 max-w-xs z-0 leading-relaxed">
                        Hỗ trợ PDF hoặc DOCX (tối đa 25MB). Dữ liệu được bảo mật an toàn.
                      </p>
                      <button
                        className="relative z-0 px-4 py-2 bg-white hover:bg-[#f8fafc] text-[#0037b0] border border-[#dce1ff] text-[13px] font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 pointer-events-none"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px]">attach_file</span>
                        Duyệt tệp từ máy
                      </button>
                    </>
                  )
                ) : (
                  <div className="absolute inset-0 bg-white p-6 flex flex-col justify-between z-20 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[26px]">description</span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-[15px] text-[#0b1c30] truncate max-w-[220px]">
                            {fileName}
                          </h4>
                          <p className="text-[12px] text-[#64748b]">{fileSize}</p>
                        </div>
                      </div>
                      <button
                        className="p-1.5 rounded-lg hover:bg-[#fee2e2] text-[#64748b] hover:text-[#dc2626] transition-colors"
                        onClick={removeFile}
                        type="button"
                        aria-label="Xóa tệp CV đã chọn"
                        title="Xóa tệp này"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-[#166534] uppercase tracking-wider">
                          Đã tải lên thành công
                        </span>
                        <span className="text-[11px] font-semibold text-[#166534] bg-white px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#bbf7d0]">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          Hợp lệ
                        </span>
                      </div>
                      <p className="text-[12px] text-[#166534]">
                        Tệp đã sẵn sàng để đối soát nội dung với mô tả công việc.
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        className="text-[12px] font-semibold text-[#0037b0] hover:underline transition-colors flex items-center gap-1"
                        onClick={removeFile}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">sync</span>
                        Chọn tệp khác
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Raw text toggle */}
              <div className="mt-3 pt-2 flex items-center justify-between">
                <button
                  className="inline-flex items-center gap-1 text-[12px] text-[#64748b] hover:text-[#0037b0] font-medium transition-colors"
                  onClick={() => setShowRawCV(!showRawCV)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">edit_note</span>
                  <span>{showRawCV ? "Thu gọn ô dán văn bản" : "Hoặc dán trực tiếp nội dung văn bản CV"}</span>
                </button>
                {rawCV.trim().length > 20 && !hasFile && (
                  <span className="text-[11px] font-semibold text-[#059669] flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">check</span> Đã có văn bản
                  </span>
                )}
              </div>

              {showRawCV && (
                <div className="mt-2">
                  <textarea
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 text-[13px] text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0037b0] focus:bg-white transition-all resize-none"
                    rows={4}
                    value={rawCV}
                    onChange={(e) => setRawCV(e.target.value)}
                    placeholder="Dán toàn bộ nội dung văn bản của CV vào đây nếu không có file sẵn..."
                  />
                </div>
              )}
            </div>

            {/* RIGHT: JD */}
            <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 relative">
              {/* Header Cột JD */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#f1f5f9] mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${jdReady ? "bg-[#ecfdf5] text-[#059669]" : "bg-[#eff4ff] text-[#0037b0]"
                    }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {jdReady ? "task_alt" : "work_outline"}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[16px] sm:text-[17px] font-bold text-[#0b1c30]">
                      Công việc mục tiêu (JD)
                    </h2>
                    <p className="text-[12px] text-[#64748b]">Vị trí và yêu cầu tuyển dụng cần đối soát</p>
                  </div>
                </div>

                {jdReady ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    Đã sẵn sàng
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-1 rounded-full">
                    Tối thiểu 30 ký tự
                  </span>
                )}
              </div>

              {/* Role input */}
              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="job-title">
                  Chức danh công việc (Tùy chọn)
                </label>
                <div className="relative">
                  <input
                    id="job-title"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2 text-[13px] text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0037b0] focus:bg-white transition-all"
                    placeholder="VD: Senior Frontend Engineer, Product Manager..."
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                  <span className="material-symbols-outlined text-[#94a3b8] text-[18px] absolute right-3 top-2.5">
                    badge
                  </span>
                </div>
              </div>

              {/* Industry Select */}
              <IndustrySelect
                value={selectedIndustryId}
                onChange={setSelectedIndustryId}
                defaultName={industryNameFromExplore}
                className="mb-3"
              />

              {/* JD Textarea with Inline Presets */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                  <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider" htmlFor="jd-content">
                    Bản mô tả công việc (JD) <span className="text-[#ba1a1a]">*</span>
                  </label>

                  {/* Inline Preset Pills */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#94a3b8] hidden sm:inline">Thử nhanh:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset("frontend")}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] transition-colors"
                      title="Nạp nhanh JD mẫu Frontend"
                    >
                      Frontend
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("pm")}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] transition-colors"
                      title="Nạp nhanh JD mẫu Product Lead"
                    >
                      Product Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("sales")}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#faf5ff] hover:bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff] transition-colors"
                      title="Nạp nhanh JD mẫu Sales B2B"
                    >
                      Sales B2B
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative flex flex-col">
                  <textarea
                    id="jd-content"
                    className="w-full flex-1 min-h-[190px] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 text-[13px] text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#0037b0] focus:bg-white transition-all resize-none"
                    placeholder="Dán nội dung yêu cầu tuyển dụng (JD) vào đây, hoặc click các nút 'Thử nhanh' ở trên để điền mẫu..."
                    value={jdContent}
                    onChange={(e) => setJdContent(e.target.value)}
                  />

                  {/* Dynamic character counter & quality status */}
                  <div className="mt-2 flex items-center justify-between text-[12px] text-[#64748b]">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#94a3b8]">info</span>
                      {jdContent.trim().length < 30 ? (
                        <span className="text-[#b45309]">Cần thêm ít nhất {30 - jdContent.trim().length} ký tự</span>
                      ) : (
                        <span className="text-[#059669] font-medium">
                          Độ dài đạt chuẩn ({jdContent.trim().split(/\s+/).filter(Boolean).length} từ)
                        </span>
                      )}
                    </span>
                    <span className={`font-semibold ${jdReady ? "text-[#059669]" : "text-[#94a3b8]"}`}>
                      {jdContent.trim().length}/30 ký tự {jdReady ? "✓" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar trung tâm thân thiện */}
          <div className="mt-6 p-5 bg-white rounded-2xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${formReady ? "bg-[#ecfdf5] text-[#059669] ring-4 ring-[#ecfdf5]" : "bg-[#f1f5f9] text-[#94a3b8]"
                }`}>
                <span className="material-symbols-outlined text-[24px]">
                  {formReady ? "verified" : "auto_awesome"}
                </span>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold text-[#0b1c30]">
                  {formReady ? "Đã sẵn sàng phân tích!" : "Sẵn sàng phân tích hồ sơ"}
                </h3>
                <p className="text-[13px] text-[#64748b]">
                  {formReady
                    ? "Dữ liệu hợp lệ. Nhấn nút bên cạnh để bắt đầu quá trình thẩm định AI."
                    : "Đính kèm tệp CV và cung cấp mô tả công việc để kích hoạt phân tích."}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto shrink-0">
              <button
                id="analyze-btn"
                disabled={!formReady}
                onClick={handleAnalyze}
                className={`w-full sm:w-auto px-7 py-3 rounded-xl font-[family-name:var(--font-plus-jakarta)] text-[15px] font-bold flex items-center justify-center gap-2 transition-all ${formReady
                    ? "bg-gradient-to-r from-[#0037b0] via-[#1a56db] to-[#2563eb] hover:shadow-lg hover:shadow-[#0037b0]/25 text-white cursor-pointer active:scale-[0.99]"
                    : "bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed shadow-none"
                  }`}
              >
                <span className="material-symbols-outlined text-[19px]">
                  {formReady ? "bolt" : "lock"}
                </span>
                <span>Bắt đầu phân tích ngay</span>
              </button>
            </div>
          </div>

          {/* Trust signals */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pb-8">
            {[
              {
                icon: "troubleshoot",
                color: "text-[#0037b0]",
                bg: "bg-[#eff4ff]",
                title: "Độ chuẩn xác đối chiếu kỹ năng",
                desc: "Thuật toán ngữ nghĩa nhận diện tương đồng kỹ năng thực tế (Synonym Mapping), không chỉ so khớp từ khóa máy móc.",
              },
              {
                icon: "gavel",
                color: "text-[#059669]",
                bg: "bg-[#ecfdf5]",
                title: "Khách quan và không định kiến",
                desc: "Ẩn danh thông tin nhân khẩu học (tuổi tác, giới tính, hình ảnh) đảm bảo phân tích hoàn toàn dựa trên năng lực chuyên môn.",
              },
              {
                icon: "shield_lock",
                color: "text-[#0284c7]",
                bg: "bg-[#f0f9ff]",
                title: "Bảo mật dữ liệu ứng viên 100%",
                desc: "Hồ sơ của bạn không bao giờ được chia sẻ hay huấn luyện mô hình bên ngoài. Xử lý an toàn theo tiêu chuẩn bảo mật dữ liệu.",
              },
            ].map((card) => (
              <div key={card.title} className="p-5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs flex flex-col justify-between">
                <div>
                  <div className={`w-9 h-9 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-3`}>
                    <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                  </div>
                  <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[14px] font-bold text-[#0b1c30] mb-1">
                    {card.title}
                  </h3>
                  <p className="text-[12px] text-[#64748b] leading-relaxed">{card.desc}</p>
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
