type Step = {
  number: number;
  label: string;
  sublabel: string;
  status: "done" | "active" | "pending";
};

const STEPS: Step[] = [
  {
    number: 1,
    label: "Bước 1: Tải lên & Thiết lập",
    sublabel: "CV + Mô tả công việc",
    status: "active",
  },
  {
    number: 2,
    label: "Bước 2: Hệ thống phân tích",
    sublabel: "Tự động chuẩn hóa & đối soát",
    status: "pending",
  },
  {
    number: 3,
    label: "Bước 3: Báo cáo đối soát",
    sublabel: "Chỉ số phù hợp & khuyến nghị",
    status: "pending",
  },
];

type Props = {
  activeStep: 1 | 2 | 3;
  sessionId?: string;
};

export default function ProgressStepper({ activeStep, sessionId }: Props) {
  const steps = STEPS.map((s) => ({
    ...s,
    status:
      s.number < activeStep
        ? ("done" as const)
        : s.number === activeStep
        ? ("active" as const)
        : ("pending" as const),
  }));

  return (
    <section className="w-full bg-white shadow-sm py-3">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {sessionId && (
          <div className="flex items-center gap-2 mb-2 text-[11px]">
            <span className="uppercase tracking-wider text-[#565e74]">Mã phiên:</span>
            <span className="font-semibold text-[#0037b0] bg-[#dce1ff]/50 px-2 py-0.5 rounded-full">
              {sessionId}
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                step.status === "active"
                  ? "bg-[#eff4ff]"
                  : step.status === "done"
                  ? "bg-[#eff4ff]"
                  : "opacity-60"
              }`}
            >
              {/* Step indicator */}
              {step.status === "done" ? (
                <div className="w-7 h-7 rounded-full bg-[#004f35] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] leading-none">
                    check
                  </span>
                </div>
              ) : step.status === "active" ? (
                <div className="w-7 h-7 rounded-full bg-[#1d4ed8] text-white flex items-center justify-center shrink-0 shadow-sm relative">
                  <span className="text-[13px] font-semibold">{step.number}</span>
                  <span className="absolute inset-0 rounded-full bg-[#1d4ed8] animate-ping opacity-30" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#e5eeff] text-[#565e74] flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-semibold">{step.number}</span>
                </div>
              )}

              <div className="min-w-0 flex flex-col">
                <span
                  className={`text-[13px] font-semibold truncate ${
                    step.status === "active"
                      ? "text-[#0037b0]"
                      : step.status === "done"
                      ? "text-[#004f35]"
                      : "text-[#0b1c30]"
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[11px] text-[#565e74] truncate">
                  {step.sublabel}
                </span>
              </div>

              {step.status === "active" && (
                <div className="ml-auto w-2 h-2 rounded-full bg-[#0037b0] animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
