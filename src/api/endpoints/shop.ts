/**
 * A shop's day on the owner's phone: what waits for them, the staff register, the staff's asks
 * for leave and price questions, and the price list. Backend: account/ (the shops an account
 * owns), staff/ (the bell, the staff list), attendance/ (ShopAttendanceController) and pricelist/.
 * The partner website has the same pages (HueVistaFrontEnd app/(app)/attendance, price-list,
 * staff); the app has what an owner does in a minute, standing in the shop.
 *
 * Prices on the list are rupees (9200, 45.5) as the owner typed them. Days are YYYY-MM-DD; times
 * are India time with no zone.
 */
import { api } from "../instance";

const seg = (value: string) => encodeURIComponent(value);

// ── The shops ─────────────────────────────────────────────────────────────────

/** GET /api/organizations/mine — the organisations the account belongs to; a shop is a RETAILER. */
export interface Shop {
  id: string;
  name: string;
  type: "RETAILER" | "DISTRIBUTOR" | "PLATFORM" | (string & {});
  city?: string | null;
  ownerName?: string | null;
}

/** Someone waiting, and for what, on the bell. */
export interface Waiting {
  id?: string | null;
  by?: string | null;
  item?: string | null;
  reply?: string | null;
  at?: string | null;
}

/** GET /api/shop-alerts — one of these for each shop the account owns or manages (staff switched on). */
export interface ShopAlert {
  orgId: string;
  shopName: string;
  role: "OWNER" | "EDITOR" | "STAFF";
  manager?: boolean;
  openRequests: number;
  newestRequest?: Waiting | null;
  newAnswers?: number;
  staffSalesWaiting: number;
  painterClaimsWaiting: number;
  materialListsWaiting: number;
  paymentsNotReceived: number;
  duesAsked: number;
  newestDuesAsk?: Waiting | null;
  godownEntries: number;
  newestGodownEntry?: Waiting | null;
  leaveRequestsWaiting: number;
  newestLeaveRequest?: Waiting | null;
  leaveAnswers?: number;
}

export interface ShopAlerts {
  total: number;
  shops: ShopAlert[];
}

// ── The register ──────────────────────────────────────────────────────────────

export type AttendanceStatus = "PRESENT" | "HALF_DAY" | "ABSENT" | "PAID_LEAVE" | "WEEK_OFF" | "HOLIDAY";

/** One person's day in the shop's register (backend StaffDayResponse). */
export interface StaffDay {
  staffId: string;
  staffName: string;
  date: string;
  /** Null for a day nobody marked. */
  status?: AttendanceStatus | null;
  /** Nobody marked it and it counts by itself: their week off, or present by the shop's setting. */
  auto: boolean;
  markedBy?: "STAFF" | "SHOP" | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  location?: "AT_PLACE" | "AWAY" | "NOT_SHARED" | "NOT_CHECKED" | null;
  placeName?: string | null;
  distanceMetres?: number | null;
  accuracyMetres?: number | null;
  staffNote?: string | null;
  updatedByName?: string | null;
  lateMinutes?: number | null;
  overtimeMinutes?: number | null;
  late?: boolean;
  weeklyOff?: string | null;
}

/** A place staff mark themselves present from (the shop, its godown). */
export interface Place {
  id: string;
  name: string;
  radiusMetres: number;
  setByName?: string | null;
  updatedAt?: string | null;
}

/** GET /api/organizations/{orgId}/attendance — one day of the register. */
export interface RegisterDay {
  shopId: string;
  shopName: string;
  date: string;
  today: boolean;
  /** A day nobody marked counts as present (true) or absent (false). */
  unmarkedPresent: boolean;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  lateGraceMinutes: number;
  places: Place[];
  staff: StaffDay[];
  /** How many of each status, and NOT_MARKED. */
  counts: Partial<Record<AttendanceStatus | "NOT_MARKED", number>>;
}

// ── Leave ─────────────────────────────────────────────────────────────────────

export type LeaveStatus = "OPEN" | "APPROVED" | "REFUSED" | "CANCELLED";

export interface LeaveRequest {
  id: string;
  orgId: string;
  shopName?: string | null;
  staffId: string;
  staffName: string;
  fromDay: string;
  toDay: string;
  days: number;
  reason?: string | null;
  status: LeaveStatus;
  /** Approved as paid leave (true) or unpaid (false); null until approved. */
  paid?: boolean | null;
  reply?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  createdAt?: string | null;
  seen?: boolean;
}

export interface LeaveAnswer {
  action: "APPROVE" | "REFUSE";
  /** With APPROVE: paid leave (true) or without pay (false). */
  paid?: boolean;
  reply?: string;
}

// ── The staff ─────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  canEditPrices: boolean;
  canSeeLowest: boolean;
  canRecordPainterSales: boolean;
  canKeepGodown: boolean;
  canManage: boolean;
  /** Whether they have signed in with the number yet. */
  signedIn: boolean;
  lastSeenAt?: string | null;
  joinedOn?: string | null;
}

// ── The price list ────────────────────────────────────────────────────────────

export interface PricePack {
  id: string;
  label: string;
  mrp?: number | null;
  sellingPrice: number;
  lowestPrice?: number | null;
  godownQty?: number | null;
}

export interface PriceItem {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  nicknames?: string | null;
  note?: string | null;
  packs: PricePack[];
  updatedAt?: string | null;
}

export interface PriceList {
  shopId: string;
  shopName: string;
  access: "OWNER" | "EDITOR" | "STAFF";
  viewerName: string;
  items: PriceItem[];
  seesLowest?: boolean;
  newAnswers?: number;
  hasGodown?: boolean;
}

export interface PriceRequest {
  id: string;
  itemText: string;
  note?: string | null;
  status: "OPEN" | "ANSWERED";
  requestedByName: string;
  mine: boolean;
  createdAt?: string | null;
  reply?: string | null;
  itemId?: string | null;
  itemName?: string | null;
  answeredByName?: string | null;
  answeredAt?: string | null;
}

export const shopApi = {
  myShops: () => api.request<Shop[]>("api/organizations/mine"),
  alerts: () => api.request<ShopAlerts>("api/shop-alerts"),

  // The register
  register: (orgId: string, date?: string) =>
    api.request<RegisterDay>(`api/organizations/${seg(orgId)}/attendance`, { query: { date } }),
  /** Set one person's day. A null status clears a day they didn't mark in on. */
  mark: (orgId: string, staffId: string, date: string, status: AttendanceStatus | null) =>
    api.request<StaffDay>(`api/organizations/${seg(orgId)}/attendance/${seg(staffId)}/${seg(date)}`, { method: "PUT", body: { status } }),
  /** One status for everybody not marked yet that day (or for `staffIds`, with onlyUnmarked false). */
  markMany: (orgId: string, date: string, body: { status: AttendanceStatus; staffIds?: string[]; onlyUnmarked?: boolean }) =>
    api.request<RegisterDay>(`api/organizations/${seg(orgId)}/attendance/day/${seg(date)}`, { method: "POST", body }),
  /** Save where this phone is as one of the shop's places ("Shop", "Godown") — a name saved before moves. */
  savePlace: (orgId: string, body: { name: string; latitude: number; longitude: number; accuracyMetres: number }) =>
    api.request<Place[]>(`api/organizations/${seg(orgId)}/attendance/places`, { method: "POST", body }),

  // Leave
  leave: (orgId: string) => api.request<LeaveRequest[]>(`api/organizations/${seg(orgId)}/attendance/leave`),
  answerLeave: (orgId: string, leaveId: string, body: LeaveAnswer) =>
    api.request<LeaveRequest>(`api/organizations/${seg(orgId)}/attendance/leave/${seg(leaveId)}/answer`, { method: "POST", body }),

  // The staff
  staff: (orgId: string) => api.request<StaffMember[]>(`api/organizations/${seg(orgId)}/staff`),

  // The price list
  priceList: (orgId: string) => api.request<PriceList>(`api/organizations/${seg(orgId)}/price-list`),
  priceRequests: (orgId: string) => api.request<PriceRequest[]>(`api/organizations/${seg(orgId)}/price-requests`),
  /** Answer a staff member's price question: a line of reply, and/or the item it's about (added to the list). */
  answerPrice: (orgId: string, requestId: string, body: { reply?: string; itemId?: string }) =>
    api.request<PriceRequest>(`api/organizations/${seg(orgId)}/price-requests/${seg(requestId)}/answer`, { method: "POST", body }),
};
