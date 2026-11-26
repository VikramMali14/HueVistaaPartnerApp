import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { ShopAlert, StaffDay, Waiting } from "@/api/endpoints/shop";
import { useSession } from "@/auth/session";
import { Card, ListGroup, ListRow, Pill, type PillTone, PressableScale, Screen, Skeleton, Text, useReducedMotion } from "@/components/ui";
import { useShop } from "@/features/shop/ShopContext";
import { ShopGate } from "@/features/shop/ShopGate";
import { ShopHeader } from "@/features/shop/ShopHeader";
import { useRegister, useShopAlerts } from "@/features/shop/use-shop";
import { dayFromToday, greeting, longDayLabel, statusLabel } from "@/features/shop/words";
import { t, type MessageKey } from "@/i18n";
import { openWebPage, webPages } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { hairline, useTheme } from "@/theme";

type Icon = ComponentProps<typeof Feather>["name"];

/** The first word of a name — "Good morning, Ramesh" reads warmer than the whole of it. */
function firstName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

/** "Suresh: Apex 10 L" — who is waiting, and for what. */
function newestLine(w: Waiting | null | undefined): string | null {
  if (!w?.by && !w?.item) return null;
  return t("shop.today.newest", { by: w.by ?? "", item: w.item ?? "" });
}

/**
 * Today, for a shop's owner. What needs them first — price questions and asks for leave, which they
 * answer here — then who is in today, then what waits on the website (claims to check, the godown,
 * painters' payments). Nothing waiting is said plainly: a calm screen is good news.
 */
export default function ShopToday() {
  const router = useRouter();
  const { space } = useTheme();
  const { profile } = useSession();
  const { shop, alert } = useShop();
  const alerts = useShopAlerts();
  const today = dayFromToday(0);
  const register = useRegister(shop?.id, today);
  const pull = usePullToRefresh(() => Promise.all([alerts.refetch(), register.refetch()]));
  const reduced = useReducedMotion();
  const enter = (i: number) => (reduced ? undefined : FadeInDown.delay(60 + i * 70).duration(340));

  const name = profile?.namePending ? null : firstName(profile?.name);
  const hello = name ? t("shop.greetingName", { greeting: greeting(), name }) : greeting();

  return (
    <Screen scroll edges={["top"]} onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.xl, paddingBottom: space.xxl }}>
      <ShopHeader eyebrow={longDayLabel(today)} title={hello} />
      <ShopGate>
        {() => (
          <>
            <Animated.View entering={enter(0)} style={{ gap: space.sm }}>
              <Text variant="label" tone="mute" accessibilityRole="header" style={{ paddingHorizontal: space.xxs }}>
                {t("shop.today.needsYou")}
              </Text>
              {alert ? (
                <NeedsYou alert={alert} onOpen={(tab) => router.navigate({ pathname: "/shop/asks", params: { tab } })} />
              ) : alerts.isPending ? (
                <Skeleton height={64} radius={16} />
              ) : (
                <StaffOff />
              )}
            </Animated.View>

            <Animated.View entering={enter(1)}>
              <TodayRegister
                loading={register.isPending}
                staff={register.data?.staff ?? null}
                counts={register.data?.counts ?? {}}
                onOpen={() => router.navigate("/shop/staff")}
              />
            </Animated.View>

            {alert ? (
              <Animated.View entering={enter(2)}>
                <OnWebsite alert={alert} />
              </Animated.View>
            ) : null}
          </>
        )}
      </ShopGate>
    </Screen>
  );
}

/**
 * The price questions, asks for leave and attendance requests (days to put right, overtime, piece
 * work) waiting, each a tap from its answer — or "nothing waiting".
 */
function NeedsYou({ alert, onOpen }: { alert: ShopAlert; onOpen: (tab: "prices" | "leave" | "attendance") => void }) {
  const { colors, radius } = useTheme();
  const items: { key: "prices" | "leave" | "attendance"; icon: Icon; title: string; line: string | null }[] = [];
  if (alert.openRequests > 0) {
    items.push({
      key: "prices",
      icon: "message-circle",
      title: alert.openRequests === 1 ? t("shop.today.questionOne") : t("shop.today.questions", { n: alert.openRequests }),
      line: newestLine(alert.newestRequest),
    });
  }
  if (alert.leaveRequestsWaiting > 0) {
    items.push({
      key: "leave",
      icon: "sun",
      title: alert.leaveRequestsWaiting === 1 ? t("shop.today.leaveOne") : t("shop.today.leave", { n: alert.leaveRequestsWaiting }),
      line: newestLine(alert.newestLeaveRequest),
    });
  }
  const attendance = (alert.correctionsWaiting ?? 0) + (alert.overtimeWaiting ?? 0) + (alert.pieceWorkWaiting ?? 0);
  if (attendance > 0) {
    items.push({
      key: "attendance",
      icon: "clock",
      title: attendance === 1 ? t("shop.today.attendanceOne") : t("shop.today.attendance", { n: attendance }),
      line: newestLine(alert.newestCorrection),
    });
  }
  if (items.length === 0) {
    return (
      <View style={[styles.clear, { backgroundColor: `${colors.success}1f`, borderColor: `${colors.success}55`, borderRadius: radius.md }]} testID="needs-nothing">
        <Feather name="check-circle" size={20} color={colors.successText} />
        <Text variant="body" style={{ flex: 1 }}>
          {t("shop.today.allClear")}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => (
        <PressableScale
          key={item.key}
          onPress={() => onOpen(item.key)}
          accessibilityLabel={item.line ? `${item.title}. ${item.line}` : item.title}
          testID={`needs-${item.key}`}
          style={[styles.need, { backgroundColor: `${colors.accent}1f`, borderColor: colors.ruleBrass, borderRadius: radius.md }]}
        >
          <View style={[styles.needIcon, { backgroundColor: colors.accent }]}>
            <Feather name={item.icon} size={18} color={colors.accentOn} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong">{item.title}</Text>
            {item.line ? (
              <Text variant="small" tone="soft" numberOfLines={1}>
                {item.line}
              </Text>
            ) : null}
          </View>
          <Feather name="chevron-right" size={20} color={colors.accentText} />
        </PressableScale>
      ))}
    </View>
  );
}

/** A shop whose staff the HueVistaa team hasn't switched on: nothing can wait here yet. */
function StaffOff() {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.clear, { backgroundColor: colors.surface, borderColor: colors.rule, borderRadius: radius.md }]} testID="staff-off">
      <Feather name="info" size={20} color={colors.fgMute} />
      <Text variant="body" tone="soft" style={{ flex: 1 }}>
        {t("shop.staffOff")}
      </Text>
    </View>
  );
}

const STATUS_ORDER = ["PRESENT", "HALF_DAY", "NOT_MARKED", "ABSENT", "PAID_LEAVE", "WEEK_OFF", "HOLIDAY"] as const;
const COUNT_KEY: Record<(typeof STATUS_ORDER)[number], MessageKey> = {
  PRESENT: "status.present",
  HALF_DAY: "status.halfDay",
  NOT_MARKED: "status.notMarked",
  ABSENT: "status.absent",
  PAID_LEAVE: "status.paidLeave",
  WEEK_OFF: "status.weekOff",
  HOLIDAY: "status.holiday",
};
const COUNT_TONE: Record<(typeof STATUS_ORDER)[number], PillTone> = {
  PRESENT: "success",
  HALF_DAY: "accent",
  NOT_MARKED: "warning",
  ABSENT: "danger",
  PAID_LEAVE: "plain",
  WEEK_OFF: "plain",
  HOLIDAY: "plain",
};

/** Who is in today, at a glance: the counts, and each person with where their day stands. */
function TodayRegister({
  loading,
  staff,
  counts,
  onOpen,
}: {
  loading: boolean;
  staff: StaffDay[] | null;
  counts: Partial<Record<string, number>>;
  onOpen: () => void;
}) {
  const { colors, space } = useTheme();
  return (
    <Card testID="today-register" style={{ gap: space.md }}>
      <View style={styles.registerHead}>
        <Text variant="title3" accessibilityRole="header" style={{ flex: 1 }}>
          {t("shop.today.register")}
        </Text>
      </View>
      {loading ? (
        <Skeleton height={60} radius={12} />
      ) : !staff || staff.length === 0 ? (
        <Text variant="body" tone="soft">
          {t("shop.today.noStaff")}
        </Text>
      ) : (
        <>
          <View style={styles.pills}>
            {STATUS_ORDER.filter((key) => (counts[key] ?? 0) > 0).map((key) => (
              <Pill key={key} label={`${counts[key]} ${t(COUNT_KEY[key])}`} tone={COUNT_TONE[key]} testID={`count-${key}`} />
            ))}
          </View>
          <View style={{ gap: space.xs }}>
            {staff.slice(0, 8).map((day) => (
              <View key={day.staffId} style={styles.person}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: day.status === "PRESENT" ? colors.success : day.status === "ABSENT" ? colors.danger : day.status ? colors.accent : "transparent",
                      borderColor: day.status ? "transparent" : colors.ruleStrong,
                    },
                  ]}
                />
                <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                  {day.staffName}
                </Text>
                <Text variant="small" tone={day.status ? "soft" : "mute"}>
                  {day.status ? statusLabel(day.status) : t("status.notMarked")}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      <PressableScale onPress={onOpen} accessibilityLabel={t("shop.today.openRegister")} testID="open-register" style={[styles.open, { borderTopColor: colors.rule }]}>
        <Text variant="bodyStrong" tone="accent" style={{ flex: 1 }}>
          {t("shop.today.openRegister")}
        </Text>
        <Feather name="arrow-right" size={18} color={colors.accentText} />
      </PressableScale>
    </Card>
  );
}

/** What waits on the shop's website — the work the app doesn't do yet. Only what is waiting. */
function OnWebsite({ alert }: { alert: ShopAlert }) {
  const { space } = useTheme();
  const rows: { id: string; icon: Icon; title: string; url: string }[] = [];
  if (alert.painterClaimsWaiting > 0) rows.push({ id: "claims", icon: "check-square", title: t("shop.today.painterClaims", { n: alert.painterClaimsWaiting }), url: webPages.shopApprovals });
  if (alert.staffSalesWaiting > 0) rows.push({ id: "staff-sales", icon: "edit-3", title: t("shop.today.staffSales", { n: alert.staffSalesWaiting }), url: webPages.shopApprovals });
  if (alert.materialListsWaiting > 0) rows.push({ id: "material", icon: "list", title: t("shop.today.materialLists", { n: alert.materialListsWaiting }), url: webPages.shopCommission });
  if (alert.paymentsNotReceived > 0) rows.push({ id: "payments", icon: "alert-circle", title: t("shop.today.paymentsNotReceived", { n: alert.paymentsNotReceived }), url: webPages.shopCommission });
  if (alert.duesAsked > 0) rows.push({ id: "dues", icon: "dollar-sign", title: t("shop.today.duesAsked", { n: alert.duesAsked }), url: webPages.shopCommission });
  if (alert.godownEntries > 0) rows.push({ id: "godown", icon: "package", title: t("shop.today.godown", { n: alert.godownEntries }), url: webPages.shopGodown });
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: space.xs }} testID="on-website">
      <ListGroup title={t("shop.today.onWebsite")}>
        {rows.map((row) => (
          <ListRow key={row.id} icon={row.icon} title={row.title} onPress={() => void openWebPage(row.url)} testID={`website-${row.id}`} />
        ))}
      </ListGroup>
      <Text variant="caption" tone="mute" style={{ paddingHorizontal: space.xxs }}>
        {t("shop.today.websiteHint")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clear: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderWidth: hairline },
  need: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: hairline },
  needIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  registerHead: { flexDirection: "row", alignItems: "center" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  person: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  open: { flexDirection: "row", alignItems: "center", paddingTop: 12, borderTopWidth: hairline },
});
