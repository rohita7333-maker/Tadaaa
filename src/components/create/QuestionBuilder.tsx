/**
 * `w3` in `tadaaaa/tadaaaa-editorial.html` — "The question & the crowd". The
 * mockup asks one question; the shipped wizard supports up to ten, so each one
 * is a hairline-boxed `.field` group with a `.tglrow` beneath it.
 */
import { Pressable, Text, View } from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import {
  EdField,
  EdHairline,
  EdSetRow,
  EdSwitch,
  TOUCH_MIN,
  derived,
  fonts,
  palette,
  radii,
} from "@/components/editorial";
import { spacing } from "@/components/ui";
import StepHead from "@/components/create/StepHead";

export interface DraftQuestion {
  text: string;
  yesLabel: string;
  noLabel: string;
  requireAnswer: boolean;
}

/** Web caps at 3 (`surprise-invite/src/components/create/QuestionBuilder.tsx`).
 * Mobile advertised 10, which the product does not deliver. */
const MAX_QUESTIONS = 3;
const EMPTY_QUESTION: DraftQuestion = { text: "", yesLabel: "Yes", noLabel: "No", requireAnswer: false };

interface Props {
  questions: DraftQuestion[];
  onQuestionsChange: (q: DraftQuestion[]) => void;
}

export default function QuestionBuilder({ questions, onQuestionsChange }: Props) {
  function addQuestion() {
    if (questions.length >= MAX_QUESTIONS) return;
    onQuestionsChange([...questions, { ...EMPTY_QUESTION }]);
  }
  function removeQuestion(index: number) {
    onQuestionsChange(questions.filter((_, i) => i !== index));
  }
  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    onQuestionsChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <StepHead
        title="The question"
        sub="Ask them something. Give the No somewhere to run."
      />

      {questions.map((q, i) => (
        <View
          key={i}
          style={{
            backgroundColor: palette.paper,
            borderWidth: 1,
            borderColor: palette.mist,
            borderRadius: radii.md,
            padding: 16,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <EdField
                label={`Question ${i + 1}`}
                value={q.text}
                onChangeText={(v) => updateQuestion(i, { text: v.slice(0, 200) })}
                placeholder="Save me a seat?"
                maxLength={200}
              />
            </View>
            <Pressable
              onPress={() => removeQuestion(i)}
              accessibilityRole="button"
              accessibilityLabel={`Remove question ${i + 1}`}
              style={({ pressed }) => ({
                width: TOUCH_MIN,
                height: TOUCH_MIN,
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: pressed ? derived.coralDeep : palette.mist,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Trash2 size={15} color={derived.coralDeep} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <EdField
                label="Yes label"
                value={q.yesLabel}
                onChangeText={(v) => updateQuestion(i, { yesLabel: v.slice(0, 40) })}
                placeholder="Yes"
                maxLength={40}
              />
            </View>
            <View style={{ flex: 1 }}>
              <EdField
                label="No label"
                value={q.noLabel}
                onChangeText={(v) => updateQuestion(i, { noLabel: v.slice(0, 40) })}
                placeholder="No"
                maxLength={40}
              />
            </View>
          </View>

          <EdHairline />
          <EdSetRow
            title="Require an answer"
            sub="They can't skip past it. Good for RSVPs."
            last
            right={
              <EdSwitch
                value={q.requireAnswer}
                onValueChange={(v) => updateQuestion(i, { requireAnswer: v })}
                accessibilityLabel={`Require an answer to question ${i + 1}`}
              />
            }
          />
        </View>
      ))}

      {questions.length < MAX_QUESTIONS ? (
        <Pressable
          onPress={addQuestion}
          accessibilityRole="button"
          accessibilityLabel="Add a question"
          style={({ pressed }) => ({
            minHeight: TOUCH_MIN,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: radii.md,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: pressed ? palette.coral : palette.mist,
            backgroundColor: palette.paper,
          })}
        >
          <Plus size={15} color={palette.ink} />
          <Text style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: "600", color: palette.ink }}>
            Add question{questions.length > 0 ? `  ${questions.length}/${MAX_QUESTIONS}` : ""}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
