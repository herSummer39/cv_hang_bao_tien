"use client";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import IndustrySelect from "@/components/IndustrySelect";
import { createClient } from "@/lib/supabase/client";

const MAX_FILES = 20;

const CV_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export default function BatchPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [jdContent, setJdContent] = useState("");
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");

  const jdReady = jdContent.trim().length > 30;
  const formReady = files.length > 0 && jdReady;

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setErrorMsg("");
    setFiles((prev) => {
      const merged = [...prev, ...picked];
      if (merged.length > MAX_FILES) {
        setErrorMsg(`Chỉ hỗ trợ tối đa ${MAX_FILES} CV mỗi lượt so sánh — đã cắt bớt các file thừa.`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleAnalyzeBatch() {
    if (!formReady || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    setProgress({ done: 0, total: files.length });

    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const batchId = crypto.randomUUID();

    // Lưu lượt so sánh để xem lại trong Dashboard. Lỗi (vd chưa chạy migration
    // v14) thì bỏ qua — không chặn việc so sánh.
    await supabase.from("batches").insert({
      id: batchId,
      user_id: currentUser?.id ?? null,
      name: jobTitle.trim() || null,
      job_title: jobTitle.trim() || null,
      jd_text: jdContent,
      industry_id: selectedIndustryId ?? null,
      cv_count: files.length,
    });

    let failCount = 0;

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        const cvB64 = btoa(binary);

        let cvStoragePath: string | null = null;
        if (currentUser) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
          const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("user-cvs")
            .upload(path, file, { contentType: file.type || CV_MIME[ext] || "application/octet-stream" });
          if (!uploadError) cvStoragePath = path;
        }

        const { error } = await supabase.from("analysis_jobs").insert({
          cv_b64: cvB64,
          cv_filename: file.name,
          cv_storage_path: cvStoragePath,
          user_id: currentUser?.id ?? null,
          jd_text: jdContent,
          job_title: jobTitle,
          industry_id: selectedIndustryId ?? null,
          batch_id: batchId,
          status: "pending",
        });
        if (error) failCount++;
      } catch {
        failCount++;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    if (failCount === files.length) {
      setErrorMsg("Không tạo được lượt so sánh nào — kiểm tra lại kết nối Supabase.");
      setSubmitting(false);
      return;
    }

    sessionStorage.setItem("cf_batch_id", batchId);
    router.push(`/batch/${batchId}`);
  }

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 flex flex-col">
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 pt-8 pb-4">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#dae2fd]/60 text-[#5c647a] text-[11px] font-semibold mb-2 uppercase tracking-wider">
            <span className="material-symbols-outlined text-[14px]">groups</span>
            Dành cho nhà tuyển dụng
          </div>
          <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[36px] font-bold text-[#0b1c30] tracking-tight leading-[44px]">
            So sánh &amp; xếp hạng nhiều CV cho 1 vị trí
          </h1>
          <p className="text-[16px] text-[#565e74] mt-1 leading-[26px] max-w-3xl">
            Dán 1 bản mô tả công việc, tải lên nhiều CV cùng lúc — hệ thống chạy đúng pipeline AI đang dùng cho từng CV rồi xếp hạng theo điểm phù hợp.
          </p>
        </section>

        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-2 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* LEFT: multi CV upload */}
            <div className="flex flex-col bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#e5eeff] text-[#0037b0] flex items-center justify-center text-[14px] font-semibold">1</span>
                  <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-semibold text-[#0b1c30]">
                    Danh sách CV ứng viên
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-[#565e74] bg-[#eff4ff] px-2 py-0.5 rounded-lg">
                  {files.length}/{MAX_FILES}
                </span>
              </div>
              <p className="text-[13px] text-[#565e74] mb-4">
                Hỗ trợ PDF, DOCX, ảnh chụp CV (PNG/JPG — worker tự OCR). Chọn nhiều file cùng lúc hoặc bấm nhiều lần để thêm dần.
              </p>

              <div
                className="relative min-h-[140px] bg-[#eff4ff]/50 hover:bg-[#eff4ff] rounded-xl transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer shadow-inner mb-4"
              >
                <input
                  ref={fileInputRef}
                  accept=".pdf,.docx,.png,.jpg,.jpeg"
                  multiple
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFilesSelected}
                  type="file"
                />
                <span className="material-symbols-outlined text-[#0037b0] text-[32px] mb-2">cloud_upload</span>
                <p className="text-[13px] text-[#565e74]">Kéo thả hoặc bấm để chọn nhiều CV</p>
              </div>

              {files.length > 0 && (
                <div className="flex-1 overflow-y-auto max-h-[280px] space-y-2">
                  {files.map((f, idx) => (
                    <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#eff4ff]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[#0037b0] text-[18px] shrink-0">description</span>
                        <span className="text-[13px] text-[#0b1c30] truncate">{f.name}</span>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="p-1 rounded-lg hover:bg-white text-[#565e74] hover:text-[#ba1a1a] transition-colors shrink-0"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: JD */}
            <div className="flex flex-col bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#e5eeff] text-[#0037b0] flex items-center justify-center text-[14px] font-semibold">2</span>
                  <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-semibold text-[#0b1c30]">
                    Vị trí tuyển dụng chung
                  </h2>
                </div>
              </div>
              <p className="text-[13px] text-[#565e74] mb-4">
                Tất cả CV trong lượt này sẽ được so với đúng 1 JD dưới đây.
              </p>

              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-[#565e74] uppercase tracking-wider mb-1" htmlFor="batch-job-title">
                  Chức danh công việc
                </label>
                <input
                  id="batch-job-title"
                  className="w-full bg-[#eff4ff] rounded-xl px-3 py-2 text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:bg-[#e5eeff] transition-all"
                  placeholder="VD: Senior Frontend Engineer..."
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              <IndustrySelect value={selectedIndustryId} onChange={setSelectedIndustryId} className="mb-3" />

              <div className="flex-1 flex flex-col min-h-[220px]">
                <label className="block text-[11px] font-semibold text-[#565e74] uppercase tracking-wider mb-1" htmlFor="batch-jd-content">
                  Nội dung chi tiết (JD)
                </label>
                <textarea
                  id="batch-jd-content"
                  className="w-full flex-1 min-h-[180px] bg-[#eff4ff] rounded-xl p-4 text-[14px] text-[#0b1c30] placeholder:text-[#747686]/70 focus:outline-none focus:bg-[#e5eeff] transition-all resize-none"
                  placeholder="Dán nội dung Bản mô tả công việc vào đây..."
                  value={jdContent}
                  onChange={(e) => setJdContent(e.target.value)}
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-[#fff4e5] border border-[#ffd9a0] text-[#7a4b00] text-[13px]">
              {errorMsg}
            </div>
          )}

          {/* Action bar */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#e5eeff] flex items-center justify-center text-[#565e74] shrink-0">
                <span className="material-symbols-outlined text-[20px]">leaderboard</span>
              </div>
              <div>
                <h4 className="font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold text-[#0b1c30]">
                  Xếp hạng tự động
                </h4>
                <p className="text-[13px] text-[#565e74]">
                  Mỗi CV chạy qua đúng pipeline M1 → M2 → M3, kết quả xếp theo điểm giảm dần.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end w-full sm:w-auto">
              <button
                disabled={!formReady || submitting}
                onClick={handleAnalyzeBatch}
                className={`w-full sm:w-auto px-8 py-3 rounded-xl font-[family-name:var(--font-plus-jakarta)] text-[16px] font-semibold flex items-center justify-center gap-2 transition-all ${
                  formReady && !submitting
                    ? "bg-[#1d4ed8] hover:bg-[#0037b0] text-white shadow-md cursor-pointer"
                    : "bg-[#e5eeff] text-[#747686] cursor-not-allowed shadow-none"
                }`}
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>Đang tạo {progress.done}/{progress.total}...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">leaderboard</span>
                    <span>So sánh & xếp hạng</span>
                  </>
                )}
              </button>
              <p className={`text-[11px] mt-1 text-center sm:text-right ${formReady ? "text-[#004f35] font-medium" : "text-[#747686]"}`}>
                {formReady
                  ? `Đã sẵn sàng — ${files.length} CV, 1 JD.`
                  : "Cần ít nhất 1 CV và nội dung JD đủ dài."}
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
