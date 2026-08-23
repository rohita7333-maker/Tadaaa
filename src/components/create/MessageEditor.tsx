/**
 * `w2` in `tadaaaa/tadaaaa-editorial.html` — the `.field` pair plus the `.cc`
 * character counter under the textarea.
 */
import { View } from "react-native";
import { EdCounter, EdField } from "@/components/editorial";
import { spacing } from "@/components/ui";
import { MAX_MESSAGE_LENGTH, MAX_TITLE_LENGTH } from "@/lib/constants";

interface Props {
  title: string;
  message: string;
  onTitleChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  titleError?: string;
  messageError?: string;
}

export default function MessageEditor({
  title,
  message,
  onTitleChange,
  onMessageChange,
  titleError,
  messageError,
}: Props) {
  return (
    <View style={{ gap: spacing.lg }}>
      <View>
        <EdField
          label="Who's it for?"
          value={title}
          onChangeText={(v) => onTitleChange(v.slice(0, MAX_TITLE_LENGTH))}
          placeholder="Maya turns thirty"
          error={titleError}
        />
        <EdCounter used={title.length} max={MAX_TITLE_LENGTH} />
      </View>

      <View>
        <EdField
          label="What do you want to say?"
          value={message}
          onChangeText={(v) => onMessageChange(v.slice(0, MAX_MESSAGE_LENGTH))}
          placeholder="The thing you've been meaning to say."
          multiline
          numberOfLines={5}
          style={{ minHeight: 120, textAlignVertical: "top" }}
          error={messageError}
        />
        <EdCounter used={message.length} max={MAX_MESSAGE_LENGTH} />
      </View>
    </View>
  );
}
