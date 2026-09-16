import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

type AnalysisResult = { score?: number };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Lấy profile + lịch sử — dùng analysis_jobs (luồng thật đang chạy), không
  // còn dùng cv_sessions (kiến trúc cũ, không được ghi dữ liệu nữa).
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: jobs } = await supabase
    .from("analysis_jobs")
    .select("id, cv_filename, job_title, status, result, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: analysisCount } = await supabase
    .from("analysis_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: interviews } = await supabase
    .from("interview_sessions")
    .select("id, job_title, total_score, status, completed_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const doneJobs = (jobs ?? []).filter((j) => (j.result as AnalysisResult | null)?.score != null);
  const avgScore = doneJobs.length > 0
    ? Math.round(doneJobs.reduce((a, j) => a + ((j.result as AnalysisResult).score ?? 0), 0) / doneJobs.length)
    : null;

  const displayName = profile?.full_name ?? user.email?.split("@")[0] ?? "Bạn";

  return (
    <div className="min-h-screen bg-[#f0f4ff]">
      {/* Top nav */}
      <nav className="bg-white border-b border-[#e5eeff] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0037b0] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[16px]">analytics</span>
          </div>
          <span className="font-bold text-[18px] text-[#0b1c30]">CareerFit</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/score"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0037b0] text-white text-[13px] font-semibold hover:bg-[#1d4ed8] transition-all">
            <span className="material-symbols-outlined text-[15px]">add</span>
            Phân tích mới
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[#565e74] text-[13px] font-medium hover:bg-[#f0f4ff] transition-all border border-[#e5eeff]">
              <span className="material-symbols-outlined text-[15px]">logout</span>
              Đăng xuất
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-[#0b1c30] mb-1">
            Xin chào, {displayName} 👋
          </h1>
          <p className="text-[#565e74]">Theo dõi kết quả phân tích CV của bạn</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: "description",
              label: "Lần phân tích",
              value: analysisCount ?? 0,
              color: "text-[#0037b0]",
              bg: "bg-[#dce1ff]/60",
            },
            {
              icon: "grade",
              label: "Điểm trung bình",
              value: avgScore ? `${avgScore}/100` : "–",
              color: "text-[#004f35]",
              bg: "bg-[#85f8c4]/40",
            },
            {
              icon: "workspace_premium",
              label: "Gói dịch vụ",
              value: profile?.plan === "pro" ? "Pro ⭐" : "Free",
              color: "text-[#7c3aed]",
              bg: "bg-[#ede9fe]/60",
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff]">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <span className={`material-symbols-outlined text-[20px] ${s.color}`}>{s.icon}</span>
              </div>
              <div className={`text-[28px] font-bold ${s.color} leading-none mb-1`}>{s.value}</div>
              <div className="text-[12px] text-[#8fa5c0]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sessions list */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e5eeff] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0f4ff] flex items-center justify-between">
            <h2 className="font-bold text-[18px] text-[#0b1c30]">Lịch sử phân tích</h2>
            <Link href="/score"
              className="text-[13px] text-[#0037b0] font-semibold flex items-center gap-1 hover:opacity-80">
              Phân tích mới
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          {!jobs || jobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[#dce1ff]/60 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px] text-[#0037b0]">upload_file</span>
              </div>
              <p className="text-[#565e74] font-medium mb-2">Chưa có phân tích nào</p>
              <p className="text-[#8fa5c0] text-[13px] mb-6">Upload CV và paste JD để bắt đầu</p>
              <Link href="/score"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0037b0] text-white text-[14px] font-semibold hover:bg-[#1d4ed8] transition-all">
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                Phân tích CV ngay
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f4ff]">
              {jobs.map((j) => {
                const score = (j.result as AnalysisResult | null)?.score;
                return (
                  <div key={j.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#f8faff] transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-[#dce1ff]/60 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-[#0037b0]">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#0b1c30] text-[14px] truncate">{j.cv_filename || "CV dán trực tiếp"}</div>
                      <div className="text-[12px] text-[#8fa5c0] truncate">{j.job_title ?? "Vị trí chưa rõ tên"}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {score != null ? (
                        <div className={`text-[22px] font-bold ${score >= 70 ? "text-[#004f35]" : score >= 50 ? "text-[#b45309]" : "text-red-500"}`}>
                          {Math.round(score)}
                        </div>
                      ) : (
                        <div className="text-[13px] text-[#8fa5c0]">{j.status === "processing" || j.status === "pending" ? "⏳" : j.status === "error" ? "⚠️" : "–"}</div>
                      )}
                      <div className="text-[11px] text-[#c4c5d7]">
                        {new Date(j.created_at).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interview history */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e5eeff] overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-[#f0f4ff] flex items-center justify-between">
            <h2 className="font-bold text-[18px] text-[#0b1c30]">Lịch sử phỏng vấn giả lập</h2>
          </div>

          {!interviews || interviews.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[#ede9fe]/60 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px] text-[#7c3aed]">quiz</span>
              </div>
              <p className="text-[#565e74] font-medium mb-2">Chưa có phiên phỏng vấn giả lập nào</p>
              <p className="text-[#8fa5c0] text-[13px]">Mở "Phiếu Phỏng Vấn Số Hóa" từ trang kết quả phân tích để bắt đầu</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f4ff]">
              {interviews.map((it) => (
                <Link
                  key={it.id}
                  href={`/dashboard/interview/${it.id}`}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-[#f8faff] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#ede9fe]/60 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-[#7c3aed]">quiz</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#0b1c30] text-[14px] truncate">{it.job_title || "Vị trí chưa xác định"}</div>
                    <div className="text-[12px] text-[#8fa5c0] truncate">{it.status === "completed" ? "Đã hoàn thành" : "Đang thực hiện"}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {it.total_score != null ? (
                      <div className={`text-[22px] font-bold ${it.total_score >= 70 ? "text-[#004f35]" : it.total_score >= 50 ? "text-[#b45309]" : "text-red-500"}`}>
                        {Math.round(it.total_score)}
                      </div>
                    ) : (
                      <div className="text-[13px] text-[#8fa5c0]">–</div>
                    )}
                    <div className="text-[11px] text-[#c4c5d7]">
                      {new Date(it.completed_at ?? it.created_at).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-[#c4c5d7]">chevron_right</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
