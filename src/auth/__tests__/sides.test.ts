import { homeFor, partnerSide } from "../sides";

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

  // A shop's or a painter's customer profile is somebody's second side, never a partner.
  it("counts a linked customer profile as a customer, whatever its role says", () => {
    expect(partnerSide({ role: "RETAILER", linkedProfile: true })).toBe("customer");
  });

  it("leaves admins and distributors to the website", () => {
    expect(partnerSide({ role: "ADMIN" })).toBe("other");
    expect(partnerSide({ role: "DISTRIBUTOR" })).toBe("other");
  });
});
