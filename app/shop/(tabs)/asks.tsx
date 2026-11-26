import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { messageFor } from "@/api/errors";
import { shopApi, type LeaveRequest, type PriceRequest } from "@/api/endpoints/shop";
import { AttendanceAsks } from "@/features/shop/AttendanceAsks";
import { keys } from "@/api/query-keys";
import {
  Button,
  EmptyState,
  ErrorState,
  Pill,
  type PillTone,
  Screen,
  Segmented,
  Sheet,
  Skeleton,
  Text,
  TextField,
  useToast,
} from "@/components/ui";
import { useShop } from "@/features/shop/ShopContext";
import { ShopGate } from "@/features/shop/ShopGate";
import { ShopHeader } from "@/features/shop/ShopHeader";
import { useShopLeave, useShopPriceRequests } from "@/features/shop/use-shop";
import { daysWords, leaveStatus, leaveWhen } from "@/features/shop/words";
import { t } from "@/i18n";
import { formatServerDateTime } from "@/lib/dates";
import { buzz } from "@/lib/haptics";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { hairline, useTheme } from "@/theme";

type Tab = "prices" | "leave" | "attendance";

const LEAVE_TONE: Record<LeaveRequest["status"], PillTone> = {
  OPEN: "warning",
  APPROVED: "success",
  REFUSED: "danger",
  CANCELLED: "plain",
};

/**
 * What the staff ask of the owner, answered on the spot: a price they need for a customer (a line
 * of reply reaches them in the HueVistaa Staff app), days off (approved paid, without pay, or by the
 * shop's own rule — or refused with a word), and the rest about their days: a day to put right,
 * overtime to OK, piece work a helper wrote down. Waiting first; answered below, for a while. The
 * website's price requests, leave and requests pages, on the phone.
 */
export default function ShopAsks() {
  const { space } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { shop, alert } = useShop();
  const [tab, setTab] = useState<Tab>(params.tab === "leave" ? "leave" : params.tab === "attendance" ? "attendance" : "prices");
  const requests = useShopPriceRequests(shop?.id);
  const leave = useShopLeave(shop?.id);
  const pull = usePullToRefresh(() => Promise.all([requests.refetch(), leave.refetch()]));

  const openQuestions = (requests.data ?? []).filter((r) => r.status === "OPEN").length || alert?.openRequests || 0;
  const openLeave = (leave.data ?? []).filter((l) => l.status === "OPEN").length || alert?.leaveRequestsWaiting || 0;
  const openAttendance = (alert?.correctionsWaiting ?? 0) + (alert?.overtimeWaiting ?? 0) + (alert?.pieceWorkWaiting ?? 0);

  return (
    <Screen scroll edges={["top"]} onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.lg, paddingBottom: space.xxl }}>
      <ShopHeader title={t("shop.asks.title")} />
      <ShopGate>
        {(current) => (
          <>
            <Segmented<Tab>
              options={[
                { value: "prices", label: openQuestions ? `${t("shop.asks.prices")} · ${openQuestions}` : t("shop.asks.prices") },
                { value: "leave", label: openLeave ? `${t("shop.asks.leave")} · ${openLeave}` : t("shop.asks.leave") },
                {
                  value: "attendance",
                  label: openAttendance ? `${t("shop.asks.attendance")} · ${openAttendance}` : t("shop.asks.attendance"),
                },
              ]}
              value={tab}
              onChange={(next) => {
                buzz.select();
                setTab(next);
              }}
              accessibilityLabel={t("shop.asks.title")}
              compact
            />
            {tab === "prices" ? (
              <PriceQuestions orgId={current.id} query={requests} />
            ) : tab === "leave" ? (
              <LeaveAsks orgId={current.id} query={leave} />
            ) : (
              <AttendanceAsks orgId={current.id} />
            )}
          </>
        )}
      </ShopGate>
    </Screen>
  );
}

// ── Price questions ───────────────────────────────────────────────────────────

function PriceQuestions({ orgId, query }: { orgId: string; query: ReturnType<typeof useShopPriceRequests> }) {
  const { space } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [answering, setAnswering] = useState<PriceRequest | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  if (query.isPending) return <Skeleton height={96} radius={16} />;
  if (!query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const open = query.data.filter((r) => r.status === "OPEN");
  const answered = query.data.filter((r) => r.status === "ANSWERED");

  const send = async () => {
    if (!answering || !reply.trim()) return;
    setBusy(true);
    try {
      const done = await shopApi.answerPrice(orgId, answering.id, { reply: reply.trim() });
      queryClient.setQueryData<PriceRequest[]>(keys.priceRequests(orgId), (cur) => (cur ?? []).map((r) => (r.id === done.id ? done : r)));
      void queryClient.invalidateQueries({ queryKey: keys.shopAlerts });
      buzz.success();
      toast.show(t("shop.asks.replied", { name: answering.requestedByName }), "success");
      setAnswering(null);
    } catch (err) {
      toast.show(messageFor(err, t("shop.asks.answerFailed")), "error");
    } finally {
      setBusy(false);
    }
  };

  if (query.data.length === 0) return <EmptyState icon="message-circle" title={t("shop.asks.noQuestions")} />;

  return (
    <View style={{ gap: space.sm }} testID="price-questions">
      {open.map((r) => (
        <AskCard key={r.id} testID={`question-${r.id}`} waiting>
          <Text variant="small" tone="mute">
            {t("shop.asks.asked", { name: r.requestedByName })}
            {r.createdAt ? ` · ${formatServerDateTime(r.createdAt)}` : ""}
          </Text>
          <Text variant="title3">{r.itemText}</Text>
          {r.note ? (
            <Text variant="body" tone="soft">
              {r.note}
            </Text>
          ) : null}
          <Button
            variant="secondary"
            icon="corner-down-right"
            label={t("shop.asks.answer")}
            onPress={() => {
              setReply("");
              setAnswering(r);
            }}
            testID={`answer-${r.id}`}
          />
        </AskCard>
      ))}
      {answered.length > 0 ? (
        <Text variant="label" tone="mute" style={{ marginTop: space.sm, paddingHorizontal: space.xxs }}>
          {t("shop.asks.answered")}
        </Text>
      ) : null}
      {answered.map((r) => (
        <AskCard key={r.id} testID={`question-${r.id}`}>
          <Text variant="small" tone="mute">
            {t("shop.asks.asked", { name: r.requestedByName })}
          </Text>
          <Text variant="bodyStrong">{r.itemText}</Text>
          {r.reply ? (
            <Text variant="body" tone="soft">
              {t("shop.asks.repliedWith", { reply: r.reply })}
            </Text>
          ) : null}
        </AskCard>
      ))}

      <Sheet
        visible={answering !== null}
        onClose={busy ? () => {} : () => setAnswering(null)}
        title={answering ? t("shop.asks.answerTitle", { name: answering.requestedByName }) : undefined}
        testID="answer-sheet"
      >
        {answering ? (
          <View style={{ gap: space.md }}>
            <Text variant="title3">{answering.itemText}</Text>
            <TextField
              label={t("shop.asks.reply")}
              value={reply}
              onChangeText={setReply}
              placeholder={t("shop.asks.replyPlaceholder")}
              maxLength={300}
              autoFocus
              testID="answer-reply"
            />
            <Button icon="send" label={t("shop.asks.sendReply")} loading={busy} disabled={busy || !reply.trim()} onPress={() => void send()} testID="answer-send" />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

// ── Asks for leave ────────────────────────────────────────────────────────────

function LeaveAsks({ orgId, query }: { orgId: string; query: ReturnType<typeof useShopLeave> }) {
  const { space } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [refusing, setRefusing] = useState<LeaveRequest | null>(null);
  const [reply, setReply] = useState("");

  if (query.isPending) return <Skeleton height={120} radius={16} />;
  if (!query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.length === 0) return <EmptyState icon="sun" title={t("shop.asks.noLeave")} />;
  const open = query.data.filter((l) => l.status === "OPEN");
  const decided = query.data.filter((l) => l.status !== "OPEN");

  /** `paid` left out with APPROVE goes by the shop's rule: paid as far as the leave left covers. */
  const answer = async (ask: LeaveRequest, action: "APPROVE" | "REFUSE", paid?: boolean, words?: string) => {
    setBusy(ask.id);
    try {
      const done = await shopApi.answerLeave(orgId, ask.id, {
        action,
        ...(paid === undefined ? {} : { paid }),
        ...(words?.trim() ? { reply: words.trim() } : {}),
      });
      queryClient.setQueryData<LeaveRequest[]>(keys.shopLeave(orgId), (cur) => (cur ?? []).map((l) => (l.id === done.id ? done : l)));
      void queryClient.invalidateQueries({ queryKey: keys.shopAlerts });
      // Approved days go into the register by themselves: read it again.
      void queryClient.invalidateQueries({ queryKey: ["shop", orgId, "register"] });
      buzz.success();
      toast.show(action === "APPROVE" ? t("shop.asks.approved") : t("shop.asks.refused", { name: ask.staffName }), "success");
      setRefusing(null);
    } catch (err) {
      toast.show(messageFor(err, t("shop.asks.leaveFailed")), "error");
    } finally {
      setBusy(null);
    }
  };

  const days = (l: LeaveRequest) =>
    l.portion && l.portion !== "FULL"
      ? leaveWhen(l)
      : l.days === 1
        ? t("shop.asks.leaveOneDay", { range: leaveWhen(l) })
        : t("shop.asks.leaveDays", { range: leaveWhen(l), n: l.days });

  return (
    <View style={{ gap: space.sm }} testID="leave-asks">
      {open.map((l) => (
        <AskCard key={l.id} testID={`leave-${l.id}`} waiting>
          <Text variant="small" tone="mute">
            {l.staffName}
            {l.createdAt ? ` · ${formatServerDateTime(l.createdAt)}` : ""}
          </Text>
          <Text variant="title3">{days(l)}</Text>
          {l.reason ? (
            <Text variant="body" tone="soft">
              {l.reason}
            </Text>
          ) : null}
          {l.leaveLeftDays != null ? (
            <Text variant="small" tone="mute" testID={`leave-left-${l.id}`}>
              {t("shop.asks.leftThatMonth", { name: l.staffName, days: daysWords(l.leaveLeftDays) })}
            </Text>
          ) : null}
          <View style={{ gap: space.xs }}>
            {l.leaveLeftDays != null ? (
              <Button
                icon="check"
                label={t("shop.asks.approveByRule")}
                loading={busy === l.id}
                disabled={busy !== null}
                onPress={() => void answer(l, "APPROVE")}
                testID={`approve-rule-${l.id}`}
              />
            ) : null}
            <Button
              variant={l.leaveLeftDays != null ? "secondary" : undefined}
              icon={l.leaveLeftDays != null ? undefined : "check"}
              label={t("shop.asks.approvePaid")}
              loading={l.leaveLeftDays == null && busy === l.id}
              disabled={busy !== null}
              onPress={() => void answer(l, "APPROVE", true)}
              testID={`approve-paid-${l.id}`}
            />
            <Button
              variant="secondary"
              label={t("shop.asks.approveUnpaid")}
              disabled={busy !== null}
              onPress={() => void answer(l, "APPROVE", false)}
              testID={`approve-unpaid-${l.id}`}
            />
            <Button
              variant="ghost"
              label={t("shop.asks.refuse")}
              disabled={busy !== null}
              onPress={() => {
                setReply("");
                setRefusing(l);
              }}
              testID={`refuse-${l.id}`}
            />
          </View>
        </AskCard>
      ))}
      {decided.length > 0 ? (
        <Text variant="label" tone="mute" style={{ marginTop: space.sm, paddingHorizontal: space.xxs }}>
          {t("shop.asks.answered")}
        </Text>
      ) : null}
      {decided.map((l) => (
        <AskCard key={l.id} testID={`leave-${l.id}`}>
          <View style={styles.row}>
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {l.staffName}
            </Text>
            <Pill label={leaveStatus(l)} tone={LEAVE_TONE[l.status]} />
          </View>
          <Text variant="body" tone="soft">
            {days(l)}
            {l.decidedByName ? ` · ${t("shop.asks.decidedBy", { name: l.decidedByName })}` : ""}
          </Text>
        </AskCard>
      ))}

      <Sheet
        visible={refusing !== null}
        onClose={busy ? () => {} : () => setRefusing(null)}
        title={refusing ? t("shop.asks.refuseTitle", { name: refusing.staffName }) : undefined}
        testID="refuse-sheet"
      >
        {refusing ? (
          <View style={{ gap: space.md }}>
            <Text variant="body" tone="soft">
              {days(refusing)}
            </Text>
            <TextField
              label={t("shop.asks.refuseReply")}
              value={reply}
              onChangeText={setReply}
              placeholder={t("shop.asks.refuseReplyPlaceholder")}
              maxLength={300}
              testID="refuse-reply"
            />
            <Button
              variant="danger"
              label={t("shop.asks.refuse")}
              loading={busy === refusing.id}
              disabled={busy !== null}
              onPress={() => void answer(refusing, "REFUSE", undefined, reply)}
              testID="refuse-sheet-confirm"
            />
            <Button variant="ghost" label={t("common.cancel")} disabled={busy !== null} onPress={() => setRefusing(null)} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

/** One ask: brass-edged while it waits for the owner, quiet once answered. */
function AskCard({ children, waiting = false, testID }: { children: ReactNode; waiting?: boolean; testID?: string }) {
  const { colors, radius, space } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          gap: space.xs,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderColor: waiting ? colors.ruleBrass : colors.rule,
          borderLeftColor: waiting ? colors.accent : colors.rule,
        },
      ]}
    >
      {waiting ? <Feather name="clock" size={14} color={colors.accentText} style={styles.clock} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: hairline, borderLeftWidth: 3 },
  clock: { position: "absolute", top: 14, right: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
