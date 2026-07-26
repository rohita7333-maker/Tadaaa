import { Pressable, Switch, View } from "react-native";
import { HelpCircle, Plus, Trash2 } from "lucide-react-native";
import { Field, Txt, colors, fonts, radii, spacing } from "@/components/ui";

export interface DraftQuestion {
  text: string;
  yesLabel: string;
  noLabel: string;
  requireAnswer: boolean;
}

const MAX_QUESTIONS = 10;
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
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <HelpCircle size={16} color={colors.rose} />
          <Txt variant="h3">The big question</Txt>
        </View>
        <Txt variant="body" muted>
          Ask up to {MAX_QUESTIONS} YES/NO questions. Customize labels and whether an answer is required.
        </Txt>
      </View>

      <View style={{ gap: spacing.md }}>
        {questions.map((q, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.cream,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.hair,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Field
                  value={q.text}
                  onChangeText={(v) => updateQuestion(i, { text: v.slice(0, 200) })}
                  placeholder={`Question ${i + 1}…`}
                  maxLength={200}
                />
              </View>
              <Pressable
                onPress={() => removeQuestion(i)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.lightGray,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={15} color={colors.rose} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 9.5, color: colors.greenChipText, letterSpacing: 0.5 }}>
                  YES LABEL
                </Txt>
                <Field
                  value={q.yesLabel}
                  onChangeText={(v) => updateQuestion(i, { yesLabel: v.slice(0, 40) })}
                  placeholder="Yes"
                  maxLength={40}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 9.5, color: colors.roseDeep, letterSpacing: 0.5 }}>
                  NO LABEL
                </Txt>
                <Field
                  value={q.noLabel}
                  onChangeText={(v) => updateQuestion(i, { noLabel: v.slice(0, 40) })}
                  placeholder="No"
                  maxLength={40}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: colors.hair,
                paddingTop: spacing.sm,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.charcoal }}>
                  Require answer to continue
                </Txt>
                <Txt variant="body" muted style={{ fontSize: 10.5 }}>
                  If on, they can&apos;t skip
                </Txt>
              </View>
              <Switch
                value={q.requireAnswer}
                onValueChange={(v) => updateQuestion(i, { requireAnswer: v })}
                trackColor={{ true: colors.rose, false: colors.lightGray }}
                thumbColor="#fff"
              />
            </View>
          </View>
        ))}
      </View>

      {questions.length < MAX_QUESTIONS && (
        <Pressable
          onPress={addQuestion}
          style={({ pressed }) => ({
            height: 44,
            borderRadius: radii.pill,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: colors.rose,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Plus size={15} color={colors.rose} />
          <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.rose }}>
            Add Question{questions.length > 0 ? ` (${questions.length}/${MAX_QUESTIONS})` : ""}
          </Txt>
        </Pressable>
      )}
    </View>
  );
}
