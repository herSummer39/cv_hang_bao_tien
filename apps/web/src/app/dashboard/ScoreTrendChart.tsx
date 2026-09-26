"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type TrendPoint = {
  id: string;
  score: number;
  date: string;     // dd/mm/yyyy
  shortDate: string; // dd/mm
  title: string;    // vị trí ứng tuyển
  cv: string;       // tên file CV
};

const W = 640, H = 220, L = 34, R = 16, T = 18, B = 30;

function band(score: number) {
  if (score >= 70) return { label: "Phù hợp cao", cls: "bg-[#85f8c4]/40 text-[#004f35]", icon: "verified" };
  if (score >= 50) return { label: "Khá phù hợp", cls: "bg-[#ffe8b8] text-[#5c3b00]", icon: "trending_up" };
  return { label: "Cần cải thiện", cls: "bg-[#ffdad6] text-[#93000a]", icon: "priority_high" };
}

// Biểu đồ diễn biến điểm — rê chuột (hoặc Tab bàn phím) vào 1 lần phân tích
// để xem chi tiết; bấm vào để mở trang kết quả của lần đó.
export default function ScoreTrendChart({ points }: { points: TrendPoint[] }) {
  const router = useRouter();
  const [active, setActive] = useState<number | null>(null);
  const n = points.length;
  const x = (i: number) => (n === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (s: number) => T + (1 - s / 100) * (H - T - B);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const last = points[n - 1];
  // Vùng bắt chuột: dải dọc quanh mỗi điểm (dễ trúng hơn nhiều so với chấm 8px)
  const step = n > 1 ? (W - L - R) / (n - 1) : W - L - R;

  const p = active != null ? points[active] : null;
  const leftPct = active != null ? (x(active) / W) * 100 : 0;
  const topPct = p ? (y(p.score) / H) * 100 : 0;
  const align = leftPct < 20 ? "left" : leftPct > 80 ? "right" : "center";
  const prev = active != null && active > 0 ? points[active - 1] : null;
  const diff = p && prev ? Math.round(p.score - prev.score) : null;

  return (
    <div className="relative" onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label="Diễn biến điểm phù hợp qua các lần phân tích">
        {[0, 50, 70, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e5eeff" strokeWidth={1}
              strokeDasharray={g === 50 || g === 70 ? "4 4" : undefined} />
            <text x={L - 8} y={y(g) + 4} textAnchor="end" fill="#8fa5c0" fontSize={11}>{g}</text>
          </g>
        ))}
        <text x={W - R} y={y(70) - 6} textAnchor="end" fill="#8fa5c0" fontSize={10}>Ngưỡng phù hợp cao</text>

        <path d={area} fill="#0037b0" opacity={0.06} />
        <path d={line} fill="none" stroke="#0037b0" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {active != null && (
          <line x1={x(active)} x2={x(active)} y1={T} y2={y(0)} stroke="#0037b0" strokeOpacity={0.25} strokeWidth={1} />
        )}

        {points.map((pt, i) => (
          <circle
            key={pt.id}
            cx={x(i)} cy={y(pt.score)}
            r={active === i ? 6 : 4}
            fill="#0037b0" stroke="#ffffff" strokeWidth={2}
            style={{ transition: "r 120ms" }}
          />
        ))}

        {active == null && (
          <text x={x(n - 1)} y={y(last.score) - 12} textAnchor={n === 1 ? "middle" : "end"} fontSize={12} fontWeight={700} fill="#0b1c30">
            {Math.round(last.score)}
          </text>
        )}

        <text x={x(0)} y={H - 8} textAnchor={n === 1 ? "middle" : "start"} fontSize={11} fill="#8fa5c0">{points[0].shortDate}</text>
        {n > 1 && <text x={x(n - 1)} y={H - 8} textAnchor="end" fontSize={11} fill="#8fa5c0">{last.shortDate}</text>}

        {/* Lớp bắt chuột/bàn phím trong suốt, đặt trên cùng */}
        {points.map((pt, i) => (
          <rect
            key={`hit-${pt.id}`}
            x={Math.max(L - 10, x(i) - step / 2)}
            y={0}
            width={Math.min(step, W)}
            height={H - B + 6}
            fill="transparent"
            className="cursor-pointer outline-none"
            tabIndex={0}
            aria-label={`${pt.date}: ${pt.title}, ${Math.round(pt.score)} điểm`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onClick={() => router.push(`/score/result?id=${pt.id}`)}
            onKeyDown={(e) => { if (e.key === "Enter") router.push(`/score/result?id=${pt.id}`); }}
          />
        ))}
      </svg>

      {p && (
        <div
          className="pointer-events-none absolute z-10 w-60 rounded-xl border border-[#e5eeff] bg-white shadow-[0_8px_24px_rgba(11,28,48,0.12)] px-3.5 py-3"
          style={{
            left: `${leftPct}%`,
            top: `${topPct}%`,
            // Điểm nằm cao (gần mép trên) thì hiện tooltip BÊN DƯỚI để không bị che
            transform: `translate(${align === "left" ? "-8%" : align === "right" ? "-92%" : "-50%"}, ${topPct < 45 ? "14px" : "calc(-100% - 14px)"})`,
          }}
        >
          <div className="text-[11px] text-[#8fa5c0] mb-1">{p.date}</div>
          <div className="text-[13px] font-semibold text-[#0b1c30] leading-snug line-clamp-2">{p.title}</div>
          <div className="text-[11px] text-[#565e74] truncate mb-2">{p.cv}</div>
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-plus-jakarta)] text-[22px] font-bold text-[#0b1c30] leading-none">
              {Math.round(p.score)}
              <span className="text-[12px] text-[#8fa5c0] font-medium">/100</span>
            </span>
            <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold px-2 py-0.5 rounded-full ${band(p.score).cls}`}>
              <span className="material-symbols-outlined text-[13px]">{band(p.score).icon}</span>
              {band(p.score).label}
            </span>
          </div>
          {diff != null && diff !== 0 && (
            <div className={`mt-1.5 text-[11px] font-medium ${diff > 0 ? "text-[#004f35]" : "text-[#93000a]"}`}>
              {diff > 0 ? "▲ +" : "▼ −"}{Math.abs(diff)} điểm so với lần trước
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-[#f0f4ff] text-[11px] text-[#0037b0] font-medium">Bấm để xem chi tiết kết quả</div>
        </div>
      )}
    </div>
  );
}
