/**
 * The partner app through its REAL route tree: a shop or a painter signs in (a shop on a new phone
 * confirms its emailed code; a number with no shop or painter behind it, somebody at a counter and
 * an admin are each turned away with where they belong), and a shop's owner works their day — what
 * needs them, the register, the staff's price questions and asks for leave, the price list, and
 * their account. Only the network, the phone's location and the secure store are faked.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, renderRouter, screen, waitFor, within } from "expo-router/testing-library";

import type { LeaveRequest, PriceList, PriceRequest, RegisterDay, Shop, ShopAlert, ShopAlerts, StaffDay } from "@/api/endpoints/shop";
import { ApiError } from "@/api/errors";
import { queryClient } from "@/api/query-client";
import type { AuthResponse, UserProfile } from "@/api/types";
import { setLanguage } from "@/i18n";
import { addDays, dayFromToday } from "@/features/shop/words";

const mockSecure: Record<string, string> = {};
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecure[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockSecure[key];
  }),
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(async () => ({})) }));
const mockBrowser = jest.requireMock("expo-web-browser") as { openBrowserAsync: jest.Mock };
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));
const mockLocation = jest.requireMock("expo-location") as Record<
  "getForegroundPermissionsAsync" | "requestForegroundPermissionsAsync" | "hasServicesEnabledAsync" | "getCurrentPositionAsync",
  jest.Mock
>;

const mockAuth = {
  phoneStart: jest.fn(),
  phoneVerify: jest.fn<Promise<AuthResponse>, [Record<string, unknown>]>(),
  login: jest.fn<Promise<AuthResponse>, [Record<string, unknown>]>(),
  shopEmailCode: jest.fn<Promise<AuthResponse>, [Record<string, unknown>]>(),
  shopEmailCodeResend: jest.fn(),
  profile: jest.fn<Promise<UserProfile>, []>(),
  logout: jest.fn(async () => undefined),
};
jest.mock("@/api/endpoints/auth", () => ({ authApi: mockAuth }));

const mockShop = {
  myShops: jest.fn<Promise<Shop[]>, []>(),
  alerts: jest.fn<Promise<ShopAlerts>, []>(),
  register: jest.fn<Promise<RegisterDay>, [string, string?]>(),
  mark: jest.fn<Promise<StaffDay>, [string, string, string, string | null]>(),
  markMany: jest.fn<Promise<RegisterDay>, [string, string, Record<string, unknown>]>(),
  savePlace: jest.fn(),
  leave: jest.fn<Promise<LeaveRequest[]>, [string]>(),
  answerLeave: jest.fn<Promise<LeaveRequest>, [string, string, Record<string, unknown>]>(),
  staff: jest.fn(),
  priceList: jest.fn<Promise<PriceList>, [string]>(),
  priceRequests: jest.fn<Promise<PriceRequest[]>, [string]>(),
  answerPrice: jest.fn<Promise<PriceRequest>, [string, string, Record<string, unknown>]>(),
};
jest.mock("@/api/endpoints/shop", () => ({
  get shopApi() {
    return mockShop;
  },
}));
// The painter's side, reached after a painter signs in: nothing there needs to answer here.
const mockNever = () => new Proxy({}, { get: () => () => new Promise<never>(() => {}) });
jest.mock("@/api/endpoints/rewards", () => ({ rewardsApi: mockNever() }));
jest.mock("@/api/endpoints/painter", () => ({ painterApi: mockNever() }));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TODAY = dayFromToday(0);
const TOKENS = { accessToken: "access-1", refreshToken: "refresh-1" };
const SHOP: Shop = { id: "o1", name: "Sharma Paints", type: "RETAILER", city: "Ajmer" };
const OWNER: UserProfile = { id: "u1", name: "Ramesh Sharma", provider: "LOCAL", role: "RETAILER", email: "ramesh@example.com", phoneNumber: "+919800011122" };
const PAINTER: UserProfile = { id: "u2", name: "Ravi Kumar", provider: "LOCAL", role: "PAINTER", phoneNumber: "+919876543210" };

function alertFor(extra: Partial<ShopAlert> = {}): ShopAlert {
  return {
    orgId: "o1",
    shopName: "Sharma Paints",
    role: "OWNER",
    openRequests: 0,
    staffSalesWaiting: 0,
    painterClaimsWaiting: 0,
    materialListsWaiting: 0,
    paymentsNotReceived: 0,
    duesAsked: 0,
    godownEntries: 0,
    leaveRequestsWaiting: 0,
    ...extra,
  };
}
function staffDay(id: string, name: string, extra: Partial<StaffDay> = {}): StaffDay {
  return { staffId: id, staffName: name, date: TODAY, status: null, auto: false, ...extra };
}
function registerDay(staff: StaffDay[], extra: Partial<RegisterDay> = {}): RegisterDay {
  const counts: Record<string, number> = { NOT_MARKED: 0 };
  for (const d of staff) counts[d.status ?? "NOT_MARKED"] = (counts[d.status ?? "NOT_MARKED"] ?? 0) + 1;
  return {
    shopId: "o1",
    shopName: "Sharma Paints",
    date: TODAY,
    today: true,
    unmarkedPresent: false,
    lateGraceMinutes: 10,
    places: [],
    staff,
    counts,
    ...extra,
  };
}
const SURESH_IN = staffDay("s1", "Suresh", {
  status: "PRESENT",
  markedBy: "STAFF",
  checkedInAt: `${TODAY}T10:05:00`,
  location: "AT_PLACE",
  placeName: "Shop",
  late: true,
  lateMinutes: 5,
});
const MOHAN = staffDay("s2", "Mohan");
const LIST: PriceList = {
  shopId: "o1",
  shopName: "Sharma Paints",
  access: "OWNER",
  viewerName: "Ramesh",
  seesLowest: true,
  hasGodown: true,
  items: [
    {
      id: "i1",
      name: "Apex Ultima",
      brand: "Asian Paints",
      packs: [
        { id: "p1", label: "10 L", mrp: 4400, sellingPrice: 4150, lowestPrice: 3950, godownQty: 6 },
        { id: "p2", label: "20 L", mrp: 8600, sellingPrice: 8200, lowestPrice: 7800, godownQty: 2 },
      ],
    },
    { id: "i2", name: "Tractor Emulsion", brand: "Asian Paints", packs: [{ id: "p3", label: "20 L", sellingPrice: 3100, lowestPrice: 2950 }] },
  ],
};
const QUESTION: PriceRequest = {
  id: "r1",
  itemText: "Royale Glitz 1 L",
  note: "Customer waiting",
  status: "OPEN",
  requestedByName: "Suresh",
  mine: false,
  createdAt: `${TODAY}T11:20:00`,
};
const LEAVE: LeaveRequest = {
  id: "l1",
  orgId: "o1",
  staffId: "s1",
  staffName: "Suresh",
  fromDay: addDays(TODAY, 3),
  toDay: addDays(TODAY, 5),
  days: 3,
  reason: "Sister's wedding",
  status: "OPEN",
};

function signedIn(profile: UserProfile = OWNER) {
  mockSecure["hvp.access"] = TOKENS.accessToken;
  mockSecure["hvp.refresh"] = TOKENS.refreshToken;
  mockAuth.profile.mockResolvedValue(profile);
}

beforeEach(async () => {
  for (const key of Object.keys(mockSecure)) delete mockSecure[key];
  for (const fn of [...Object.values(mockShop), ...Object.values(mockAuth)]) fn.mockReset();
  for (const name of ["getForegroundPermissionsAsync", "requestForegroundPermissionsAsync", "hasServicesEnabledAsync", "getCurrentPositionAsync"] as const) {
    mockLocation[name].mockReset();
  }
  mockBrowser.openBrowserAsync.mockClear();
  queryClient.clear();
  await AsyncStorage.clear();
  setLanguage("en");
  mockAuth.logout.mockResolvedValue(undefined);
  mockShop.myShops.mockResolvedValue([SHOP]);
  mockShop.alerts.mockResolvedValue({ total: 0, shops: [alertFor()] });
  mockShop.register.mockResolvedValue(registerDay([SURESH_IN, MOHAN]));
  mockShop.leave.mockResolvedValue([]);
  mockShop.priceRequests.mockResolvedValue([]);
  mockShop.priceList.mockResolvedValue(LIST);
});

afterEach(() => setLanguage("en"));

// ── Signing in ────────────────────────────────────────────────────────────────

describe("signing in", () => {
  it("opens on Welcome when nobody is signed in, in Hindi at a tap", async () => {
    renderRouter("./app", { initialUrl: "/" });
    await waitFor(() => expect(screen).toHavePathname("/welcome"));
    expect(screen.getByText("For paint shops")).toBeTruthy();
    expect(screen.getByText("For painters")).toBeTruthy();

    fireEvent.press(screen.getByTestId("welcome-language"));
    await waitFor(() => expect(screen.getByText("पेंट की दुकानों के लिए")).toBeTruthy());
  });

  it("signs a painter in by mobile and opens the painter's side", async () => {
    mockAuth.phoneStart.mockResolvedValue({ phone: "*******3210", expiresInSeconds: 600, resendAfterSeconds: 30 });
    mockAuth.phoneVerify.mockResolvedValue({ ...TOKENS, user: PAINTER });
    mockAuth.profile.mockResolvedValue(PAINTER);
    renderRouter("./app", { initialUrl: "/phone" });

    await waitFor(() => expect(screen.getByTestId("phone-input")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("phone-input"), "98765 43210");
    fireEvent.press(screen.getByTestId("phone-send"));
    await waitFor(() => expect(screen).toHavePathname("/code"));

    fireEvent.changeText(screen.getByTestId("code-input"), "123456");
    await waitFor(() => expect(screen).toHavePathname("/painter"));
    expect(mockAuth.phoneVerify).toHaveBeenCalledWith({ phone: "+919876543210", code: "123456", deviceToken: undefined });
    expect(mockSecure["hvp.refresh"]).toBe("refresh-1");
  });

  it("asks a shop on a new phone for its emailed code, then keeps the phone trusted", async () => {
    mockAuth.phoneVerify.mockResolvedValue({ emailCodeRequired: true, challengeToken: "challenge-1", emailHint: "r***@example.com" });
    mockAuth.shopEmailCode.mockResolvedValue({ ...TOKENS, deviceToken: "device-1", user: OWNER });
    mockAuth.profile.mockResolvedValue(OWNER);
    renderRouter("./app", { initialUrl: "/code?phone=%2B919800011122&resendAfter=30" });

    await waitFor(() => expect(screen.getByTestId("code-input")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("code-input"), "123456");
    await waitFor(() => expect(screen).toHavePathname("/email-code"));
    expect(screen.getByText(/we emailed a 6-digit code to r\*\*\*@example.com/)).toBeTruthy();
    expect(mockSecure["hvp.refresh"]).toBeUndefined();

    fireEvent.changeText(screen.getByTestId("email-code-input"), "654321");
    await waitFor(() => expect(screen).toHavePathname("/shop"));
    expect(mockAuth.shopEmailCode).toHaveBeenCalledWith({ challengeToken: "challenge-1", code: "654321" });
    expect(mockSecure["hvp.device"]).toBe("device-1");
  });

  it("sends the trusted phone's token with every sign-in after", async () => {
    mockSecure["hvp.device"] = "device-1";
    mockAuth.login.mockResolvedValue({ ...TOKENS, user: OWNER });
    mockAuth.profile.mockResolvedValue(OWNER);
    renderRouter("./app", { initialUrl: "/email" });

    await waitFor(() => expect(screen.getByTestId("email-input")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("email-input"), "Ramesh@Example.com ");
    fireEvent.changeText(screen.getByTestId("password-input"), "secret123");
    fireEvent.press(screen.getByTestId("email-submit"));

    await waitFor(() => expect(screen).toHavePathname("/shop"));
    expect(mockAuth.login).toHaveBeenCalledWith({ email: "ramesh@example.com", password: "secret123", deviceToken: "device-1" });
  });

  it("opens nothing for a number with no shop or painter behind it, and offers the way to one", async () => {
    mockAuth.phoneVerify.mockResolvedValue({ shopSignupRequired: true, signupTicket: "ticket-1" });
    renderRouter("./app", { initialUrl: "/code?phone=%2B919811122233&resendAfter=30" });

    await waitFor(() => expect(screen.getByTestId("code-input")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("code-input"), "123456");
    await waitFor(() => expect(screen.getByTestId("code-no-account")).toBeTruthy());
    expect(mockSecure["hvp.refresh"]).toBeUndefined();

    fireEvent.press(screen.getByText("Start a free trial for your shop"));
    expect(mockBrowser.openBrowserAsync).toHaveBeenCalledWith("https://shop.huevistaa.com/trial", expect.anything());
  });

  it("turns away somebody at a shop's counter, naming the app that is theirs", async () => {
    const employee: UserProfile = { id: "u3", name: "Suresh", provider: "LOCAL", role: "CUSTOMER", staffOf: [{ orgId: "o1", shopName: "Sharma Paints" }] };
    mockAuth.phoneVerify.mockResolvedValue({ ...TOKENS, user: employee });
    mockAuth.profile.mockResolvedValue(employee);
    renderRouter("./app", { initialUrl: "/code?phone=%2B919877711122&resendAfter=30" });

    await waitFor(() => expect(screen.getByTestId("code-input")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("code-input"), "123456");
    await waitFor(() => expect(screen.getByTestId("code-refused")).toBeTruthy());
    expect(screen.getByText(/Staff use the HueVistaa Staff app/)).toBeTruthy();
    // The backend's logout would end every session the employee has — their staff app too.
    expect(mockAuth.logout).not.toHaveBeenCalled();
    expect(mockSecure["hvp.refresh"]).toBeUndefined();
  });

  it("sends an admin to the website", async () => {
    mockAuth.login.mockResolvedValue({ twoFactorRequired: true });
    renderRouter("./app", { initialUrl: "/email" });

    await waitFor(() => expect(screen.getByTestId("email-input")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("email-input"), "team@huevistaa.com");
    fireEvent.changeText(screen.getByTestId("password-input"), "secret123");
    fireEvent.press(screen.getByTestId("email-submit"));
    await waitFor(() => expect(screen.getByText("Admins and distributors sign in on the website.")).toBeTruthy());
  });

  it("says a wrong password plainly", async () => {
    mockAuth.login.mockRejectedValue(new ApiError("http", 401, "Bad credentials"));
    renderRouter("./app", { initialUrl: "/email" });

    await waitFor(() => expect(screen.getByTestId("email-input")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("email-input"), "ramesh@example.com");
    fireEvent.changeText(screen.getByTestId("password-input"), "wrong");
    fireEvent.press(screen.getByTestId("email-submit"));
    await waitFor(() => expect(screen.getByText("That email and password don't match.")).toBeTruthy());
  });

  it("opens each side on its own account, and keeps a shop out of the painter's", async () => {
    signedIn(OWNER);
    renderRouter("./app", { initialUrl: "/painter" });
    await waitFor(() => expect(screen).toHavePathname("/shop"));
  });

  it("says where a restored account that is neither belongs", async () => {
    signedIn({ id: "u4", name: "Asha", provider: "LOCAL", role: "CUSTOMER" });
    renderRouter("./app", { initialUrl: "/" });
    await waitFor(() => expect(screen.getByTestId("not-partner")).toBeTruthy());
    expect(screen.getByText("This account chooses colours for a home: it opens in the HueVistaa app.")).toBeTruthy();
  });
});

// ── The shop's Today ──────────────────────────────────────────────────────────

describe("a shop's Today", () => {
  beforeEach(() => signedIn());

  it("puts what needs the owner first, and goes to the answer", async () => {
    mockShop.alerts.mockResolvedValue({
      total: 3,
      shops: [
        alertFor({
          openRequests: 2,
          newestRequest: { by: "Suresh", item: "Royale Glitz 1 L" },
          leaveRequestsWaiting: 1,
          newestLeaveRequest: { by: "Mohan", item: "26 Nov – 28 Nov" },
          painterClaimsWaiting: 4,
        }),
      ],
    });
    mockShop.leave.mockResolvedValue([LEAVE]);
    renderRouter("./app", { initialUrl: "/shop" });

    await waitFor(() => expect(screen.getByText("2 price questions to answer")).toBeTruthy());
    expect(screen.getByText("Suresh: Royale Glitz 1 L")).toBeTruthy();
    expect(screen.getByText("1 ask for leave")).toBeTruthy();
    expect(screen.getByText("4 painter claims to check")).toBeTruthy();
    expect(screen.getByTestId("tab-asks-badge")).toBeTruthy();

    fireEvent.press(screen.getByTestId("needs-leave"));
    await waitFor(() => expect(screen).toHavePathname("/shop/asks"));
    await waitFor(() => expect(screen.getByTestId("leave-l1")).toBeTruthy());
  });

  it("says plainly when nothing is waiting, and who is in today", async () => {
    renderRouter("./app", { initialUrl: "/shop" });
    await waitFor(() => expect(screen.getByTestId("needs-nothing")).toBeTruthy());
    expect(screen.getByText(/, Ramesh$/)).toBeTruthy();
    expect(screen.getByTestId("shop-name")).toHaveTextContent("Sharma Paints");
    await waitFor(() => expect(within(screen.getByTestId("today-register")).getByText("Suresh")).toBeTruthy());
    expect(screen.getByTestId("count-PRESENT")).toHaveTextContent("1 Present");
    expect(screen.getByTestId("count-NOT_MARKED")).toHaveTextContent("1 Not marked");
    expect(screen.queryByTestId("on-website")).toBeNull();
  });

  it("says when the shop's staff aren't switched on yet", async () => {
    mockShop.alerts.mockResolvedValue({ total: 0, shops: [] });
    renderRouter("./app", { initialUrl: "/shop" });
    await waitFor(() => expect(screen.getByTestId("staff-off")).toBeTruthy());
  });

  it("sends an account with no shop yet to set one up on the website", async () => {
    mockShop.myShops.mockResolvedValue([]);
    renderRouter("./app", { initialUrl: "/shop" });
    await waitFor(() => expect(screen.getByText("No shop is on this account yet. Set your shop up on the website.")).toBeTruthy());
  });
});

// ── The register ──────────────────────────────────────────────────────────────

describe("the register", () => {
  beforeEach(() => signedIn());

  it("shows each person's day, and marks one at a tap", async () => {
    // The register remembers the mark, as the server does: the screen reads the day again after it.
    let mohan = MOHAN;
    mockShop.register.mockImplementation(async () => registerDay([SURESH_IN, mohan]));
    mockShop.mark.mockImplementation(async () => (mohan = staffDay("s2", "Mohan", { status: "ABSENT", markedBy: "SHOP" })));
    renderRouter("./app", { initialUrl: "/shop/staff" });
    await waitFor(() => expect(screen.getByTestId("staff-s1")).toBeTruthy());
    expect(within(screen.getByTestId("staff-s1")).getByText("In 10:05 am · 5 min late · At Shop")).toBeTruthy();
    expect(screen.getByTestId("status-s2")).toHaveTextContent("Not marked");

    fireEvent.press(screen.getByTestId("staff-s2"));
    await waitFor(() => expect(screen.getByTestId("mark-sheet")).toBeTruthy());
    fireEvent.press(screen.getByTestId("mark-ABSENT"));

    await waitFor(() => expect(mockShop.mark).toHaveBeenCalledWith("o1", "s2", TODAY, "ABSENT"));
    await waitFor(() => expect(screen.getByTestId("status-s2")).toHaveTextContent("Absent"));
  });

  it("marks everybody not marked yet present at once", async () => {
    mockShop.markMany.mockResolvedValue(registerDay([SURESH_IN, staffDay("s2", "Mohan", { status: "PRESENT", markedBy: "SHOP" })]));
    renderRouter("./app", { initialUrl: "/shop/staff" });
    await waitFor(() => expect(screen.getByTestId("mark-all")).toBeTruthy());
    fireEvent.press(screen.getByTestId("mark-all"));

    await waitFor(() => expect(mockShop.markMany).toHaveBeenCalledWith("o1", TODAY, { status: "PRESENT", onlyUnmarked: true }));
    await waitFor(() => expect(screen.getByTestId("status-s2")).toHaveTextContent("Present"));
    expect(screen.queryByTestId("mark-all")).toBeNull();
  });

  it("goes back a day, and never past today", async () => {
    renderRouter("./app", { initialUrl: "/shop/staff" });
    await waitFor(() => expect(screen.getByTestId("staff-s1")).toBeTruthy());
    expect(screen.getByTestId("day-after").props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(screen.getByTestId("day-before"));
    await waitFor(() => expect(mockShop.register).toHaveBeenCalledWith("o1", addDays(TODAY, -1)));
  });

  it("saves the shop's place from where the owner stands", async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
    mockLocation.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 26.45, longitude: 74.64, accuracy: 12 }, timestamp: 0 });
    mockShop.savePlace.mockResolvedValue([{ id: "pl1", name: "Shop", radiusMetres: 150 }]);
    renderRouter("./app", { initialUrl: "/shop/staff" });

    await waitFor(() => expect(screen.getByTestId("place-save")).toBeTruthy());
    fireEvent.press(screen.getByTestId("place-save"));
    await waitFor(() => expect(screen.getByTestId("place-sheet")).toBeTruthy());
    fireEvent.press(screen.getByTestId("place-save-confirm"));

    await waitFor(() => expect(mockShop.savePlace).toHaveBeenCalledWith("o1", { name: "Shop", latitude: 26.45, longitude: 74.64, accuracyMetres: 12 }));
    await waitFor(() => expect(screen.getByTestId("place-pl1")).toBeTruthy());
  });

  it("saves no place when the phone can't say where it is", async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    renderRouter("./app", { initialUrl: "/shop/staff" });

    await waitFor(() => expect(screen.getByTestId("place-save")).toBeTruthy());
    fireEvent.press(screen.getByTestId("place-save"));
    await waitFor(() => expect(screen.getByTestId("place-save-confirm")).toBeTruthy());
    fireEvent.press(screen.getByTestId("place-save-confirm"));

    await waitFor(() => expect(screen.getByTestId("place-error")).toBeTruthy());
    expect(mockShop.savePlace).not.toHaveBeenCalled();
  });
});

// ── Asks ──────────────────────────────────────────────────────────────────────

describe("asks", () => {
  beforeEach(() => signedIn());

  it("answers a price question in a line the employee reads in their app", async () => {
    mockShop.priceRequests.mockResolvedValue([QUESTION]);
    mockShop.answerPrice.mockResolvedValue({ ...QUESTION, status: "ANSWERED", reply: "₹1,240 — 4 in stock" });
    renderRouter("./app", { initialUrl: "/shop/asks" });

    await waitFor(() => expect(screen.getByTestId("question-r1")).toBeTruthy());
    expect(screen.getByText("Royale Glitz 1 L")).toBeTruthy();
    fireEvent.press(screen.getByTestId("answer-r1"));
    await waitFor(() => expect(screen.getByTestId("answer-reply")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("answer-reply"), "₹1,240 — 4 in stock");
    fireEvent.press(screen.getByTestId("answer-send"));

    await waitFor(() => expect(mockShop.answerPrice).toHaveBeenCalledWith("o1", "r1", { reply: "₹1,240 — 4 in stock" }));
    await waitFor(() => expect(screen.getByText("You: ₹1,240 — 4 in stock")).toBeTruthy());
  });

  it("approves leave with pay in one tap", async () => {
    mockShop.leave.mockResolvedValue([LEAVE]);
    mockShop.answerLeave.mockResolvedValue({ ...LEAVE, status: "APPROVED", paid: true, decidedByName: "Ramesh" });
    renderRouter("./app", { initialUrl: "/shop/asks?tab=leave" });

    await waitFor(() => expect(screen.getByTestId("leave-l1")).toBeTruthy());
    expect(screen.getByText("Sister's wedding")).toBeTruthy();
    fireEvent.press(screen.getByTestId("approve-paid-l1"));

    await waitFor(() => expect(mockShop.answerLeave).toHaveBeenCalledWith("o1", "l1", { action: "APPROVE", paid: true }));
    await waitFor(() => expect(within(screen.getByTestId("leave-l1")).getByText("Approved — paid leave")).toBeTruthy());
  });

  it("refuses leave with a word, after asking", async () => {
    mockShop.leave.mockResolvedValue([LEAVE]);
    mockShop.answerLeave.mockResolvedValue({ ...LEAVE, status: "REFUSED", reply: "Diwali week" });
    renderRouter("./app", { initialUrl: "/shop/asks?tab=leave" });

    await waitFor(() => expect(screen.getByTestId("refuse-l1")).toBeTruthy());
    fireEvent.press(screen.getByTestId("refuse-l1"));
    await waitFor(() => expect(screen.getByTestId("refuse-reply")).toBeTruthy());
    expect(mockShop.answerLeave).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByTestId("refuse-reply"), "Diwali week");
    fireEvent.press(screen.getByTestId("refuse-sheet-confirm"));

    await waitFor(() => expect(mockShop.answerLeave).toHaveBeenCalledWith("o1", "l1", { action: "REFUSE", reply: "Diwali week" }));
    await waitFor(() => expect(within(screen.getByTestId("leave-l1")).getByText("Refused")).toBeTruthy());
  });

  it("says when nothing has been asked", async () => {
    renderRouter("./app", { initialUrl: "/shop/asks" });
    await waitFor(() => expect(screen.getByText("No price questions. When staff ask about an item, it shows here.")).toBeTruthy());
  });
});

// ── Prices and Me ─────────────────────────────────────────────────────────────

describe("prices and Me", () => {
  beforeEach(() => signedIn());

  it("searches the shop's list, with the lowest price behind a tap", async () => {
    renderRouter("./app", { initialUrl: "/shop/prices" });
    await waitFor(() => expect(screen.getByTestId("price-item-i1")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("prices-search"), "apex 20");
    await waitFor(() => expect(screen.getByText("1 item")).toBeTruthy());
    expect(screen.queryByTestId("price-lowest-p2-shown")).toBeNull();
    fireEvent.press(screen.getByTestId("price-lowest-p2"));
    expect(within(screen.getByTestId("price-lowest-p2-shown")).getByText("₹7,800")).toBeTruthy();

    fireEvent.press(screen.getByTestId("prices-edit"));
    expect(mockBrowser.openBrowserAsync).toHaveBeenCalledWith("https://shop.huevistaa.com/price-list", expect.anything());
  });

  it("shows the account and the shop, and signs out after asking", async () => {
    renderRouter("./app", { initialUrl: "/shop/me" });
    await waitFor(() => expect(screen.getByTestId("me-person")).toBeTruthy());
    expect(screen.getByText("Ramesh Sharma")).toBeTruthy();
    await waitFor(() => expect(within(screen.getByTestId("me-shop-o1")).getByText("Sharma Paints")).toBeTruthy());

    fireEvent.press(screen.getByTestId("settings-sign-out"));
    await waitFor(() => expect(screen.getByText("Sign out of HueVistaa Partner?")).toBeTruthy());
    fireEvent.press(screen.getByTestId("sign-out-sheet-confirm"));
    await waitFor(() => expect(screen).toHavePathname("/welcome"));
    expect(mockAuth.logout).toHaveBeenCalled();
    expect(mockSecure["hvp.refresh"]).toBeUndefined();
  });
});
