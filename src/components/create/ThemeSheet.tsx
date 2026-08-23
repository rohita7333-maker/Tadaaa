/**
 * C4 "Change" — the theme picker, inside the wizard.
 *
 * This replaces `router.push("/(tabs)/themes")`. That left the create modal for
 * a tab, and the only way back in was `theme/[id]`'s "Use this theme", which
 * pushed a SECOND `/create` — leaving a stale wizard mounted underneath the new
 * one. It also applied a TEMPLATE, so it rewrote the occasion and the reveal
 * style the card never claimed to touch.
 *
 * Nothing here navigates, so the second instance cannot exist. The themes tab
 * and `theme/[id]` are untouched: they remain the browse surface and the way to
 * start a NEW surprise from a template, where rewriting occasion and reveal is
 * correct because there is nothing yet to overwrite.
 */
import { ScrollView, Text, View } from "react-native";
import { Sheet } from "@/components/handoff/Sheet";
import { ThemeCard } from "./ThemeCard";
import { themes } from "@/lib/themes";
import { space, type } from "@/theme/tokens";

/** Tall enough to show several rows, short enough to stay a sheet. */
const LIST_MAX_HEIGHT = 420;

export function ThemeSheet({
  visible,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedId: string;
  /** Handed the chosen id; the caller applies it through `selectTheme`. */
  onSelect: (themeId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Pick a theme">
      <Text style={{ ...type.bodySecondary, marginBottom: space.x4 }}>
        Only the look changes. Your occasion and how it opens stay as they are.
      </Text>
      <ScrollView
        style={{ maxHeight: LIST_MAX_HEIGHT }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: space.x2, paddingBottom: space.x2 }}>
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              selected={t.id === selectedId}
              onPress={() => {
                onSelect(t.id);
                onClose();
              }}
            />
          ))}
        </View>
      </ScrollView>
    </Sheet>
  );
}
