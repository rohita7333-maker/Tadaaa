import { View } from "react-native";
import { Card, Txt, colors, radii, spacing } from "@/components/ui";

export interface QuestionTallyData {
  id: string;
  questionText: string;
  yesLabel: string;
  noLabel: string;
  yesCount: number;
  noCount: number;
}

/** Bar showing the yes/no split for a single invite question. */
export function QuestionTally({ q }: { q: QuestionTallyData }) {
  const total = q.yesCount + q.noCount;
  const yesPct = total > 0 ? q.yesCount / total : 0;

  return (
    <Card style={{ gap: 10 }}>
      <Txt variant="title" numberOfLines={2}>{q.questionText}</Txt>
      <View
        style={{
          height: 8,
          borderRadius: radii.pill,
          backgroundColor: colors.hair,
          overflow: "hidden",
          flexDirection: "row",
        }}
      >
        {total > 0 ? (
          <View style={{ width: `${yesPct * 100}%`, backgroundColor: colors.rose }} />
        ) : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Txt variant="body" muted style={{ fontSize: 12.5 }}>
          {q.yesLabel} · {q.yesCount}
        </Txt>
        <Txt variant="body" muted style={{ fontSize: 12.5 }}>
          {q.noLabel} · {q.noCount}
        </Txt>
      </View>
    </Card>
  );
}
