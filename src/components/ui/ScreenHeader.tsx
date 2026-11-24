import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useTheme } from "@/theme";

import { Text } from "./Text";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * The top of a tab: a small brass line over a large title, as iOS's large titles and Material's
 * top app bar both settle on — the screen says where you are before anything else. `right` holds
 * one control (a month switch); `children` sit under the title (a shop switch).
 */
export function ScreenHeader({
  eyebrow,
  title,
  right,
  children,
  testID,
}: {
  eyebrow?: string | null;
  title: string;
  right?: ReactNode;
  children?: ReactNode;
  testID?: string;
}) {
  const { space } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Animated.View entering={reduced ? undefined : FadeIn.duration(260)} style={{ gap: space.sm, paddingTop: space.md }} testID={testID}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          {eyebrow ? (
            <Text variant="label" tone="accent" numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="title1" accessibilityRole="header">
            {title}
          </Text>
        </View>
        {right}
      </View>
      {children}
    </Animated.View>
  );
}
