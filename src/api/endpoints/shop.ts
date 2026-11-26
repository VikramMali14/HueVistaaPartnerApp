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
  /** Staff asking to put a day right, or to be marked present out on work. */
  correctionsWaiting?: number;
  newestCorrection?: Waiting | null;
  /** Days of overtime waiting for the owner's OK. */
  overtimeWaiting?: number;
  /** Piece work helpers wrote down, waiting for an OK. */
  pieceWorkWaiting?: number;
}

export interface ShopAlerts {
  total: number;
  shops: ShopAlert[];
}

// ── The register ──────────────────────────────────────────────────────────────

export type AttendanceStatus = "PRESENT" | "HALF_DAY" | "ABSENT" | "PAID_LEAVE" | "HALF_PAID_LEAVE" | "WEEK_OFF" | "HOLIDAY";
/** How the shop's staff mark in: the phone, the shop's fingerprint machine, or either. */
export type AttendanceMethod = "PHONE" | "MACHINE" | "BOTH";

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
  /** MACHINE: punched on the shop's machine (placeName is the machine's name); REQUEST: a request the shop OKed. */
  location?: "AT_PLACE" | "AWAY" | "NOT_SHARED" | "NOT_CHECKED" | "MACHINE" | "REQUEST" | null;
  placeName?: string | null;
  distanceMetres?: number | null;
  accuracyMetres?: number | null;
  staffNote?: string | null;
  updatedByName?: string | null;
  lateMinutes?: number | null;
  overtimeMinutes?: number | null;
  late?: boolean;
  weeklyOff?: string | null;
  /** Overtime waiting for an OK, OKed, or not paid — where the shop OKs overtime. */
  overtimeStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  overtimeApprovedMinutes?: number | null;
  /** Marked in and never out: the day's hours can't be counted. */
  missedOut?: boolean;
  /** The shop's holiday on this day, by name. */
  holiday?: string | null;
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
  /** How staff mark in; on MACHINE the shop's places aren't used. */
  attendanceMethod?: AttendanceMethod;
  /** Whether the shop has a fingerprint machine. */
  hasMachine?: boolean;
  /** Days of overtime waiting for the owner's OK, any day. */
  overtimeWaiting?: number;
  /** The shop's holiday on this day, by name. */
  holiday?: string | null;
}

// ── Leave ─────────────────────────────────────────────────────────────────────

export type LeaveStatus = "OPEN" | "APPROVED" | "REFUSED" | "CANCELLED";
/** A whole day (or days), or half of one: the first half off (comes after lunch) or the second (goes early). */
export type LeavePortion = "FULL" | "FIRST_HALF" | "SECOND_HALF";

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
  portion?: LeavePortion | null;
  /** Once approved, in half days: how much was paid, and how much went without pay. */
  paidHalves?: number | null;
  unpaidHalves?: number | null;
  /**
   * While it waits, where the shop gives paid leave by a rule: what the person has left that month,
   * in days. Then it can be approved "by the rule" — paid as far as that covers, the rest without pay.
   */
  leaveLeftDays?: number | null;
}

export interface LeaveAnswer {
  action: "APPROVE" | "REFUSE";
  /** With APPROVE: paid leave (true) or without pay (false) — or left out to go by the shop's rule. */
  paid?: boolean;
  reply?: string;
}

// ── Days put right, overtime, piece work ──────────────────────────────────────

/** A request to put a day right (backend CorrectionResponse). */
export interface AttendanceCorrection {
  id: string;
  orgId: string;
  staffId: string;
  staffName: string;
  /** CORRECTION ("I forgot to punch") or OUT_ON_WORK (marks on the machine, out on a delivery). */
  kind: "CORRECTION" | "OUT_ON_WORK";
  day: string;
  inTime?: string | null;
  outTime?: string | null;
  reason: string;
  status: LeaveStatus;
  reply?: string | null;
  decidedByName?: string | null;
  createdAt?: string | null;
}

/** A job of piece work (backend PieceEntryResponse). */
export interface PieceEntry {
  id: string;
  orgId: string;
  workDay: string;
  note?: string | null;
  status: LeaveStatus;
  split: "EQUAL" | "CUSTOM";
  totalPaise: number;
  lines: { itemName: string; quantity: number; amountPaise: number }[];
  shares: { staffId: string; name: string; sharePaise: number }[];
  createdByName?: string | null;
  byStaff: boolean;
  createdByStaffId?: string | null;
  decidedByName?: string | null;
  reply?: string | null;
  createdAt?: string | null;
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

  // Days put right — "I forgot to punch", "out on a delivery"
  corrections: (orgId: string) => api.request<AttendanceCorrection[]>(`api/organizations/${seg(orgId)}/attendance/corrections`),
  /** Approve (the day is written present, with the times as given or as the owner changes them) or refuse. */
  answerCorrection: (orgId: string, id: string, body: { action: "APPROVE" | "REFUSE"; reply?: string; inTime?: string; outTime?: string }) =>
    api.request<AttendanceCorrection>(`api/organizations/${seg(orgId)}/attendance/corrections/${seg(id)}/answer`, { method: "POST", body }),

  // Overtime waiting for the owner's OK
  overtime: (orgId: string) => api.request<StaffDay[]>(`api/organizations/${seg(orgId)}/attendance/overtime`),
  /** OK it all, or so many minutes of it (whole half hours) — or not paid. */
  answerOvertime: (orgId: string, staffId: string, date: string, body: { approve: boolean; minutes?: number | null }) =>
    api.request<StaffDay>(`api/organizations/${seg(orgId)}/attendance/${seg(staffId)}/${seg(date)}/overtime`, { method: "PUT", body }),

  // Piece work: the helpers' own jobs waiting (this month's jobs come too)
  pieceJobs: (orgId: string) => api.request<PieceEntry[]>(`api/organizations/${seg(orgId)}/piece-work`),
  answerPieceJob: (orgId: string, id: string, body: { action: "APPROVE" | "REFUSE"; reply?: string }) =>
    api.request<PieceEntry>(`api/organizations/${seg(orgId)}/piece-work/${seg(id)}/answer`, { method: "POST", body }),

  // The staff
  staff: (orgId: string) => api.request<StaffMember[]>(`api/organizations/${seg(orgId)}/staff`),

  // The price list
  priceList: (orgId: string) => api.request<PriceList>(`api/organizations/${seg(orgId)}/price-list`),
  priceRequests: (orgId: string) => api.request<PriceRequest[]>(`api/organizations/${seg(orgId)}/price-requests`),
  /** Answer a staff member's price question: a line of reply, and/or the item it's about (added to the list). */
  answerPrice: (orgId: string, requestId: string, body: { reply?: string; itemId?: string }) =>
    api.request<PriceRequest>(`api/organizations/${seg(orgId)}/price-requests/${seg(requestId)}/answer`, { method: "POST", body }),
};
