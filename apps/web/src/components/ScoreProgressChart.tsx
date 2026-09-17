"use client";

import { useMemo } from "react";

interface ScoreProgressChartProps {
  data: {
    date: string; // e.g., "01/09", "05/09", "12/09"
    score: number; // 0-100
  }[];
}

export default function ScoreProgressChart({ data }: ScoreProgressChartProps) {
  // Config
  const width = 600;
  const height = 240;
  const paddingX = 40;
  const paddingY = 40;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  // Process data if empty or single point
  const displayData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ date: "-", score: 0 }];
    }
    if (data.length === 1) {
      return [{ date: "", score: 0 }, data[0], { date: "", score: 0 }];
    }
    return data;
  }, [data]);

  // Calculations
  const maxValue = 100;
  const numPoints = displayData.length;
  const stepX = numPoints > 1 ? graphWidth / (numPoints - 1) : 0;

  const points = displayData.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = paddingY + graphHeight - (d.score / maxValue) * graphHeight;
    return { x, y, score: d.score, date: d.date };
  });

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth curve
      const cp1X = points[i - 1].x + stepX / 2;
      const cp1Y = points[i - 1].y;
      const cp2X = points[i].x - stepX / 2;
      const cp2Y = points[i].y;
      d += ` C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${points[i].x},${points[i].y}`;
    }
    return d;
  }, [points, stepX]);

  const fillPathD = useMemo(() => {
    if (points.length === 0) return "";
    return `${pathD} L ${points[points.length - 1].x},${paddingY + graphHeight} L ${points[0].x},${paddingY + graphHeight} Z`;
  }, [pathD, points, paddingY, graphHeight]);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <div className="min-w-[500px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0037b0" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0037b0" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid Lines (Y-axis) */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = paddingY + graphHeight - (val / maxValue) * graphHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#e5eeff"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#8fa5c0"
                  fontSize="12"
                  fontFamily="sans-serif"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          <path d={fillPathD} fill="url(#chartGradient)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#0037b0"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & X-axis labels */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#ffffff"
                stroke="#0037b0"
                strokeWidth="2"
                className="hover:r-[7px] transition-all cursor-pointer"
              />
              
              {/* Score Label (only show for real data, not empty filler) */}
              {p.date && (
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  fill="#0b1c30"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {p.score}
                </text>
              )}

              {/* X-axis label */}
              {p.date && (
                <text
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  fill="#565e74"
                  fontSize="12"
                  fontFamily="sans-serif"
                >
                  {p.date}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
