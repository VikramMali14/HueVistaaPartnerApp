import { useRouter } from "expo-router";
import { View } from "react-native";

import type { SiteSummary } from "@/api/endpoints/work";
import { BackButton, EmptyState, ErrorState, ListGroup, ListRow, Screen, Skeleton, Text } from "@/components/ui";
import { env } from "@/config/env";
import { useSites } from "@/features/work/use-work";
import { siteMoneyLine } from "@/features/work/words";
import { WorkTitle } from "@/features/work/WorkTitle";
import { t } from "@/i18n";
import { openWebPage } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme";

/**
 * P17 · Sites. Spec: docs/05-screens-painter.md — P17. Web reference:
 * HueVistaaPainter app/(app)/(painter)/sites.
 *
 * The jobs going on, then the ones finished: each with its customer and what is still to collect.
 */
export default function Sites() {
  const router = useRouter();
  const { space } = useTheme();
  const sites = useSites();
  const pull = usePullToRefresh(() => sites.refetch());
  const list = sites.data?.sites ?? [];
  const going = list.filter((s) => s.status === "ACTIVE");
  const done = list.filter((s) => s.status !== "ACTIVE");
  const row = (s: SiteSummary) => (
    <ListRow
      key={s.id}
      title={s.name}
      detail={[s.customerName, s.address].filter(Boolean).join(" · ") || undefined}
      value={siteMoneyLine(s)}
      onPress={() => router.push({ pathname: "/painter/work/sites/[id]", params: { id: s.id } })}
      testID={`site-${s.id}`}
    />
  );

  let body;
  if (sites.isPending) {
    body = (
      <View style={{ gap: space.sm }} testID="sites-loading">
        <Skeleton height={64} radius={16} />
        <Skeleton height={64} radius={16} />
      </View>
    );
  } else if (!sites.data) {
    body = <ErrorState error={sites.error} onRetry={() => void sites.refetch()} />;
  } else if (list.length === 0) {
    body = (
      <EmptyState
        icon="home"
        title={t("work.sites.empty")}
        actionLabel={t("work.onWebsite")}
        onAction={() => void openWebPage(`${env.painterOrigin}/sites`)}
      />
    );
  } else {
    body = (
      <>
        {going.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <Text variant="title3" accessibilityRole="header">
              {t("work.sites.going")}
            </Text>
            <ListGroup>{going.map(row)}</ListGroup>
          </View>
        ) : null}
        {done.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <Text variant="title3" accessibilityRole="header">
              {t("work.sites.finished")}
            </Text>
            <ListGroup>{done.map(row)}</ListGroup>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen scroll onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.lg, paddingBottom: space.xl }}>
      <BackButton fallback="/painter/work" />
      <WorkTitle title={t("work.sites.title")} />
      {body}
    </Screen>
  );
}
