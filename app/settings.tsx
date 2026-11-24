import { BackButton, Screen, ScreenHeader } from "@/components/ui";
import { SettingsBody } from "@/features/settings/SettingsBody";
import { t } from "@/i18n";
import { useTheme } from "@/theme";

/** Settings, opened from a painter's trade profile: the language, help, and signing out. */
export default function Settings() {
  const { space } = useTheme();
  return (
    <Screen scroll contentStyle={{ gap: space.xl, paddingBottom: space.xxl }}>
      <BackButton fallback="/" />
      <ScreenHeader title={t("settings.title")} />
      <SettingsBody />
    </Screen>
  );
}
