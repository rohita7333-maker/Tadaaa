import { View } from "react-native";
import { Field, Txt, colors, spacing } from "@/components/ui";
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
      <View style={{ gap: 4 }}>
        <Field
          label="Title"
          value={title}
          onChangeText={(v) => onTitleChange(v.slice(0, MAX_TITLE_LENGTH))}
          placeholder="e.g. A little something for you"
          error={titleError}
        />
        <Txt variant="body" muted style={{ fontSize: 10.5, alignSelf: "flex-end" }}>
          {title.length}/{MAX_TITLE_LENGTH}
        </Txt>
      </View>

      <View style={{ gap: 4 }}>
        <Field
          label="Message"
          value={message}
          onChangeText={(v) => onMessageChange(v.slice(0, MAX_MESSAGE_LENGTH))}
          placeholder="Write the sweet part…"
          multiline
          numberOfLines={5}
          style={{ minHeight: 120, textAlignVertical: "top" }}
          error={messageError}
        />
        <Txt
          variant="body"
          muted
          style={{
            fontSize: 10.5,
            alignSelf: "flex-end",
            color: message.length > MAX_MESSAGE_LENGTH * 0.9 ? colors.rose : colors.warmGray,
          }}
        >
          {message.length}/{MAX_MESSAGE_LENGTH}
        </Txt>
      </View>
    </View>
  );
}
