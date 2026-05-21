interface StepIndicatorProps {
  currentStep: number;
}

const STEPS = ["Occasion", "Photos & Message", "Question", "Publish"];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const totalSteps = STEPS.length;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="h-1 bg-[#D4CBC3]/40 rounded-full mb-6">
        <div
          className="h-full bg-gradient-to-r from-[#C4686D] to-[#9B3D42] rounded-full transition-all duration-500"
          style={{ width: `${((currentStep) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="flex items-start justify-between">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;

          return (
            <div key={step} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? "bg-[#C4686D] text-white"
                    : isActive
                    ? "bg-[#C4686D] text-white ring-4 ring-[#C4686D]/20"
                    : "bg-[#D4CBC3]/40 text-[#6B5E57]"
                }`}
              >
                {isCompleted ? "✓" : step}
              </div>
              <span
                className={`text-[10px] hidden sm:block transition-colors whitespace-nowrap ${
                  isActive ? "text-[#C4686D] font-semibold" : "text-[#6B5E57]"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
