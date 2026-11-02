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

// ─── 1. THẺ GIẢI TRÌNH ĐIỂM SỐ (SHAP · XGBOOST EXPLAINABILITY) ───────────────
export function ScoreBreakdownCard({ data }: { data: ScoreBreakdown }) {
  const [showAll, setShowAll] = useState(false);
  const maxAbs = Math.max(1, ...data.factors.map((f) => Math.abs(f.contribution)));

  return (
    <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-xs border border-slate-200/80">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#0037b0] flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">analytics</span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0037b0]">
              Mô hình giải thích điểm (SHAP · XGBoost M3)
            </span>
          </div>
          <h3 className="font-['Plus_Jakarta_Sans',-apple-system,BlinkMacSystemFont,sans-serif] text-[20px] font-bold text-[#0b1c30]">
            Vì sao hồ sơ đạt {Math.round(data.final)}/100 điểm?
          </h3>
        </div>
        <span className="text-[12px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60 self-start sm:self-auto">
          Thuật toán minh bạch · Không ước lượng
        </span>
      </div>

      <p className="text-[13px] text-slate-600 mt-3 mb-5 leading-relaxed">
        Điểm số được tính từ <strong>mức sàn tiêu chuẩn</strong> của thị trường, sau đó cộng dồn hoặc khấu trừ dựa trên đóng góp thực tế từ hồ sơ của bạn:
      </p>

      {/* Hành trình điểm số (Score Bridge Flow) */}
      <div className="bg-[#f8faff] rounded-2xl p-4 sm:p-5 border border-blue-100/70 mb-6">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          Công thức đóng góp điểm số:
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
          {/* Mức nền */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-slate-500 text-[12px]">Điểm sàn thị trường:</span>
            <span className="font-bold text-slate-800 font-mono text-[14px]">{data.base.toFixed(1)}</span>
          </div>

          {/* Các yếu tố đóng góp */}
          {data.factors.map((f) => {
            const isPos = f.contribution >= 0;
            return (
              <div
                key={f.key}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-xs ${
                  isPos
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                    : "bg-rose-50/80 border-rose-200 text-rose-800"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {isPos ? "arrow_upward" : "arrow_downward"}
                </span>
                <span className="text-[12px] font-medium">{f.label}:</span>
                <strong className="font-mono text-[13px]">{fmtSigned(f.contribution)}</strong>
              </div>
            );
          })}

          <span className="text-slate-400 font-bold text-[16px] px-1">=</span>

          {/* Điểm tổng kết */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white px-4 py-2 rounded-xl shadow-xs">
            <span className="text-[12px] font-medium text-white/90">Tổng điểm:</span>
            <span className="font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] font-extrabold text-[16px]">
              {Math.round(data.final)} điểm
            </span>
          </div>

          {data.clamped && (
            <span className="text-[11px] text-slate-400 italic block w-full mt-1">
              (Tổng giá trị thô: {data.raw.toFixed(1)}, chuẩn hóa trên thang đo 0–100)
            </span>
          )}
        </div>
      </div>

      {/* Danh sách các yếu tố tác động (Impact Drivers) */}
      <div className="space-y-3.5">
        <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
          Chi tiết mức độ tác động của từng nhóm yếu tố:
        </div>

        {data.factors.map((f) => {
          const pct = Math.min(50, (Math.abs(f.contribution) / maxAbs) * 50);
          const pos = f.contribution >= 0;

          return (
            <div
              key={f.key}
              className="bg-white rounded-xl border border-slate-200/80 p-4 hover:border-slate-300 transition-all shadow-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Thông tin nhóm yếu tố */}
                <div className="md:col-span-5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        pos ? "bg-emerald-100/60 text-emerald-700" : "bg-rose-100/60 text-rose-700"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
                    </span>
                    <span className="text-[14px] font-bold text-[#0b1c30] truncate">{f.label}</span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-1 leading-snug pl-9">{f.detail}</p>
                </div>

                {/* Thanh đo tác động 2 chiều (Diverging Gauge) */}
                <div className="md:col-span-5 px-2">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Khấu trừ (−)</span>
                    <span className="font-mono text-slate-300">0</span>
                    <span>Tích cực (+)</span>
                  </div>
                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-300 z-10 -translate-x-1/2" />
                    <div
                      className={`absolute top-0 bottom-0 rounded-full transition-all duration-700 ${
                        pos ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={
                        pos
                          ? { left: "50%", width: `${pct}%` }
                          : { right: "50%", width: `${pct}%` }
                      }
                    />
                  </div>
                </div>

                {/* Điểm cộng/trừ */}
                <div className="md:col-span-2 flex items-center justify-start md:justify-end">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold font-mono text-[13px] ${
                      pos
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {pos ? "arrow_upward" : "arrow_downward"}
                    </span>
                    {fmtSigned(f.contribution)} điểm
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle xem 11 đặc trưng đầu vào M3 */}
      <div className="mt-5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0037b0] hover:text-[#1d4ed8] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            {showAll ? "keyboard_arrow_up" : "tune"}
          </span>
          {showAll ? "Thu gọn bảng kỹ thuật" : `Xem chi tiết ${data.features.length} đặc trưng máy học của M3`}
        </button>

        {showAll && (
          <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full text-[12px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="px-4 py-2.5 font-bold text-left">Đặc trưng đầu vào (Feature)</th>
                    <th className="px-4 py-2.5 font-bold text-right">Giá trị đo được</th>
                    <th className="px-4 py-2.5 font-bold text-right">Đóng góp điểm (SHAP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.features.map((ft) => (
                    <tr key={ft.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 text-[#0b1c30] font-medium">{ft.label}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{ft.value}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-bold ${
                          ft.contribution >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {ft.contribution > 0 ? "+" : ""}
                        {ft.contribution.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. THẺ ĐỐI CHIẾU TỪNG YÊU CẦU CỦA JD (REQUIREMENT MATCH MATRIX) ────────
type Filter = "all" | "missing" | "partial" | "met";

export function RequirementMatchCard({
  items,
  summary,
}: {
  items: RequirementItem[];
  summary: RequirementSummary;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [onlyRequired, setOnlyRequired] = useState(false);

  const order = { missing: 0, partial: 1, met: 2 } as const;
  const sorted = [...items].sort(
    (a, b) =>
      (a.priority === b.priority ? 0 : a.priority === "required" ? -1 : 1) ||
      order[a.status] - order[b.status]
  );

  let filtered = filter === "all" ? sorted : sorted.filter((r) => r.status === filter);
  if (onlyRequired) {
    filtered = filtered.filter((r) => r.priority === "required");
  }

  const pct = summary.total
    ? Math.round(((summary.met + summary.partial * 0.5) / summary.total) * 100)
    : 0;

  const tabs: { key: Filter; label: string; count: number; icon: string }[] = [
    { key: "all", label: "Tất cả", count: summary.total, icon: "view_list" },
    { key: "missing", label: "Chưa có minh chứng", count: summary.missing, icon: "cancel" },
    { key: "partial", label: "Đáp ứng một phần", count: summary.partial, icon: "change_circle" },
    { key: "met", label: "Đã đáp ứng tốt", count: summary.met, icon: "check_circle" },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-xs border border-slate-200/80">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#0037b0] flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0037b0]">
              Ma trận đối soát năng lực
            </span>
          </div>
          <h3 className="font-['Plus_Jakarta_Sans',-apple-system,BlinkMacSystemFont,sans-serif] text-[20px] font-bold text-[#0b1c30]">
            Đối chiếu chi tiết từng yêu cầu của JD
          </h3>
        </div>
        <span className="text-[12px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60 self-start sm:self-auto">
          Mô hình M2 trích xuất bằng chứng ngữ nghĩa từ CV
        </span>
      </div>

      <p className="text-[13px] text-slate-600 mt-3 mb-6 leading-relaxed">
        Từng tiêu chí trong JD được so khớp trực tiếp với toàn bộ hồ sơ của bạn kèm đoạn trích dẫn thực tế, giúp bạn nhận diện chính xác điểm cần bổ sung trước khi phỏng vấn:
      </p>

      {/* 4 Thẻ KPI Tóm tắt Hiện đại */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* Metric 1 */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/30 border border-blue-100 p-4">
          <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[15px] text-[#0037b0]">percent</span>
            Mức đáp ứng JD
          </div>
          <div className="font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[26px] font-extrabold text-[#0037b0] leading-none my-1">
            {pct}%
          </div>
          <div className="w-full bg-blue-200/50 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-[#0037b0] h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[15px] text-slate-700">priority_high</span>
            Yêu cầu bắt buộc
          </div>
          <div className="font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[26px] font-extrabold text-slate-900 leading-none my-1">
            {summary.required_met}
            <span className="text-[15px] font-semibold text-slate-400">/{summary.required_total}</span>
          </div>
          <div className="text-[12px] text-slate-500 mt-1">tiêu chí có bằng chứng rõ</div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-4">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
            Đạt chuẩn / Một phần
          </div>
          <div className="font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[26px] font-extrabold text-emerald-700 leading-none my-1">
            {summary.met}
            <span className="text-[15px] font-semibold text-emerald-500"> / {summary.partial}</span>
          </div>
          <div className="text-[12px] text-emerald-600 mt-1">trên {summary.total} yêu cầu</div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl bg-rose-50/70 border border-rose-100 p-4">
          <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1 mb-1">
            <span className="material-symbols-outlined text-[15px] text-rose-600">cancel</span>
            Chưa có minh chứng
          </div>
          <div className="font-['Inter',-apple-system,BlinkMacSystemFont,sans-serif] text-[26px] font-extrabold text-rose-700 leading-none my-1">
            {summary.missing}
          </div>
          <div className="text-[12px] text-rose-600 mt-1">cần bổ sung hoặc làm rõ</div>
        </div>
      </div>

      {/* Segmented Filter Control & Checkbox */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 p-2 bg-slate-50/80 rounded-2xl border border-slate-200/60">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
                  active
                    ? "bg-white text-[#0037b0] shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
                <span>{t.label}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[11px] ${
                    active ? "bg-blue-100 text-[#0037b0]" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lọc chỉ bắt buộc */}
        <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700 cursor-pointer px-2 select-none">
          <input
            type="checkbox"
            checked={onlyRequired}
            onChange={(e) => setOnlyRequired(e.target.checked)}
            className="w-4 h-4 rounded text-[#0037b0] focus:ring-blue-500 border-slate-300"
          />
          <span>Chỉ xem yêu cầu bắt buộc</span>
        </label>
      </div>

      {/* Danh sách yêu cầu đã được thiết kế lại gọn gàng */}
      <ul className="space-y-3.5">
        {filtered.map((r, i) => {
          const isMet = r.status === "met";
          const isPartial = r.status === "partial";
          const isMissing = r.status === "missing";
          const matchPercent = Math.round(r.match * 100);

          return (
            <li
              key={`${r.text}-${i}`}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all"
            >
              {/* Top row: Trạng thái đối soát + Phân loại */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Pill */}
                  {isMet && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Đã đáp ứng ({matchPercent}% khớp)
                    </span>
                  )}
                  {isPartial && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      <span className="material-symbols-outlined text-[13px]">change_circle</span>
                      Đáp ứng một phần ({matchPercent}% khớp)
                    </span>
                  )}
                  {isMissing && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      <span className="material-symbols-outlined text-[13px]">cancel</span>
                      Chưa có minh chứng
                    </span>
                  )}

                  {/* Priority Tag */}
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      r.priority === "required"
                        ? "bg-blue-50 text-[#0037b0] border border-blue-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {r.priority === "required" ? "Bắt buộc" : "Ưu tiên / Lợi thế"}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400 font-medium">
                  {r.section === "responsibility" ? "Nhiệm vụ công việc" : "Tiêu chí ứng viên"}
                </span>
              </div>

              {/* Tiêu đề yêu cầu của JD */}
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#0b1c30] leading-snug">
                {r.text}
              </h4>

              {/* Minh chứng trích xuất từ CV */}
              {r.evidence ? (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0037b0] shrink-0 mt-0.5">
                    format_quote
                  </span>
                  <div className="min-w-0 text-[13px] leading-relaxed text-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Minh chứng đối chiếu trong CV:
                    </span>
                    “{r.evidence}”
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3 rounded-xl bg-rose-50/50 border border-rose-100 flex items-start gap-2.5 text-[13px] text-rose-800">
                  <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">
                    info
                  </span>
                  <div className="min-w-0 leading-relaxed">
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-0.5">
                      Chưa tìm thấy minh chứng tương thích:
                    </span>
                    <span>Không tìm thấy câu nào trong CV thể hiện rõ tiêu chí này.</span>
                    {r.closest && (
                      <span className="block text-slate-600 mt-1 italic text-[12px] bg-white/70 p-2 rounded-lg border border-rose-100">
                        Đoạn gần nhất: “{r.closest}”
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Danh sách Kỹ năng bóc tách */}
              {r.skills.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">sell</span>
                    Kỹ năng liên quan:
                  </span>
                  {r.skills.map((s) => (
                    <span
                      key={s.name}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg ${
                        s.matched
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {s.matched ? "check" : "close"}
                      </span>
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}

        {filtered.length === 0 && (
          <li className="text-[13px] text-slate-400 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Không có tiêu chí nào phù hợp với bộ lọc hiện tại.
          </li>
        )}
      </ul>
    </div>
  );
}
