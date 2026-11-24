import type { ReactNode } from "react";
import { View } from "react-native";

import type { Shop } from "@/api/endpoints/shop";
import { Button, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { t } from "@/i18n";
import { openWebPage, webPages } from "@/lib/open-web";
import { useTheme } from "@/theme";

import { useShop } from "./ShopContext";

/**
 * What every shop tab shows before it has a shop to show: a skeleton while the shops load, the
 * error with Try again, or — an account with no shop yet — the way to set one up on the website.
 * With a shop, it draws `children(shop)`.
 */
export function ShopGate({ children }: { children: (shop: Shop) => ReactNode }) {
  const { space } = useTheme();
  const { shop, loading, error, retry } = useShop();
  if (loading) {
    return (
      <View style={{ gap: space.sm }} testID="shop-loading">
        <Skeleton height={96} radius={16} />
        <Skeleton height={160} radius={16} />
      </View>
    );
  }
  if (error) return <ErrorState error={error} message={t("shop.loadFailed")} onRetry={retry} />;
  if (!shop) {
    return (
      <View style={{ gap: space.md }}>
        <EmptyState icon="shopping-bag" title={t("shop.noShop")} />
        <Button variant="secondary" icon="external-link" label={t("shop.me.website")} onPress={() => void openWebPage(webPages.shopDashboard)} />
      </View>
    );
  }
  return <>{children(shop)}</>;
}
