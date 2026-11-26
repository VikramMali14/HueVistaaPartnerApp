/**
 * Every cache key in one place, so a change can say exactly what it made stale. The whole cache
 * is cleared on sign-out, so keys need not carry the account. Memory only: nothing here is
 * written to the phone — the price list's lowest prices least of all.
 */
export const keys = {
  // ── The shop's side ─────────────────────────────────────────────────────────
  /** The shops this account owns or manages (GET /api/organizations/mine). */
  myShops: ["shop", "mine"] as const,
  /** What waits at each shop: price questions, asks for leave, claims… (GET /api/shop-alerts). */
  shopAlerts: ["shop", "alerts"] as const,
  /** One day of a shop's register. Under the shop, so a mark reaches the day and the alerts' counts. */
  register: (orgId: string, date: string) => ["shop", orgId, "register", date] as const,
  shopLeave: (orgId: string) => ["shop", orgId, "leave"] as const,
  shopCorrections: (orgId: string) => ["shop", orgId, "corrections"] as const,
  shopOvertime: (orgId: string) => ["shop", orgId, "overtime"] as const,
  shopPieceWork: (orgId: string) => ["shop", orgId, "piece-work"] as const,
  shopStaff: (orgId: string) => ["shop", orgId, "staff"] as const,
  priceList: (orgId: string) => ["shop", orgId, "price-list"] as const,
  priceRequests: (orgId: string) => ["shop", orgId, "price-requests"] as const,

  // ── The painter's side (P1–P20), as the HueVistaa app keeps them ───────────
  painterWallet: ["painter", "wallet"] as const,
  painterCatalogue: ["painter", "catalogue"] as const,
  painterRedemptions: ["painter", "redemptions"] as const,
  painterProfile: ["painter", "profile"] as const,
  /**
   * P13–P20: the painter's own books and their khatas — all under "painter", "work", so a
   * change can reach a list and the one item open from it at once.
   */
  work: ["painter", "work"] as const,
  workRegister: (date: string) => ["painter", "work", "register", date] as const,
  workWages: ["painter", "work", "wages"] as const,
  workEstimates: ["painter", "work", "estimates"] as const,
  workEstimate: (id: string) => ["painter", "work", "estimates", id] as const,
  workSites: ["painter", "work", "sites"] as const,
  workSite: (id: string) => ["painter", "work", "sites", id] as const,
  workShops: ["painter", "work", "shops"] as const,
  workKhata: (linkId: string) => ["painter", "work", "shops", linkId] as const,
  /** P6: a board's preview, by its token. */
  boardScan: (token: string) => ["painter", "board", token] as const,
  /** P5: a search for painters or shops near a place (memory only — nothing here is written down). */
  nearbyPainters: (s: { state?: string; pincode?: string; division?: string; lat?: number; lon?: number }) =>
    ["nearby", "painters", s.state ?? null, s.pincode ?? null, s.division ?? null, s.lat ?? null, s.lon ?? null] as const,
  nearbyShops: (s: { state?: string; pincode?: string; division?: string; lat?: number; lon?: number }) =>
    ["nearby", "shops", s.state ?? null, s.pincode ?? null, s.division ?? null, s.lat ?? null, s.lon ?? null] as const,
  /** A painter's number once asked for — kept for the session so it's never asked twice. */
  nearbyPhone: (painterId: string) => ["nearby", "phone", painterId] as const,
  /** The names of the places painters say they work in — the same for everybody. */
  workAreas: ["nearby", "work-areas"] as const,
  /** Which place a point is in, by the point to two decimals (memory only). */
  nearbyWhere: (lat: number, lon: number) => ["nearby", "where", lat, lon] as const,
};

/** What a claimed board changes: the balance, its batches and statement — and what it buys. */
export const claimChanges = [keys.painterWallet, keys.painterCatalogue] as const;

/** What a redemption changes: the balance, what's affordable, and the vouchers. */
export const redeemChanges = [keys.painterWallet, keys.painterCatalogue, keys.painterRedemptions] as const;
