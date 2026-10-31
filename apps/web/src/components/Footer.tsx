import Link from "next/link";
import CareerFitLogo from "@/components/CareerFitLogo";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-[#c4c5d7]/30 py-6">
      <div className="w-full px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#434655]">
        <div className="flex items-center gap-2.5">
          <CareerFitLogo size="sm" showText={false} />
          <span>© 2026 CareerFit. Nền tảng đánh giá CV &amp; luyện phỏng vấn AI tiếng Việt.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/about" className="hover:text-[#0037b0] transition-colors font-medium text-[#0b1c30]">
            Về nhóm
          </Link>
          <Link href="#" className="hover:text-[#0037b0] transition-colors">
            Quy chế bảo mật
          </Link>
          <Link href="#" className="hover:text-[#0037b0] transition-colors">
            Tiêu chuẩn đánh giá
          </Link>
          <Link href="#" className="hover:text-[#0037b0] transition-colors">
            Hỗ trợ kỹ thuật
          </Link>
        </div>
      </div>
    </footer>
  );
}
