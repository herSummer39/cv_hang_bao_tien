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
    <section className="w-full bg-white border-b border-[#e2e8f0] py-4 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {sessionId && (
          <div className="flex items-center gap-2 mb-3 text-[12px]">
            <span className="font-semibold uppercase tracking-wider text-[#64748b]">Mã phiên làm việc:</span>
            <span className="font-bold text-[#0037b0] bg-[#eff4ff] border border-[#dce1ff] px-2.5 py-0.5 rounded-lg font-mono">
              {sessionId}
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
                    ? "bg-gradient-to-r from-[#0037b0] via-[#1a56db] to-[#2563eb] text-white shadow-lg shadow-[#0037b0]/25 ring-2 ring-[#0037b0]/40 scale-[1.01]"
                    : isDone
                    ? "bg-[#ecfdf5] border-2 border-[#a7f3d0] text-[#065f46]"
                    : "bg-[#f8fafc] border border-[#e2e8f0] text-[#64748b]"
                }`}
              >
                {/* Step Circle Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-[15px] shadow-sm transition-all ${
                    isActive
                      ? "bg-white text-[#0037b0] ring-4 ring-white/30"
                      : isDone
                      ? "bg-[#10b981] text-white"
                      : "bg-white border-2 border-[#cbd5e1] text-[#64748b]"
                  }`}
                >
                  {isDone ? (
                    <span className="material-symbols-outlined text-[22px] font-bold">check</span>
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>

                {/* Step Text Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[13px] font-bold leading-tight truncate ${
                        isActive ? "text-white" : isDone ? "text-[#065f46]" : "text-[#1e293b]"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#85f8c4] animate-ping shrink-0" />
                    )}
                  </div>
                  <p
                    className={`text-[11px] leading-tight mt-1 truncate ${
                      isActive ? "text-white/85 font-medium" : isDone ? "text-[#047857]" : "text-[#64748b]"
                    }`}
                  >
                    {step.sublabel}
                  </p>
                </div>

                {/* Arrow indicator between steps */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-[#cbd5e1] shadow-xs items-center justify-center text-[#94a3b8]">
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
