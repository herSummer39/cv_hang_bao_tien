import React from "react";

interface CareerFitLogoProps {
  /** Kích thước: sm (navbar ~36px), md (~42px), lg (~50px), xl (~64px) */
  size?: "sm" | "md" | "lg" | "xl";
  /** Có hiển thị chữ CareerFit nhiều màu không */
  showText?: boolean;
  /** Lớp CSS bổ sung cho container */
  className?: string;
}

export default function CareerFitLogo({
  size = "md",
  showText = true,
  className = "",
}: CareerFitLogoProps) {
  // Cấu hình kích thước icon và font chữ
  const config = {
    sm: { box: 36, font: "text-[21px]", gap: "gap-2.5", radius: "rounded-[11px]" },
    md: { box: 42, font: "text-[24px]", gap: "gap-3", radius: "rounded-[13px]" },
    lg: { box: 50, font: "text-[28px]", gap: "gap-3.5", radius: "rounded-[15px]" },
    xl: { box: 64, font: "text-[38px]", gap: "gap-4", radius: "rounded-[19px]" },
  }[size];

  return (
    <div className={`inline-flex items-center ${config.gap} select-none group ${className}`}>
      {/* Icon Squircle với Gradient rực rỡ & Bóng đa tầng nổi bật */}
      <div
        style={{
          width: config.box,
          height: config.box,
        }}
        className={`relative shrink-0 ${config.radius} transition-all duration-300 group-hover:scale-105 cursor-pointer`}
      >
        {/* Lớp bóng màu phát sáng (Ambient Glow Shadow) */}
        <div
          className={`absolute -inset-0.5 ${config.radius} opacity-70 blur-[8px] -z-10 transition-all duration-300 group-hover:opacity-100 group-hover:blur-[11px]`}
          style={{
            background:
              "linear-gradient(135deg, rgba(79,70,229,0.7) 0%, rgba(192,38,211,0.8) 45%, rgba(244,63,94,0.8) 75%, rgba(251,146,60,0.8) 100%)",
          }}
        />

        {/* Khung Icon chính với viền sáng 3D & bóng đổ mềm */}
        <div
          className={`w-full h-full ${config.radius} overflow-hidden flex items-center justify-center border border-white/30 transition-all duration-300 shadow-[0_6px_16px_rgba(192,38,211,0.35),0_2px_6px_rgba(59,40,204,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.45)] group-hover:shadow-[0_10px_24px_rgba(244,63,94,0.45),0_4px_10px_rgba(79,70,229,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.6)]`}
          style={{
            background:
              "linear-gradient(135deg, #4338ca 0%, #7e22ce 28%, #c026d3 55%, #f43f5e 80%, #ff7828 100%)",
          }}
        >
          {/* SVG Artwork: Tờ CV có avatar + Dấu tích Checkmark dạng rỗng như ảnh mẫu */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Tờ tài liệu CV viền trắng */}
            <path
              d="M25 22C25 17.58 28.58 14 33 14H57L73 30V74C73 78.42 69.42 82 65 82H33C28.58 82 25 78.42 25 74V22Z"
              stroke="#ffffff"
              strokeWidth="5.5"
              strokeLinejoin="round"
            />
            {/* Góc gấp tài liệu (Dog ear) */}
            <path
              d="M57 14V27C57 28.66 58.34 30 60 30H73"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Đầu avatar ứng viên (tròn đặc trắng) */}
            <circle cx="43" cy="33.5" r="5.5" fill="#ffffff" />
            {/* Thân/vai avatar ứng viên (tròn đặc trắng) */}
            <path
              d="M34 50.5C34 44.5 52 44.5 52 50.5Z"
              fill="#ffffff"
            />

            {/* Dấu tích ✓ viền trắng rỗng, nổi bật đè lên góc dưới CV như ảnh tham khảo */}
            <path
              d="M16 57L37 78L84 31L76 23L37 62L24 49Z"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="rgba(255,255,255,0.05)"
              className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.4)]"
            />
          </svg>
        </div>
      </div>

      {/* Tên thương hiệu CareerFit với từng ký tự mang màu sắc rực rỡ & bóng chữ nổi bật */}
      {showText && (
        <span
          className={`font-[family-name:var(--font-plus-jakarta)] font-extrabold tracking-tight ${config.font} flex items-center leading-none transition-transform duration-200`}
        >
          <span style={{ color: "#00a2bb", textShadow: "0 2px 4px rgba(0,162,187,0.25)" }}>C</span>
          <span style={{ color: "#ff6a00", textShadow: "0 2px 4px rgba(255,106,0,0.25)" }}>a</span>
          <span style={{ color: "#5d359b", textShadow: "0 2px 4px rgba(93,53,155,0.25)" }}>r</span>
          <span style={{ color: "#2ea44f", textShadow: "0 2px 4px rgba(46,164,79,0.25)" }}>e</span>
          <span style={{ color: "#ffb300", textShadow: "0 2px 4px rgba(255,179,0,0.25)" }}>e</span>
          <span style={{ color: "#db1a6e", textShadow: "0 2px 4px rgba(219,26,110,0.25)" }}>r</span>
          <span style={{ color: "#b51a82", textShadow: "0 2px 4px rgba(181,26,130,0.25)" }}>F</span>
          <span style={{ color: "#009fe3", textShadow: "0 2px 4px rgba(0,159,227,0.25)" }}>i</span>
          <span style={{ color: "#ef3340", textShadow: "0 2px 4px rgba(239,51,64,0.25)" }}>t</span>
        </span>
      )}
    </div>
  );
}
