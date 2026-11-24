import { isApiError, messageFor } from "@/api/errors";
import { NotPartnerError } from "@/auth/session";
import type { Side } from "@/auth/sides";
import { t } from "@/i18n";

/**
 * The texted code was right, but an existing account holds the number unconfirmed (409). Nothing
 * was made, and the code is not spent: "This isn't my account" sends it again with `notMyAccount`.
 */
export function isPhoneOnUnconfirmedAccount(err: unknown): boolean {
  return isApiError(err) && err.code === "PHONE_ON_UNCONFIRMED_ACCOUNT";
}

/**
 * Confirming a mobile: the number already signs in to a separate customer account — almost always
 * the painter's own — which can be moved into this account's customer profile with a code (409).
 */
export function isPhoneOnCustomerAccount(err: unknown): boolean {
  return isApiError(err) && err.code === "PHONE_ON_CUSTOMER_ACCOUNT";
}

/** Where a sign-in that worked, for an account the partner app has nothing for, belongs instead. */
export function refusalMessage(side: Exclude<Side, "shop" | "painter">): string {
  if (side === "staff") return t("auth.refused.staff");
  if (side === "customer") return t("auth.refused.customer");
  return t("auth.refused.admin");
}

/**
 * The sentence for a failed sign-in call. Sign-in endpoints answer without a session, so their 401
 * and 403 carry their own reason ("Incorrect code. 2 attempts left."), written for people — so they
 * are shown as they are. No answer, a timeout or a 5xx goes through the app-wide messageFor.
 */
export function authErrorMessage(err: unknown): string {
  if (err instanceof NotPartnerError) return refusalMessage(err.side);
  if (isPhoneOnUnconfirmedAccount(err)) return t("auth.code.unconfirmedElsewhere");
  if (isApiError(err) && err.kind === "http" && err.status >= 400 && err.status < 500) {
    const firstField = err.fieldErrors ? Object.values(err.fieldErrors)[0] : undefined;
    if (firstField) return firstField;
    if (err.message) return err.message;
  }
  return messageFor(err);
}

/** The server's message for one field, if it sent one. */
export function fieldError(err: unknown, field: string): string | null {
  return isApiError(err) ? (err.fieldErrors?.[field] ?? null) : null;
}
