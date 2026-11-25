import { useRouter } from "expo-router";
import { View } from "react-native";

import { BackButton, Button, EmptyState, ErrorState, ListGroup, ListRow, Screen, Skeleton } from "@/components/ui";
import { env } from "@/config/env";
import { useEstimates } from "@/features/work/use-work";
import { estimateStatus } from "@/features/work/words";
import { WorkTitle } from "@/features/work/WorkTitle";
import { t } from "@/i18n";
import { formatServerDate } from "@/lib/dates";
import { formatRupees } from "@/lib/money";
import { openWebPage } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme";

/**
 * P15 · Estimates. Spec: docs/05-screens-painter.md — P15. Web reference:
 * HueVistaaPainter app/(app)/(painter)/estimates.
 *
 * The painter's estimates, newest first: the customer, the number and day, where each stands, and
 * the total. A new one is measured and priced on the painter website.
 */
export default function Estimates() {
  const router = useRouter();
  const { space } = useTheme();
  const estimates = useEstimates();
  const pull = usePullToRefresh(() => estimates.refetch());
  const list = estimates.data?.estimates ?? [];
  const newOne = () => void openWebPage(`${env.painterOrigin}/estimates/new`);

  let body;
  if (estimates.isPending) {
    body = (
      <View style={{ gap: space.sm }} testID="estimates-loading">
        <Skeleton height={64} radius={16} />
        <Skeleton height={64} radius={16} />
      </View>
    );
  } else if (!estimates.data) {
    body = <ErrorState error={estimates.error} onRetry={() => void estimates.refetch()} />;
  } else if (list.length === 0) {
    body = <EmptyState icon="file-text" title={t("work.estimates.empty")} actionLabel={t("work.estimates.new")} onAction={newOne} />;
  } else {
    body = (
      <ListGroup>
        {list.map((e) => (
          <ListRow
            key={e.id}
            title={e.customerName}
            detail={`${t("work.estimates.number", { n: e.estimateNo })} · ${formatServerDate(e.createdAt)} · ${estimateStatus(e.status)}`}
            value={formatRupees(e.totalPaise)}
            onPress={() => router.push({ pathname: "/painter/work/estimates/[id]", params: { id: e.id } })}
            testID={`estimate-${e.id}`}
          />
        ))}
      </ListGroup>
    );
  }

  return (
    <Screen
      scroll
      onRefresh={pull.onRefresh}
      refreshing={pull.refreshing}
      contentStyle={{ gap: space.lg, paddingBottom: space.xl }}
      footer={list.length > 0 ? <Button variant="secondary" icon="external-link" label={t("work.estimates.new")} onPress={newOne} /> : undefined}
    >
      <BackButton fallback="/painter/work" />
      <WorkTitle title={t("work.estimates.title")} />
      {body}
    </Screen>
  );
}
