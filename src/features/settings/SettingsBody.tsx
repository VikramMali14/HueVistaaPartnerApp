import Constants from "expo-constants";
import { useState } from "react";
import { View } from "react-native";

import { useSession } from "@/auth/session";
import { ConfirmSheet, ListGroup, ListRow, Segmented, Text } from "@/components/ui";
import { t } from "@/i18n";
import { chooseLanguage, languageChoice, type LanguageChoice } from "@/i18n/language";
import { buzz } from "@/lib/haptics";
import { openWebPage, webPages } from "@/lib/open-web";
import { useTheme } from "@/theme";

/**
 * What both sides share at the bottom of their account: the language (the screen redraws in
 * place), help and the legal pages on the website, signing out after a question, and the version.
 */
export function SettingsBody() {
  const { space } = useTheme();
  const { signOut } = useSession();
  const [language, setLanguage] = useState<LanguageChoice>(languageChoice());
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const version = Constants.expoConfig?.version ?? "";

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.xs }}>
        <Text variant="label" tone="mute" accessibilityRole="header" style={{ paddingHorizontal: space.xxs }}>
          {t("settings.language")}
        </Text>
        <Segmented<LanguageChoice>
          options={[
            { value: "phone", label: t("settings.languagePhone") },
            { value: "en", label: t("settings.english") },
            { value: "hi", label: t("settings.hindi") },
          ]}
          value={language}
          onChange={(next) => {
            buzz.select();
            setLanguage(next);
            void chooseLanguage(next);
          }}
          accessibilityLabel={t("settings.language")}
          compact
        />
      </View>

      <ListGroup>
        <ListRow icon="help-circle" title={t("settings.help")} detail={t("settings.helpHint")} onPress={() => void openWebPage(webPages.contact)} testID="settings-help" />
        <ListRow icon="shield" title={t("settings.privacy")} onPress={() => void openWebPage(webPages.privacy)} />
        <ListRow icon="file-text" title={t("settings.terms")} onPress={() => void openWebPage(webPages.terms)} />
      </ListGroup>

      <ListGroup>
        <ListRow icon="log-out" title={t("common.signOut")} tone="danger" onPress={() => setLeaving(true)} testID="settings-sign-out" />
      </ListGroup>

      {version ? (
        <Text variant="caption" tone="mute" align="center">
          {`${t("common.appName")} · ${t("settings.version", { version })}`}
        </Text>
      ) : null}

      <ConfirmSheet
        visible={leaving}
        title={t("settings.signOutTitle")}
        body={t("settings.signOutBody")}
        confirmLabel={t("common.signOut")}
        destructive
        loading={busy}
        onConfirm={() => {
          setBusy(true);
          void signOut().finally(() => setBusy(false));
        }}
        onCancel={() => setLeaving(false)}
        testID="sign-out-sheet"
      />
    </View>
  );
}
