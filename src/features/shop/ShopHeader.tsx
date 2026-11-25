import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { ScreenHeader, Segmented, Text } from "@/components/ui";
import { t } from "@/i18n";
import { useTheme } from "@/theme";

import { useShop } from "./ShopContext";

/**
 * The head of each shop tab: the title, and under it the shop — or, for an owner of more than one,
 * a switch between them that every tab follows.
 */
export function ShopHeader({ eyebrow, title, right }: { eyebrow?: string | null; title: string; right?: ReactNode }) {
  const { colors } = useTheme();
  const { shops, shop, choose } = useShop();
  return (
    <ScreenHeader eyebrow={eyebrow} title={title} right={right} testID="shop-header">
      {shops.length > 1 ? (
        <Segmented
          options={shops.map((s) => ({ value: s.id, label: s.name }))}
          value={shop?.id ?? ""}
          onChange={choose}
          accessibilityLabel={t("shop.shop")}
          compact
        />
      ) : shop ? (
        <View style={styles.line}>
          <Feather name="shopping-bag" size={14} color={colors.fgMute} />
          <Text variant="body" tone="soft" testID="shop-name">
            {shop.name}
          </Text>
        </View>
      ) : null}
    </ScreenHeader>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center", gap: 6 },
});
