import Header from "@/components/Header";

export default function DashboardLoading() {
  return (
    <div className="bg-[#f8f9fc] min-h-screen flex flex-col selection:bg-[#c026d3]/20 selection:text-[#0037b0]">
      <Header />

      <main className="flex-1 pt-16">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6 animate-pulse">
          {/* Top Indicator bar */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0037b0] animate-spin text-[20px]">
                progress_activity
              </span>
              <span className="text-[13px] font-bold text-[#0037b0]">
                Đang nạp dữ liệu Bảng điều khiển cá nhân...
              </span>
            </div>
            <div className="h-4 w-28 bg-slate-200 rounded-md"></div>
          </div>

          {/* 1. Hero Banner Skeleton */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700/80 via-blue-600/80 to-purple-700/80 p-6 sm:p-8 shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20"></div>
                <div className="space-y-2">
                  <div className="h-3.5 w-32 bg-white/30 rounded"></div>
                  <div className="h-7 w-64 bg-white/40 rounded"></div>
                  <div className="h-3 w-48 bg-white/25 rounded"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-36 bg-white/30 rounded-xl"></div>
                <div className="h-10 w-32 bg-white/20 rounded-xl"></div>
              </div>
            </div>
          </section>

          {/* 2. 4 Thẻ KPI Skeleton */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100"></div>
                  <div className="h-4 w-12 bg-slate-100 rounded"></div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-28 bg-slate-200 rounded"></div>
                  <div className="h-7 w-20 bg-slate-200 rounded"></div>
                </div>
                <div className="h-3 w-36 bg-slate-100 rounded pt-1"></div>
              </div>
            ))}
          </section>

          {/* 3. Grid 2 cột Skeleton */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="h-5 w-48 bg-slate-200 rounded"></div>
                <div className="h-4 w-24 bg-slate-100 rounded"></div>
              </div>
              <div className="h-56 bg-slate-50 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-300 text-[40px]">
                  insights
                </span>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-12 bg-slate-50 rounded-xl"></div>
                ))}
              </div>
            </div>

            {/* Cột phải */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
              <div className="h-5 w-36 bg-slate-200 rounded pb-3 border-b border-slate-100"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} className="p-3.5 rounded-xl bg-slate-50 space-y-2">
                    <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                    <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

