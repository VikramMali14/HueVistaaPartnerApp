import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { messageFor } from "@/api/errors";
import { shopApi, type AttendanceCorrection, type PieceEntry, type StaffDay } from "@/api/endpoints/shop";
import { keys } from "@/api/query-keys";
import { Button, EmptyState, ErrorState, Skeleton, Stepper, Text, useToast } from "@/components/ui";
import { t } from "@/i18n";
import { buzz } from "@/lib/haptics";
import { formatRupees } from "@/lib/money";
import { openWebPage, webPages } from "@/lib/open-web";
import { hairline, useTheme } from "@/theme";

import { useShopCorrections, useShopOvertime, useShopPieceWork } from "./use-shop";
import { correctionTimes, dayLabel, hoursLabel } from "./words";

/**
 * The rest of what the staff ask of the owner about their days, answered on the spot:
 *
 * - **Days to put right** — "I forgot to punch", or out on a delivery from somebody who marks in on
 *   the machine. Approved, the day is written as present with the times they gave.
 * - **Overtime** past the shift, where the shop OKs it first: all of it, so many half hours, or not
 *   paid.
 * - **Piece work** a helper wrote down: approved, it is paid with the month's salary. Adding the
 *   others who were on the job is on the website.
 *
 * The website's requests panel and piece-work page, on the phone. A manager's own are the owner's,
 * and the server says so.
 */
export function AttendanceAsks({ orgId }: { orgId: string }) {
  const { space } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const corrections = useShopCorrections(orgId);
  const overtime = useShopOvertime(orgId);
  const piece = useShopPieceWork(orgId);
  const [busy, setBusy] = useState<string | null>(null);

  if (corrections.isPending || overtime.isPending || piece.isPending) return <Skeleton height={120} radius={16} />;
  if (!corrections.data || !overtime.data || !piece.data) {
    const error = corrections.error ?? overtime.error ?? piece.error;
    return (
      <ErrorState
        error={error}
        onRetry={() => void Promise.all([corrections.refetch(), overtime.refetch(), piece.refetch()])}
      />
    );
  }
  const fixes = corrections.data.filter((c) => c.status === "OPEN");
  const days = overtime.data;
  const jobs = piece.data.filter((j) => j.status === "OPEN");
  if (fixes.length === 0 && days.length === 0 && jobs.length === 0) {
    return <EmptyState icon="check-circle" title={t("shop.asks.noAttendance")} />;
  }

  /** Runs one answer, then reads again what it changed: the bell, and the register. */
  const run = async (id: string, work: () => Promise<unknown>, done: string) => {
    setBusy(id);
    try {
      await work();
      void queryClient.invalidateQueries({ queryKey: keys.shopAlerts });
      void queryClient.invalidateQueries({ queryKey: ["shop", orgId, "register"] });
      buzz.success();
      toast.show(done, "success");
    } catch (err) {
      toast.show(messageFor(err, t("shop.asks.leaveFailed")), "error");
    } finally {
      setBusy(null);
    }
  };

  const answerFix = (c: AttendanceCorrection, action: "APPROVE" | "REFUSE") =>
    run(
      c.id,
      async () => {
        const next = await shopApi.answerCorrection(orgId, c.id, { action });
        queryClient.setQueryData<AttendanceCorrection[]>(keys.shopCorrections(orgId), (cur) => (cur ?? []).map((x) => (x.id === c.id ? next : x)));
      },
      action === "APPROVE" ? t("shop.asks.fixApproved") : t("shop.asks.fixRefused", { name: c.staffName }),
    );

  const answerOvertime = (d: StaffDay, approve: boolean, minutes?: number) =>
    run(
      `${d.staffId}:${d.date}`,
      async () => {
        await shopApi.answerOvertime(orgId, d.staffId, d.date, { approve, minutes: approve ? (minutes ?? null) : null });
        queryClient.setQueryData<StaffDay[]>(keys.shopOvertime(orgId), (cur) =>
          (cur ?? []).filter((x) => !(x.staffId === d.staffId && x.date === d.date)),
        );
      },
      approve ? t("shop.asks.overtimeApproved") : t("shop.asks.overtimeRefused"),
    );

  const answerJob = (j: PieceEntry, action: "APPROVE" | "REFUSE") =>
    run(
      j.id,
      async () => {
        const next = await shopApi.answerPieceJob(orgId, j.id, { action });
        queryClient.setQueryData<PieceEntry[]>(keys.shopPieceWork(orgId), (cur) => (cur ?? []).map((x) => (x.id === j.id ? next : x)));
      },
      action === "APPROVE" ? t("shop.asks.pieceApproved") : t("shop.asks.pieceRefused"),
    );

  return (
    <View style={{ gap: space.lg }} testID="attendance-asks">
      {fixes.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label" tone="mute" style={{ paddingHorizontal: space.xxs }}>
            {t("shop.asks.fixTitle")}
          </Text>
          {fixes.map((c) => (
            <Waiting key={c.id} testID={`fix-${c.id}`}>
              <Text variant="small" tone="mute">
                {c.staffName} · {dayLabel(c.day)}
              </Text>
              <Text variant="title3">{c.kind === "OUT_ON_WORK" ? t("shop.asks.fixOut") : t("shop.asks.fixKind")}</Text>
              {correctionTimes(c) ? (
                <Text variant="body" tone="soft">
                  {correctionTimes(c)}
                </Text>
              ) : null}
              <Text variant="body" tone="soft">
                {c.reason}
              </Text>
              <View style={{ gap: space.xs }}>
                <Button
                  icon="check"
                  label={t("shop.asks.fixApprove")}
                  loading={busy === c.id}
                  disabled={busy !== null}
                  onPress={() => void answerFix(c, "APPROVE")}
                  testID={`fix-approve-${c.id}`}
                />
                <Button
                  variant="ghost"
                  label={t("shop.asks.refuse")}
                  disabled={busy !== null}
                  onPress={() => void answerFix(c, "REFUSE")}
                  testID={`fix-refuse-${c.id}`}
                />
              </View>
            </Waiting>
          ))}
        </View>
      ) : null}

      {days.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label" tone="mute" style={{ paddingHorizontal: space.xxs }}>
            {t("shop.asks.overtimeTitle")}
          </Text>
          {days.map((d) => (
            <OvertimeAsk
              key={`${d.staffId}:${d.date}`}
              day={d}
              busy={busy}
              onAnswer={(approve, minutes) => void answerOvertime(d, approve, minutes)}
            />
          ))}
        </View>
      ) : null}

      {jobs.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label" tone="mute" style={{ paddingHorizontal: space.xxs }}>
            {t("shop.asks.pieceTitle")}
          </Text>
          {jobs.map((j) => (
            <Waiting key={j.id} testID={`piece-${j.id}`}>
              <Text variant="small" tone="mute">
                {t("shop.asks.pieceBy", { name: j.createdByName ?? "", day: dayLabel(j.workDay) })}
                {j.note ? ` · ${j.note}` : ""}
              </Text>
              <Text variant="body" tone="soft">
                {j.lines.map((l) => `${l.quantity} × ${l.itemName}`).join(" · ")}
              </Text>
              <View style={{ gap: space.xs }}>
                <Button
                  icon="check"
                  label={t("shop.asks.pieceApprove", { amount: formatRupees(j.totalPaise) })}
                  loading={busy === j.id}
                  disabled={busy !== null}
                  onPress={() => void answerJob(j, "APPROVE")}
                  testID={`piece-approve-${j.id}`}
                />
                <Button
                  variant="ghost"
                  label={t("shop.asks.refuse")}
                  disabled={busy !== null}
                  onPress={() => void answerJob(j, "REFUSE")}
                  testID={`piece-refuse-${j.id}`}
                />
              </View>
            </Waiting>
          ))}
          <Text variant="caption" tone="mute" style={{ paddingHorizontal: space.xxs }} onPress={() => void openWebPage(webPages.shopPieceWork)}>
            {t("shop.asks.pieceOthersOnWebsite")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** A day of overtime: OK it all, so many half hours of it, or not paid. */
function OvertimeAsk({ day, busy, onAnswer }: { day: StaffDay; busy: string | null; onAnswer: (approve: boolean, minutes?: number) => void }) {
  const { space } = useTheme();
  const total = day.overtimeMinutes ?? 0;
  const steps = Math.max(1, Math.floor(total / 30));
  const [halves, setHalves] = useState(steps);
  const id = `${day.staffId}:${day.date}`;
  return (
    <Waiting testID={`overtime-${id}`}>
      <Text variant="small" tone="mute">
        {day.staffName}
      </Text>
      <Text variant="title3">{t("shop.asks.overtimeLine", { day: dayLabel(day.date), time: hoursLabel(total) })}</Text>
      {steps > 1 ? (
        <Stepper
          value={halves}
          min={1}
          max={steps}
          onChange={setHalves}
          describe={(n) => hoursLabel(n * 30)}
          fewerLabel="−30 min"
          moreLabel="+30 min"
          testID={`overtime-steps-${id}`}
        />
      ) : null}
      <View style={{ gap: space.xs }}>
        <Button
          icon="check"
          label={halves * 30 >= total ? t("shop.asks.overtimeApproveAll", { time: hoursLabel(total) }) : t("shop.asks.overtimeApproveSome", { time: hoursLabel(halves * 30) })}
          loading={busy === id}
          disabled={busy !== null}
          onPress={() => onAnswer(true, halves * 30 >= total ? total : halves * 30)}
          testID={`overtime-approve-${id}`}
        />
        <Button variant="ghost" label={t("shop.asks.overtimeNot")} disabled={busy !== null} onPress={() => onAnswer(false)} testID={`overtime-refuse-${id}`} />
      </View>
    </Waiting>
  );
}

/** One ask waiting for the owner: brass-edged, as on the other tabs. */
function Waiting({ children, testID }: { children: ReactNode; testID?: string }) {
  const { colors, radius, space } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { gap: space.xs, borderRadius: radius.md, backgroundColor: colors.surface, borderColor: colors.ruleBrass, borderLeftColor: colors.accent },
      ]}
    >
      <Feather name="clock" size={14} color={colors.accentText} style={styles.clock} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: hairline, borderLeftWidth: 3 },
  clock: { position: "absolute", top: 14, right: 14 },
});
