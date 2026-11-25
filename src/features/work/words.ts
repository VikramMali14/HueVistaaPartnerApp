import type { DayStatus, EstimateStatus, SiteMoneyCategory, SiteMoneyMode, SiteSummary } from "@/api/endpoints/work";
import { t, type MessageKey } from "@/i18n";
import type { UserProfile } from "@/api/types";
import { formatRupees } from "@/lib/money";

/** Today in India, as YYYY-MM-DD — the register's day, whatever zone the phone is set to. */
export function todayInIndia(now: number = Date.now()): string {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}

const DAY: Record<DayStatus, MessageKey> = {
  PRESENT: "work.team.present",
  HALF_DAY: "work.team.halfDay",
  ABSENT: "work.team.absent",
  PAID_LEAVE: "work.team.paidLeave",
  WEEK_OFF: "work.team.weekOff",
  HOLIDAY: "work.team.holiday",
};

export function dayStatus(status: DayStatus): string {
  return t(DAY[status]);
}

const ESTIMATE: Record<EstimateStatus, MessageKey> = {
  OPEN: "work.estimates.open",
  ACCEPTED: "work.estimates.accepted",
  DECLINED: "work.estimates.declined",
};

export function estimateStatus(status: EstimateStatus): string {
  return t(ESTIMATE[status]);
}

const CATEGORY: Record<SiteMoneyCategory, MessageKey> = {
  ADVANCE: "work.sites.advance",
  PART: "work.sites.part",
  FINAL: "work.sites.final",
  MATERIAL: "work.sites.material",
  LABOUR: "work.sites.labour",
  TRANSPORT: "work.sites.transport",
  FOOD: "work.sites.food",
  OTHER: "work.sites.other",
};

export function moneyCategory(category: SiteMoneyCategory): string {
  return t(CATEGORY[category]);
}

const MODE: Record<SiteMoneyMode, MessageKey> = {
  CASH: "work.sites.cash",
  UPI: "work.sites.upi",
  BANK: "work.sites.bank",
  OTHER: "work.sites.otherMode",
};

export function moneyMode(mode: SiteMoneyMode): string {
  return t(MODE[mode]);
}

/** Rupees as typed — "1500", "1,500.50" — in paise; null for anything that isn't an amount. */
export function readRupees(text: string): number | null {
  const clean = text.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const paise = Math.round(Number(clean) * 100);
  return paise > 0 ? paise : null;
}

/** A WhatsApp message link, to a 10-digit Indian mobile when there is one. */
export function whatsappUrl(text: string, phone?: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits.length === 12 && digits.startsWith("91") ? digits : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** "₹35,000 still to collect", or what came in when the job has no price. */
export function siteMoneyLine(s: Pick<SiteSummary, "dueFromCustomerPaise" | "receivedPaise">): string {
  if (s.dueFromCustomerPaise != null && s.dueFromCustomerPaise > 0) {
    return `${formatRupees(s.dueFromCustomerPaise)} · ${t("work.sites.due")}`;
  }
  return `${formatRupees(s.receivedPaise ?? 0)} · ${t("work.sites.received")}`;
}

/**
 * Whether the painter has their own books — team, estimates, sites. The HueVistaa team switches them
 * on painter by painter; only an explicit false closes them (a backend from before the switch says
 * nothing, and there every painter had them). The backend refuses them too, whatever the app shows.
 */
export function hasWorkBooks(profile: Pick<UserProfile, "role" | "workBooksEnabled"> | null | undefined): boolean {
  return profile?.role === "PAINTER" && profile.workBooksEnabled !== false;
}

/** Whether a shop has the painter on its commission list — the shops' khatas are offered only then. */
export function hasShops(profile: Pick<UserProfile, "commissionShops"> | null | undefined): boolean {
  return (profile?.commissionShops ?? 0) > 0;
}
