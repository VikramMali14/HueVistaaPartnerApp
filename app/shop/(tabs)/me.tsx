import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, View } from "react-native";

import { useSession } from "@/auth/session";
import { Avatar, ListGroup, ListRow, Screen, ScreenHeader, Text } from "@/components/ui";
import { useShop } from "@/features/shop/ShopContext";
import { SettingsBody } from "@/features/settings/SettingsBody";
import { t } from "@/i18n";
import { openWebPage, webPages } from "@/lib/open-web";
import { formatMobileForDisplay } from "@/lib/validation";
import { hairline, useTheme } from "@/theme";

/**
 * Me, for a shop: who is signed in, the shop (or shops), the shop's website for everything the app
 * doesn't do yet — salaries, claims, the godown book, changing prices — then the language, help
 * and signing out.
 */
export default function ShopMe() {
  const { colors, space, radius } = useTheme();
  const { profile } = useSession();
  const { shops } = useShop();
  const name = profile?.namePending ? null : profile?.name;
  const phone = profile?.phoneNumber ? `+91 ${formatMobileForDisplay(profile.phoneNumber)}` : null;

  return (
    <Screen scroll edges={["top"]} contentStyle={{ gap: space.xl, paddingBottom: space.xxl }}>
      <ScreenHeader title={t("shop.me.title")} />

      <View style={[styles.person, { backgroundColor: colors.surface, borderColor: colors.rule, borderRadius: radius.md }]} testID="me-person">
        <Avatar name={name ?? shops[0]?.name ?? "?"} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title3">{name ?? profile?.email ?? phone ?? ""}</Text>
          {phone && name ? (
            <Text variant="small" tone="mute">
              {phone}
            </Text>
          ) : null}
          {profile?.email && (name || phone) ? (
            <Text variant="small" tone="mute">
              {profile.email}
            </Text>
          ) : null}
        </View>
      </View>

      {shops.length > 0 ? (
        <View style={{ gap: space.xs }}>
          <Text variant="label" tone="mute" accessibilityRole="header" style={{ paddingHorizontal: space.xxs }}>
            {shops.length > 1 ? t("shop.me.shops") : t("shop.me.yourShop")}
          </Text>
          {shops.map((shop) => (
            <View
              key={shop.id}
              testID={`me-shop-${shop.id}`}
              style={[styles.shop, { backgroundColor: colors.surface, borderColor: colors.rule, borderRadius: radius.md }]}
            >
              <View style={[styles.shopIcon, { backgroundColor: `${colors.accent}29` }]}>
                <Feather name="shopping-bag" size={18} color={colors.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{shop.name}</Text>
                {shop.city ? (
                  <Text variant="small" tone="mute">
                    {shop.city}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <ListGroup>
        <ListRow
          icon="external-link"
          title={t("shop.me.website")}
          detail={t("shop.me.websiteHint")}
          onPress={() => void openWebPage(webPages.shopDashboard)}
          testID="me-website"
        />
      </ListGroup>

      <SettingsBody />
    </Screen>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: hairline },
  shop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: hairline },
  shopIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
