import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareerFit — Đánh giá CV & Phỏng vấn AI tiếng Việt",
  description:
    "Nền tảng đánh giá độ phù hợp CV ↔ JD và luyện phỏng vấn bằng tiếng Việt với AI. Điểm số minh bạch, giải thích chi tiết, câu hỏi được cá nhân hóa.",
  keywords: ["CV", "phỏng vấn", "AI", "CareerFit", "tuyển dụng", "tiếng Việt"],
  openGraph: {
    title: "CareerFit — AI Đánh giá CV & Luyện Phỏng vấn",
    description: "Chấm điểm CV tự động · Tư vấn cải thiện · Phỏng vấn giả lập",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="bg-[#f8f9ff] font-[family-name:var(--font-inter)] text-[#0b1c30] antialiased">
        {children}
      </body>
    </html>
  );
}
