import * as WebBrowser from "expo-web-browser";

import { env } from "@/config/env";

/** Website pages the app links to. Opening them keeps help and legal text always current. */
export const webPages = {
  terms: "/legal/terms",
  privacy: "/legal/privacy",
  contact: "/legal/contact",
  /** A painter's own home: their customer side, on the main website (they sign in there with the same account). */
  ownHome: "/choose-profile?next=%2Fmy-projects",
  /** The shop's pages, on the partner site where shops sign in. */
  shopDashboard: `${env.partnerOrigin}/dashboard`,
  shopStaff: `${env.partnerOrigin}/staff`,
  /** The register's settings: the fingerprint machine, the shop's rules, holidays and places. */
  shopAttendance: `${env.partnerOrigin}/staff/attendance`,
  shopSalary: `${env.partnerOrigin}/staff/salary`,
  shopPieceWork: `${env.partnerOrigin}/staff/piece-work`,
  shopPriceList: `${env.partnerOrigin}/price-list`,
  shopApprovals: `${env.partnerOrigin}/approvals`,
  shopCommission: `${env.partnerOrigin}/commission`,
  shopGodown: `${env.partnerOrigin}/godown`,
  /** No shop behind a number: the shop signup (the partner site's free trial). */
  shopTrial: `${env.partnerOrigin}/trial`,
  /** Becoming a painter with HueVistaa. */
  painterJoin: env.painterOrigin,
} as const;

/** Open a page of the website in the in-app browser — a full URL, or a path on the main website. */
export async function openWebPage(path: string): Promise<void> {
  const url = /^https?:\/\//.test(path) ? path : `${env.siteOrigin}${path}`;
  try {
    await WebBrowser.openBrowserAsync(url, { showTitle: true, enableBarCollapsing: true });
  } catch {
    // The person can still reach the site themselves; nothing on screen depends on this.
  }
}
