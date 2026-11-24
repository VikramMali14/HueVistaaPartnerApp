import { Redirect, useGlobalSearchParams, usePathname, useSegments, type Href } from "expo-router";
import { useEffect, useMemo, type ReactElement } from "react";
import { View } from "react-native";

import type { UserProfile } from "@/api/types";
import { useTheme } from "@/theme";

import { forgetRememberedRoute, peekRememberedRoute, rememberRoute } from "./pending-route";
import { useSession } from "./session";
import { homeFor } from "./sides";

/** The current path with its query, e.g. "/painter/claim/abc" (as the HueVistaa app reads it). */
function useCurrentHref(): string {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  // Route params ([token]) are already in the pathname; everything else is query.
  const routeParams = new Set(
    (useSegments() as string[]).filter((s) => s.startsWith("[")).map((s) => s.replace(/^\[(\.\.\.)?|\]$/g, "")),
  );
  const query = Object.entries(params)
    .filter(([key, value]) => value !== undefined && !routeParams.has(key))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * The guard each side's `_layout.tsx` uses. Returns what to render INSTEAD of the group (a
 * redirect, or an empty page while the session is still being restored), or `null` when the
 * person may enter.
 *
 *   const blocked = useGuard((p) => p.role === "PAINTER");
 *   if (blocked) return blocked;
 *
 * A signed-out person is sent to Welcome, and the page they asked for — a board's claim opened
 * from the HueVistaa app, say — is remembered so the sign-in brings them back to it. Not after
 * a sign-out by choice: whoever signs in next may be someone else.
 */
export function useGuard(allow: (profile: UserProfile) => boolean): ReactElement | null {
  const { state } = useSession();
  const { colors } = useTheme();
  const href = useCurrentHref();

  switch (state.status) {
    case "loading":
      // The splash normally covers this; never flash the wrong screen.
      return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
    case "unreachable":
      return <Redirect href="/" />;
    case "signedOut":
      if (!state.byChoice) rememberRoute(href);
      return <Redirect href="/welcome" />;
    case "signedIn":
      return allow(state.profile) ? null : <Redirect href={homeFor(state.profile)} />;
  }
}

/**
 * Where a sign-in that just completed goes: the page remembered from before it, once, or the
 * side's home. Fixed per account, so forgetting the remembered page cannot move a redirect that
 * is already on its way.
 */
export function useAfterSignIn(profile: UserProfile | null): Href | null {
  const home = profile ? homeFor(profile) : null;
  const target = useMemo(() => (home ? ((peekRememberedRoute() ?? home) as Href) : null), [home]);
  useEffect(() => {
    if (target) forgetRememberedRoute();
  }, [target]);
  return target;
}
