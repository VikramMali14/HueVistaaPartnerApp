import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { BrandLockup, Button, Em, Screen, Text, useReducedMotion } from "@/components/ui";
import { getLanguage, t } from "@/i18n";
import { chooseLanguage } from "@/i18n/language";
import { buzz } from "@/lib/haptics";
import { fonts, hairline, minTouch, useTheme } from "@/theme";

type Icon = ComponentProps<typeof Feather>["name"];

/**
 * Welcome. One app for the two kinds of business that work with HueVistaa — shown as two cards,
 * the shop's and the painter's, each with what it holds — and one way in. Nobody chooses a side
 * here: the account they sign in to decides it. The language switch is up top, before any reading.
 */
export default function Welcome() {
  const router = useRouter();
  const { colors, space, radius } = useTheme();
  const reduced = useReducedMotion();
  const enter = (i: number) => (reduced ? undefined : FadeInDown.delay(120 + i * 120).duration(420).springify().damping(16));

  return (
    <Screen
      scroll
      footer={
        <View style={{ gap: space.xs }}>
          <Button label={t("auth.welcome.mobile")} icon="smartphone" onPress={() => router.push("/phone")} testID="welcome-mobile" />
          <Button variant="ghost" label={t("auth.welcome.email")} onPress={() => router.push("/email")} testID="welcome-email" />
        </View>
      }
    >
      <View style={[styles.top, { marginTop: space.md }]}>
        <BrandLockup size="sm" />
        <Pressable
          onPress={() => {
            buzz.select();
            void chooseLanguage(getLanguage() === "hi" ? "en" : "hi");
          }}
          accessibilityRole="button"
          accessibilityLabel={t("auth.welcome.otherLanguageLabel")}
          testID="welcome-language"
          hitSlop={6}
          style={({ pressed }) => [
            styles.language,
            { borderRadius: radius.pill, borderColor: colors.ruleStrong, backgroundColor: pressed ? colors.surfaceSoft : "transparent" },
          ]}
        >
          <Feather name="globe" size={15} color={colors.fgSoft} />
          <Text variant="small" style={{ fontFamily: fonts.semibold }}>
            {t("auth.welcome.otherLanguage")}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.sides, { marginVertical: space.xl, gap: space.sm }]}>
        <Animated.View entering={enter(0)} style={styles.side}>
          <SideCard icon="shopping-bag" title={t("auth.welcome.shopTitle")} body={t("auth.welcome.shopBody")} tint={colors.accent} />
        </Animated.View>
        <Animated.View entering={enter(1)} style={styles.side}>
          <SideCard icon="award" title={t("auth.welcome.painterTitle")} body={t("auth.welcome.painterBody")} tint={colors.mark} />
        </Animated.View>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="display" accessibilityRole="header">
          {t("auth.welcome.headlineStart")}
          <Em variant="display">{t("auth.welcome.headlineEm")}</Em>
          {t("auth.welcome.headlineEnd")}
        </Text>
        <Text variant="lead">{t("auth.welcome.lead")}</Text>
      </View>

      <View style={[styles.note, { marginTop: space.lg, borderColor: colors.rule, borderRadius: radius.sm }]}>
        <Feather name="info" size={16} color={colors.fgMute} />
        <Text variant="small" tone="mute" style={{ flex: 1 }}>
          {t("auth.welcome.notHere")}
        </Text>
      </View>
    </Screen>
  );
}

/** One of the two businesses the app is for: an icon in its colour, a name, what it holds. */
function SideCard({ icon, title, body, tint }: { icon: Icon; title: string; body: string; tint: string }) {
  const { colors, radius, space } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.rule, borderTopColor: tint, borderRadius: radius.md, padding: space.md, gap: space.sm }]}
      accessible
      accessibilityLabel={`${title}. ${body}`}
    >
      <View style={[styles.icon, { backgroundColor: `${tint}2e` }]}>
        <Feather name={icon} size={20} color={colors.fg} />
      </View>
      <Text variant="bodyStrong">{title}</Text>
      <Text variant="small" tone="mute">
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  language: { minHeight: minTouch - 8, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderWidth: hairline },
  sides: { flexDirection: "row" },
  side: { flex: 1 },
  card: { flex: 1, borderWidth: hairline, borderTopWidth: 3 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  note: { flexDirection: "row", gap: 10, padding: 12, borderWidth: hairline },
});
