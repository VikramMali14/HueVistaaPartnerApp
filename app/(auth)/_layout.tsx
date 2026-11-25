import { Redirect, Stack } from "expo-router";

import { useAfterSignIn } from "@/auth/guards";
import { useSession } from "@/auth/session";

/**
 * The signed-out screens. The moment a sign-in completes the session changes, and this layout
 * sends the person on — to the page they opened before signing in (a board's claim from the
 * HueVistaa app), or to their side's home. Only a shop or a painter ever gets that far
 * (auth/session.tsx).
 */
export default function AuthLayout() {
  const { state } = useSession();
  const target = useAfterSignIn(state.status === "signedIn" ? state.profile : null);
  if (target) return <Redirect href={target} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
