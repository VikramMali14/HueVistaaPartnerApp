/**
 * A painter's own books — their team, their estimates, their sites — and their commission khatas with
 * the shops that pay them. Backend: crew/, estimate/, sitebook/ and commission/ (PainterCommissionController).
 * Screens: P13–P20 (docs/05-screens-painter.md). The painter website (HueVistaaPainter) has the same
 * books in full; the app has what a painter does at a site with the phone in hand.
 *
 * Money is whole paise; days are YYYY-MM-DD; times are India time with no zone.
 */
import { api } from "../instance";

// ── The team ──────────────────────────────────────────────────────────────────

export type DayStatus = "PRESENT" | "HALF_DAY" | "ABSENT" | "PAID_LEAVE" | "WEEK_OFF" | "HOLIDAY";
export type CrewRole = "PAINTER" | "HELPER" | "OTHER";

/** One person's day in the register (backend CrewDayResponse). */
export interface CrewDay {
  memberId: string;
  name: string;
  role?: CrewRole | null;
  date: string;
  /** As marked, or as it counts by itself ({@link auto}); null when it counts as nothing yet. */
  status?: DayStatus | null;
  auto: boolean;
  siteId?: string | null;
  siteName?: string | null;
  note?: string | null;
}

/** GET /api/painter/crew/days — everyone working that day, and their mark. */
export interface CrewRegister {
  date: string;
  today: boolean;
  unmarkedPresent: boolean;
  members: CrewDay[];
  counts: Partial<Record<DayStatus, number>>;
  notMarked: number;
}

/** One person's month (backend CrewWageRowResponse) — what the app shows of it. */
export interface CrewWageRow {
  memberId: string;
  name: string;
  current: boolean;
  month: string;
  present: number;
  halfDays: number;
  absent: number;
  paidDays: number;
  earnedPaise: number;
  advancePaise: number;
  paidPaise: number;
  /** Above nought the painter owes them; below, an advance still to work off. */
  balancePaise: number;
}

/** GET /api/painter/crew/wages. */
export interface CrewWages {
  month: string;
  members: CrewWageRow[];
  totalDuePaise: number;
}

// ── Estimates ─────────────────────────────────────────────────────────────────

export type EstimateStatus = "OPEN" | "ACCEPTED" | "DECLINED";
export type RateUnit = "SQ_FT" | "R_FT" | "PIECE" | "DAY" | "JOB";

export interface EstimateSummary {
  id: string;
  estimateNo: number;
  customerName: string;
  siteAddress?: string | null;
  status: EstimateStatus;
  totalPaise: number;
  siteId?: string | null;
  createdAt?: string | null;
}

/** GET /api/painter/estimates. */
export interface EstimateList {
  estimates: EstimateSummary[];
  hasRates: boolean;
}

export interface EstimateRoom {
  id?: string;
  name: string;
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  wallsSqFt: number;
  ceilingSqFt: number;
}

export interface EstimateLine {
  id?: string;
  name: string;
  unit: RateUnit;
  qty: number;
  ratePaise: number;
  withMaterial: boolean;
  amountPaise: number;
}

/** GET /api/painter/estimates/{id}. */
export interface Estimate {
  id: string;
  estimateNo: number;
  customerName: string;
  customerPhone?: string | null;
  siteAddress?: string | null;
  note?: string | null;
  status: EstimateStatus;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  siteId?: string | null;
  rooms: EstimateRoom[];
  lines: EstimateLine[];
  createdAt?: string | null;
  updatedAt?: string | null;
  /** The unguessable part of the customer's link; null when none was made, or it was taken back. */
  shareToken?: string | null;
  /** When the customer answered on their own page, and what they wrote. */
  customerAnsweredAt?: string | null;
  customerNote?: string | null;
  /** Once it is the final bill: its number and day, what was paid and what is left. */
  billNo?: number | null;
  billedAt?: string | null;
  receivedPaise?: number;
  balancePaise?: number;
}

// ── Sites ─────────────────────────────────────────────────────────────────────

export type SiteStatus = "ACTIVE" | "FINISHED";
export type SiteMoneyCategory = "ADVANCE" | "PART" | "FINAL" | "MATERIAL" | "LABOUR" | "TRANSPORT" | "FOOD" | "OTHER";
export type SiteMoneyMode = "CASH" | "UPI" | "BANK" | "OTHER";

export interface SiteSummary {
  id: string;
  name: string;
  customerName?: string | null;
  address?: string | null;
  status: SiteStatus;
  startedOn: string;
  finishedOn?: string | null;
  estimateId?: string | null;
  estimateNo?: number | null;
  teamDays: number;
  /** What the job is worth: the price agreed, else its estimate's total; null with neither. */
  agreedPaise?: number | null;
  receivedPaise?: number;
  spentPaise?: number;
  labourPaise?: number;
  profitPaise?: number | null;
  dueFromCustomerPaise?: number | null;
}

/** GET /api/painter/sites. */
export interface SiteList {
  sites: SiteSummary[];
}

export interface SiteMoneyEntry {
  id: string;
  kind: "RECEIVED" | "SPENT";
  category: SiteMoneyCategory;
  amountPaise: number;
  paidOn: string;
  mode?: SiteMoneyMode | null;
  note?: string | null;
  createdAt?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
}

export interface SiteMoney {
  agreedPaise?: number | null;
  estimatePaise?: number | null;
  receivedPaise: number;
  spentPaise: number;
  labourPaise: number;
  profitPaise?: number | null;
  dueFromCustomerPaise?: number | null;
  entries: SiteMoneyEntry[];
}

export interface SiteTeamRow {
  memberId: string;
  name: string;
  days: number;
  labourPaise: number;
}

/** GET /api/painter/sites/{siteId} — what the app shows of a site's book. */
export interface SiteBook {
  site: SiteSummary;
  team: SiteTeamRow[];
  teamDays: number;
  labourPaise: number;
  money?: SiteMoney | null;
}

/** POST /api/painter/sites/{siteId}/money. */
export interface SiteMoneyBody {
  category: SiteMoneyCategory;
  amountPaise: number;
  paidOn?: string;
  mode?: SiteMoneyMode;
  note?: string;
}

// ── Shops: the commission khata ───────────────────────────────────────────────

export type ShopLinkStatus = "REQUESTED" | "ACTIVE" | "DECLINED" | "REMOVED" | "LEFT" | "BLOCKED";

export interface CommissionShop {
  linkId: string;
  shopName: string;
  place?: string | null;
  shopPhone?: string | null;
  status: ShopLinkStatus;
  commissionType: "PERCENT_OF_BILL" | "PRODUCT_WISE";
  terms: string;
  balancePaise: number;
  pendingClaims: number;
  /** Payments the shop wrote down that the painter hasn't answered yet. */
  paymentsWaiting: number;
  /** The day of the oldest commission not yet paid; null when nothing is owed. */
  owedSince?: string | null;
  /** When the painter last reminded the shop of what it owes them. */
  duesRemindedAt?: string | null;
}

/** GET /api/painter/commission. */
export interface PainterCommission {
  upiId?: string | null;
  pendingRequests: number;
  duePaise: number;
  shops: CommissionShop[];
}

export interface PaymentNote {
  id: string;
  author: "PAINTER" | "SHOP";
  text: string;
  reference?: string | null;
  createdAt?: string | null;
}

export interface CommissionPayment {
  id: string;
  amountPaise: number;
  mode: "UPI" | "CASH" | "BANK" | "OTHER";
  reference?: string | null;
  note?: string | null;
  paidOn: string;
  painterStatus: "WAITING" | "RECEIVED" | "NOT_RECEIVED";
  undoneAt?: string | null;
  undoneReason?: string | null;
  notes?: PaymentNote[] | null;
}

export interface CommissionEntry {
  id: string;
  source: "PAINTER_CLAIM" | "SHOP_ENTRY" | "STAFF_ENTRY";
  status: "PENDING" | "APPROVED" | "PARTLY_APPROVED" | "REJECTED" | "CANCELLED" | "REVERSED";
  billNo?: string | null;
  billDate?: string | null;
  claimedPaise: number;
  approvedPaise?: number | null;
  shopNote?: string | null;
  createdAt?: string | null;
}

/** GET /api/painter/commission/shops/{linkId}. */
export interface CommissionKhata {
  shop: CommissionShop;
  balancePaise: number;
  entries: CommissionEntry[];
  payments: CommissionPayment[];
}

const seg = (value: string) => encodeURIComponent(value);

export const workApi = {
  // The team
  register: (date?: string) => api.request<CrewRegister>("api/painter/crew/days", { query: { date } }),
  /** One person's day: a status, or null to clear it. */
  mark: (date: string, memberId: string, status: DayStatus | null) =>
    api.request<CrewDay>(`api/painter/crew/days/${seg(date)}/${seg(memberId)}`, { method: "PUT", body: { status: status ?? "" } }),
  /** One status for everyone not marked yet that day. */
  markRest: (date: string, status: DayStatus) =>
    api.request<CrewRegister>(`api/painter/crew/days/${seg(date)}`, { method: "POST", body: { status, onlyUnmarked: true } }),
  wages: (month?: string) => api.request<CrewWages>("api/painter/crew/wages", { query: { month } }),

  // Estimates
  estimates: () => api.request<EstimateList>("api/painter/estimates"),
  estimate: (id: string) => api.request<Estimate>(`api/painter/estimates/${seg(id)}`),
  setEstimateStatus: (id: string, status: EstimateStatus) =>
    api.request<Estimate>(`api/painter/estimates/${seg(id)}/status`, { method: "PUT", body: { status } }),

  // Sites
  sites: () => api.request<SiteList>("api/painter/sites"),
  site: (id: string) => api.request<SiteBook>(`api/painter/sites/${seg(id)}`),
  addSiteMoney: (siteId: string, body: SiteMoneyBody) =>
    api.request<SiteMoneyEntry>(`api/painter/sites/${seg(siteId)}/money`, { method: "POST", body }),

  // Shops
  shops: () => api.request<PainterCommission>("api/painter/commission"),
  khata: (linkId: string) => api.request<CommissionKhata>(`api/painter/commission/shops/${seg(linkId)}`),
  received: (paymentId: string) =>
    api.request<CommissionPayment>(`api/painter/commission/payments/${seg(paymentId)}/received`, { method: "POST" }),
  /** The money didn't arrive — with what the painter checked, which the shop is shown. */
  notReceived: (paymentId: string, text?: string) =>
    api.request<CommissionPayment>(`api/painter/commission/payments/${seg(paymentId)}/not-received`, {
      method: "POST",
      body: text ? { text } : undefined,
    }),
  paymentNote: (paymentId: string, text: string) =>
    api.request<CommissionPayment>(`api/painter/commission/payments/${seg(paymentId)}/notes`, { method: "POST", body: { text } }),
  /** Remind a shop of what it owes — its owner is mailed; once a week at most. */
  remind: (linkId: string) => api.request<CommissionShop>(`api/painter/commission/shops/${seg(linkId)}/remind`, { method: "POST" }),
};
