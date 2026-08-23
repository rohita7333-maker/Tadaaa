/**
 * `.wizbody h2` + `.wizbody .sub` from `tadaaaa/tadaaaa-editorial.html`
 * (`h2{font-size:24px;margin-bottom:6px}` · `.sub{font-size:14px;margin-bottom:26px}`).
 *
 * Every wizard step opens with this pair in the mockup, so it ships once here
 * rather than being re-declared per step.
 */
import { View } from "react-native";
import { Body, Heading } from "@/components/editorial";

export default function StepHead({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ gap: 6, marginBottom: 20 }}>
      <Heading size={24}>{title}</Heading>
      <Body size={14}>{sub}</Body>
    </View>
  );
}
