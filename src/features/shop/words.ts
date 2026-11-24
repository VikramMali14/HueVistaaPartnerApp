import type { AttendanceStatus, LeaveRequest, StaffDay } from "@/api/endpoints/shop";
import { t, type MessageKey } from "@/i18n";
import { istHour, monthName, serverMoment } from "@/lib/dates";
import { formatRupees } from "@/lib/money";

/** India Standard Time is UTC+5:30 all year. */
const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

const STATUS: Record<AttendanceStatus, MessageKey> = {
  PRESENT: "status.present",
  HALF_DAY: "status.halfDay",
  ABSENT: "status.absent",
  PAID_LEAVE: "status.paidLeave",
  WEEK_OFF: "status.weekOff",
  HOLIDAY: "status.holiday",
};

/** "Present", "Half day"… — the register's words, the same ones the shop's owner sees. */
export function statusLabel(status: AttendanceStatus): string {
  return t(STATUS[status]);
}

/** "10:05 am" from a server time (India time, no zone); null when there isn't one. */
export function timeLabel(iso: string | null | undefined): string | null {
  const at = serverMoment(iso);
  if (!Number.isFinite(at)) return null;
  return clockLabel(at);
}

/** "7:31 pm" for a moment, in India. */
export function clockLabel(at: number): string {
  const ist = new Date(at + IST_OFFSET_MS);
  const hours = ist.getUTCHours();
  const minutes = String(ist.getUTCMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? t("time.am") : t("time.pm")}`;
}

/** "3 h 12 min", "45 min" — how long, never below a minute's worth of nothing. */
export function durationLabel(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? t("time.hoursMinutes", { h, m }) : t("time.minutes", { m });
}

/** "Good morning" until noon, "Good afternoon" until five, then "Good evening" — India's clock. */
export function greeting(now: number = Date.now()): string {
  const hour = istHour(now);
  if (hour < 12) return t("shop.greetingMorning");
  if (hour < 17) return t("shop.greetingAfternoon");
  return t("shop.greetingEvening");
}

/** A register day, "YYYY-MM-DD", as a date with no zone to shift it. */
function dayParts(day: string): { y: number; m: number; d: number; weekday: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  return { y, m, d, weekday: new Date(Date.UTC(y, m, d)).getUTCDay() };
}

function weekday(index: number, form: "short" | "long"): string {
  return t(form === "short" ? "time.weekdaysShort" : "time.weekdaysLong").split(",")[index]?.trim() ?? "";
}

/** "Mon 24 Nov" from a register day; the day itself when it can't be read. */
export function dayLabel(day: string): string {
  const p = dayParts(day);
  if (!p) return day;
  return `${weekday(p.weekday, "short")} ${p.d} ${monthName(p.m)}`;
}

/** "Tuesday, 24 November" — the head of the Today screen and of a day's sheet. */
export function longDayLabel(day: string): string {
  const p = dayParts(day);
  if (!p) return day;
  return `${weekday(p.weekday, "long")}, ${p.d} ${monthName(p.m, "long")}`;
}

/** "24 Nov" — a day in a range, where the weekday would crowd the line. */
export function shortDay(day: string): string {
  const p = dayParts(day);
  return p ? `${p.d} ${monthName(p.m)}` : day;
}

/** The day of the month, 1–31; 0 when the day can't be read. */
export function dayOfMonth(day: string): number {
  return dayParts(day)?.d ?? 0;
}

/** Today in India as YYYY-MM-DD, moved by `delta` days. */
export function dayFromToday(delta: number, now: number = Date.now()): string {
  return new Date(now + IST_OFFSET_MS + delta * DAY_MS).toISOString().slice(0, 10);
}

/** A register day moved by `delta` days. */
export function addDays(day: string, delta: number): string {
  const p = dayParts(day);
  if (!p) return day;
  return new Date(Date.UTC(p.y, p.m, p.d + delta)).toISOString().slice(0, 10);
}

/** This month in India, "YYYY-MM". */
export function thisMonth(now: number = Date.now()): string {
  return dayFromToday(0, now).slice(0, 7);
}

/** "YYYY-MM" moved by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** "November 2026" from "YYYY-MM". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${monthName(m - 1, "long")} ${y}`;
}


/** "350 m", "2.4 km" — how far the phone was from the shop. */
export function distanceLabel(metres: number | null | undefined): string | null {
  if (metres == null || !Number.isFinite(metres)) return null;
  if (metres < 1000) return t("where.metres", { n: Math.round(metres) });
  const km = metres / 1000;
  return t("where.km", { n: km < 10 ? km.toFixed(1) : String(Math.round(km)) });
}

/** Where the phone was when they marked in, in words — "At the shop", "350 m away". Null when nothing to say. */
export function whereLabel(day: Pick<StaffDay, "location" | "placeName" | "distanceMetres">): string | null {
  switch (day.location) {
    case "AT_PLACE":
      return t("where.atPlace", { place: day.placeName?.trim() || t("where.theShop") });
    case "AWAY": {
      const distance = distanceLabel(day.distanceMetres);
      return distance ? t("where.away", { distance }) : t("where.awayUnknown");
    }
    case "NOT_SHARED":
      return t("where.notShared");
    default:
      return null;
  }
}

/**
 * Prices on a shop's list are rupees as the owner typed them — "₹9,200", "₹45.50" — not paise.
 * Indian grouping, paise only when there are some; "—" for no price.
 */
export function priceRupees(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatRupees(Math.round(value * 100));
}

/** An ask for leave's days: "24 Nov" or "24 Nov – 26 Nov". */
export function leaveRange(leave: Pick<LeaveRequest, "fromDay" | "toDay">): string {
  return leave.fromDay === leave.toDay
    ? shortDay(leave.fromDay)
    : t("shop.asks.leaveRange", { from: shortDay(leave.fromDay), to: shortDay(leave.toDay) });
}

/** Where an ask for leave stands, in a few words. */
export function leaveStatus(leave: Pick<LeaveRequest, "status" | "paid">): string {
  switch (leave.status) {
    case "OPEN":
      return t("shop.asks.waiting");
    case "APPROVED":
      return leave.paid === false ? t("shop.asks.leaveApprovedUnpaid") : t("shop.asks.leaveApprovedPaid");
    case "REFUSED":
      return t("shop.asks.leaveRefused");
    case "CANCELLED":
      return t("shop.asks.leaveCancelled");
  }
}

