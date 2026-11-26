import { Tabs } from "expo-router/js-tabs";

import { useShop } from "@/features/shop/ShopContext";
import { t } from "@/i18n";
import { useLanguage } from "@/i18n/language";
import { TabBar, type TabIcon } from "@/navigation/TabBar";

const ICONS: Record<string, TabIcon> = {
  index: "sun",
  staff: "users",
  asks: "inbox",
  prices: "tag",
  me: "user",
};

/**
 * Today · Staff · Asks · Prices · Me. Today says what needs the owner; Asks is where they answer
 * it — a badge counts the price questions, asks for leave, days to put right, overtime and piece
 * work waiting.
 */
export default function ShopTabs() {
  // The tabs' names are read here: a change of language draws them again.
  useLanguage();
  const { alert } = useShop();
  const waiting =
    (alert?.openRequests ?? 0) +
    (alert?.leaveRequestsWaiting ?? 0) +
    (alert?.correctionsWaiting ?? 0) +
    (alert?.overtimeWaiting ?? 0) +
    (alert?.pieceWorkWaiting ?? 0);
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} icons={ICONS} />}>
      <Tabs.Screen name="index" options={{ title: t("tabs.today") }} />
      <Tabs.Screen name="staff" options={{ title: t("tabs.staff") }} />
      <Tabs.Screen name="asks" options={{ title: t("tabs.asks"), tabBarBadge: waiting || undefined }} />
      <Tabs.Screen name="prices" options={{ title: t("tabs.prices") }} />
      <Tabs.Screen name="me" options={{ title: t("tabs.me") }} />
    </Tabs>
  );
}
