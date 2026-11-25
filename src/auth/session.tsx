import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { authApi } from "@/api/endpoints/auth";
import { isApiError } from "@/api/errors";
import { tokens } from "@/api/instance";
import { queryClient } from "@/api/query-client";
import type { AuthResponse, UserProfile } from "@/api/types";

import { deviceToken, keepDeviceToken } from "@/features/auth/device";

import { forgetRememberedRoute } from "./pending-route";
import { partnerSide, type Side } from "./sides";

/** The profile is not secret; it is cached so the app can open with no connection. */
const PROFILE_CACHE_KEY = "hvp.profile";
/** Sign-out never waits longer than this for the server to hear about it. */
const LOGOUT_WAIT_MS = 3000;

export type SessionState =
  | { status: "loading" }
  /** Tokens exist but the server can't be reached and nothing is cached. */
  | { status: "unreachable" }
  /** `byChoice`: the person signed out themselves, so no page is remembered for the next one. */
  | { status: "signedOut"; byChoice?: boolean }
  | { status: "signedIn"; profile: UserProfile };

/**
 * A sign-in that worked, for an account the partner app has nothing for: somebody at a shop's
 * counter (the HueVistaa Staff app is theirs), a homeowner (the HueVistaa app), an admin or a
 * distributor (the website). Nothing is kept on the phone, the account's other sessions are left
 * alone, and the screen says where they belong.
 */
/**
 * A switch into a shop, or a sign-in that goes on into one of the person's shops, that waits on the
 * shop's emailed code: the challenge to finish it with, and where the code went (masked).
 */
export class EmailCodeNeededError extends Error {
  readonly challenge: string;
  readonly hint: string;
  constructor(challenge: string, hint: string) {
    super("The shop's emailed code is needed first");
    this.name = "EmailCodeNeededError";
    this.challenge = challenge;
    this.hint = hint;
  }
}

/** What switching to another side came to. */
export type SwitchOutcome =
  | { kind: "switched"; profile: UserProfile }
  /** A shop on a phone that hasn't confirmed its emailed code lately: finish with confirmSwitch(). */
  | { kind: "emailCode"; challenge: string; hint: string };

export class NotPartnerError extends Error {
  readonly side: Exclude<Side, "shop" | "painter">;
  constructor(side: Exclude<Side, "shop" | "painter">) {
    super(`Not a shop or a painter (${side})`);
    this.name = "NotPartnerError";
    this.side = side;
  }
}

export interface SessionValue {
  state: SessionState;
  /** The profile when signed in, else null. */
  profile: UserProfile | null;
  /**
   * Save the tokens from a sign-in answer and load the profile. Throws {@link NotPartnerError}
   * for an account that is neither a shop nor a painter, keeping none of it.
   */
  completeSignIn(response: AuthResponse): Promise<UserProfile>;
  /** Read the profile again. */
  refreshProfile(): Promise<UserProfile | null>;
  /** Use a profile the server just returned (a new name, a confirmed number) without another fetch. */
  updateProfile(profile: UserProfile): Promise<void>;
  /**
   * Continue as another of the person's sides — a shop, their painter work, another shop — without
   * signing in again. A shop may first need its emailed code: then the session is left as it is and
   * the answer says so, to be finished with {@link confirmSwitch}.
   */
  switchTo(sideId: string): Promise<SwitchOutcome>;
  /** Finish a switch into a shop with the code it emailed. */
  confirmSwitch(challenge: string, code: string): Promise<UserProfile>;
  /** Sign out on this phone, telling the server when it can be reached. */
  signOut(): Promise<void>;
  /** Try the start-up restore again (from the "can't reach" state). */
  retry(): void;
}

const SessionContext = createContext<SessionValue | null>(null);

async function cacheProfile(profile: UserProfile) {
  await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)).catch(() => {});
}

async function readCachedProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

/** Tell the server, but never keep anybody waiting on a dead connection. */
async function endOnServer(): Promise<void> {
  await Promise.race([authApi.logout().catch(() => {}), new Promise((resolve) => setTimeout(resolve, LOGOUT_WAIT_MS))]);
}

/** Everything kept for one account goes with it: the screens' data and the cached profile. */
async function forgetAccountData(): Promise<void> {
  queryClient.clear();
  await AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  /** A profile answer that lands after a sign-out is dropped, never brought back on screen. */
  const signedInId = useRef<string | null>(null);
  useEffect(() => {
    signedInId.current = state.status === "signedIn" ? state.profile.id : null;
  }, [state]);

  const forget = useCallback(async (byChoice = false) => {
    if (byChoice) forgetRememberedRoute();
    await tokens.clear();
    await forgetAccountData();
    setState({ status: "signedOut", byChoice });
  }, []);

  const applyProfile = useCallback(async (profile: UserProfile) => {
    if (!tokens.hasSession() || signedInId.current !== profile.id) return;
    await cacheProfile(profile);
    setState((prev) => (prev.status === "signedIn" && prev.profile.id === profile.id ? { status: "signedIn", profile } : prev));
  }, []);

  // Start-up: restore the saved session.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await tokens.load();
      if (!tokens.hasSession()) {
        if (!cancelled) setState({ status: "signedOut" });
        return;
      }
      try {
        const profile = await authApi.profile();
        await cacheProfile(profile);
        if (!cancelled) setState({ status: "signedIn", profile });
      } catch (err) {
        if (cancelled) return;
        if (!tokens.hasSession() || (isApiError(err) && err.status === 401)) {
          await forget();
          return;
        }
        // Offline or the server is down: never sign somebody out for that.
        const cached = await readCachedProfile();
        setState(cached ? { status: "signedIn", profile: cached } : { status: "unreachable" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, forget]);

  // The backend refused the refresh token mid-session.
  useEffect(() => tokens.onSessionEnded(() => void forget()), [forget]);

  const completeSignIn = useCallback(async function completeSignIn(response: AuthResponse): Promise<UserProfile> {
    // An admin's emailed code never reaches here: the screens send admins to the website.
    if (response.twoFactorRequired) throw new NotPartnerError("other");
    if (!response.accessToken || !response.refreshToken) {
      throw new Error("completeSignIn() needs an answer that carries tokens");
    }
    await tokens.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    let profile: UserProfile;
    try {
      profile = await authApi.profile();
    } catch (err) {
      // Never leave tokens saved behind a screen that says "signed out".
      await tokens.clear();
      throw err;
    }
    const side = partnerSide(profile);
    if (side !== "shop" && side !== "painter") {
      // Somebody whose own sign-in isn't a shop's or a painter's — a customer whose shop the team
      // added to their account — goes on into that shop (or their painter work) here.
      const partner = (profile.sides ?? []).find(
        (other) => !other.current && (other.kind === "SHOP" || other.kind === "PAINTER"),
      );
      if (partner) {
        let switched: AuthResponse;
        try {
          switched = await authApi.switchProfile({
            to: partner.id,
            deviceToken: await deviceToken(),
            refreshToken: response.refreshToken,
          });
        } catch (err) {
          await tokens.clear();
          throw err;
        }
        if (switched.emailCodeRequired && switched.challengeToken) {
          await tokens.clear();
          throw new EmailCodeNeededError(switched.challengeToken, switched.emailHint ?? "");
        }
        return completeSignIn(switched);
      }
      // Dropped, not ended on the server: the backend's logout ends EVERY session the account
      // has — a homeowner's HueVistaa app, an employee's staff app — so a sign-in this app
      // refuses is simply never kept, and its tokens lapse unused.
      await tokens.clear();
      throw new NotPartnerError(side);
    }
    // Another account than the one on screen — a switch to another side of the person: nothing the
    // last one loaded (a shop's staff, a painter's points) may show under the new one.
    if (signedInId.current && signedInId.current !== profile.id) queryClient.clear();
    await cacheProfile(profile);
    signedInId.current = profile.id;
    setState({ status: "signedIn", profile });
    return profile;
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      state,
      profile: state.status === "signedIn" ? state.profile : null,

      completeSignIn,

      async switchTo(sideId) {
        const response = await authApi.switchProfile({
          to: sideId,
          deviceToken: await deviceToken(),
          refreshToken: tokens.refreshToken ?? undefined,
        });
        if (response.emailCodeRequired && response.challengeToken) {
          return { kind: "emailCode", challenge: response.challengeToken, hint: response.emailHint ?? "" };
        }
        return { kind: "switched", profile: await completeSignIn(response) };
      },

      async confirmSwitch(challenge, code) {
        const response = await authApi.shopEmailCode({ challengeToken: challenge, code });
        await keepDeviceToken(response);
        return completeSignIn(response);
      },

      async refreshProfile() {
        if (state.status !== "signedIn") return null;
        const profile = await authApi.profile();
        await applyProfile(profile);
        return profile;
      },

      async updateProfile(profile) {
        if (state.status !== "signedIn") return;
        await applyProfile(profile);
      },

      async signOut() {
        if (tokens.hasSession()) await endOnServer();
        await forget(true);
      },

      retry() {
        setState({ status: "loading" });
        setAttempt((n) => n + 1);
      },
    }),
    [state, forget, applyProfile, completeSignIn],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession() must be used inside <SessionProvider>");
  return value;
}
