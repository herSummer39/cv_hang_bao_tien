"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

type JobResult = {
  score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  cv_exp_years?: number;
  job_title?: string;
};

type BatchJob = {
  id: string;
  cv_filename: string | null;
  status: "pending" | "processing" | "done" | "error";
  result: JobResult | null;
  error_msg: string | null;
  created_at: string;
};

function scoreColor(score: number) {
  if (score >= 70) return "text-[#004f35] bg-[#85f8c4]/40";
  if (score >= 40) return "text-[#5c3b00] bg-[#ffe8b8]";
  return "text-[#93000a] bg-[#ffdad6]";
}

export default function BatchResultPage() {
  const params = useParams<{ batchId: string }>();
  const router = useRouter();
  const batchId = params.batchId;

  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [notFoundBatch, setNotFoundBatch] = useState(false);
  const [minScore, setMinScore] = useState(0);

  const poll = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("analysis_jobs")
      .select("id, cv_filename, status, result, error_msg, created_at")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) {
      setNotFoundBatch(true);
      return;
    }
    setJobs(data as unknown as BatchJob[]);
  }, [batchId]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [poll]);

  const total = jobs.length;
  const finishedCount = jobs.filter((j) => j.status === "done" || j.status === "error").length;
  const allDone = total > 0 && finishedCount === total;

  const ranked = [...jobs].sort((a, b) => {
    const sa = a.result?.score ?? -1;
    const sb = b.result?.score ?? -1;
    return sb - sa;
  });
  const visible = ranked.filter((j) => (j.result?.score ?? -1) >= minScore || j.status !== "done");

  function openDetail(job: BatchJob) {
    if (job.status !== "done" || !job.result) return;
    sessionStorage.setItem("cf_result", JSON.stringify(job.result));
    sessionStorage.setItem("cf_job_id", job.id);
    router.push("/score/result");
  }

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16 flex flex-col">
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 flex-1">
          {notFoundBatch ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[40px] mb-3">error</span>
              <p className="text-[#0b1c30] font-semibold mb-2">Không tìm thấy lượt so sánh này</p>
              <Link href="/batch" className="px-5 py-2.5 rounded-xl bg-[#0037b0] text-white text-[13px] font-medium hover:bg-[#1d4ed8] transition-colors inline-block mt-2">
                Tạo lượt so sánh mới
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[28px] font-bold text-[#0b1c30]">
                    Bảng xếp hạng ứng viên
                  </h1>
                  <p className="text-[13px] text-[#565e74] mt-1">
                    {jobs[0]?.result?.job_title ? `Vị trí: ${jobs[0].result.job_title} · ` : ""}
                    {allDone ? `Đã xử lý xong ${total}/${total} CV.` : `Đang xử lý ${finishedCount}/${total} CV...`}
                  </p>
                </div>
                <Link
                  href="/batch"
                  className="px-4 py-2 rounded-xl bg-white border border-[#c4c5d7]/50 text-[#0b1c30] text-[13px] font-medium hover:bg-[#eff4ff] transition-colors flex items-center gap-2 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  So sánh lượt khác
                </Link>
              </div>

              {!allDone && (
                <div className="w-full h-1.5 bg-[#e5eeff] rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-[#1d4ed8] rounded-full transition-all duration-500"
                    style={{ width: `${total ? (finishedCount / total) * 100 : 0}%` }}
                  />
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center gap-4">
                <span className="text-[13px] font-medium text-[#565e74] shrink-0">Chỉ hiện điểm ≥ {minScore}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="flex-1"
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-[40px_1fr_90px_110px_110px_100px_90px] gap-2 px-4 py-3 bg-[#eff4ff] text-[11px] font-semibold text-[#565e74] uppercase">
                  <span>#</span>
                  <span>Ứng viên (file)</span>
                  <span>Điểm</span>
                  <span>Kỹ năng khớp</span>
                  <span>Kỹ năng thiếu</span>
                  <span>Kinh nghiệm</span>
                  <span>Trạng thái</span>
                </div>
                <div className="divide-y divide-[#f0f4ff]">
                  {visible.map((job, idx) => {
                    const score = job.result?.score;
                    return (
                      <div
                        key={job.id}
                        onClick={() => openDetail(job)}
                        className={`grid grid-cols-[40px_1fr_90px_110px_110px_100px_90px] gap-2 px-4 py-3 items-center text-[13px] ${
                          job.status === "done" ? "cursor-pointer hover:bg-[#f8faff]" : ""
                        }`}
                      >
                        <span className="text-[#8fa5c0] font-medium">{idx + 1}</span>
                        <span className="text-[#0b1c30] font-medium truncate">{job.cv_filename || "CV"}</span>
                        <span>
                          {score != null ? (
                            <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold ${scoreColor(score)}`}>
                              {Math.round(score)}
                            </span>
                          ) : (
                            <span className="text-[#c4c5d7]">–</span>
                          )}
                        </span>
                        <span className="text-[#434655]">{job.result?.matched_skills?.length ?? "–"}</span>
                        <span className="text-[#434655]">{job.result?.missing_skills?.length ?? "–"}</span>
                        <span className="text-[#434655]">
                          {job.result?.cv_exp_years != null ? `${job.result.cv_exp_years} năm` : "–"}
                        </span>
                        <span>
                          {job.status === "done" && (
                            <span className="text-[#004f35] flex items-center gap-1 text-[12px]">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>Xong
                            </span>
                          )}
                          {job.status === "error" && (
                            <span className="text-[#93000a] flex items-center gap-1 text-[12px]" title={job.error_msg || ""}>
                              <span className="material-symbols-outlined text-[14px]">error</span>Lỗi
                            </span>
                          )}
                          {(job.status === "pending" || job.status === "processing") && (
                            <span className="text-[#565e74] flex items-center gap-1 text-[12px]">
                              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>Đang xử lý
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!allDone && (
                <p className="text-[12px] text-[#8fa5c0] mt-3 text-center">
                  Cần worker AI (python worker.py) đang chạy để xử lý các job pending/processing.
                </p>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
