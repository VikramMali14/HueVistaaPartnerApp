import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { messageFor } from "@/api/errors";
import { shopApi, type AttendanceStatus, type Place, type RegisterDay, type StaffDay } from "@/api/endpoints/shop";
import { keys } from "@/api/query-keys";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Pill,
  type PillTone,
  PressableScale,
  Screen,
  Skeleton,
  Text,
  useToast,
} from "@/components/ui";
import { MarkSheet } from "@/features/shop/MarkSheet";
import { PlacesCard } from "@/features/shop/PlacesCard";
import { useShop } from "@/features/shop/ShopContext";
import { ShopGate } from "@/features/shop/ShopGate";
import { ShopHeader } from "@/features/shop/ShopHeader";
import { useRegister } from "@/features/shop/use-shop";
import { addDays, dayFromToday, dayLabel, statusLabel, timeLabel, whereLabel } from "@/features/shop/words";
import { t } from "@/i18n";
import { buzz } from "@/lib/haptics";
import { openWebPage, webPages } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { hairline, useTheme } from "@/theme";

const TONE: Record<AttendanceStatus, PillTone> = {
  PRESENT: "success",
  HALF_DAY: "accent",
  ABSENT: "danger",
  PAID_LEAVE: "plain",
  WEEK_OFF: "plain",
  HOLIDAY: "plain",
};

/**
 * The register, for one day: everybody, with how their day stands — marked in from where, at what
 * time, late or not — and the owner's mark on it, a tap away. Everybody not marked yet can be
 * marked present at once. Under it, the places staff mark in from, saved from where the owner
 * stands. The website's attendance page, on the phone (HueVistaFrontEnd app/(app)/attendance).
 */
export default function ShopStaff() {
  const { space } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { shop } = useShop();
  const today = dayFromToday(0);
  const [date, setDate] = useState(today);
  const register = useRegister(shop?.id, date);
  const pull = usePullToRefresh(() => register.refetch());
  const [open, setOpen] = useState<StaffDay | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const put = (next: RegisterDay) => {
    if (shop) queryClient.setQueryData<RegisterDay>(keys.register(shop.id, date), next);
  };
  const putDay = (day: StaffDay) => {
    if (!shop) return;
    queryClient.setQueryData<RegisterDay>(keys.register(shop.id, date), (cur) =>
      cur ? { ...cur, staff: cur.staff.map((d) => (d.staffId === day.staffId ? day : d)) } : cur,
    );
    // The counts are the server's to work out: read the day again behind the change.
    void queryClient.invalidateQueries({ queryKey: keys.register(shop.id, date) });
    void queryClient.invalidateQueries({ queryKey: keys.shopAlerts });
  };

  const mark = async (status: AttendanceStatus | null) => {
    if (!shop || !open) return;
    setBusy(open.staffId);
    try {
      const day = await shopApi.mark(shop.id, open.staffId, date, status);
      buzz.success();
      putDay(day);
      setOpen(null);
    } catch (err) {
      buzz.warning();
      toast.show(messageFor(err, t("shop.register.markFailed")), "error");
    } finally {
      setBusy(null);
    }
  };

  const markAll = async () => {
    if (!shop) return;
    setBusy("all");
    try {
      put(await shopApi.markMany(shop.id, date, { status: "PRESENT", onlyUnmarked: true }));
      buzz.success();
      toast.show(t("shop.register.markAllDone"), "success");
    } catch (err) {
      toast.show(messageFor(err, t("shop.register.markFailed")), "error");
    } finally {
      setBusy(null);
    }
  };

  const switcher = (
    <View style={styles.switcher}>
      <IconButton icon="chevron-left" label={t("shop.register.dayBefore")} onPress={() => setDate((d) => addDays(d, -1))} testID="day-before" />
      <IconButton icon="chevron-right" label={t("shop.register.dayAfter")} onPress={() => setDate((d) => addDays(d, 1))} disabled={date >= today} testID="day-after" />
    </View>
  );

  return (
    <Screen scroll edges={["top"]} onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.lg, paddingBottom: space.xxl }}>
      <ShopHeader eyebrow={date === today ? t("shop.register.today") : dayLabel(date)} title={t("shop.register.title")} right={switcher} />
      <ShopGate>
        {(current) => {
          if (register.isPending) {
            return (
              <View style={{ gap: space.sm }} testID="register-loading">
                <Skeleton height={72} radius={16} />
                <Skeleton height={72} radius={16} />
              </View>
            );
          }
          if (!register.data) {
            return <ErrorState error={register.error} message={t("shop.register.loadFailed")} onRetry={() => void register.refetch()} />;
          }
          const data = register.data;
          const unmarked = data.counts.NOT_MARKED ?? 0;
          return (
            <>
              {data.staff.length === 0 ? (
                <View style={{ gap: space.md }}>
                  <EmptyState icon="users" title={t("shop.today.noStaff")} />
                  <Button variant="secondary" icon="external-link" label={t("shop.today.addStaff")} onPress={() => void openWebPage(webPages.shopStaff)} />
                </View>
              ) : (
                <View style={{ gap: space.sm }}>
                  <Text variant="small" tone="mute">
                    {data.unmarkedPresent ? t("shop.register.unmarkedPresent") : t("shop.register.unmarkedAbsent")}
                  </Text>
                  {unmarked > 0 ? (
                    <Button icon="check-circle" label={t("shop.register.markAll")} loading={busy === "all"} disabled={busy !== null} onPress={() => void markAll()} testID="mark-all" />
                  ) : null}
                  {data.staff.map((day) => (
                    <StaffRow key={day.staffId} day={day} onPress={() => setOpen(day)} />
                  ))}
                </View>
              )}
              <PlacesCard orgId={current.id} places={data.places} onSaved={(places: Place[]) => put({ ...data, places })} />
            </>
          );
        }}
      </ShopGate>
      <MarkSheet day={open} busy={busy !== null} onMark={(status) => void mark(status)} onClose={() => setOpen(null)} />
    </Screen>
  );
}

/** One person on the register: their name, how the day stands, and the facts behind it. */
function StaffRow({ day, onPress }: { day: StaffDay; onPress: () => void }) {
  const { colors, radius, space } = useTheme();
  const inAt = timeLabel(day.checkedInAt);
  const outAt = timeLabel(day.checkedOutAt);
  const where = whereLabel(day);
  const facts = [
    inAt ? t("shop.register.in", { time: inAt }) : null,
    outAt ? t("shop.register.out", { time: outAt }) : null,
    day.late && day.lateMinutes ? t("shop.register.late", { n: day.lateMinutes }) : null,
    where,
  ].filter(Boolean) as string[];
  const label = day.status ? statusLabel(day.status) : t("shop.register.notMarked");
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`${day.staffName}, ${label}${facts.length ? `. ${facts.join(", ")}` : ""}`}
      testID={`staff-${day.staffId}`}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.rule, borderRadius: radius.md, gap: space.sm }]}
    >
      <Avatar name={day.staffName} size={40} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.line}>
          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {day.staffName}
          </Text>
          {day.status ? (
            <Pill label={label} tone={TONE[day.status]} testID={`status-${day.staffId}`} />
          ) : (
            <Pill label={label} tone="warning" testID={`status-${day.staffId}`} />
          )}
        </View>
        {facts.length > 0 ? (
          <Text variant="small" tone="mute" numberOfLines={2}>
            {facts.join(" · ")}
          </Text>
        ) : null}
        {day.auto ? (
          <Text variant="caption" tone="mute">
            {t("shop.register.byItself")}
          </Text>
        ) : null}
        {day.staffNote?.trim() ? (
          <View style={styles.note}>
            <Feather name="message-square" size={13} color={colors.fgMute} />
            <Text variant="small" tone="soft" style={{ flex: 1 }} numberOfLines={2}>
              {t("shop.register.note", { note: day.staffNote.trim() })}
            </Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  switcher: { flexDirection: "row", gap: 4 },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 14, borderWidth: hairline },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  note: { flexDirection: "row", alignItems: "center", gap: 6 },
});
