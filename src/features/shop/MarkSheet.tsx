import { View } from "react-native";

import type { AttendanceStatus, StaffDay } from "@/api/endpoints/shop";
import { Button, Chip, Sheet, Text } from "@/components/ui";
import { t } from "@/i18n";
import { useTheme } from "@/theme";

import { dayLabel, statusLabel, timeLabel, whereLabel } from "./words";

/** What an owner can set a day to, in the register's order. */
export const STATUSES: AttendanceStatus[] = ["PRESENT", "HALF_DAY", "ABSENT", "PAID_LEAVE", "WEEK_OFF", "HOLIDAY"];

/**
 * One person's day, opened from the register: how it stands (when they came, from where, what they
 * wrote) and the six marks an owner can give it. A mark is set at once — no asking the employee —
 * and a day they didn't mark in on can be cleared again.
 */
export function MarkSheet({
  day,
  busy,
  onMark,
  onClose,
}: {
  day: StaffDay | null;
  busy: boolean;
  onMark: (status: AttendanceStatus | null) => void;
  onClose: () => void;
}) {
  const { space } = useTheme();
  const inAt = day ? timeLabel(day.checkedInAt) : null;
  const outAt = day ? timeLabel(day.checkedOutAt) : null;
  const where = day ? whereLabel(day) : null;
  const facts = [
    inAt ? t("shop.register.in", { time: inAt }) : null,
    outAt ? t("shop.register.out", { time: outAt }) : null,
    day?.late && day.lateMinutes ? t("shop.register.late", { n: day.lateMinutes }) : null,
    where,
  ].filter(Boolean);

  return (
    <Sheet
      visible={day !== null}
      onClose={busy ? () => {} : onClose}
      title={day ? t("shop.register.markFor", { name: day.staffName, day: dayLabel(day.date) }) : undefined}
      testID="mark-sheet"
    >
      {day ? (
        <View style={{ gap: space.md }}>
          {facts.length > 0 ? (
            <Text variant="body" tone="soft">
              {facts.join(" · ")}
            </Text>
          ) : null}
          {day.staffNote?.trim() ? <Text variant="body">{t("shop.register.note", { note: day.staffNote.trim() })}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
            {STATUSES.map((status) => (
              <Chip
                key={status}
                label={statusLabel(status)}
                role="radio"
                selected={day.status === status && !day.auto}
                disabled={busy}
                onPress={() => onMark(status)}
                testID={`mark-${status}`}
              />
            ))}
          </View>
          {/* A day the employee marked in on stays theirs: only a mark the shop gave can go. */}
          {day.status && !day.auto && !day.checkedInAt ? (
            <Button variant="ghost" block={false} label={t("shop.register.clear")} disabled={busy} onPress={() => onMark(null)} testID="mark-clear" />
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
