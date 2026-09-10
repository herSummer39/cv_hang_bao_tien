import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-[#c4c5d7]/30 py-6">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#434655]">
        <span>© 2026 CareerFit. Nền tảng đánh giá CV & luyện phỏng vấn AI tiếng Việt.</span>
        <div className="flex items-center gap-6">
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
