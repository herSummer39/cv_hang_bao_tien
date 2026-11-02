type Step = {
  number: number;
  label: string;
  sublabel: string;
  status: "done" | "active" | "pending";
};

const STEPS: Omit<Step, "status">[] = [
  {
    number: 1,
    label: "Bước 1: Tải lên & Thiết lập",
    sublabel: "Đính kèm CV + Nhập JD mục tiêu",
  },
  {
    number: 2,
    label: "Bước 2: AI Phân tích chuyên sâu",
    sublabel: "Đối soát từ khóa & Độ khớp ATS",
  },
  {
    number: 3,
    label: "Bước 3: Báo cáo & Lộ trình",
    sublabel: "Xem điểm số, lỗ hổng & Luyện phỏng vấn",
  },
];

type Props = {
  activeStep: 1 | 2 | 3;
  sessionId?: string;
};

export default function ProgressStepper({ activeStep, sessionId }: Props) {
  const steps: Step[] = STEPS.map((s) => ({
    ...s,
    status:
      s.number < activeStep
        ? ("done" as const)
        : s.number === activeStep
        ? ("active" as const)
        : ("pending" as const),
  }));

  return (
    <section className="w-full bg-white border-b border-slate-200/80 py-4 shadow-2xs">
      <div className="w-full px-4 sm:px-8 lg:px-12">
        {sessionId && (
          <div className="flex items-center gap-2 mb-3 text-[12px]">
            <span className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
              Mã phiên làm việc:
            </span>
            <span className="font-bold text-[#0037b0] bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-lg font-mono">
              #{sessionId}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {steps.map((step, idx) => {
            const isActive = step.status === "active";
            const isDone = step.status === "done";

            return (
              <div
                key={step.number}
                className={`relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-500/20 scale-[1.01]"
                    : isDone
                    ? "bg-emerald-50/70 border border-emerald-200 text-emerald-900"
                    : "bg-[#f8fafc] border border-slate-200/80 text-slate-500"
                }`}
              >
                {/* Step Circle Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-[15px] shadow-2xs transition-all ${
                    isActive
                      ? "bg-white text-[#0037b0] ring-4 ring-white/25 shadow-sm"
                      : isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-white border-2 border-slate-300 text-slate-400"
                  }`}
                >
                  {isDone ? (
                    <span className="material-symbols-outlined text-[20px] font-bold">check</span>
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>

                {/* Step Text Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[13px] font-bold leading-tight truncate ${
                        isActive
                          ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]"
                          : isDone
                          ? "text-emerald-950 font-bold"
                          : "text-slate-700"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    )}
                  </div>
                  <p
                    className={`text-[11px] leading-tight mt-1 truncate ${
                      isActive
                        ? "text-white/90 font-medium"
                        : isDone
                        ? "text-emerald-700 font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    {step.sublabel}
                  </p>
                </div>

                {/* Arrow indicator between steps */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-2xs items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
