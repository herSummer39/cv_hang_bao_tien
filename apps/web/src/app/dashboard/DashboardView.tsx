import Link from "next/link";

// ─── Kiểu dữ liệu (client Supabase không gắn schema nên tự khai báo) ─────────
export type AnalysisResult = {
  score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
};
export type JobRow = {
  id: string;
  cv_filename: string | null;
  job_title: string | null;
  status: string;
  result: AnalysisResult | null;
  created_at: string;
};
export type InterviewRow = {
  id: string;
  job_title: string | null;
  total_score: number | null;
  status: string | null;
  completed_at: string | null;
  created_at: string;
};
export type BatchRow = {
  id: string;
  name: string | null;
  job_title: string | null;
  cv_count: number | null;
  created_at: string;
};

// ─── Tiện ích hiển thị ───────────────────────────────────────────────────────
const TZ = "Asia/Ho_Chi_Minh";
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
const fmtShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit" });

// Mức đánh giá theo điểm — màu trạng thái luôn đi kèm icon + nhãn chữ
type Band = { key: "good" | "fair" | "low"; label: string; icon: string; text: string; bg: string; bar: string };
const BANDS: Record<Band["key"], Band> = {
  good: { key: "good", label: "Phù hợp cao", icon: "verified", text: "text-[#004f35]", bg: "bg-[#85f8c4]/40", bar: "bg-[#00875a]" },
  fair: { key: "fair", label: "Khá phù hợp", icon: "trending_up", text: "text-[#5c3b00]", bg: "bg-[#ffe8b8]", bar: "bg-[#c77c00]" },
  low: { key: "low", label: "Cần cải thiện", icon: "priority_high", text: "text-[#93000a]", bg: "bg-[#ffdad6]", bar: "bg-[#ba1a1a]" },
};
const bandOf = (score: number): Band => (score >= 70 ? BANDS.good : score >= 50 ? BANDS.fair : BANDS.low);

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const last = parts[parts.length - 1][0] ?? "";
  const first = parts.length > 1 ? parts[0][0] : "";
  return (first + last).toUpperCase();
}

// ─── Biểu đồ xu hướng điểm (SVG thuần, render phía server) ───────────────────
function ScoreTrend({ points }: { points: { score: number; date: string; title: string }[] }) {
  const W = 640, H = 220, L = 34, R = 16, T = 14, B = 30;
  const n = points.length;
  const x = (i: number) => (n === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (s: number) => T + (1 - s / 100) * (H - T - B);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const last = points[n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Diễn biến điểm phù hợp qua các lần phân tích">
      {[0, 50, 70, 100].map((g) => (
        <g key={g}>
          <line
            x1={L} x2={W - R} y1={y(g)} y2={y(g)}
            stroke="#e5eeff" strokeWidth={1}
            strokeDasharray={g === 50 || g === 70 ? "4 4" : undefined}
          />
          <text x={L - 8} y={y(g) + 4} textAnchor="end" className="fill-[#8fa5c0]" fontSize={11}>{g}</text>
        </g>
      ))}
      <text x={W - R} y={y(70) - 6} textAnchor="end" className="fill-[#8fa5c0]" fontSize={10}>Ngưỡng phù hợp cao</text>

      <path d={area} fill="#0037b0" opacity={0.06} />
      <path d={line} fill="none" stroke="#0037b0" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <g key={i}>
          <title>{`${p.date} · ${p.title} · ${Math.round(p.score)} điểm`}</title>
          <circle cx={x(i)} cy={y(p.score)} r={12} fill="transparent" />
          <circle cx={x(i)} cy={y(p.score)} r={4} fill="#0037b0" stroke="#ffffff" strokeWidth={2} />
        </g>
      ))}

      {/* Nhãn trực tiếp chỉ cho điểm mới nhất */}
      <text x={x(n - 1)} y={y(last.score) - 12} textAnchor={n === 1 ? "middle" : "end"} fontSize={12} fontWeight={700} className="fill-[#0b1c30]">
        {Math.round(last.score)}
      </text>

      <text x={x(0)} y={H - 8} textAnchor={n === 1 ? "middle" : "start"} fontSize={11} className="fill-[#8fa5c0]">{points[0].date}</text>
      {n > 1 && (
        <text x={x(n - 1)} y={H - 8} textAnchor="end" fontSize={11} className="fill-[#8fa5c0]">{last.date}</text>
      )}
    </svg>
  );
}

function SectionCard({
  title, subtitle, icon, action, children, className = "",
}: {
  title: string; subtitle?: string; icon: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`bg-white rounded-2xl border border-[#e5eeff] shadow-[0_1px_3px_rgba(11,28,48,0.04)] ${className}`}>
      <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#eff4ff] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[18px] text-[#0037b0]">{icon}</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] font-bold text-[16px] text-[#0b1c30] leading-tight">{title}</h2>
            {subtitle && <p className="text-[12px] text-[#8fa5c0] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon, title, desc, href, cta }: { icon: string; title: string; desc: string; href: string; cta: string }) {
  return (
    <div className="px-6 pb-8 pt-2 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center mx-auto mb-3">
        <span className="material-symbols-outlined text-[24px] text-[#0037b0]">{icon}</span>
      </div>
      <p className="text-[14px] font-medium text-[#0b1c30]">{title}</p>
      <p className="text-[12px] text-[#8fa5c0] mt-1 mb-4">{desc}</p>
      <Link href={href} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0037b0] text-white text-[13px] font-semibold hover:bg-[#1d4ed8] transition-colors">
        {cta}
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </Link>
    </div>
  );
}

export type BatchStat = { done: number; best: number | null };

export type DashboardData = {
  displayName: string;
  plan: string | null;
  analysisCount: number;
  last30Count: number;
  jobs: JobRow[];
  interviews: InterviewRow[];
  batches: BatchRow[];
  batchStats: Record<string, BatchStat>;
};

// Giao diện Dashboard — component thuần (không tự gọi Supabase), page.tsx lấy
// dữ liệu rồi truyền vào. Tách riêng để dễ xem trước/kiểm thử với dữ liệu mẫu.
export default function DashboardView({ data }: { data: DashboardData }) {
  const { displayName, plan, analysisCount, last30Count, jobs, interviews, batches } = data;
  const batchStats = new Map(Object.entries(data.batchStats));
  const profile = { plan };

  // ─── Số liệu tổng hợp ──────────────────────────────────────────────────────
  const done = jobs.filter((j) => j.status === "done" && typeof j.result?.score === "number");
  const scores = done.map((j) => j.result!.score!);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const latest = done[0];
  const previous = done[1];
  const delta = latest && previous ? Math.round(latest.result!.score! - previous.result!.score!) : null;
  const best = done.reduce<JobRow | null>((acc, j) => (!acc || j.result!.score! > acc.result!.score! ? j : acc), null);

  const completedInterviews = interviews.filter((i) => typeof i.total_score === "number");
  const avgInterview = completedInterviews.length
    ? Math.round(completedInterviews.reduce((a, i) => a + (i.total_score ?? 0), 0) / completedInterviews.length)
    : null;

  const trendPoints = [...done].slice(0, 12).reverse().map((j) => ({
    score: j.result!.score!,
    date: fmtShortDate(j.created_at),
    title: j.job_title || j.cv_filename || "Phân tích CV",
  }));

  // Kỹ năng lấy từ ĐÚNG lần phân tích gần nhất (1 JD cụ thể) — không gộp các
  // JD khác ngành với nhau (gộp BĐS + IT sẽ ra danh sách lộn xộn, khó hiểu).
  const latestMissing = latest?.result?.missing_skills ?? [];
  const latestMatched = latest?.result?.matched_skills ?? [];

  const today = new Date().toLocaleDateString("vi-VN", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const kpis = [
    {
      icon: "description",
      label: "Lượt phân tích CV",
      value: String(analysisCount ?? 0),
      foot: `${last30Count ?? 0} lượt trong 30 ngày qua`,
    },
    {
      icon: "insights",
      label: "Điểm phù hợp trung bình",
      value: avgScore != null ? String(avgScore) : "–",
      unit: avgScore != null ? "/100" : undefined,
      band: avgScore != null ? bandOf(avgScore) : undefined,
      foot: scores.length ? `Tính trên ${scores.length} lần phân tích gần nhất` : "Chưa có kết quả",
    },
    {
      icon: "workspace_premium",
      label: "Điểm cao nhất",
      value: best ? String(Math.round(best.result!.score!)) : "–",
      unit: best ? "/100" : undefined,
      foot: best ? best.job_title || best.cv_filename || "—" : "Chưa có kết quả",
    },
    {
      icon: "record_voice_over",
      label: "Phỏng vấn giả lập",
      value: String(completedInterviews.length),
      foot: avgInterview != null ? `Điểm trung bình ${avgInterview}/100` : "Chưa có phiên nào",
    },
  ];

  return (
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0037b0] to-[#1d4ed8] text-white px-6 sm:px-8 py-7">
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-[20px] font-bold flex-shrink-0">
                  {initials(displayName)}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] text-white/70 capitalize">{today}</p>
                  <h1 className="font-[family-name:var(--font-plus-jakarta)] text-[24px] sm:text-[28px] font-bold leading-tight break-words">
                    Xin chào, {displayName}
                  </h1>
                  <p className="text-[13px] text-white/80 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {latest ? (
                      <>
                        <span>
                          Lần phân tích gần nhất: <span className="text-white font-medium">{latest.job_title || latest.cv_filename || "CV"}</span> — {Math.round(latest.result!.score!)} điểm
                        </span>
                        {delta != null && delta !== 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold px-2 py-0.5 rounded-full bg-white/15">
                            <span className="material-symbols-outlined text-[14px]">{delta > 0 ? "arrow_upward" : "arrow_downward"}</span>
                            {delta > 0 ? "+" : "−"}{Math.abs(delta)} so với lần trước
                          </span>
                        )}
                      </>
                    ) : (
                      "Bắt đầu bằng việc đánh giá CV của bạn với một JD cụ thể."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/score" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#0037b0] text-[13px] font-semibold hover:bg-[#eff4ff] transition-colors">
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Đánh giá CV mới
                </Link>
                <Link href="/batch" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/25 text-white text-[13px] font-semibold hover:bg-white/20 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
                  So sánh CV
                </Link>
                <Link href="/interview" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/25 text-white text-[13px] font-semibold hover:bg-white/20 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">mic</span>
                  Phỏng vấn giả lập
                </Link>
              </div>
            </div>
          </section>

          {/* ── KPI ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-[#e5eeff] shadow-[0_1px_3px_rgba(11,28,48,0.04)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[12px] font-semibold text-[#565e74] uppercase tracking-wider">{k.label}</span>
                  <span className="material-symbols-outlined text-[20px] text-[#0037b0]">{k.icon}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-[family-name:var(--font-plus-jakarta)] text-[32px] font-bold text-[#0b1c30] leading-none">{k.value}</span>
                  {k.unit && <span className="text-[14px] text-[#8fa5c0] font-medium">{k.unit}</span>}
                </div>
                {k.band ? (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-[#eff4ff] overflow-hidden">
                      <div className={`h-full rounded-full ${k.band.bar}`} style={{ width: `${Math.min(100, Number(k.value))}%` }} />
                    </div>
                    <span className={`inline-flex items-center gap-1 mt-2 text-[11px] font-semibold ${k.band.text}`}>
                      <span className="material-symbols-outlined text-[14px]">{k.band.icon}</span>
                      {k.band.label}
                    </span>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#8fa5c0] mt-3 truncate" title={k.foot}>{k.foot}</p>
                )}
              </div>
            ))}
          </div>

          {/* ── Xu hướng điểm + kỹ năng của lần gần nhất ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SectionCard
              className="lg:col-span-2"
              icon="show_chart"
              title="Diễn biến điểm phù hợp"
              subtitle="12 lần phân tích gần nhất · rê chuột vào từng điểm để xem chi tiết"
            >
              {trendPoints.length > 0 ? (
                <div className="px-3 sm:px-5 pb-5 overflow-x-auto">
                  <div className="min-w-[480px]">
                    <ScoreTrend points={trendPoints} />
                  </div>
                </div>
              ) : (
                <EmptyState icon="show_chart" title="Chưa có dữ liệu xu hướng" desc="Phân tích CV để bắt đầu theo dõi điểm theo thời gian." href="/score" cta="Đánh giá CV" />
              )}
            </SectionCard>

            <SectionCard
              icon="checklist"
              title="Kỹ năng — lần phân tích gần nhất"
              subtitle={latest ? latest.job_title || latest.cv_filename || "CV" : "Chưa có kết quả"}
            >
              {!latest ? (
                <p className="px-5 sm:px-6 pb-6 text-[13px] text-[#8fa5c0]">Phân tích CV để xem kỹ năng khớp và còn thiếu.</p>
              ) : (
                <div className="px-5 sm:px-6 pb-6 space-y-4">
                  {[
                    { label: "Còn thiếu", icon: "cancel", items: latestMissing, chip: "bg-[#ffdad6] text-[#93000a]", empty: "Không thiếu kỹ năng nào JD yêu cầu." },
                    { label: "Đã khớp", icon: "check_circle", items: latestMatched, chip: "bg-[#85f8c4]/40 text-[#004f35]", empty: "Chưa khớp kỹ năng nào." },
                  ].map((g) => (
                    <div key={g.label}>
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#565e74] mb-2">
                        <span className="material-symbols-outlined text-[16px]">{g.icon}</span>
                        {g.label} ({g.items.length})
                      </div>
                      {g.items.length === 0 ? (
                        <p className="text-[12px] text-[#8fa5c0]">{g.empty}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {g.items.slice(0, 10).map((s) => (
                            <span key={s} className={`text-[12px] font-medium px-2 py-0.5 rounded-md ${g.chip}`}>{s}</span>
                          ))}
                          {g.items.length > 10 && <span className="text-[12px] text-[#8fa5c0] px-1">+{g.items.length - 10}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                  <Link href={`/score/result?id=${latest.id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0037b0] hover:underline pt-1">
                    Xem gợi ý cải thiện CV
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Lịch sử phân tích ────────────────────────────────────────── */}
          <SectionCard
            icon="history"
            title="Lịch sử phân tích CV"
            subtitle={`${jobs.length} lần gần nhất`}
            action={
              <Link href="/score" className="text-[13px] text-[#0037b0] font-semibold inline-flex items-center gap-1 hover:underline flex-shrink-0">
                Phân tích mới
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            }
          >
            {jobs.length === 0 ? (
              <EmptyState icon="upload_file" title="Chưa có phân tích nào" desc="Tải CV và dán JD để nhận điểm phù hợp, kỹ năng thiếu và gợi ý cải thiện." href="/score" cta="Phân tích CV ngay" />
            ) : (
              <div>
                <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_200px_140px_100px_24px] gap-4 px-6 py-2.5 bg-[#f8f9ff] border-y border-[#f0f4ff] text-[11px] font-semibold text-[#565e74] uppercase tracking-wider">
                  <span>CV</span>
                  <span>Vị trí ứng tuyển</span>
                  <span>Điểm phù hợp</span>
                  <span>Kỹ năng khớp</span>
                  <span>Ngày</span>
                  <span />
                </div>
                <div className="divide-y divide-[#f0f4ff]">
                  {jobs.slice(0, 10).map((j) => {
                    const score = j.result?.score;
                    const isDone = j.status === "done" && typeof score === "number";
                    const isProcessing = j.status === "processing" || j.status === "pending";
                    const href = isDone ? `/score/result?id=${j.id}` : isProcessing ? `/score/processing?job_id=${j.id}` : null;
                    const matched = j.result?.matched_skills?.length ?? 0;
                    const totalSkills = matched + (j.result?.missing_skills?.length ?? 0);
                    const band = isDone ? bandOf(score!) : null;
                    const isImage = /\.(png|jpe?g)$/i.test(j.cv_filename ?? "");

                    const row = (
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_200px_140px_100px_24px] gap-x-4 gap-y-2 px-5 sm:px-6 py-4 items-center">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#eff4ff] flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-[18px] text-[#0037b0]">{isImage ? "image" : "description"}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[14px] font-medium text-[#0b1c30] truncate" title={j.cv_filename ?? undefined}>
                              {j.cv_filename || "CV dán trực tiếp"}
                            </div>
                            <div className="md:hidden text-[12px] text-[#8fa5c0] truncate">{j.job_title || "Chưa đặt tên vị trí"} · {fmtDate(j.created_at)}</div>
                          </div>
                        </div>
                        <div className="hidden md:block text-[13px] text-[#434655] truncate" title={j.job_title ?? undefined}>
                          {j.job_title || <span className="text-[#c4c5d7]">Chưa đặt tên vị trí</span>}
                        </div>
                        <div className="justify-self-end md:justify-self-start">
                          {isDone && band ? (
                            <div className="flex items-center gap-2">
                              <span className="font-[family-name:var(--font-plus-jakarta)] text-[20px] font-bold text-[#0b1c30] w-8 text-right">{Math.round(score!)}</span>
                              <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold px-2 py-0.5 rounded-full ${band.bg} ${band.text}`}>
                                <span className="material-symbols-outlined text-[13px]">{band.icon}</span>
                                {band.label}
                              </span>
                            </div>
                          ) : isProcessing ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-medium text-[#0037b0] bg-[#eff4ff] px-2 py-0.5 rounded-full">
                              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                              Đang xử lý
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#93000a] bg-[#ffdad6] px-2 py-0.5 rounded-full">
                              <span className="material-symbols-outlined text-[14px]">error</span>
                              Lỗi
                            </span>
                          )}
                        </div>
                        <div className="hidden md:block">
                          {isDone && totalSkills > 0 ? (
                            <div>
                              <div className="text-[12px] text-[#434655] mb-1">
                                <span className="font-semibold text-[#0b1c30]">{matched}</span>/{totalSkills} kỹ năng
                              </div>
                              <div className="h-1.5 rounded-full bg-[#eff4ff] overflow-hidden w-28">
                                <div className="h-full rounded-full bg-[#0037b0]" style={{ width: `${Math.round((matched / totalSkills) * 100)}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#c4c5d7] text-[13px]">–</span>
                          )}
                        </div>
                        <div className="hidden md:block text-[12px] text-[#565e74]">{fmtDate(j.created_at)}</div>
                        <span className="hidden md:block">
                          {href && <span className="material-symbols-outlined text-[18px] text-[#c4c5d7]">chevron_right</span>}
                        </span>
                      </div>
                    );

                    return href ? (
                      <Link key={j.id} href={href} className="block hover:bg-[#f8faff] transition-colors">{row}</Link>
                    ) : (
                      <div key={j.id} className="opacity-80">{row}</div>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Phỏng vấn + So sánh ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              icon="record_voice_over"
              title="Phỏng vấn giả lập"
              subtitle="Kết quả các phiên gần nhất"
              action={
                <Link href="/interview" className="text-[13px] text-[#0037b0] font-semibold inline-flex items-center gap-1 hover:underline flex-shrink-0">
                  Luyện tiếp
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              }
            >
              {interviews.length === 0 ? (
                <EmptyState icon="mic" title="Chưa có phiên phỏng vấn nào" desc="Mở phiếu phỏng vấn từ trang kết quả phân tích CV để luyện tập." href="/score" cta="Phân tích CV trước" />
              ) : (
                <ul className="divide-y divide-[#f0f4ff] border-t border-[#f0f4ff]">
                  {interviews.map((it) => {
                    const s = it.total_score;
                    const band = typeof s === "number" ? bandOf(s) : null;
                    return (
                      <li key={it.id}>
                        <Link href={`/dashboard/interview/${it.id}`} className="flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-[#f8faff] transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-medium text-[#0b1c30] truncate">{it.job_title || "Vị trí chưa xác định"}</div>
                            <div className="text-[12px] text-[#8fa5c0]">
                              {it.status === "completed" ? "Đã hoàn thành" : "Đang thực hiện"} · {fmtDate(it.completed_at ?? it.created_at)}
                            </div>
                          </div>
                          {band ? (
                            <span className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full ${band.bg} ${band.text}`}>
                              <span className="material-symbols-outlined text-[14px]">{band.icon}</span>
                              {Math.round(s!)}/100
                            </span>
                          ) : (
                            <span className="text-[13px] text-[#c4c5d7]">–</span>
                          )}
                          <span className="material-symbols-outlined text-[18px] text-[#c4c5d7]">chevron_right</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              icon="compare_arrows"
              title="So sánh & xếp hạng CV"
              subtitle="Các lượt so sánh nhiều CV cho 1 vị trí"
              action={
                <Link href="/batch" className="text-[13px] text-[#0037b0] font-semibold inline-flex items-center gap-1 hover:underline flex-shrink-0">
                  Lượt mới
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              }
            >
              {batches.length === 0 ? (
                <EmptyState icon="compare_arrows" title="Chưa có lượt so sánh nào" desc="Tải nhiều CV cho cùng 1 JD để xếp hạng ứng viên." href="/batch" cta="So sánh CV" />
              ) : (
                <ul className="divide-y divide-[#f0f4ff] border-t border-[#f0f4ff]">
                  {batches.map((b) => {
                    const st = batchStats.get(b.id) ?? { done: 0, best: null };
                    const count = b.cv_count || 0;
                    const finished = st.done >= count;
                    return (
                      <li key={b.id}>
                        <Link href={`/batch/${b.id}`} className="flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-[#f8faff] transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-medium text-[#0b1c30] truncate">{b.name || b.job_title || "Lượt so sánh chưa đặt tên"}</div>
                            <div className="text-[12px] text-[#8fa5c0]">
                              {count} CV · {finished ? "đã xử lý xong" : `đang xử lý ${st.done}/${count}`} · {fmtDate(b.created_at)}
                            </div>
                          </div>
                          {st.best != null ? (
                            <div className="text-right">
                              <div className="text-[15px] font-bold text-[#0b1c30]">{Math.round(st.best)}</div>
                              <div className="text-[10px] text-[#8fa5c0] uppercase tracking-wider">cao nhất</div>
                            </div>
                          ) : (
                            <span className="text-[13px] text-[#c4c5d7]">–</span>
                          )}
                          <span className="material-symbols-outlined text-[18px] text-[#c4c5d7]">chevron_right</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          <p className="text-[12px] text-[#8fa5c0] text-center">
            Gói dịch vụ: <span className="font-semibold text-[#565e74]">{profile?.plan === "pro" ? "Pro" : "Free"}</span>
          </p>
        </div>
  );
}
