import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DashboardView, { type BatchRow, type BatchStat, type InterviewRow, type JobRow } from "./DashboardView";

// Mốc thời gian "N ngày trước" (tách ra ngoài component — quy tắc purity)
function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // Phân tích CV cá nhân (không tính CV trong "So sánh CV" — đó là CV của ứng viên khác)
  const { data: jobsRaw } = await supabase
    .from("analysis_jobs")
    .select("id, cv_filename, job_title, status, result, created_at")
    .eq("user_id", user.id)
    .is("batch_id", null)
    .order("created_at", { ascending: false })
    .limit(30);
  const jobs = (jobsRaw ?? []) as JobRow[];

  const { count: analysisCount } = await supabase
    .from("analysis_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("batch_id", null);

  const since30 = daysAgoIso(30);
  const { count: last30Count } = await supabase
    .from("analysis_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("batch_id", null)
    .gte("created_at", since30);

  const { data: interviewsRaw } = await supabase
    .from("interview_sessions")
    .select("id, job_title, total_score, status, completed_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);
  const interviews = (interviewsRaw ?? []) as InterviewRow[];

  // Lịch sử "So sánh CV" (bảng batches — migration v14)
  const { data: batchesRaw } = await supabase
    .from("batches")
    .select("id, name, job_title, cv_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);
  const batches = (batchesRaw ?? []) as BatchRow[];
  const batchIds = batches.map((b) => b.id);
  const { data: batchJobs } = batchIds.length
    ? await supabase.from("analysis_jobs").select("batch_id, status, score:result->score").in("batch_id", batchIds)
    : { data: [] as { batch_id: string; status: string; score: number | null }[] };
  const batchStats: Record<string, BatchStat> = {};
  for (const j of (batchJobs ?? []) as { batch_id: string; status: string; score: number | null }[]) {
    const s = batchStats[j.batch_id] ?? { done: 0, best: null };
    if (j.status === "done" || j.status === "error") s.done++;
    if (typeof j.score === "number") s.best = s.best == null ? j.score : Math.max(s.best, j.score);
    batchStats[j.batch_id] = s;
  }

  const displayName = profile?.full_name ?? user.email?.split("@")[0] ?? "Bạn";

  return (
    <div className="bg-[#f8f9ff] min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        <DashboardView
          data={{
            displayName,
            plan: profile?.plan ?? null,
            analysisCount: analysisCount ?? 0,
            last30Count: last30Count ?? 0,
            jobs,
            interviews,
            batches,
            batchStats,
          }}
        />
      </main>
      <Footer />
    </div>
  );
}
