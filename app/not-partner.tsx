import Feather from "@expo/vector-icons/Feather";
import { Redirect } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useSession } from "@/auth/session";
import { homeFor, partnerSide } from "@/auth/sides";
import { BrandLockup, Button, Screen, Text } from "@/components/ui";
import { t } from "@/i18n";
import { useTheme } from "@/theme";

/**
 * A session this app has nothing for — an account that was a shop or a painter when it signed in
 * and isn't any more, or one restored from before. Sign-in itself never lets one through
 * (auth/session.tsx). It says which app is theirs, and signs out.
 */
export default function NotPartner() {
  const { colors, space } = useTheme();
  const { state, signOut } = useSession();
  if (state.status !== "signedIn") return <Redirect href="/" />;
  const side = partnerSide(state.profile);
  if (side === "shop" || side === "painter") return <Redirect href={homeFor(state.profile)} />;

  return (
    <Screen footer={<Button label={t("common.signOut")} onPress={() => void signOut()} testID="not-partner-sign-out" />}>
      <View style={[styles.body, { gap: space.lg }]} testID="not-partner">
        <BrandLockup size="sm" />
        <View style={[styles.icon, { backgroundColor: colors.surfaceSoft }]}>
          <Feather name="smartphone" size={28} color={colors.fgSoft} />
        </View>
        <Text variant="title2" accessibilityRole="header">
          {t("notPartner.title")}
        </Text>
        <Text variant="body" tone="soft">
          {side === "staff" ? t("notPartner.staff") : side === "customer" ? t("notPartner.customer") : t("notPartner.other")}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center" },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
