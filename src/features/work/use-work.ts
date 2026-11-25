import { useQuery } from "@tanstack/react-query";

import { workApi } from "@/api/endpoints/work";
import { keys } from "@/api/query-keys";

/** The day's register: everyone working, and their mark (P14). */
export function useRegister(date: string, enabled = true) {
  return useQuery({ queryKey: keys.workRegister(date), queryFn: () => workApi.register(date), enabled });
}

/** This month's wages: what each person is owed (P14). */
export function useWages() {
  return useQuery({ queryKey: keys.workWages, queryFn: () => workApi.wages() });
}

export function useEstimates(enabled = true) {
  return useQuery({ queryKey: keys.workEstimates, queryFn: workApi.estimates, enabled });
}

export function useEstimate(id: string) {
  return useQuery({ queryKey: keys.workEstimate(id), queryFn: () => workApi.estimate(id), enabled: Boolean(id) });
}

export function useSites(enabled = true) {
  return useQuery({ queryKey: keys.workSites, queryFn: workApi.sites, enabled });
}

export function useSite(id: string) {
  return useQuery({ queryKey: keys.workSite(id), queryFn: () => workApi.site(id), enabled: Boolean(id) });
}

export function useShops(enabled = true) {
  return useQuery({ queryKey: keys.workShops, queryFn: workApi.shops, enabled });
}

export function useKhata(linkId: string) {
  return useQuery({ queryKey: keys.workKhata(linkId), queryFn: () => workApi.khata(linkId), enabled: Boolean(linkId) });
}
