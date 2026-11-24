import { Redirect, Stack } from "expo-router";

import { useSession } from "@/auth/session";
import { homeFor } from "@/auth/sides";

/**
 * The signed-out screens. The moment a sign-in completes the session changes, and this layout
 * sends the person to their side — only a shop or a painter ever gets that far (auth/session.tsx).
 */
export default function AuthLayout() {
  const { state } = useSession();
  if (state.status === "signedIn") return <Redirect href={homeFor(state.profile)} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
