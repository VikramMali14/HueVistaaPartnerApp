import type { AccountSide, UserProfile } from "@/api/types";

/**
 * Which side of the partner app an account opens on — the ONLY place the role decision is made.
 *
 * - `shop`: a shop's own login (RETAILER).
 * - `painter`: a painter's login (PAINTER).
 * - `staff`: a personal account a shop added to its staff — the HueVistaa Staff app is theirs.
 * - `customer`: any other personal account — the HueVistaa app is theirs.
 * - `other`: an admin or a distributor — the website.
 *
 * A side of somebody's sign-in counts by its role (see `partnerSide`): a painter side or a shop side
 * opens that side here, and only a customer side — their own home — counts as a customer.
 */
export type Side = "shop" | "painter" | "staff" | "customer" | "other";

export function partnerSide(profile: Pick<UserProfile, "role" | "linkedProfile" | "staffOf">): Side {
  // A side of somebody's sign-in is what its role says: a shop owner's painter side is painter work,
  // a painter's counter (or an owner's second branch) is a shop. Only a customer side is a customer's.
  if (profile.linkedProfile) {
    if (profile.role === "RETAILER") return "shop";
    if (profile.role === "PAINTER") return "painter";
    return profile.role === "CUSTOMER" ? "customer" : "other";
  }
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

/** The person's other sides this app opens — shops and painter work — that this session can switch to. */
export function otherPartnerSides(profile: Pick<UserProfile, "sides"> | null | undefined): AccountSide[] {
  return (profile?.sides ?? []).filter((side) => !side.current && (side.kind === "SHOP" || side.kind === "PAINTER"));
}
