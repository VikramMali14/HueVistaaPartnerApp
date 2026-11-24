import { View } from "react-native";

import { Button, Card, Text } from "@/components/ui";
import { t } from "@/i18n";
import { openWebPage, webPages } from "@/lib/open-web";
import { useTheme } from "@/theme";

/**
 * "Your own home": a painter's own rooms and colours live on the customer side of this same
 * sign-in. The HueVistaa app switches to it in place; this app is the painter's, so it opens that
 * side on the website, where the same account signs in (and in the HueVistaa app, if they have it).
 */
export function OwnHome() {
  const { space } = useTheme();
  return (
    <Card>
      <View style={{ gap: space.sm }}>
        <Text variant="title3">{t("painter.profile.ownHomeTitle")}</Text>
        <Text variant="body" tone="soft">
          {t("painter.profile.ownHomeOff")}
        </Text>
        <Button
          variant="secondary"
          icon="external-link"
          label={t("painter.profile.ownHomeGo")}
          onPress={() => void openWebPage(webPages.ownHome)}
          testID="painter-own-home"
        />
      </View>
    </Card>
  );
}
