import { Stack } from "expo-router";

import { useGuard } from "@/auth/guards";
import { ShopProvider } from "@/features/shop/ShopContext";
import { useTheme } from "@/theme";

/** The shop's side — a shop's own login (RETAILER) only. Everybody else is sent to their side. */
export default function ShopLayout() {
  const { colors } = useTheme();
  const blocked = useGuard((profile) => profile.role === "RETAILER" && !profile.linkedProfile);
  if (blocked) return blocked;
  return (
    <ShopProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </ShopProvider>
  );
}
