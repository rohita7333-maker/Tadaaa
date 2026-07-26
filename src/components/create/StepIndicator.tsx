import { View } from "react-native";
import { Check } from "lucide-react-native";
import { colors, fonts, radii } from "@/theme/tokens";
import { Txt } from "@/components/ui";

const STEPS = ["Occasion", "Photos", "Question", "Publish"];

/** 4-segment progress header — mirrors the web StepIndicator (circles + connecting line). */
export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        return (
          <View key={step} style={{ flex: 1, alignItems: "center", gap: 5 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radii.pill,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: isCompleted || isActive ? colors.rose : colors.lightGray,
                backgroundColor: isCompleted ? colors.rose : colors.white,
              }}
            >
              {isCompleted ? (
                <Check size={14} color="#fff" strokeWidth={3} />
              ) : (
                <Txt
                  style={{
                    fontFamily: fonts.bodyBold,
                    fontSize: 12,
                    color: isActive ? colors.rose : colors.warmGray,
                  }}
                >
                  {step}
                </Txt>
              )}
            </View>
            <Txt
              style={{
                fontFamily: isActive ? fonts.bodyBold : fonts.body,
                fontSize: 10,
                color: isActive ? colors.rose : colors.warmGray,
              }}
            >
              {label}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}
