import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSession } from "@/auth/session";
import { homeFor } from "@/auth/sides";
import { BrandLockup, Button, Screen, Text } from "@/components/ui";
import { t } from "@/i18n";
import { useTheme } from "@/theme";

/**
 * Every app start lands here: signed out → Welcome, a shop → its day, a painter → their home.
 * Only drawn itself when the splash has gone and the session is still not known — still loading
 * after 8 s, or the server can't be reached and nothing was saved.
 */
export default function Start() {
  const { state, retry } = useSession();
  const { colors, space } = useTheme();

  if (state.status === "signedOut") return <Redirect href="/welcome" />;
  if (state.status === "signedIn") return <Redirect href={homeFor(state.profile)} />;

  return (
    <Screen>
      <View style={[styles.center, { gap: space.lg }]}>
        <BrandLockup />
        {state.status === "loading" ? (
          <>
            <ActivityIndicator color={colors.accent} />
            <Text tone="soft">{t("boot.stillConnecting")}</Text>
          </>
        ) : (
          <>
            <Text tone="soft" align="center">
              {t("boot.cantReach")}
            </Text>
            <Button label={t("common.retry")} onPress={retry} block={false} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
