import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Shop, ShopAlert } from "@/api/endpoints/shop";

import { useMyShops, useShopAlerts } from "./use-shop";

interface ShopContextValue {
  /** Every shop this account owns, oldest first. */
  shops: Shop[];
  /** The one on screen. Undefined only while loading, or with no shop at all. */
  shop: Shop | undefined;
  /** What waits there — undefined while loading, or where staff aren't switched on. */
  alert: ShopAlert | undefined;
  choose: (orgId: string) => void;
  loading: boolean;
  error: unknown;
  retry: () => void;
}

const ShopContext = createContext<ShopContextValue | null>(null);

/**
 * The shop the owner is looking at, the same on every tab: an owner of two shops switches once and
 * every tab follows. Most owners have one, and never see a switch.
 */
export function ShopProvider({ children }: { children: ReactNode }) {
  const shopsQuery = useMyShops();
  const alertsQuery = useShopAlerts();
  const [chosen, setChosen] = useState<string | null>(null);

  const value = useMemo<ShopContextValue>(() => {
    const shops = shopsQuery.data ?? [];
    const shop = shops.find((s) => s.id === chosen) ?? shops[0];
    const alert = alertsQuery.data?.shops.find((a) => a.orgId === shop?.id && (a.role === "OWNER" || a.manager));
    return {
      shops,
      shop,
      alert,
      choose: setChosen,
      loading: shopsQuery.isPending,
      error: shopsQuery.error,
      retry: () => void shopsQuery.refetch(),
    };
  }, [shopsQuery, alertsQuery.data, chosen]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop() must be used inside <ShopProvider>");
  return value;
}
