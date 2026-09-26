"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import {
  buildRequirementMatrix,
  buildSkillMatrix,
  compareCandidates,
  explainRank,
  type JobResult,
  type RankedCandidate,
} from "./compare";

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
  const [batchTitle, setBatchTitle] = useState<string | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);

  // Tên lượt so sánh (bảng batches — migration v14). Chưa có thì bỏ qua.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("batches")
        .select("name, job_title")
        .eq("id", batchId)
        .maybeSingle();
      if (data) setBatchTitle(data.name || data.job_title || null);
    })();
  }, [batchId]);

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
    const first = setTimeout(poll, 0);
    const t = setInterval(poll, 4000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [poll]);

  const total = jobs.length;
  const finishedCount = jobs.filter((j) => j.status === "done" || j.status === "error").length;
  const allDone = total > 0 && finishedCount === total;

  // CV đã xong xếp trước (điểm M3 giảm dần, hoà điểm thì ai khớp nhiều kỹ
  // năng hơn đứng trên); CV đang xử lý/lỗi xuống cuối.
  const ranked = [...jobs].sort((a, b) => {
    const aDone = a.status === "done" && a.result;
    const bDone = b.status === "done" && b.result;
    if (aDone && bDone) return compareCandidates(a.result!, b.result!);
    if (aDone) return -1;
    if (bDone) return 1;
    return 0;
  });
  const visible = ranked.filter((j) => (j.result?.score ?? -1) >= minScore || j.status !== "done");

  // Ứng viên đã có kết quả, theo đúng thứ hạng — dùng cho giải thích + ma trận
  const doneRanked: RankedCandidate[] = ranked
    .filter((j) => j.status === "done" && j.result)
    .map((j, i) => ({ id: j.id, label: `#${i + 1}`, result: j.result! }));
  const rankOf = new Map(doneRanked.map((c, i) => [c.id, i]));

  function explanationFor(jobId: string): string | null {
    const i = rankOf.get(jobId);
    if (i == null || doneRanked.length < 2) return null;
    // Mỗi ứng viên được giải thích so với người NGAY DƯỚI mình; người cuối
    // bảng thì giải thích vì sao người ngay trên xếp hơn.
    if (i < doneRanked.length - 1) return explainRank(doneRanked[i], doneRanked[i + 1]);
    const upper = doneRanked[i - 1];
    return `Xếp sau ${upper.label} — ${upper.label}: ${explainRank(upper, doneRanked[i])}`;
  }

  const matrixCandidates = doneRanked.filter((c) => (c.result.score ?? 0) >= minScore);
  const skillRows = buildSkillMatrix(matrixCandidates);
  const reqRows = buildRequirementMatrix(matrixCandidates);
  const SKILL_ROWS_PREVIEW = 15;
  const shownSkillRows = showAllSkills ? skillRows : skillRows.slice(0, SKILL_ROWS_PREVIEW);
  const nobodyHas = skillRows.filter((r) => r.haveCount === 0).map((r) => r.skill);
  const fileLabel = (id: string) => jobs.find((j) => j.id === id)?.cv_filename || "CV";

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
                    {batchTitle || jobs[0]?.result?.job_title
                      ? `Vị trí: ${batchTitle || jobs[0]?.result?.job_title} · `
                      : ""}
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
                <div className="grid grid-cols-[40px_1fr_80px_100px_90px_90px_90px_90px] gap-2 px-4 py-3 bg-[#eff4ff] text-[11px] font-semibold text-[#565e74] uppercase">
                  <span>#</span>
                  <span>Ứng viên (file)</span>
                  <span>Điểm</span>
                  <span title="Số yêu cầu của JD có bằng chứng rõ trong CV">Yêu cầu JD</span>
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
                        className={`grid grid-cols-[40px_1fr_80px_100px_90px_90px_90px_90px] gap-2 px-4 py-3 items-center text-[13px] ${
                          job.status === "done" ? "cursor-pointer hover:bg-[#f8faff]" : ""
                        }`}
                      >
                        <span className="text-[#8fa5c0] font-medium">{idx + 1}</span>
                        <span className="min-w-0">
                          <span className="block text-[#0b1c30] font-medium truncate">{job.cv_filename || "CV"}</span>
                          {explanationFor(job.id) && (
                            <span className="block text-[11px] text-[#565e74] leading-snug mt-0.5">
                              {explanationFor(job.id)}
                            </span>
                          )}
                        </span>
                        <span>
                          {score != null ? (
                            <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold ${scoreColor(score)}`}>
                              {Math.round(score)}
                            </span>
                          ) : (
                            <span className="text-[#c4c5d7]">–</span>
                          )}
                        </span>
                        <span className="text-[#434655]" title={job.result?.requirement_summary ? `Đáp ứng ${job.result.requirement_summary.met}, một phần ${job.result.requirement_summary.partial}, chưa có ${job.result.requirement_summary.missing}` : undefined}>
                          {job.result?.requirement_summary ? (
                            <>
                              <span className="font-semibold text-[#0b1c30]">{job.result.requirement_summary.met}</span>/{job.result.requirement_summary.total}
                            </>
                          ) : (
                            "–"
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

              {matrixCandidates.length > 0 && reqRows.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm mt-6 overflow-hidden">
                  <div className="px-4 py-4 border-b border-[#f0f4ff]">
                    <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold text-[#0b1c30]">
                      Ma trận yêu cầu JD
                    </h2>
                    <p className="text-[12px] text-[#565e74] mt-1">
                      Từng dòng yêu cầu trong JD × từng ứng viên (M2 tìm bằng chứng trong CV). Yêu cầu bắt buộc ít người đáp ứng nhất xếp đầu.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[12px]">
                      <thead>
                        <tr className="bg-[#eff4ff] text-[#565e74]">
                          <th className="sticky left-0 bg-[#eff4ff] text-left font-semibold px-4 py-2 min-w-[280px]">Yêu cầu</th>
                          {matrixCandidates.map((cand) => (
                            <th key={cand.id} title={fileLabel(cand.id)} className="font-semibold px-2 py-2 text-center min-w-[64px]">
                              <div>{cand.label}</div>
                              <div className="font-normal text-[10px] text-[#8fa5c0] truncate max-w-[80px] mx-auto">{fileLabel(cand.id)}</div>
                            </th>
                          ))}
                          <th className="font-semibold px-3 py-2 text-center">Đáp ứng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f4ff]">
                        {reqRows.map((row) => (
                          <tr key={row.text}>
                            <td className="sticky left-0 bg-white px-4 py-2 text-[#0b1c30]">
                              <span className="block">{row.text}</span>
                              <span className={`text-[10px] font-semibold ${row.priority === "required" ? "text-[#0037b0]" : "text-[#8fa5c0]"}`}>
                                {row.priority === "required" ? "Bắt buộc" : "Ưu tiên"}
                              </span>
                            </td>
                            {matrixCandidates.map((cand) => {
                              const s = row.status[cand.id];
                              const cls =
                                s === "met" ? "bg-[#85f8c4]/50 text-[#004f35]" : s === "partial" ? "bg-[#ffe8b8] text-[#5c3b00]" : "bg-[#ffdad6] text-[#93000a]";
                              const icon = s === "met" ? "check" : s === "partial" ? "radio_button_partial" : "close";
                              const label = s === "met" ? "Đáp ứng" : s === "partial" ? "Một phần" : "Chưa có";
                              return (
                                <td key={cand.id} className="px-2 py-2 text-center">
                                  {s ? (
                                    <span title={label} className={`inline-flex w-6 h-6 rounded-md items-center justify-center material-symbols-outlined text-[16px] ${cls}`}>
                                      {icon}
                                    </span>
                                  ) : (
                                    <span className="text-[#c4c5d7]">–</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center font-semibold text-[#434655]">
                              {row.metCount}/{matrixCandidates.length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="px-4 py-3 text-[11px] text-[#8fa5c0] border-t border-[#f0f4ff]">
                    ✓ đáp ứng · ◐ một phần · ✕ chưa có bằng chứng trong CV · – CV này được phân tích trước khi có tính năng đối chiếu yêu cầu.
                  </p>
                </div>
              )}

              {matrixCandidates.length > 0 && skillRows.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm mt-6 overflow-hidden">
                  <div className="px-4 py-4 border-b border-[#f0f4ff]">
                    <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[18px] font-bold text-[#0b1c30]">
                      Ma trận kỹ năng
                    </h2>
                    <p className="text-[12px] text-[#565e74] mt-1">
                      Kỹ năng JD yêu cầu (M1 trích xuất) × từng ứng viên, theo đúng thứ hạng. Kỹ năng ít người có nhất xếp lên đầu.
                    </p>
                    {nobodyHas.length > 0 && (
                      <p className="text-[12px] text-[#93000a] bg-[#ffdad6]/60 rounded-lg px-3 py-2 mt-3">
                        <strong>Cả lô đều thiếu {nobodyHas.length} kỹ năng:</strong> {nobodyHas.slice(0, 8).join(", ")}
                        {nobodyHas.length > 8 ? "…" : ""} — cân nhắc nới yêu cầu JD hoặc đào tạo thêm sau tuyển.
                      </p>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[12px]">
                      <thead>
                        <tr className="bg-[#eff4ff] text-[#565e74]">
                          <th className="sticky left-0 bg-[#eff4ff] text-left font-semibold px-4 py-2 min-w-[180px]">Kỹ năng</th>
                          {matrixCandidates.map((cand) => (
                            <th
                              key={cand.id}
                              title={fileLabel(cand.id)}
                              className="font-semibold px-2 py-2 text-center min-w-[64px]"
                            >
                              <div>{cand.label}</div>
                              <div className="font-normal text-[10px] text-[#8fa5c0] truncate max-w-[80px] mx-auto">
                                {fileLabel(cand.id)}
                              </div>
                            </th>
                          ))}
                          <th className="font-semibold px-3 py-2 text-center">Số người có</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f4ff]">
                        {shownSkillRows.map((row) => (
                          <tr key={row.skill}>
                            <td className="sticky left-0 bg-white px-4 py-2 text-[#0b1c30] font-medium">{row.skill}</td>
                            {matrixCandidates.map((cand) => {
                              const v = row.has[cand.id];
                              return (
                                <td key={cand.id} className="px-2 py-2 text-center">
                                  {v === true ? (
                                    <span className="inline-flex w-6 h-6 rounded-md bg-[#85f8c4]/50 text-[#004f35] items-center justify-center material-symbols-outlined text-[16px]">check</span>
                                  ) : v === false ? (
                                    <span className="inline-flex w-6 h-6 rounded-md bg-[#ffdad6] text-[#93000a] items-center justify-center material-symbols-outlined text-[16px]">close</span>
                                  ) : (
                                    <span className="text-[#c4c5d7]">–</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`font-semibold ${
                                  row.haveCount === 0 ? "text-[#93000a]" : row.haveCount === matrixCandidates.length ? "text-[#004f35]" : "text-[#434655]"
                                }`}
                              >
                                {row.haveCount}/{matrixCandidates.length}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {skillRows.length > SKILL_ROWS_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setShowAllSkills((v) => !v)}
                      className="w-full py-3 text-[13px] font-medium text-[#0037b0] hover:bg-[#f8faff] border-t border-[#f0f4ff]"
                    >
                      {showAllSkills ? "Thu gọn" : `Xem tất cả ${skillRows.length} kỹ năng`}
                    </button>
                  )}
                  <p className="px-4 py-3 text-[11px] text-[#8fa5c0] border-t border-[#f0f4ff]">
                    ✓ có trong CV · ✕ JD yêu cầu nhưng CV thiếu · – M1 không trích được kỹ năng này từ JD ở lượt phân tích CV đó.
                  </p>
                </div>
              )}

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
