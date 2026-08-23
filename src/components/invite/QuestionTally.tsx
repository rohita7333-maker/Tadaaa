/**
 * Yes/no split for one invite question — the mockup's `.hbar` treatment
 * (`tadaaaa-editorial.html` analytics panel): a mist track with a coral fill
 * and the two counts on a 12px stone line underneath.
 */
import { View } from "react-native";
import { EdMeta, EdPanel, palette, radii } from "@/components/editorial";
import { Txt } from "@/components/ui";

export interface QuestionTallyData {
  id: string;
  questionText: string;
  yesLabel: string;
  noLabel: string;
  yesCount: number;
  noCount: number;
}

const BAR_HEIGHT = 8;

export function QuestionTally({ q }: { q: QuestionTallyData }) {
  const total = q.yesCount + q.noCount;
  const yesPct = total > 0 ? q.yesCount / total : 0;

  return (
    <EdPanel style={{ gap: 10 }}>
      <Txt variant="title" numberOfLines={2}>
        {q.questionText}
      </Txt>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${q.yesLabel} ${q.yesCount}, ${q.noLabel} ${q.noCount}`}
        style={{
          height: BAR_HEIGHT,
          borderRadius: radii.pill,
          backgroundColor: palette.mist,
          overflow: "hidden",
          flexDirection: "row",
        }}
      >
        {total > 0 ? (
          <View style={{ width: `${yesPct * 100}%`, backgroundColor: palette.coral }} />
        ) : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <EdMeta>
          {q.yesLabel} · {q.yesCount}
        </EdMeta>
        <EdMeta>
          {q.noLabel} · {q.noCount}
        </EdMeta>
      </View>
    </EdPanel>
  );
}
