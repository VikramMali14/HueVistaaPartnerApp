import { useRouter } from "expo-router";
import { useCallback } from "react";

import type { AuthResponse } from "@/api/types";
import { EmailCodeNeededError, NotPartnerError, useSession } from "@/auth/session";
import type { Side } from "@/auth/sides";

import { keepDeviceToken } from "./device";

/** What a sign-in answer means for the screen that asked. */
export type SignInOutcome =
  /** The session is open; the (auth) layout moves the person on to their side. */
  | { kind: "signedIn" }
  /** A shop on a new phone: the emailed code, on its own screen (this hook goes there). */
  | { kind: "emailCode" }
  /** A mobile number with no shop and no painter behind it: nothing was opened. */
  | { kind: "noAccount" }
  /** It worked, for an account that belongs in another app (or on the website). Nothing was kept. */
  | { kind: "refused"; side: Exclude<Side, "shop" | "painter"> };

/**
 * Finish any sign-in answer the same way everywhere — mobile code, email and password, or a shop's
 * emailed code. A painter or a shop with its customer side switched on is asked on the website
 * which side to continue as; here the answer is always the business side, so that question is
 * passed over — and somebody whose own sign-in is a customer's, with a shop or painter work as a
 * side, goes on into that (a shop asking for its emailed code first). Their other sides are a
 * switch away on Me.
 */
export function useFinishSignIn() {
  const router = useRouter();
  const { completeSignIn } = useSession();

  return useCallback(
    async (response: AuthResponse): Promise<SignInOutcome> => {
      if (response.twoFactorRequired) return { kind: "refused", side: "other" };
      if (response.shopSignupRequired) return { kind: "noAccount" };
      if (response.emailCodeRequired && response.challengeToken) {
        router.push({ pathname: "/email-code", params: { challenge: response.challengeToken, hint: response.emailHint ?? "" } });
        return { kind: "emailCode" };
      }
      await keepDeviceToken(response);
      try {
        await completeSignIn(response);
        return { kind: "signedIn" };
      } catch (err) {
        if (err instanceof NotPartnerError) return { kind: "refused", side: err.side };
        // The sign-in went on into one of the person's shops, which asks for its emailed code.
        if (err instanceof EmailCodeNeededError) {
          router.push({ pathname: "/email-code", params: { challenge: err.challenge, hint: err.hint } });
          return { kind: "emailCode" };
        }
        throw err;
      }
    },
    [completeSignIn, router],
  );
}
