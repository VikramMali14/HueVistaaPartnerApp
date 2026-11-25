import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { messageFor } from "@/api/errors";
import { workApi, type CommissionEntry, type CommissionPayment } from "@/api/endpoints/work";
import { keys } from "@/api/query-keys";
import { BackButton, Banner, Button, Card, CountUp, ErrorState, ListGroup, ListRow, Pill, Screen, Skeleton, Text, TextField, useToast } from "@/components/ui";
import { env } from "@/config/env";
import { useKhata } from "@/features/work/use-work";
import { WorkTitle } from "@/features/work/WorkTitle";
import { t, type MessageKey } from "@/i18n";
import { formatDate, serverMoment } from "@/lib/dates";
import { formatRupees } from "@/lib/money";
import { openWebPage } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const MODE: Record<CommissionPayment["mode"], MessageKey> = {
  UPI: "work.shops.upi",
  CASH: "work.shops.cashMode",
  BANK: "work.shops.bankMode",
  OTHER: "work.shops.otherMode",
};

function entryLine(e: CommissionEntry): string {
  switch (e.status) {
    case "PENDING":
      return t("work.shops.claimWaiting");
    case "APPROVED":
    case "PARTLY_APPROVED":
      return t("work.shops.accepted", { amount: formatRupees(e.approvedPaise ?? e.claimedPaise) });
    case "REJECTED":
      return t("work.shops.claimRefused");
    case "CANCELLED":
      return t("work.shops.claimWithdrawn");
    case "REVERSED":
      return t("work.shops.claimReversed");
  }
}

/**
 * P20 · A shop's khata. Spec: docs/05-screens-painter.md — P20. Web reference:
 * HueVistaaPainter app/(app)/(painter)/shops/[linkId]/khata-screen.tsx.
 *
 * What the shop owes and since when; a reminder to it, once a week; each payment it wrote down — the
 * painter says it arrived, or didn't and what they checked, and talks a missing one out with the shop
 * until it turns up; and the claims and sales in the khata. A claim, with its photos, is sent on the
 * painter website.
 */
export default function Khata() {
  const { linkId = "" } = useLocalSearchParams<{ linkId: string }>();
  const { space } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const khata = useKhata(linkId);
  const pull = usePullToRefresh(() => khata.refetch());
  const [busy, setBusy] = useState<string | null>(null);
  // When the khata was read: a reminder sent in the week before it waits out the week.
  const [readAt] = useState(() => Date.now());

  if (khata.isPending) {
    return (
      <Screen scroll contentStyle={{ gap: space.lg }}>
        <BackButton fallback="/painter/work/shops" />
        <View style={{ gap: space.sm }} testID="khata-loading">
          <Skeleton height={140} radius={16} />
        </View>
      </Screen>
    );
  }
  if (!khata.data) {
    return (
      <Screen scroll contentStyle={{ gap: space.lg }}>
        <BackButton fallback="/painter/work/shops" />
        <ErrorState error={khata.error} onRetry={() => void khata.refetch()} />
      </Screen>
    );
  }
  const k = khata.data;
  const shop = k.shop;
  const remindedAt = serverMoment(shop.duesRemindedAt);
  const remindedLately = Number.isFinite(remindedAt) && remindedAt > readAt - WEEK;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.workKhata(linkId) }),
      queryClient.invalidateQueries({ queryKey: keys.workShops, exact: true }),
    ]).catch(() => {});
  };

  const act = async (key: string, work: () => Promise<unknown>, done: string, failed: MessageKey) => {
    setBusy(key);
    try {
      await work();
      toast.show(done, "success");
      await refresh();
    } catch (err) {
      toast.show(messageFor(err, t(failed)), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.lg, paddingBottom: space.xl }}>
      <BackButton fallback="/painter/work/shops" />
      <WorkTitle title={shop.shopName} lede={[shop.place, shop.terms].filter(Boolean).join(" · ")} />

      <Card lit>
        <View style={{ gap: space.xs }} testID="khata-balance">
          <Text variant="label" tone="accent">
            {t("work.shops.dueToYou")}
          </Text>
          <CountUp value={Math.max(0, Math.round(k.balancePaise / 100))} variant="display" />
          {k.balancePaise > 0 && shop.owedSince ? (
            <Text variant="painterStrong">{t("work.shops.owedSince", { date: formatDate(shop.owedSince) })}</Text>
          ) : null}
          {k.balancePaise < 0 ? (
            <Text variant="painterBody" tone="soft">
              {t("work.shops.ahead", { amount: formatRupees(-k.balancePaise) })}
            </Text>
          ) : null}
        </View>
      </Card>

      {k.balancePaise > 0 ? (
        <View style={{ gap: space.xs }}>
          <Text variant="small" tone="soft">
            {t("work.shops.remindHint")}
          </Text>
          {remindedLately ? (
            <Text variant="painterBody" testID="khata-reminded">
              {t("work.shops.remindedOn", { date: formatDate(shop.duesRemindedAt) })}
            </Text>
          ) : (
            <Button
              variant="secondary"
              icon="bell"
              label={t("work.shops.remind", { shop: shop.shopName })}
              loading={busy === "remind"}
              disabled={busy !== null}
              onPress={() => void act("remind", () => workApi.remind(linkId), t("work.shops.reminded", { shop: shop.shopName }), "work.shops.remindFailed")}
              testID="khata-remind"
            />
          )}
        </View>
      ) : null}

      <View style={styles.actions}>
        {shop.status === "ACTIVE" ? (
          <View style={styles.fill}>
            <Button variant="secondary" icon="plus" label={t("work.shops.sendClaim")} onPress={() => void openWebPage(`${env.painterOrigin}/shops/${linkId}/claim`)} />
          </View>
        ) : null}
        {shop.shopPhone ? (
          <View style={styles.fill}>
            <Button variant="ghost" icon="phone" label={t("work.shops.call")} onPress={() => void Linking.openURL(`tel:${shop.shopPhone}`)} />
          </View>
        ) : null}
      </View>

      {k.payments.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="title3" accessibilityRole="header">
            {t("work.shops.paymentsTitle")}
          </Text>
          {k.payments.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              shopName={shop.shopName}
              busy={busy}
              onReceived={() => void act(p.id, () => workApi.received(p.id), t("work.shops.confirmed"), "work.shops.sendFailed")}
              onNotReceived={(note) => act(p.id, () => workApi.notReceived(p.id, note), t("work.shops.saidNot"), "work.shops.sendFailed")}
              onNote={(text) => act(`note-${p.id}`, () => workApi.paymentNote(p.id, text), t("work.shops.sent"), "work.shops.sendFailed")}
            />
          ))}
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Text variant="title3" accessibilityRole="header">
          {t("work.shops.claimsTitle")}
        </Text>
        {k.entries.length === 0 ? (
          <Text variant="painterBody" tone="soft">
            {t("work.shops.claimsEmpty")}
          </Text>
        ) : (
          <ListGroup>
            {k.entries.map((e) => (
              <ListRow
                key={e.id}
                title={e.billNo ? `${e.billNo}` : t("work.shops.claimed", { amount: formatRupees(e.claimedPaise) })}
                detail={[formatDate(e.billDate ?? e.createdAt), e.shopNote].filter(Boolean).join(" · ")}
                value={entryLine(e)}
              />
            ))}
          </ListGroup>
        )}
      </View>
    </Screen>
  );
}

/** One payment the shop wrote down, and the painter's answer to it — or the talk about one that didn't arrive. */
function PaymentCard({
  payment: p,
  shopName,
  busy,
  onReceived,
  onNotReceived,
  onNote,
}: {
  payment: CommissionPayment;
  shopName: string;
  busy: string | null;
  onReceived: () => void;
  onNotReceived: (note?: string) => Promise<void>;
  onNote: (text: string) => Promise<void>;
}) {
  const { space, colors } = useTheme();
  const [asking, setAsking] = useState(false);
  const [checked, setChecked] = useState("");
  const [reply, setReply] = useState("");
  const open = !p.undoneAt && p.painterStatus !== "RECEIVED";
  const disputed = p.painterStatus === "NOT_RECEIVED" && !p.undoneAt;

  return (
    <Card testID={`payment-${p.id}`}>
      <View style={{ gap: space.xs }}>
        <View style={styles.row}>
          <Text variant="title3" style={[styles.fill, p.undoneAt ? { textDecorationLine: "line-through" } : null]}>
            {formatRupees(p.amountPaise)}
          </Text>
          {p.undoneAt ? null : p.painterStatus === "RECEIVED" ? (
            <Pill label={t("work.shops.gotIt")} tone="success" />
          ) : p.painterStatus === "NOT_RECEIVED" ? (
            <Pill label={t("work.shops.notArrived")} tone="danger" />
          ) : null}
        </View>
        <Text variant="small" tone="mute">
          {t("work.shops.paymentLine", { mode: t(MODE[p.mode]), date: formatDate(p.paidOn) })}
          {p.reference ? ` · ${t("work.shops.utr", { ref: p.reference })}` : ""}
        </Text>
        {p.note ? <Text variant="small">{p.note}</Text> : null}
        {p.undoneAt ? <Text variant="small" tone="soft">{t("work.shops.undoneByShop", { reason: p.undoneReason ?? "" })}</Text> : null}

        {(p.notes ?? []).length > 0 ? (
          <View style={{ gap: space.xs }} accessibilityLabel={t("work.shops.talkTitle")}>
            {(p.notes ?? []).map((n) => (
              <View
                key={n.id}
                style={[
                  styles.note,
                  { borderColor: colors.rule, alignSelf: n.author === "PAINTER" ? "flex-end" : "flex-start" },
                ]}
              >
                <Text variant="caption" tone="mute">
                  {n.author === "PAINTER" ? t("work.shops.you") : shopName}
                  {n.createdAt ? ` · ${formatDate(n.createdAt)}` : ""}
                </Text>
                <Text variant="small">{n.text}</Text>
                {n.reference ? <Text variant="bodyStrong">{t("work.shops.utr", { ref: n.reference })}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {open && !asking ? (
          <View style={styles.row}>
            <View style={styles.fill}>
              <Button
                label={disputed ? t("work.shops.arrivedAfterAll") : t("work.shops.gotIt")}
                loading={busy === p.id}
                disabled={busy !== null}
                onPress={onReceived}
                testID={`received-${p.id}`}
              />
            </View>
            {p.painterStatus === "WAITING" ? (
              <View style={styles.fill}>
                <Button variant="secondary" label={t("work.shops.notArrived")} disabled={busy !== null} onPress={() => setAsking(true)} testID={`not-received-${p.id}`} />
              </View>
            ) : null}
          </View>
        ) : null}

        {asking ? (
          <View style={{ gap: space.xs }}>
            <Banner tone="warning" title={t("work.shops.notArrivedTitle", { shop: shopName })} message={t("work.shops.notArrivedBody")} />
            <TextField label={t("work.shops.notArrivedNote")} value={checked} onChangeText={setChecked} maxLength={500} testID={`checked-${p.id}`} />
            <View style={styles.row}>
              <View style={styles.fill}>
                <Button
                  label={t("work.shops.notArrivedSend")}
                  loading={busy === p.id}
                  disabled={busy !== null}
                  onPress={() =>
                    void onNotReceived(checked.trim() || undefined).then(() => {
                      setAsking(false);
                      setChecked("");
                    })
                  }
                  testID={`tell-shop-${p.id}`}
                />
              </View>
              <View style={styles.fill}>
                <Button variant="ghost" label={t("common.cancel")} onPress={() => setAsking(false)} />
              </View>
            </View>
          </View>
        ) : null}

        {disputed ? (
          <View style={{ gap: space.xs }}>
            <TextField label={t("work.shops.writeLabel")} value={reply} onChangeText={setReply} maxLength={500} testID={`reply-${p.id}`} />
            <Button
              variant="secondary"
              label={t("work.shops.send")}
              loading={busy === `note-${p.id}`}
              disabled={busy !== null || !reply.trim()}
              onPress={() => void onNote(reply.trim()).then(() => setReply(""))}
              testID={`send-note-${p.id}`}
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  fill: { flex: 1 },
  actions: { flexDirection: "row", gap: 8 },
  note: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxWidth: "90%", gap: 2 },
});
