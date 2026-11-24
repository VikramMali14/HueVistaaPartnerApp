import { View } from "react-native";

import { Text } from "@/components/ui";
import { t } from "@/i18n";
import { useTheme } from "@/theme";

/** A work screen's heading: "My work" over its own title, and a line under it when it has one. */
export function WorkTitle({ title, lede }: { title: string; lede?: string | null }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space.xxs }}>
      <Text variant="label" tone="accent">
        {t("work.eyebrow")}
      </Text>
      <Text variant="title1" accessibilityRole="header">
        {title}
      </Text>
      {lede ? (
        <Text variant="painterBody" tone="soft">
          {lede}
        </Text>
      ) : null}
    </View>
  );
}
