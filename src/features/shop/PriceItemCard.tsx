import { StyleSheet, View } from "react-native";

import type { PriceItem } from "@/api/endpoints/shop";
import { Card, Text } from "@/components/ui";
import { t } from "@/i18n";
import { fonts, hairline, useTheme } from "@/theme";

import { packMatches } from "./price-search";
import { priceRupees } from "./words";

import { LowestPrice } from "./LowestPrice";

/**
 * One item on the shop's price list, set for reading across a counter: the name, then a row per
 * pack — the pack as a tag, the selling price large in figures that line up, MRP and the godown
 * under it, and the lowest price behind a tap for those the owner shows it to. The pack a search
 * names ("apex 20") is outlined in brass.
 */
export function PriceItemCard({
  item,
  query,
  seesLowest,
  hasGodown,
}: {
  item: PriceItem;
  query: string;
  seesLowest: boolean;
  hasGodown: boolean;
}) {
  const { colors, space, radius } = useTheme();
  const about = [item.brand, item.category].filter(Boolean).join(" · ");
  const searching = query.trim() !== "";
  return (
    <Card testID={`price-item-${item.id}`} style={{ gap: space.sm, padding: space.md }}>
      <View style={{ gap: 2, paddingHorizontal: space.xxs }}>
        <Text variant="title3">{item.name}</Text>
        {about ? (
          <Text variant="small" tone="mute">
            {about}
          </Text>
        ) : null}
        {item.note ? (
          <Text variant="small" tone="soft">
            {item.note}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: space.xs }}>
        {item.packs.map((pack) => {
          const named = searching && packMatches(pack, query);
          return (
            <View
              key={pack.id}
              testID={`price-pack-${pack.id}`}
              style={[
                styles.pack,
                {
                  borderRadius: radius.sm,
                  backgroundColor: named ? `${colors.accent}1f` : colors.surfaceSoft,
                  borderColor: named ? colors.accent : "transparent",
                },
              ]}
            >
              <View style={styles.top}>
                <View style={[styles.tag, { borderColor: colors.ruleStrong, backgroundColor: colors.surface, borderRadius: radius.xs }]}>
                  <Text variant="bodyStrong" maxFontSizeMultiplier={1.4}>
                    {pack.label}
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text
                  testID={`price-selling-${pack.id}`}
                  accessibilityLabel={`${t("shop.prices.selling")} ${priceRupees(pack.sellingPrice)}`}
                  style={{ fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, color: colors.fg, fontVariant: ["tabular-nums"], letterSpacing: -0.3 }}
                >
                  {priceRupees(pack.sellingPrice)}
                </Text>
              </View>
              <View style={styles.bottom}>
                <View style={styles.facts}>
                  {pack.mrp != null ? (
                    <Text variant="small" tone="mute">
                      {t("shop.prices.mrp", { price: priceRupees(pack.mrp) })}
                    </Text>
                  ) : null}
                  {hasGodown && pack.godownQty != null ? (
                    <Text variant="small" tone={pack.godownQty > 0 ? "soft" : "warm"}>
                      {pack.godownQty > 0 ? t("shop.prices.godown", { n: pack.godownQty }) : t("shop.prices.godownNone")}
                    </Text>
                  ) : null}
                </View>
                {seesLowest && pack.lowestPrice != null ? <LowestPrice price={pack.lowestPrice} testID={`price-lowest-${pack.id}`} /> : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  pack: { paddingHorizontal: 12, paddingVertical: 10, gap: 6, borderWidth: hairline },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderWidth: hairline },
  bottom: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 12, flexShrink: 1 },
});
