import { useRouter } from "expo-router";
import { View } from "react-native";

import type { CommissionShop } from "@/api/endpoints/work";
import { BackButton, Card, CountUp, EmptyState, ErrorState, ListGroup, ListRow, Screen, Skeleton, Text } from "@/components/ui";
import { env } from "@/config/env";
import { useShops } from "@/features/work/use-work";
import { WorkTitle } from "@/features/work/WorkTitle";
import { t } from "@/i18n";
import { formatDate } from "@/lib/dates";
import { formatRupees } from "@/lib/money";
import { openWebPage } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme";

/** "₹1,500 due", "Nothing due", or "₹200 paid ahead". */
function balanceText(paise: number): string {
  if (paise > 0) return t("work.shops.due", { amount: formatRupees(paise) });
  if (paise < 0) return t("work.shops.ahead", { amount: formatRupees(-paise) });
  return t("work.shops.nothingDue");
}

function shopDetail(s: CommissionShop): string {
  const parts: string[] = [];
  if (s.status === "REQUESTED") parts.push(t("work.shops.asking"));
  else if (s.status === "LEFT" || s.status === "REMOVED") parts.push(t("work.shops.ended"));
  if (s.paymentsWaiting > 0) {
    parts.push(s.paymentsWaiting === 1 ? t("work.shops.toConfirmOne") : t("work.shops.toConfirmMany", { n: s.paymentsWaiting }));
  } else if (s.balancePaise > 0 && s.owedSince) {
    parts.push(t("work.shops.owedSince", { date: formatDate(s.owedSince) }));
  }
  if (parts.length === 0 && s.place) parts.push(s.place);
  return parts.join(" · ");
}

/**
 * P19 · Shops. Spec: docs/05-screens-painter.md — P19. Web reference:
 * HueVistaaPainter app/(app)/(painter)/shops/shops-screen.tsx.
 *
 * What every shop owes the painter together, then each shop: what it owes and since when, and a
 * payment waiting for the painter to say it arrived. The statement across shops is on the website.
 */
export default function Shops() {
  const router = useRouter();
  const { space } = useTheme();
  const shops = useShops();
  const pull = usePullToRefresh(() => shops.refetch());
  const list = shops.data?.shops ?? [];

  let body;
  if (shops.isPending) {
    body = (
      <View style={{ gap: space.sm }} testID="shops-loading">
        <Skeleton height={110} radius={16} />
        <Skeleton height={64} radius={16} />
      </View>
    );
  } else if (!shops.data) {
    body = <ErrorState error={shops.error} onRetry={() => void shops.refetch()} />;
  } else if (list.length === 0) {
    body = <EmptyState icon="shopping-bag" title={t("work.shops.empty")} />;
  } else {
    body = (
      <>
        {shops.data.duePaise > 0 ? (
          <Card lit>
            <View style={{ gap: space.xs }} testID="shops-due">
              <Text variant="label" tone="accent">
                {t("work.shops.dueToYou")}
              </Text>
              <CountUp value={Math.round(shops.data.duePaise / 100)} variant="display" />
              <Text variant="painterBody" tone="soft">
                {t("work.shops.totalDue", { amount: formatRupees(shops.data.duePaise) })}
              </Text>
            </View>
          </Card>
        ) : null}
        <ListGroup>
          {list.map((s) => (
            <ListRow
              key={s.linkId}
              title={s.shopName}
              detail={shopDetail(s) || undefined}
              value={balanceText(s.balancePaise)}
              onPress={() => router.push({ pathname: "/painter/work/shops/[linkId]", params: { linkId: s.linkId } })}
              testID={`shop-${s.linkId}`}
            />
          ))}
        </ListGroup>
        <ListGroup>
          <ListRow icon="external-link" title={t("work.shops.statement")} onPress={() => void openWebPage(`${env.painterOrigin}/shops/statement`)} />
        </ListGroup>
      </>
    );
  }

  return (
    <Screen scroll onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.lg, paddingBottom: space.xl }}>
      <BackButton fallback="/painter/work" />
      <WorkTitle title={t("work.shops.title")} />
      {body}
    </Screen>
  );
}
