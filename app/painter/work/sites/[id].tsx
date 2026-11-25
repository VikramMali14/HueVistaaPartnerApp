import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { messageFor } from "@/api/errors";
import { workApi, type SiteMoneyCategory, type SiteMoneyMode } from "@/api/endpoints/work";
import { keys } from "@/api/query-keys";
import { BackButton, Banner, Button, Card, Chip, ErrorState, ListGroup, ListRow, Screen, Segmented, Skeleton, Text, TextField, useToast } from "@/components/ui";
import { useSite } from "@/features/work/use-work";
import { moneyCategory, moneyMode, readRupees } from "@/features/work/words";
import { WorkTitle } from "@/features/work/WorkTitle";
import { t } from "@/i18n";
import { formatDate } from "@/lib/dates";
import { formatRupees } from "@/lib/money";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useTheme } from "@/theme";

type Way = "IN" | "OUT";
const RECEIVED: readonly SiteMoneyCategory[] = ["ADVANCE", "PART", "FINAL"];
const SPENT: readonly SiteMoneyCategory[] = ["MATERIAL", "LABOUR", "TRANSPORT", "FOOD", "OTHER"];
const MODES: readonly SiteMoneyMode[] = ["CASH", "UPI", "BANK", "OTHER"];

/**
 * P18 · Site. Spec: docs/05-screens-painter.md — P18. Web reference:
 * HueVistaaPainter app/(app)/(painter)/sites/[siteId]/site-money.tsx.
 *
 * A site's money: the price agreed, what came in and went out, the team's days at their pay, what the
 * job made, and what is still to collect — and money written down from the site as it changes hands.
 * The material book and its photos are on the painter website.
 */
export default function Site() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { space } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const book = useSite(id);
  const pull = usePullToRefresh(() => book.refetch());
  const [way, setWay] = useState<Way>("IN");
  const [category, setCategory] = useState<SiteMoneyCategory>("ADVANCE");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<SiteMoneyMode>("CASH");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (book.isPending) {
    return (
      <Screen scroll contentStyle={{ gap: space.lg }}>
        <BackButton fallback="/painter/work/sites" />
        <View style={{ gap: space.sm }} testID="site-loading">
          <Skeleton height={160} radius={16} />
        </View>
      </Screen>
    );
  }
  if (!book.data) {
    return (
      <Screen scroll contentStyle={{ gap: space.lg }}>
        <BackButton fallback="/painter/work/sites" />
        <ErrorState error={book.error} onRetry={() => void book.refetch()} />
      </Screen>
    );
  }
  const { site, money } = book.data;
  const profit = money?.profitPaise;
  const due = money?.dueFromCustomerPaise;

  const chooseWay = (next: Way) => {
    setWay(next);
    setCategory(next === "IN" ? "ADVANCE" : "MATERIAL");
  };

  const save = async () => {
    const paise = readRupees(amount);
    if (paise === null) {
      setProblem(t("work.sites.needAmount"));
      return;
    }
    setProblem(null);
    setSaving(true);
    try {
      await workApi.addSiteMoney(site.id, { category, amountPaise: paise, mode, note: note.trim() || undefined });
      setAmount("");
      setNote("");
      toast.show(t("work.sites.saved"), "success");
      await queryClient.invalidateQueries({ queryKey: keys.workSites });
    } catch (err) {
      setProblem(messageFor(err, t("work.sites.saveFailed")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll onRefresh={pull.onRefresh} refreshing={pull.refreshing} contentStyle={{ gap: space.lg, paddingBottom: space.xl }}>
      <BackButton fallback="/painter/work/sites" />
      <WorkTitle title={site.name} lede={[site.customerName, site.address].filter(Boolean).join(" · ")} />

      <Card lit>
        <View style={{ gap: space.xs }} testID="site-money">
          {money?.agreedPaise != null ? (
            <>
              <Row label={t("work.sites.agreed")} value={formatRupees(money.agreedPaise)} />
              <Row label={t("work.sites.received")} value={formatRupees(money.receivedPaise)} />
              <Row label={t("work.sites.spent")} value={formatRupees(money.spentPaise)} />
              <Row label={t("work.sites.labourCost")} value={formatRupees(money.labourPaise)} />
              {profit != null ? (
                <Row label={profit < 0 ? t("work.sites.loss") : t("work.sites.made")} value={formatRupees(Math.abs(profit))} strong />
              ) : null}
              {due != null ? (
                <Row label={due < 0 ? t("work.sites.overpaid") : t("work.sites.due")} value={formatRupees(Math.abs(due))} strong />
              ) : null}
            </>
          ) : (
            <>
              <Row label={t("work.sites.received")} value={formatRupees(money?.receivedPaise ?? 0)} />
              <Row label={t("work.sites.spent")} value={formatRupees(money?.spentPaise ?? 0)} />
              <Text variant="small" tone="soft">
                {t("work.sites.noPrice")}
              </Text>
            </>
          )}
          <Text variant="small" tone="mute">
            {t("work.sites.teamDays", { n: book.data.teamDays })}
          </Text>
        </View>
      </Card>

      <View style={{ gap: space.sm }}>
        <Segmented
          options={[
            { value: "IN" as const, label: t("work.sites.moneyIn") },
            { value: "OUT" as const, label: t("work.sites.moneyOut") },
          ]}
          value={way}
          onChange={chooseWay}
          accessibilityLabel={t("work.sites.entriesTitle")}
          compact
        />
        <View style={styles.chips}>
          {(way === "IN" ? RECEIVED : SPENT).map((c) => (
            <Chip key={c} role="radio" label={moneyCategory(c)} selected={category === c} onPress={() => setCategory(c)} testID={`category-${c}`} />
          ))}
        </View>
        <TextField label={t("work.sites.amount")} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" testID="site-amount" />
        <Text variant="bodyStrong">{t("work.sites.how")}</Text>
        <View style={styles.chips}>
          {MODES.map((m) => (
            <Chip key={m} role="radio" label={moneyMode(m)} selected={mode === m} onPress={() => setMode(m)} testID={`mode-${m}`} />
          ))}
        </View>
        <TextField label={t("work.sites.note")} value={note} onChangeText={setNote} maxLength={300} />
        {problem ? <Banner tone="danger" message={problem} testID="site-problem" /> : null}
        <Button label={t("work.sites.save")} loading={saving} disabled={saving} onPress={() => void save()} testID="site-save" />
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="title3" accessibilityRole="header">
          {t("work.sites.entriesTitle")}
        </Text>
        {money && money.entries.length > 0 ? (
          <ListGroup>
            {money.entries.map((m) => (
              <ListRow
                key={m.id}
                title={moneyCategory(m.category)}
                detail={[formatDate(m.paidOn), m.mode ? moneyMode(m.mode) : null, m.voidedAt ? t("work.sites.undone", { reason: m.voidReason ?? "" }) : m.note]
                  .filter(Boolean)
                  .join(" · ")}
                value={`${m.kind === "RECEIVED" ? "+" : "−"} ${formatRupees(m.amountPaise)}`}
              />
            ))}
          </ListGroup>
        ) : (
          <Text variant="painterBody" tone="soft">
            {t("work.sites.entriesEmpty")}
          </Text>
        )}
      </View>
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
