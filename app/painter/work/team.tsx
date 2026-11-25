import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";

import { messageFor } from "@/api/errors";
import { workApi, type CrewRegister, type DayStatus } from "@/api/endpoints/work";
import { keys } from "@/api/query-keys";
import { BackButton, Button, Card, Chip, EmptyState, ErrorState, ListGroup, ListRow, Screen, Skeleton, Text, useToast } from "@/components/ui";
import { env } from "@/config/env";
import { useRegister, useWages } from "@/features/work/use-work";
import { dayStatus, todayInIndia } from "@/features/work/words";
import { WorkTitle } from "@/features/work/WorkTitle";
import { t } from "@/i18n";
import { formatRupees } from "@/lib/money";
import { openWebPage } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme";

/** The marks a day takes from the phone; leave, a week off and a holiday are set on the website. */
const MARKS: readonly DayStatus[] = ["PRESENT", "HALF_DAY", "ABSENT"];

/**
 * P14 · Team. Spec: docs/05-screens-painter.md — P14. Web reference:
 * HueVistaaPainter app/(app)/(painter)/team.
 *
 * Today's register: each person, and Present, Half day or Absent — saved as it is tapped — or the
 * rest marked present in one go. Under it, this month's wages: what each is owed, or the advance they
 * have still to work off.
 */
export default function Team() {
  const { space } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = todayInIndia();
  const register = useRegister(today);
  const wages = useWages();
  const [busy, setBusy] = useState<string | null>(null);
  const pull = usePullToRefresh(() => Promise.all([register.refetch(), wages.refetch()]));

  const put = (next: CrewRegister) => queryClient.setQueryData(keys.workRegister(today), next);
  const changed = () => void queryClient.invalidateQueries({ queryKey: keys.workWages }).catch(() => {});

  const mark = async (memberId: string, status: DayStatus) => {
    const now = register.data;
    if (!now) return;
    setBusy(memberId);
    // Shown as tapped at once; put back as it was if it isn't saved.
    put({
      ...now,
      members: now.members.map((m) => (m.memberId === memberId ? { ...m, status, auto: false } : m)),
      notMarked: now.members.filter((m) => m.memberId !== memberId && (m.status == null || m.auto)).length,
    });
    try {
      const saved = await workApi.mark(today, memberId, status);
      queryClient.setQueryData<CrewRegister>(keys.workRegister(today), (cur) =>
        cur ? { ...cur, members: cur.members.map((m) => (m.memberId === memberId ? saved : m)) } : cur,
      );
      changed();
    } catch (err) {
      put(now);
      toast.show(messageFor(err, t("work.team.saveFailed")), "error");
    } finally {
      setBusy(null);
    }
  };

  const markRest = async () => {
    setBusy("rest");
    try {
      put(await workApi.markRest(today, "PRESENT"));
      changed();
    } catch (err) {
      toast.show(messageFor(err, t("work.team.saveFailed")), "error");
    } finally {
      setBusy(null);
    }
  };

  let body;
  if (register.isPending) {
    body = (
      <View style={{ gap: space.sm }} testID="team-loading">
        <Skeleton height={96} radius={16} />
        <Skeleton height={96} radius={16} />
      </View>
    );
  } else if (!register.data) {
    body = <ErrorState error={register.error} onRetry={() => void register.refetch()} />;
  } else if (register.data.members.length === 0) {
    body = (
      <EmptyState
        icon="users"
        title={t("work.team.empty")}
        actionLabel={t("work.team.addOnWebsite")}
        onAction={() => void openWebPage(`${env.painterOrigin}/team`)}
      />
    );
  } else {
    const r = register.data;
    body = (
      <View style={{ gap: space.sm }}>
        <Text variant="title3" accessibilityRole="header">
          {t("work.team.today")}
        </Text>
        <Text variant="painterBody" tone="soft" testID="team-not-marked">
          {r.notMarked === 0
            ? t("work.team.allMarked")
            : r.notMarked === 1
              ? t("work.team.notMarkedOne")
              : t("work.team.notMarkedMany", { n: r.notMarked })}
        </Text>
        {r.members.map((m) => (
          <Card key={m.memberId} testID={`member-${m.memberId}`}>
            <View style={{ gap: space.xs }}>
              <Text variant="painterStrong">{m.name}</Text>
              {m.auto && m.status ? (
                <Text variant="small" tone="mute">
                  {t("work.team.counted", { status: dayStatus(m.status) })}
                </Text>
              ) : null}
              {m.siteName ? (
                <Text variant="small" tone="mute">
                  {t("work.team.site", { site: m.siteName })}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
                {MARKS.map((status) => (
                  <Chip
                    key={status}
                    label={dayStatus(status)}
                    role="radio"
                    selected={!m.auto && m.status === status}
                    disabled={busy !== null}
                    onPress={() => void mark(m.memberId, status)}
                    testID={`mark-${m.memberId}-${status}`}
                  />
                ))}
              </View>
            </View>
          </Card>
        ))}
        {r.notMarked > 0 ? (
          <Button variant="secondary" label={t("work.team.markRest")} loading={busy === "rest"} disabled={busy !== null} onPress={() => void markRest()} testID="mark-rest" />
        ) : null}
      </View>
    );
  }

  const w = wages.data;
  return (
    <Screen scroll onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.lg, paddingBottom: space.xl }}>
      <BackButton fallback="/painter/work" />
      <WorkTitle title={t("work.team.title")} />
      {body}
      {w && w.members.length > 0 ? (
        <View style={{ gap: space.sm }} testID="team-wages">
          <Text variant="title3" accessibilityRole="header">
            {t("work.team.wagesTitle")}
          </Text>
          <ListGroup>
            {w.members.map((row) => (
              <ListRow
                key={row.memberId}
                title={row.name}
                detail={t("work.team.days", { n: row.paidDays })}
                value={
                  row.balancePaise > 0
                    ? t("work.team.due", { amount: formatRupees(row.balancePaise) })
                    : row.balancePaise < 0
                      ? t("work.team.advanceLeft", { amount: formatRupees(-row.balancePaise) })
                      : t("work.team.settled")
                }
              />
            ))}
          </ListGroup>
          {w.totalDuePaise > 0 ? (
            <Text variant="painterStrong">{t("work.team.totalDue", { amount: formatRupees(w.totalDuePaise) })}</Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
