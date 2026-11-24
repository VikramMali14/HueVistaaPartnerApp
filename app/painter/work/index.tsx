import { useRouter } from "expo-router";

import { useSession } from "@/auth/session";
import { BackButton, ListGroup, ListRow, Screen, Text } from "@/components/ui";
import { env } from "@/config/env";
import { useEstimates, useRegister, useShops, useSites } from "@/features/work/use-work";
import { hasShops, hasWorkBooks, todayInIndia } from "@/features/work/words";
import { WorkTitle } from "@/features/work/WorkTitle";
import { t } from "@/i18n";
import { formatRupees } from "@/lib/money";
import { openWebPage } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme";

/**
 * P13 · My work. Spec: docs/05-screens-painter.md — P13. Web reference:
 * HueVistaaPainter app/(app)/(painter)/work.
 *
 * The painter's own books in four rows, each with where it stands today: who isn't marked yet, the
 * estimates waiting for an answer, the sites going on, and what the shops owe. The rest of the books —
 * making an estimate, adding to the team, a claim's photos — is on the painter website, a tap away.
 */
export default function MyWork() {
  const router = useRouter();
  const { space } = useTheme();
  const { profile } = useSession();
  // Only what this painter has: their books once the team switched them on, the shops once one asked.
  const books = hasWorkBooks(profile);
  const withShops = hasShops(profile);
  const today = todayInIndia();
  const register = useRegister(today, books);
  const estimates = useEstimates(books);
  const sites = useSites(books);
  const shops = useShops(withShops);
  const pull = usePullToRefresh(() => Promise.all([register.refetch(), estimates.refetch(), sites.refetch(), shops.refetch()]));

  const notMarked = register.data?.notMarked ?? 0;
  const waiting = estimates.data?.estimates.filter((e) => e.status === "OPEN").length;
  const going = sites.data?.sites.filter((s) => s.status === "ACTIVE").length;
  const due = shops.data?.duePaise;

  return (
    <Screen scroll onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.lg, paddingBottom: space.xl }}>
      <BackButton fallback="/painter" />
      <WorkTitle title={t("work.title")} lede={t("work.lede")} />
      <ListGroup>
        {books ? (
          <ListRow
            icon="users"
            title={t("work.teamLabel")}
            detail={
              register.data
                ? register.data.members.length === 0
                  ? t("work.teamHint")
                  : notMarked > 0
                    ? notMarked === 1
                      ? t("work.team.notMarkedOne")
                      : t("work.team.notMarkedMany", { n: notMarked })
                    : t("work.team.allMarked")
                : t("work.teamHint")
            }
            onPress={() => router.push("/painter/work/team")}
            testID="work-team"
          />
        ) : null}
        {books ? (
          <ListRow
            icon="file-text"
            title={t("work.estimatesLabel")}
            detail={waiting ? `${waiting} · ${t("work.estimates.open")}` : t("work.estimatesHint")}
            onPress={() => router.push("/painter/work/estimates")}
            testID="work-estimates"
          />
        ) : null}
        {books ? (
          <ListRow
            icon="home"
            title={t("work.sitesLabel")}
            detail={going ? `${going} · ${t("work.sites.going")}` : t("work.sitesHint")}
            onPress={() => router.push("/painter/work/sites")}
            testID="work-sites"
          />
        ) : null}
        {withShops ? (
          <ListRow
            icon="shopping-bag"
            title={t("work.shopsLabel")}
            detail={due ? t("work.shops.totalDue", { amount: formatRupees(due) }) : t("work.shopsHint")}
            onPress={() => router.push("/painter/work/shops")}
            testID="work-shops"
          />
        ) : null}
      </ListGroup>
      <Text variant="small" tone="soft">
        {t("work.onWebsiteHint")}
      </Text>
      <ListGroup>
        <ListRow icon="external-link" title={t("work.onWebsite")} onPress={() => void openWebPage(`${env.painterOrigin}/work`)} />
      </ListGroup>
    </Screen>
  );
}
