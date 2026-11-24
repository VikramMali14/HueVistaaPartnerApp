import type { UserProfile } from "@/api/types";

/**
 * Which side of the partner app an account opens on — the ONLY place the role decision is made.
 *
 * - `shop`: a shop's own login (RETAILER).
 * - `painter`: a painter's login (PAINTER).
 * - `staff`: a personal account a shop added to its staff — the HueVistaa Staff app is theirs.
 * - `customer`: any other personal account — the HueVistaa app is theirs.
 * - `other`: an admin or a distributor — the website.
 *
 * A shop's or a painter's customer profile is a second side of somebody else's login, never a
 * partner: it counts as a customer here.
 */
export type Side = "shop" | "painter" | "staff" | "customer" | "other";

export function partnerSide(profile: Pick<UserProfile, "role" | "linkedProfile" | "staffOf">): Side {
  if (profile.linkedProfile) return "customer";
  switch (profile.role) {
    case "RETAILER":
      return "shop";
    case "PAINTER":
      return "painter";
    case "CUSTOMER":
      return (profile.staffOf?.length ?? 0) > 0 ? "staff" : "customer";
    default:
      return "other";
  }
}

/** Where a signed-in account belongs. */
export function homeFor(profile: Pick<UserProfile, "role" | "linkedProfile" | "staffOf">): "/shop" | "/painter" | "/not-partner" {
  const side = partnerSide(profile);
  return side === "shop" ? "/shop" : side === "painter" ? "/painter" : "/not-partner";
}
