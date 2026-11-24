import { useQuery } from "@tanstack/react-query";

import { shopApi } from "@/api/endpoints/shop";
import { keys } from "@/api/query-keys";

/** The shops this account owns — the RETAILER organisations among its memberships. */
export function useMyShops() {
  return useQuery({
    queryKey: keys.myShops,
    queryFn: async () => (await shopApi.myShops()).filter((org) => org.type === "RETAILER"),
  });
}

/** What waits at each shop, read every minute while the app is open. */
export function useShopAlerts() {
  return useQuery({ queryKey: keys.shopAlerts, queryFn: shopApi.alerts, refetchInterval: 60_000 });
}

/** One day of a shop's register. */
export function useRegister(orgId: string | undefined, date: string) {
  return useQuery({
    queryKey: keys.register(orgId ?? "", date),
    queryFn: () => shopApi.register(orgId!, date),
    enabled: Boolean(orgId),
  });
}

/** The staff's asks for leave: those waiting, then those answered lately. */
export function useShopLeave(orgId: string | undefined) {
  return useQuery({ queryKey: keys.shopLeave(orgId ?? ""), queryFn: () => shopApi.leave(orgId!), enabled: Boolean(orgId) });
}

/** The shop's price list, as its owner sees it — the lowest prices included. Memory only. */
export function useShopPriceList(orgId: string | undefined) {
  return useQuery({ queryKey: keys.priceList(orgId ?? ""), queryFn: () => shopApi.priceList(orgId!), enabled: Boolean(orgId) });
}

/** The staff's price questions, waiting first. */
export function useShopPriceRequests(orgId: string | undefined) {
  return useQuery({
    queryKey: keys.priceRequests(orgId ?? ""),
    queryFn: () => shopApi.priceRequests(orgId!),
    enabled: Boolean(orgId),
  });
}
