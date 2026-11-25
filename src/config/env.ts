import { Platform } from "react-native";

/**
 * Where the app talks to. EXPO_PUBLIC_* values are built into the app (see .env.example
 * and eas.json), so nothing secret belongs here.
 */

/** Android emulator → the computer it runs on. A real phone needs your LAN IP in .env. */
const DEV_API_ORIGIN = "http://10.0.2.2:8080";
const PROD_API_ORIGIN = "https://api.huevistaa.com";
const PROD_SITE_ORIGIN = "https://huevistaa.com";
const PROD_PAINTER_ORIGIN = "https://painter.huevistaa.com";
const PROD_PARTNER_ORIGIN = "https://shop.huevistaa.com";

function origin(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\/+$/, "");
  return trimmed ? trimmed : undefined;
}

const siteOrigin = origin(process.env.EXPO_PUBLIC_SITE_ORIGIN) ?? PROD_SITE_ORIGIN;

export const env = {
  apiOrigin: origin(process.env.EXPO_PUBLIC_API_ORIGIN) ?? (__DEV__ ? DEV_API_ORIGIN : PROD_API_ORIGIN),
  siteOrigin,
  /**
   * The partner site, where shops sign in on the web. It keeps its own session (host-only
   * cookies), so the shop's pages are opened there directly. Unset, it is the production partner
   * site for the production website, and the website itself for any other.
   */
  partnerOrigin:
    origin(process.env.EXPO_PUBLIC_PARTNER_ORIGIN) ?? (siteOrigin === PROD_SITE_ORIGIN ? PROD_PARTNER_ORIGIN : siteOrigin),
  /** The painter website, named on a colour board's reward page (as the website names it). */
  painterOrigin: origin(process.env.EXPO_PUBLIC_PAINTER_ORIGIN) ?? PROD_PAINTER_ORIGIN,
  /** Must match app.json's "scheme". */
  scheme: "huevistaapartner",
} as const;

/**
 * Whether the app may send somebody to the website to pay (a painter's certification). "play" is
 * the Android store build, whose payments policy forbids pointing at a payment outside it; "web"
 * is iOS for now and a sideloaded APK. On Android only an explicit EXPO_PUBLIC_PAYMENTS=web gives
 * the website. A function, read at each call, so tests can switch it.
 */
export type PaymentsMode = "play" | "web";

export function paymentsMode(): PaymentsMode {
  if (Platform.OS !== "android") return "web";
  return process.env.EXPO_PUBLIC_PAYMENTS?.trim() === "web" ? "web" : "play";
}
