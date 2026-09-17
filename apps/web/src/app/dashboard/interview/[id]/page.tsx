import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

type AnswerOutcome = "submitted" | "timeout" | "skipped";

type AnswerRecord = {
  question_id: string;
  category: string;
  question: string;
  expected: string[];
  red_flags: string[];
  time_limit_sec: number;
  time_used_sec: number;
  answer_text: string;
  question_score: number;
  outcome?: AnswerOutcome; // có thể undefined ở các phiên cũ trước khi thêm field này
  answered_at: string;
};

function scoreColor(score: number) {
  if (score >= 70) return "text-[#004f35] bg-[#85f8c4]/30";
  if (score >= 40) return "text-[#5c3b00] bg-[#ffe8b8]";
  return "text-[#93000a] bg-[#ffdad6]";
}

function outcomeBadge(outcome: AnswerOutcome | undefined) {
  switch (outcome) {
    case "timeout":
      return { label: "Hết giờ — bị loại", cls: "text-[#93000a] bg-[#ffdad6]" };
    case "skipped":
      return { label: "Đã bỏ qua", cls: "text-[#565e74] bg-[#e5eeff]" };
    case "submitted":
      return { label: "Đã nộp", cls: "text-[#004f35] bg-[#85f8c4]/30" };
    default:
      return null;
  }
}

export default async function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!session) notFound();

  const answers = (session.answers ?? []) as unknown as AnswerRecord[];
  const totalScore = session.total_score ?? 0;

  return (
    <div className="min-h-screen bg-[#f0f4ff]">
      <nav className="bg-white border-b border-[#e5eeff] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0037b0] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[16px]">analytics</span>
          </div>
          <span className="font-bold text-[18px] text-[#0b1c30]">CareerFit</span>
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[#565e74] text-[13px] font-medium hover:bg-[#f0f4ff] transition-all border border-[#e5eeff]"
        >
          <span className="material-symbols-outlined text-[15px]">arrow_back</span>
          Quay lại Dashboard
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-[12px] font-semibold text-[#8fa5c0] uppercase tracking-wider mb-1">
            Chi tiết phỏng vấn giả lập
          </p>
          <h1 className="text-[28px] font-bold text-[#0b1c30] mb-1">
            {session.job_title || "Vị trí chưa xác định"}
          </h1>
          <p className="text-[#565e74] text-[13px]">
            {session.candidate_name ? `Ứng viên: ${session.candidate_name} · ` : ""}
            Hoàn thành lúc {session.completed_at ? new Date(session.completed_at).toLocaleString("vi-VN") : "—"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff]">
            <div className={`text-[28px] font-bold leading-none mb-1 ${totalScore >= 70 ? "text-[#004f35]" : totalScore >= 40 ? "text-[#b45309]" : "text-red-500"}`}>
              {totalScore}/100
            </div>
            <div className="text-[12px] text-[#8fa5c0]">Điểm trung bình</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff]">
            <div className="text-[28px] font-bold leading-none mb-1 text-[#0037b0]">
              {answers.filter((a) => a.answer_text.trim().length > 0).length}/{answers.length}
            </div>
            <div className="text-[12px] text-[#8fa5c0]">Câu đã trả lời</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff]">
            <div className="text-[28px] font-bold leading-none mb-1 text-[#7c3aed]">
              {answers.length
                ? Math.round(answers.reduce((s, a) => s + a.time_used_sec, 0) / answers.length)
                : 0}s
            </div>
            <div className="text-[12px] text-[#8fa5c0]">Thời gian TB / câu</div>
          </div>
        </div>

        {session.summary && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff] mb-8 text-[13px] text-[#434655]">
            {session.summary}
          </div>
        )}

        <div className="space-y-4">
          {answers.map((a, idx) => {
            const badge = outcomeBadge(a.outcome);
            return (
            <div key={a.question_id || idx} className="bg-white rounded-2xl shadow-sm border border-[#e5eeff] p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa5c0]">
                    Câu {idx + 1} · {a.category}
                  </span>
                  <p className="font-semibold text-[#0b1c30] text-[15px] mt-1">{a.question}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className={`px-3 py-1 rounded-full text-[13px] font-bold ${scoreColor(a.question_score)}`}>
                    {a.question_score}/100
                  </span>
                  {badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-[#eff4ff] rounded-xl p-4 mb-3">
                <p className="text-[11px] font-semibold text-[#565e74] uppercase mb-1">Câu trả lời của bạn</p>
                <p className="text-[13px] text-[#0b1c30] whitespace-pre-wrap">
                  {a.answer_text || (
                    <span className="italic text-[#8fa5c0]">
                      {a.outcome === "skipped" ? "Đã bỏ qua, không trả lời" : "Không trả lời (hết thời gian)"}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[#8fa5c0] mt-2">
                  Thời gian dùng: {a.time_used_sec}s / {a.time_limit_sec}s
                </p>
              </div>

              <div className="bg-[#e5eeff]/60 rounded-xl p-4">
                <p className="text-[11px] font-semibold text-[#004f35] mb-1">Tiêu chí kỳ vọng đạt chuẩn</p>
                <ul className="text-[12px] text-[#0b1c30] space-y-1 pl-4 list-disc">
                  {a.expected.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
