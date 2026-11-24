import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { isApiError } from "@/api/errors";
import { EmptyState, ErrorState, PressableScale, Screen, SearchBar, Skeleton, Text } from "@/components/ui";
import { PriceItemCard } from "@/features/shop/PriceItemCard";
import { searchItems } from "@/features/shop/price-search";
import { useShop } from "@/features/shop/ShopContext";
import { ShopGate } from "@/features/shop/ShopGate";
import { ShopHeader } from "@/features/shop/ShopHeader";
import { useShopPriceList } from "@/features/shop/use-shop";
import { t } from "@/i18n";
import { openWebPage, webPages } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { hairline, useTheme } from "@/theme";

/** How many items are drawn at once; the search narrows the rest. */
const SHOWN = 60;

/**
 * The shop's price list, as the counter sees it — the same search and the same cards as the staff
 * app, so an owner and their staff read one list one way. The lowest price stays covered until
 * tapped here too: the owner is as likely as anybody to be showing a customer the screen. Prices
 * are changed on the website, where the product picker and bulk changes are.
 */
export default function ShopPrices() {
  const { colors, space, radius } = useTheme();
  const { shop } = useShop();
  const list = useShopPriceList(shop?.id);
  const pull = usePullToRefresh(() => list.refetch());
  const [query, setQuery] = useState("");
  const found = useMemo(() => (list.data ? searchItems(list.data.items, query) : []), [list.data, query]);

  let body;
  if (list.isPending) {
    body = (
      <View style={{ gap: space.sm }} testID="prices-loading">
        <Skeleton height={148} radius={16} />
        <Skeleton height={148} radius={16} />
      </View>
    );
  } else if (!list.data) {
    const off = isApiError(list.error) && list.error.code === "PRICE_LIST_OFF";
    body = off ? (
      <EmptyState icon="slash" title={t("shop.prices.switchedOff")} />
    ) : (
      <ErrorState error={list.error} message={t("shop.prices.loadFailed")} onRetry={() => void list.refetch()} />
    );
  } else if (list.data.items.length === 0) {
    body = <EmptyState icon="tag" title={t("shop.prices.noItems")} actionLabel={t("shop.prices.edit")} onAction={() => void openWebPage(webPages.shopPriceList)} />;
  } else if (found.length === 0) {
    body = (
      <Text variant="body" tone="soft" testID="prices-no-match">
        {t("shop.prices.noMatch", { q: query.trim() })}
      </Text>
    );
  } else {
    const data = list.data;
    body = (
      <View style={{ gap: space.sm }}>
        <Text variant="small" tone="mute" testID="prices-count">
          {found.length === 1 ? t("shop.prices.one") : t("shop.prices.count", { n: found.length })}
        </Text>
        {found.slice(0, SHOWN).map((item) => (
          <PriceItemCard key={item.id} item={item} query={query} seesLowest={data.seesLowest !== false} hasGodown={Boolean(data.hasGodown)} />
        ))}
        {found.length > SHOWN ? (
          <Text variant="small" tone="mute" align="center">
            {t("shop.prices.more", { shown: SHOWN })}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Screen scroll edges={["top"]} onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.lg, paddingBottom: space.xxl }}>
      <ShopHeader title={t("shop.prices.title")} />
      <ShopGate>
        {() => (
          <>
            <View style={{ gap: space.xs }}>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                label={t("shop.prices.search")}
                placeholder={t("shop.prices.searchPlaceholder")}
                clearLabel={t("shop.prices.clear")}
                testID="prices-search"
              />
              <Text variant="caption" tone="mute" style={{ paddingHorizontal: space.md }}>
                {t("shop.prices.searchHint")}
              </Text>
            </View>
            <PressableScale
              onPress={() => void openWebPage(webPages.shopPriceList)}
              accessibilityLabel={t("shop.prices.edit")}
              testID="prices-edit"
              style={[styles.edit, { borderColor: colors.rule, borderRadius: radius.sm }]}
            >
              <Feather name="edit-2" size={16} color={colors.fgMute} />
              <Text variant="small" tone="soft" style={{ flex: 1 }}>
                {t("shop.prices.edit")}
              </Text>
              <Feather name="external-link" size={14} color={colors.accentText} />
            </PressableScale>
            {body}
          </>
        )}
      </ShopGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  edit: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: hairline },
});
