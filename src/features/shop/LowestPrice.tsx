import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Text, useReducedMotion } from "@/components/ui";
import { t } from "@/i18n";
import { buzz } from "@/lib/haptics";
import { fonts, minTouch, useTheme } from "@/theme";

import { priceRupees } from "./words";

/** How long the lowest price stays on screen once tapped. The website's figure. */
export const LOWEST_SHOWN_MS = 15_000;

/**
 * The least a pack may be sold for, kept covered until the employee taps it — the customer is
 * often looking at the same screen — and covered again by itself after 15 seconds, or the moment
 * the app is put away. As the website's price list does it.
 *
 * Shown, a brass bar under the figure drains away over the 15 seconds, and the seconds left are
 * written beside it, so nobody is surprised when it goes. A tap on it hides it at once.
 */
export function LowestPrice({ price, testID }: { price: number; testID?: string }) {
  const { colors, radius } = useTheme();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  const [left, setLeft] = useState(LOWEST_SHOWN_MS / 1000);
  const drain = useSharedValue(1);

  const show = () => {
    buzz.select();
    setLeft(LOWEST_SHOWN_MS / 1000);
    // The bar drains over the same 15 seconds; held full with "Reduce motion" on (the seconds still count).
    drain.set(reduced ? 1 : withTiming(0, { duration: LOWEST_SHOWN_MS, easing: Easing.linear }));
    setShown(true);
  };

  // Started once per showing, and only by it: nothing else may push the 15 seconds back.
  useEffect(() => {
    if (!shown) return;
    const started = Date.now();
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((LOWEST_SHOWN_MS - (Date.now() - started)) / 1000))), 1000);
    const timer = setTimeout(() => setShown(false), LOWEST_SHOWN_MS);
    const sub = AppState.addEventListener("change", (status) => {
      if (status !== "active") setShown(false);
    });
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
      sub.remove();
    };
  }, [shown]);

  const bar = useAnimatedStyle(() => ({ width: `${drain.get() * 100}%` }));

  if (shown) {
    return (
      <Animated.View entering={reduced ? undefined : FadeIn.duration(160)}>
        <Pressable
          onPress={() => setShown(false)}
          accessibilityRole="button"
          accessibilityLabel={`${t("shop.prices.lowestLabel")} ${priceRupees(price)}. ${t("common.hide")}`}
          testID={testID ? `${testID}-shown` : undefined}
          style={[styles.shown, { borderRadius: radius.sm, backgroundColor: `${colors.warmFill}26`, borderColor: `${colors.warmText}55` }]}
        >
          <View style={styles.shownRow}>
            <Feather name="eye-off" size={14} color={colors.warmText} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.warmText, fontVariant: ["tabular-nums"] }}>
              {priceRupees(price)}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: `${colors.warmText}22` }]}>
            <Animated.View style={[styles.fill, { backgroundColor: colors.warmText }, bar]} />
          </View>
          <Text variant="caption" tone="mute" accessibilityLiveRegion="polite">
            {t("shop.prices.hidesIn", { n: left })}
          </Text>
        </Pressable>
      </Animated.View>
    );
  }
  return (
    <Pressable
      onPress={show}
      accessibilityRole="button"
      accessibilityLabel={t("shop.prices.lowestLabel")}
      accessibilityHint={t("shop.prices.lowestHint")}
      testID={testID}
      hitSlop={6}
      style={({ pressed }) => [
        styles.cover,
        { borderRadius: radius.pill, borderColor: colors.ruleStrong, backgroundColor: pressed ? colors.surfaceSoft : "transparent" },
      ]}
    >
      <Feather name="eye" size={15} color={colors.accentText} />
      <Text variant="small" style={{ color: colors.accentText, fontFamily: fonts.semibold }}>
        {t("shop.prices.showLowest")}
      </Text>
      {/* The figure's place, covered: a row of dots the width of a price. */}
      <Text variant="small" tone="mute" style={{ letterSpacing: 1 }}>
        ₹ ••••
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cover: { minHeight: minTouch - 8, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderWidth: 1 },
  shown: { minWidth: 132, paddingHorizontal: 10, paddingVertical: 6, gap: 4, borderWidth: 1 },
  shownRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  track: { height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: 3, borderRadius: 2 },
});
