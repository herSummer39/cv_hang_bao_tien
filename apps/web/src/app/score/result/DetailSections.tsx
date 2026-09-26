"use client";
import { useState } from "react";

// ─── Kiểu dữ liệu do worker.py (detail_analysis.py) trả về ───────────────────
export type RequirementItem = {
  text: string;
  section: "requirement" | "responsibility";
  priority: "required" | "preferred";
  status: "met" | "partial" | "missing";
  match: number;
  evidence: string | null;
  closest?: string | null;
  skills: { name: string; matched: boolean }[];
};
export type RequirementSummary = {
  total: number;
  met: number;
  partial: number;
  missing: number;
  required_total: number;
  required_met: number;
  thresholds?: { met: number; partial: number };
};
export type ScoreBreakdown = {
  base: number;
  factors: { key: string; label: string; icon: string; detail: string; contribution: number }[];
  features: { key: string; label: string; value: number; contribution: number; group: string | null }[];
  raw: number;
  final: number;
  clamped: boolean;
};

const fmtSigned = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(1)}`;

// ─── Vì sao hồ sơ được X điểm ────────────────────────────────────────────────
export function ScoreBreakdownCard({ data }: { data: ScoreBreakdown }) {
  const [showAll, setShowAll] = useState(false);
  const maxAbs = Math.max(1, ...data.factors.map((f) => Math.abs(f.contribution)));

  return (
    <div className="bg-white rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0037b0] flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">calculate</span>
          Vì sao hồ sơ được {Math.round(data.final)} điểm?
        </span>
        <span className="text-[11px] text-[#8fa5c0]">Tách từ chính mô hình M3 (XGBoost · SHAP), không ước lượng</span>
      </div>
      <p className="text-[13px] text-[#434655] mb-5">
        Điểm = <strong>mức nền</strong> của mô hình, cộng hoặc trừ phần đóng góp của từng nhóm yếu tố bên dưới.
      </p>

      {/* Phương trình điểm */}
      <div className="flex flex-wrap items-center gap-2 text-[13px] mb-6 bg-[#f8f9ff] rounded-xl px-4 py-3">
        <span className="px-2.5 py-1 rounded-lg bg-white border border-[#e5eeff] text-[#434655]">
          Mức nền <strong className="text-[#0b1c30]">{data.base.toFixed(1)}</strong>
        </span>
        {data.factors.map((f) => (
          <span
            key={f.key}
            className={`px-2.5 py-1 rounded-lg border ${
              f.contribution >= 0 ? "bg-[#85f8c4]/25 border-[#85f8c4] text-[#004f35]" : "bg-[#ffdad6]/50 border-[#ffb4ab] text-[#93000a]"
            }`}
          >
            {f.label} <strong>{fmtSigned(f.contribution)}</strong>
          </span>
        ))}
        <span className="text-[#565e74]">=</span>
        <span className="px-2.5 py-1 rounded-lg bg-[#0037b0] text-white font-bold">{Math.round(data.final)} điểm</span>
        {data.clamped && (
          <span className="text-[11px] text-[#8fa5c0]">(tổng thô {data.raw.toFixed(1)}, giới hạn trong thang 0–100)</span>
        )}
      </div>

      {/* Biểu đồ đóng góp: âm sang trái, dương sang phải từ mốc 0 */}
      <div className="space-y-4">
        {data.factors.map((f) => {
          const pct = (Math.abs(f.contribution) / maxAbs) * 50;
          const pos = f.contribution >= 0;
          return (
            <div key={f.key} className="grid grid-cols-1 md:grid-cols-[260px_1fr_72px] gap-2 md:gap-4 items-center">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#0b1c30] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0037b0]">{f.icon}</span>
                  {f.label}
                </div>
                <div className="text-[12px] text-[#565e74] leading-snug">{f.detail}</div>
              </div>
              <div className="relative h-5 bg-[#f8f9ff] rounded-md" title={`${f.label}: ${fmtSigned(f.contribution)} điểm`}>
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#c4c5d7]" />
                <div
                  className={`absolute top-1 bottom-1 rounded ${pos ? "bg-[#00875a]" : "bg-[#ba1a1a]"}`}
                  style={pos ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}
                />
              </div>
              <div className={`text-[14px] font-bold md:text-right flex items-center md:justify-end gap-0.5 ${pos ? "text-[#004f35]" : "text-[#93000a]"}`}>
                <span className="material-symbols-outlined text-[16px]">{pos ? "arrow_upward" : "arrow_downward"}</span>
                {fmtSigned(f.contribution)}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        className="mt-5 text-[13px] font-medium text-[#0037b0] flex items-center gap-1 hover:underline"
      >
        <span className="material-symbols-outlined text-[18px]">{showAll ? "expand_less" : "expand_more"}</span>
        {showAll ? "Ẩn chi tiết" : `Xem chi tiết ${data.features.length} đặc trưng đầu vào của M3`}
      </button>
      {showAll && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead>
              <tr className="text-left text-[#565e74] bg-[#eff4ff]">
                <th className="px-3 py-2 font-semibold">Đặc trưng</th>
                <th className="px-3 py-2 font-semibold text-right">Giá trị</th>
                <th className="px-3 py-2 font-semibold text-right">Đóng góp (điểm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f4ff]">
              {data.features.map((ft) => (
                <tr key={ft.key}>
                  <td className="px-3 py-2 text-[#0b1c30]">{ft.label}</td>
                  <td className="px-3 py-2 text-right text-[#434655]">{ft.value}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${ft.contribution >= 0 ? "text-[#004f35]" : "text-[#93000a]"}`}>
                    {ft.contribution > 0 ? "+" : ""}{ft.contribution.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Đối chiếu từng yêu cầu JD ───────────────────────────────────────────────
const STATUS = {
  met: { label: "Đáp ứng", icon: "check_circle", pill: "bg-[#85f8c4]/40 text-[#004f35]", border: "border-l-[#00875a]" },
  partial: { label: "Một phần", icon: "radio_button_partial", pill: "bg-[#ffe8b8] text-[#5c3b00]", border: "border-l-[#c77c00]" },
  missing: { label: "Chưa có", icon: "cancel", pill: "bg-[#ffdad6] text-[#93000a]", border: "border-l-[#ba1a1a]" },
} as const;

type Filter = "all" | "missing" | "partial" | "met";

export function RequirementMatchCard({ items, summary }: { items: RequirementItem[]; summary: RequirementSummary }) {
  const [filter, setFilter] = useState<Filter>("all");
  const order = { missing: 0, partial: 1, met: 2 } as const;
  const sorted = [...items].sort(
    (a, b) =>
      (a.priority === b.priority ? 0 : a.priority === "required" ? -1 : 1) || order[a.status] - order[b.status]
  );
  const shown = filter === "all" ? sorted : sorted.filter((r) => r.status === filter);
  const pct = summary.total ? Math.round(((summary.met + summary.partial * 0.5) / summary.total) * 100) : 0;
  const th = summary.thresholds ?? { met: 0.6, partial: 0.45 };

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: summary.total },
    { key: "missing", label: "Chưa có", count: summary.missing },
    { key: "partial", label: "Một phần", count: summary.partial },
    { key: "met", label: "Đáp ứng", count: summary.met },
  ];

  return (
    <div className="bg-white rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0037b0] flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">fact_check</span>
          Đối chiếu từng yêu cầu của JD
        </span>
        <span className="text-[11px] text-[#8fa5c0]">
          M2 tìm câu khớp nhất trong CV cho từng yêu cầu · Đáp ứng ≥ {Math.round(th.met * 100)}%, Một phần ≥ {Math.round(th.partial * 100)}%
        </span>
      </div>
      <p className="text-[13px] text-[#434655] mb-5">
        Mỗi dòng yêu cầu trong JD được so với toàn bộ CV, kèm câu trong CV làm bằng chứng — để bạn biết chính xác cần bổ sung gì.
      </p>

      {/* Tóm tắt */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl bg-[#eff4ff] p-4">
          <div className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider">Mức đáp ứng JD</div>
          <div className="font-[family-name:var(--font-plus-jakarta)] text-[26px] font-bold text-[#0b1c30] leading-tight">{pct}%</div>
          <div className="h-1.5 rounded-full bg-white overflow-hidden mt-1">
            <div className="h-full rounded-full bg-[#0037b0]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="rounded-xl bg-[#eff4ff] p-4">
          <div className="text-[11px] font-semibold text-[#565e74] uppercase tracking-wider">Yêu cầu bắt buộc</div>
          <div className="font-[family-name:var(--font-plus-jakarta)] text-[26px] font-bold text-[#0b1c30] leading-tight">
            {summary.required_met}<span className="text-[15px] text-[#8fa5c0]">/{summary.required_total}</span>
          </div>
          <div className="text-[12px] text-[#565e74]">đã có bằng chứng rõ trong CV</div>
        </div>
        <div className="rounded-xl bg-[#85f8c4]/20 p-4">
          <div className="text-[11px] font-semibold text-[#004f35] uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>Đáp ứng / Một phần
          </div>
          <div className="font-[family-name:var(--font-plus-jakarta)] text-[26px] font-bold text-[#0b1c30] leading-tight">
            {summary.met}<span className="text-[15px] text-[#8fa5c0]"> / {summary.partial}</span>
          </div>
          <div className="text-[12px] text-[#565e74]">trên {summary.total} yêu cầu</div>
        </div>
        <div className="rounded-xl bg-[#ffdad6]/40 p-4">
          <div className="text-[11px] font-semibold text-[#93000a] uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">cancel</span>Chưa có bằng chứng
          </div>
          <div className="font-[family-name:var(--font-plus-jakarta)] text-[26px] font-bold text-[#0b1c30] leading-tight">{summary.missing}</div>
          <div className="text-[12px] text-[#565e74]">cần bổ sung vào CV (nếu bạn thật sự có)</div>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-wrap gap-2 mb-4" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={filter === t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              filter === t.key ? "bg-[#0037b0] text-white" : "bg-[#eff4ff] text-[#434655] hover:bg-[#e5eeff]"
            }`}
          >
            {t.label} <span className={filter === t.key ? "text-white/70" : "text-[#8fa5c0]"}>{t.count}</span>
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {shown.map((r, i) => {
          const st = STATUS[r.status];
          return (
            <li key={`${r.text}-${i}`} className={`border border-[#e5eeff] border-l-4 ${st.border} rounded-xl p-4`}>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full ${st.pill}`}>
                  <span className="material-symbols-outlined text-[14px]">{st.icon}</span>
                  {st.label}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    r.priority === "required" ? "bg-[#0037b0]/10 text-[#0037b0]" : "bg-[#f0f4ff] text-[#565e74]"
                  }`}
                >
                  {r.priority === "required" ? "Bắt buộc" : "Ưu tiên / lợi thế"}
                </span>
                <span className="text-[11px] text-[#8fa5c0]">{r.section === "responsibility" ? "Nhiệm vụ công việc" : "Yêu cầu ứng viên"}</span>
                <span className="ml-auto text-[12px] font-semibold text-[#434655]" title="Độ tương đồng M2 giữa yêu cầu và câu gần nhất trong CV">
                  {Math.round(r.match * 100)}% khớp
                </span>
              </div>
              <p className="text-[14px] font-medium text-[#0b1c30]">{r.text}</p>

              {r.evidence ? (
                <div className="mt-2 flex items-start gap-2 text-[13px] text-[#434655] bg-[#f8f9ff] rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-[16px] text-[#0037b0] shrink-0 mt-0.5">format_quote</span>
                  <span><span className="text-[#8fa5c0]">CV của bạn: </span>“{r.evidence}”</span>
                </div>
              ) : (
                <div className="mt-2 text-[13px] text-[#93000a] bg-[#ffdad6]/30 rounded-lg px-3 py-2">
                  Không tìm thấy câu nào trong CV thể hiện yêu cầu này.
                  {r.closest && (
                    <span className="block text-[#565e74] mt-1">
                      Câu gần nhất (chưa đủ khớp): “{r.closest}”
                    </span>
                  )}
                </div>
              )}

              {r.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-[#8fa5c0]">Kỹ năng trong yêu cầu:</span>
                  {r.skills.map((s) => (
                    <span
                      key={s.name}
                      className={`inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        s.matched ? "bg-[#85f8c4]/40 text-[#004f35]" : "bg-[#ffdad6] text-[#93000a]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">{s.matched ? "check" : "close"}</span>
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="text-[13px] text-[#8fa5c0] py-4 text-center">Không có yêu cầu nào ở mục này.</li>}
      </ul>
    </div>
  );
}
