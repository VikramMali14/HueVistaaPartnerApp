import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { messageFor } from "@/api/errors";
import { workApi, type EstimateStatus } from "@/api/endpoints/work";
import { keys } from "@/api/query-keys";
import { BackButton, Banner, Button, Card, ErrorState, ListGroup, ListRow, Screen, Segmented, Skeleton, Text, useToast } from "@/components/ui";
import { env } from "@/config/env";
import { useEstimate } from "@/features/work/use-work";
import { estimateStatus, whatsappUrl } from "@/features/work/words";
import { WorkTitle } from "@/features/work/WorkTitle";
import { t } from "@/i18n";
import { formatServerDate } from "@/lib/dates";
import { formatRupees } from "@/lib/money";
import { openWebPage } from "@/lib/open-web";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme";

const STATUSES: readonly EstimateStatus[] = ["OPEN", "ACCEPTED", "DECLINED"];
const UNIT: Record<string, string> = { SQ_FT: "sq ft", R_FT: "running ft", PIECE: "pcs", DAY: "days", JOB: "job" };

/**
 * P16 · Estimate. Spec: docs/05-screens-painter.md — P16. Web reference:
 * HueVistaaPainter app/(app)/(painter)/estimates/[estimateId]/estimate-screen.tsx.
 *
 * One estimate as the customer reads it — or, once it is the final bill, the bill: the rooms, the work
 * line by line, the total, and what the customer said on their own page. It goes to the customer on
 * WhatsApp, with the link to accept it when there is one; the painter says what the customer answered
 * at the door; it is changed on the painter website.
 */
export default function EstimateScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { space } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const estimate = useEstimate(id);
  const [busy, setBusy] = useState(false);
  const pull = usePullToRefresh(() => estimate.refetch());

  if (estimate.isPending) {
    return (
      <Screen scroll contentStyle={{ gap: space.lg }}>
        <BackButton fallback="/painter/work/estimates" />
        <View style={{ gap: space.sm }} testID="estimate-loading">
          <Skeleton height={120} radius={16} />
          <Skeleton height={200} radius={16} />
        </View>
      </Screen>
    );
  }
  if (!estimate.data) {
    return (
      <Screen scroll contentStyle={{ gap: space.lg }}>
        <BackButton fallback="/painter/work/estimates" />
        <ErrorState error={estimate.error} onRetry={() => void estimate.refetch()} />
      </Screen>
    );
  }
  const e = estimate.data;
  const billed = e.billNo != null && Boolean(e.billedAt);
  const link = e.shareToken ? `${env.painterOrigin}/e/${e.shareToken}` : null;
  const message = [
    t("work.estimates.message", { n: e.estimateNo, customer: e.customerName, total: formatRupees(billed ? (e.balancePaise ?? e.totalPaise) : e.totalPaise) }),
    ...e.lines.map((l) => `• ${l.name}: ${formatRupees(l.amountPaise)}`),
    link ? t("work.estimates.linkLine", { link }) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const setStatus = async (status: EstimateStatus) => {
    if (status === e.status) return;
    setBusy(true);
    try {
      queryClient.setQueryData(keys.workEstimate(e.id), await workApi.setEstimateStatus(e.id, status));
      void queryClient.invalidateQueries({ queryKey: keys.workEstimates, exact: true }).catch(() => {});
    } catch (err) {
      toast.show(messageFor(err, t("work.estimates.saveFailed")), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll
      onRefresh={pull.onRefresh}
      refreshing={pull.refreshing}
      contentStyle={{ gap: space.lg, paddingBottom: space.xl }}
      footer={
        <Button icon="send" label={t("work.estimates.sendWhatsApp")} onPress={() => void Linking.openURL(whatsappUrl(message, e.customerPhone))} testID="estimate-whatsapp" />
      }
    >
      <BackButton fallback="/painter/work/estimates" />
      <WorkTitle
        title={billed ? t("work.estimates.bill", { n: e.billNo! }) : t("work.estimates.number", { n: e.estimateNo })}
        lede={[e.customerName, e.siteAddress].filter(Boolean).join(" · ")}
      />

      {e.customerAnsweredAt ? (
        <Banner
          tone={e.status === "ACCEPTED" ? "success" : "info"}
          title={`${t("work.estimates.customerSaid", { name: e.customerName, date: formatServerDate(e.customerAnsweredAt) })} — ${estimateStatus(e.status)}`}
          message={e.customerNote ? t("work.estimates.customerNote", { note: e.customerNote }) : estimateStatus(e.status)}
          testID="estimate-answer"
        />
      ) : null}

      {e.rooms.length > 0 ? (
        <ListGroup title={t("work.estimates.rooms")}>
          {e.rooms.map((r, i) => (
            <ListRow
              key={r.id ?? `${r.name}-${i}`}
              title={r.name}
              detail={t("work.estimates.walls", { walls: Math.round(r.wallsSqFt), ceiling: Math.round(r.ceilingSqFt) })}
            />
          ))}
        </ListGroup>
      ) : null}

      <ListGroup title={t("work.estimates.work")}>
        {e.lines.map((l, i) => (
          <ListRow
            key={l.id ?? `${l.name}-${i}`}
            title={l.name}
            detail={`${l.qty.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${UNIT[l.unit] ?? ""} · ${l.withMaterial ? t("work.estimates.withMaterial") : t("work.estimates.labourOnly")}`}
            value={formatRupees(l.amountPaise)}
          />
        ))}
      </ListGroup>

      <Card lit>
        <View style={{ gap: space.xs }} testID="estimate-total">
          {e.discountPaise > 0 ? (
            <>
              <Row label={t("work.estimates.subtotal")} value={formatRupees(e.subtotalPaise)} />
              <Row label={t("work.estimates.discount")} value={`− ${formatRupees(e.discountPaise)}`} />
            </>
          ) : null}
          <Row label={t("work.estimates.total")} value={formatRupees(e.totalPaise)} strong />
          {billed ? (
            <>
              <Row label={t("work.estimates.paid")} value={`− ${formatRupees(e.receivedPaise ?? 0)}`} />
              <Row label={t("work.estimates.balance")} value={formatRupees(e.balancePaise ?? e.totalPaise)} strong />
            </>
          ) : null}
        </View>
      </Card>

      {e.note ? (
        <Text variant="painterBody" tone="soft">
          {e.note}
        </Text>
      ) : null}

      {billed ? null : (
        <View style={{ gap: space.xs }}>
          <Text variant="bodyStrong">{t("work.estimates.answer")}</Text>
          <Segmented
            options={STATUSES.map((s) => ({ value: s, label: estimateStatus(s) }))}
            value={e.status}
            onChange={(s) => void setStatus(s)}
            accessibilityLabel={t("work.estimates.answer")}
            compact
          />
          {busy ? <Skeleton height={4} /> : null}
        </View>
      )}

      <Button variant="ghost" icon="external-link" label={t("work.estimates.edit")} onPress={() => void openWebPage(`${env.painterOrigin}/estimates/${e.id}`)} />
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={strong ? "painterStrong" : "painterBody"} tone={strong ? undefined : "soft"} style={styles.fill}>
        {label}
      </Text>
      <Text variant={strong ? "title3" : "painterBody"}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  fill: { flex: 1 },
});
