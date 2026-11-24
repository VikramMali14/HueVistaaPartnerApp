import { Tabs } from "expo-router/js-tabs";

import { t } from "@/i18n";
import { useLanguage } from "@/i18n/language";
import { TabBar, type TabIcon } from "@/navigation/TabBar";

const ICONS: Record<string, TabIcon> = {
  index: "home",
  points: "star",
  scan: "maximize",
  rewards: "gift",
  nearby: "map-pin",
};

/**
 * Painter tabs: Home · Points · Scan · Rewards · Nearby — as the HueVistaa app has them. Scan sits
 * in the middle in brass: it is the one thing a painter opens the app to do.
 */
export default function PainterTabs() {
  // The tabs' names are read here: a change of language draws them again.
  useLanguage();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} icons={ICONS} primary="scan" />}>
      <Tabs.Screen name="index" options={{ title: t("tabs.home") }} />
      <Tabs.Screen name="points" options={{ title: t("tabs.points") }} />
      <Tabs.Screen name="scan" options={{ title: t("tabs.scan") }} />
      <Tabs.Screen name="rewards" options={{ title: t("tabs.rewards") }} />
      <Tabs.Screen name="nearby" options={{ title: t("tabs.nearby") }} />
    </Tabs>
  );
}
