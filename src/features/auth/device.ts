import type { AuthResponse } from "@/api/types";
import { secureTokenStore } from "@/auth/token-store";

/**
 * The shop's trusted-phone token, if this phone has one. Sent with every sign-in, so a shop is not
 * asked for an emailed code again within 30 days. Kept across sign-outs, as the website keeps it.
 */
export async function deviceToken(): Promise<string | undefined> {
  try {
    return (await secureTokenStore.readDeviceToken()) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Keep the token a confirmed emailed code gave this phone. */
export async function keepDeviceToken(response: AuthResponse): Promise<void> {
  if (!response.deviceToken) return;
  try {
    await secureTokenStore.writeDeviceToken(response.deviceToken);
  } catch {
    // Not kept: the next sign-in on this phone asks for the emailed code again.
  }
}
