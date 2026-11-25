import { homeFor, otherPartnerSides, partnerSide } from "../sides";

describe("which side an account opens on", () => {
  it("opens a shop's login on the shop's side, and a painter's on the painter's", () => {
    expect(partnerSide({ role: "RETAILER" })).toBe("shop");
    expect(homeFor({ role: "RETAILER" })).toBe("/shop");
    expect(partnerSide({ role: "PAINTER" })).toBe("painter");
    expect(homeFor({ role: "PAINTER" })).toBe("/painter");
  });

  it("sends somebody at a counter to the staff app, and a homeowner to the HueVistaa app", () => {
    expect(partnerSide({ role: "CUSTOMER", staffOf: [{ orgId: "o1", shopName: "Sharma Paints" }] })).toBe("staff");
    expect(partnerSide({ role: "CUSTOMER" })).toBe("customer");
    expect(partnerSide({ role: "CUSTOMER", staffOf: [] })).toBe("customer");
    expect(homeFor({ role: "CUSTOMER" })).toBe("/not-partner");
  });

  // A side of somebody's sign-in counts by its role: a shop owner's painter side is painter work, a
  // painter's counter or an owner's second branch is a shop, and only their own home is a customer's.
  it("counts a linked side by its role, and only a linked customer profile as a customer", () => {
    expect(partnerSide({ role: "CUSTOMER", linkedProfile: true })).toBe("customer");
    expect(partnerSide({ role: "RETAILER", linkedProfile: true })).toBe("shop");
    expect(partnerSide({ role: "PAINTER", linkedProfile: true })).toBe("painter");
    expect(partnerSide({ role: "DISTRIBUTOR", linkedProfile: true })).toBe("other");
  });

  it("offers the person's other shops and painter work, never the side this session is", () => {
    const side = (id: string, kind: "SHOP" | "PAINTER" | "CUSTOMER" | "DISTRIBUTOR", current = false) => ({
      id, kind, role: kind === "SHOP" ? ("RETAILER" as const) : kind, label: id, current, main: false, needsCode: kind === "SHOP",
    });
    const sides = [side("a", "SHOP", true), side("b", "PAINTER"), side("c", "CUSTOMER"), side("d", "SHOP"), side("e", "DISTRIBUTOR")];
    expect(otherPartnerSides({ sides }).map((s) => s.id)).toEqual(["b", "d"]);
    expect(otherPartnerSides({})).toEqual([]);
  });

  it("leaves admins and distributors to the website", () => {
    expect(partnerSide({ role: "ADMIN" })).toBe("other");
    expect(partnerSide({ role: "DISTRIBUTOR" })).toBe("other");
  });
});
