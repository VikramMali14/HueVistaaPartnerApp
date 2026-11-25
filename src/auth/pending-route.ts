/**
 * Where a signed-out person was trying to go, as in the HueVistaa app (its pending-route.ts).
 *
 * A link into this app — HueVistaa sending a painter to a board's claim
 * (`huevistaapartner://painter/claim/{token}`), say — can arrive while nobody is signed in.
 * The guard remembers the page, and the sign-in takes the person there instead of their home,
 * so the board is not lost on the way. A shop that signs in with a painter's page remembered is
 * simply sent on to its own home by that page's guard.
 *
 * Kept in memory only, and never after a sign-out by choice: whoever signs in next on this phone
 * may be someone else.
 */

/** Never worth returning to: the sign-in screens, the screen for a refused sign-in, and the root. */
const NOT_A_DESTINATION = /^\/((welcome|phone|code|email|email-code|not-partner)(\/|\?|$)|\?|$)/;

let remembered: string | null = null;

/**
 * Only an in-app path is accepted: it must start with one slash, so nothing that came in on a
 * link can send the app to another scheme, host or `//evil.example`.
 */
export function isRememberablePath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.length > 1 &&
    path.length <= 512 &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !NOT_A_DESTINATION.test(path)
  );
}

export function rememberRoute(path: string): void {
  if (!isRememberablePath(path)) return;
  // While a guard's redirect is on its way, the router can report only the guarded layout's own
  // segment, with the page's params as a query ("/painter?token=…" for "/painter/claim/…").
  // That's the same visit, not a new page: the deeper path stays.
  if (remembered && remembered.split("?")[0]!.startsWith(`${path.split("?")[0]}/`)) return;
  remembered = path;
}

/** Read without clearing — safe to call during render. */
export function peekRememberedRoute(): string | null {
  return remembered;
}

export function forgetRememberedRoute(): void {
  remembered = null;
}
