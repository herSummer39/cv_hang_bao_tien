import React from "react";

interface CareerFitLogoProps {
  /** Kích thước: sm (navbar ~35px), md (~40px), lg (~48px), xl (~60px) */
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
  // Cấu hình kích thước chuẩn, gọn gàng, vừa mắt
  const config = {
    sm: { box: 34, font: "text-[20px]", gap: "gap-2.5", radius: "rounded-[10px]" },
    md: { box: 40, font: "text-[23px]", gap: "gap-2.5", radius: "rounded-[12px]" },
    lg: { box: 48, font: "text-[27px]", gap: "gap-3", radius: "rounded-[14px]" },
    xl: { box: 60, font: "text-[34px]", gap: "gap-3.5", radius: "rounded-[16px]" },
  }[size];

  return (
    <div className={`inline-flex items-center ${config.gap} select-none group ${className}`}>
      {/* Icon Squircle sắc nét, chuyển màu hoàng hôn mượt mà, bóng đổ tự nhiên nhẹ dịu mắt */}
      <div
        style={{
          width: config.box,
          height: config.box,
        }}
        className={`relative shrink-0 ${config.radius} transition-all duration-200 group-hover:scale-105 cursor-pointer shadow-[0_3px_10px_rgba(15,23,42,0.12),0_1px_3px_rgba(15,23,42,0.06)] group-hover:shadow-[0_6px_16px_rgba(15,23,42,0.16)]`}
      >
        {/* Khung Icon chính: Gradient mềm mại từ Xanh tím sang Hồng cam */}
        <div
          className={`w-full h-full ${config.radius} overflow-hidden flex items-center justify-center`}
          style={{
            background:
              "linear-gradient(135deg, #3724c9 0%, #7d1fa8 38%, #df2365 72%, #ff791b 100%)",
          }}
        >
          {/* SVG Artwork: Tờ CV + Avatar + Dấu tích chuẩn xác, nét mảnh thanh thoát */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full p-[1px]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Tờ tài liệu CV viền trắng sắc nét */}
            <path
              d="M26 23C26 18.58 29.58 15 34 15H56L72 31V71C72 75.42 68.42 79 64 79H34C29.58 79 26 75.42 26 71V23Z"
              stroke="#ffffff"
              strokeWidth="4.8"
              strokeLinejoin="round"
            />
            {/* Góc gấp tài liệu (Dog ear) */}
            <path
              d="M56 15V27C56 29.21 57.79 31 60 31H72"
              stroke="#ffffff"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Đầu avatar nhân sự (tròn đặc trắng) */}
            <circle cx="43" cy="33.5" r="5" fill="#ffffff" />
            {/* Vai avatar nhân sự */}
            <path
              d="M34 50C34 44 52 44 52 50"
              stroke="#ffffff"
              strokeWidth="4.2"
              strokeLinecap="round"
            />

            {/* Dấu tích ✓ viền rỗng thanh mảnh, cân đối theo đúng ảnh tham khảo */}
            <path
              d="M17 58L36 77L83 30L75 22L36 61L25 50Z"
              stroke="#ffffff"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      </div>

      {/* Tên thương hiệu CareerFit: Từng chữ mang màu tươi tắn, đường nét sắc sảo, không bị chói nhòe */}
      {showText && (
        <span
          className={`font-[family-name:var(--font-plus-jakarta)] font-extrabold tracking-tight ${config.font} flex items-center leading-none transition-transform duration-200`}
        >
          <span style={{ color: "#00a2bb" }}>C</span>
          <span style={{ color: "#ff6a00" }}>a</span>
          <span style={{ color: "#5d359b" }}>r</span>
          <span style={{ color: "#2ea44f" }}>e</span>
          <span style={{ color: "#ffb300" }}>e</span>
          <span style={{ color: "#db1a6e" }}>r</span>
          <span style={{ color: "#b51a82" }}>F</span>
          <span style={{ color: "#009fe3" }}>i</span>
          <span style={{ color: "#ef3340" }}>t</span>
        </span>
      )}
    </div>
  );
}
