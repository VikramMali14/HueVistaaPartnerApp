/**
 * The painter's own books on the phone (P13–P20) through the REAL route tree: My work, today's
 * attendance and wages, estimates sent on WhatsApp and answered, a site's money written down, and the
 * shops' khatas — a payment confirmed, one that didn't arrive talked out, a reminder sent. Only the
 * network and the secure store are faked.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, renderRouter, screen, waitFor, within } from "expo-router/testing-library";
import { Linking } from "react-native";

import type { CommissionKhata, CrewRegister, CrewWages, Estimate, EstimateList, PainterCommission, SiteBook, SiteList } from "@/api/endpoints/work";
import { queryClient } from "@/api/query-client";
import type { UserProfile } from "@/api/types";
import { todayInIndia } from "@/features/work/words";

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
jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn(), openBrowserAsync: jest.fn(async () => ({})) }));

const mockAuth = { profile: jest.fn<Promise<UserProfile>, []>(), logout: jest.fn(async () => undefined) };
jest.mock("@/api/endpoints/auth", () => ({ authApi: mockAuth }));
// Home reads the points, the rewards and the painter's profile; here they never answer.
const mockNoAnswer = () => new Promise<never>(() => {});
jest.mock("@/api/endpoints/rewards", () => ({
  rewardsApi: { wallet: mockNoAnswer, catalogue: mockNoAnswer, redemptions: mockNoAnswer, redeem: mockNoAnswer, scan: mockNoAnswer, claim: mockNoAnswer },
}));
jest.mock("@/api/endpoints/painter", () => ({
  painterApi: { becomePainter: mockNoAnswer, profile: mockNoAnswer, updateProfile: mockNoAnswer, updateListing: mockNoAnswer },
}));
const mockWork = {
  register: jest.fn<Promise<CrewRegister>, [string?]>(),
  mark: jest.fn(),
  markRest: jest.fn<Promise<CrewRegister>, [string, string]>(),
  wages: jest.fn<Promise<CrewWages>, [string?]>(),
  estimates: jest.fn<Promise<EstimateList>, []>(),
  estimate: jest.fn<Promise<Estimate>, [string]>(),
  setEstimateStatus: jest.fn(),
  sites: jest.fn<Promise<SiteList>, []>(),
  site: jest.fn<Promise<SiteBook>, [string]>(),
  addSiteMoney: jest.fn(),
  shops: jest.fn<Promise<PainterCommission>, []>(),
  khata: jest.fn<Promise<CommissionKhata>, [string]>(),
  received: jest.fn(),
  notReceived: jest.fn(),
  paymentNote: jest.fn(),
  remind: jest.fn(),
};
jest.mock("@/api/endpoints/work", () => ({
  get workApi() {
    return mockWork;
  },
}));

const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TODAY = todayInIndia();
const REGISTER: CrewRegister = {
  date: TODAY,
  today: true,
  unmarkedPresent: false,
  members: [
    { memberId: "m1", name: "Raju", date: TODAY, status: null, auto: false },
    { memberId: "m2", name: "Sonu", date: TODAY, status: "PRESENT", auto: false, siteName: "Gupta flat" },
    { memberId: "m3", name: "Kallu", date: TODAY, status: null, auto: false },
  ],
  counts: { PRESENT: 1 },
  notMarked: 2,
};
const WAGES: CrewWages = {
  month: TODAY.slice(0, 7),
  members: [
    { memberId: "m1", name: "Raju", current: true, month: TODAY.slice(0, 7), present: 10, halfDays: 0, absent: 1, paidDays: 10, earnedPaise: 8_000_00, advancePaise: 2_000_00, paidPaise: 0, balancePaise: 6_000_00 },
    { memberId: "m2", name: "Sonu", current: true, month: TODAY.slice(0, 7), present: 4, halfDays: 0, absent: 0, paidDays: 4, earnedPaise: 2_400_00, advancePaise: 3_000_00, paidPaise: 0, balancePaise: -600_00 },
  ],
  totalDuePaise: 6_000_00,
};
const ESTIMATE: Estimate = {
  id: "e1",
  estimateNo: 7,
  customerName: "Mr Gupta",
  customerPhone: "9876543210",
  siteAddress: "Vaishali Nagar",
  status: "ACCEPTED",
  subtotalPaise: 45_000_00,
  discountPaise: 0,
  totalPaise: 45_000_00,
  rooms: [{ name: "Hall", lengthFt: 14, widthFt: 12, heightFt: 10, wallsSqFt: 470, ceilingSqFt: 168 }],
  lines: [{ name: "Walls — Royale", unit: "SQ_FT", qty: 1000, ratePaise: 45_00, withMaterial: true, amountPaise: 45_000_00 }],
  shareToken: "tok123",
  customerAnsweredAt: "2026-11-20T10:00:00",
  customerNote: "Start on Monday",
};
const SITE: SiteBook = {
  site: { id: "s1", name: "Gupta flat", customerName: "Mr Gupta", status: "ACTIVE", startedOn: "2026-11-01", teamDays: 12 },
  team: [],
  teamDays: 12,
  labourPaise: 9_600_00,
  money: {
    agreedPaise: 45_000_00,
    receivedPaise: 10_000_00,
    spentPaise: 8_200_00,
    labourPaise: 9_600_00,
    profitPaise: 27_200_00,
    dueFromCustomerPaise: 35_000_00,
    entries: [{ id: "x1", kind: "RECEIVED", category: "ADVANCE", amountPaise: 10_000_00, paidOn: "2026-11-01", mode: "CASH" }],
  },
};
const SHARMA = {
  linkId: "k1",
  shopName: "Sharma Paints",
  place: "Ajmer",
  status: "ACTIVE" as const,
  commissionType: "PERCENT_OF_BILL" as const,
  terms: "3% of the bill",
  balancePaise: 1_500_00,
  pendingClaims: 0,
  paymentsWaiting: 1,
  owedSince: "2026-10-12",
  duesRemindedAt: null,
};
const KHATA: CommissionKhata = {
  shop: SHARMA,
  balancePaise: 1_500_00,
  entries: [{ id: "c1", source: "SHOP_ENTRY", status: "APPROVED", billNo: "INV-42", billDate: "2026-10-12", claimedPaise: 1_500_00, approvedPaise: 1_500_00 }],
  payments: [{ id: "p1", amountPaise: 500_00, mode: "UPI", reference: "4123", paidOn: "2026-11-19", painterStatus: "WAITING" }],
};

function signedIn(extra: Partial<UserProfile> = {}) {
  mockSecure["hvp.access"] = "access-0";
  mockSecure["hvp.refresh"] = "refresh-0";
  mockAuth.profile.mockResolvedValue({
    id: "u1",
    name: "Ravi Kumar",
    provider: "LOCAL",
    role: "PAINTER",
    phoneNumber: "+919876543210",
    workBooksEnabled: true,
    commissionShops: 1,
    ...extra,
  });
}

beforeEach(async () => {
  for (const key of Object.keys(mockSecure)) delete mockSecure[key];
  for (const fn of Object.values(mockWork)) fn.mockReset();
  openURL.mockClear();
  queryClient.clear();
  await AsyncStorage.clear();
  signedIn();
  mockWork.register.mockResolvedValue(REGISTER);
  mockWork.wages.mockResolvedValue(WAGES);
  mockWork.estimates.mockResolvedValue({ hasRates: true, estimates: [{ id: "e1", estimateNo: 7, customerName: "Mr Gupta", status: "ACCEPTED", totalPaise: 45_000_00, createdAt: "2026-11-18T10:00:00" }] });
  mockWork.estimate.mockResolvedValue(ESTIMATE);
  mockWork.sites.mockResolvedValue({ sites: [SITE.site] });
  mockWork.site.mockResolvedValue(SITE);
  mockWork.shops.mockResolvedValue({ pendingRequests: 0, duePaise: 1_500_00, shops: [SHARMA] });
  mockWork.khata.mockResolvedValue(KHATA);
});

describe("P13 · My work", () => {
  it("is reached from Home, and says where each book stands", async () => {
    renderRouter("./app", { initialUrl: "/painter" });
    await waitFor(() => expect(screen.getByTestId("painter-work")).toBeTruthy());
    fireEvent.press(screen.getByTestId("painter-work"));
    await waitFor(() => expect(screen).toHavePathname("/painter/work"));
    await waitFor(() => expect(screen.getByText("2 not marked yet")).toBeTruthy());
    expect(screen.getByText("₹1,500 due to you from all shops")).toBeTruthy();
    fireEvent.press(screen.getByTestId("work-team"));
    await waitFor(() => expect(screen).toHavePathname("/painter/work/team"));
  });
});

describe("My work, painter by painter", () => {
  it("offers only the shops to a painter whose books the team hasn't switched on", async () => {
    signedIn({ workBooksEnabled: false });
    renderRouter("./app", { initialUrl: "/painter/work" });
    await waitFor(() => expect(screen.getByTestId("work-shops")).toBeTruthy());
    expect(screen.queryByTestId("work-team")).toBeNull();
    expect(screen.queryByTestId("work-estimates")).toBeNull();
    expect(mockWork.register).not.toHaveBeenCalled();
    expect(mockWork.estimates).not.toHaveBeenCalled();
  });

  it("offers no shops to a painter no shop has asked", async () => {
    signedIn({ commissionShops: 0 });
    renderRouter("./app", { initialUrl: "/painter/work" });
    await waitFor(() => expect(screen.getByTestId("work-team")).toBeTruthy());
    expect(screen.queryByTestId("work-shops")).toBeNull();
    expect(mockWork.shops).not.toHaveBeenCalled();
  });

  it("puts no My work on Home for a painter with neither", async () => {
    signedIn({ workBooksEnabled: false, commissionShops: 0 });
    renderRouter("./app", { initialUrl: "/painter" });
    await waitFor(() => expect(screen.getByTestId("painter-scan")).toBeTruthy());
    expect(screen.queryByTestId("painter-work")).toBeNull();
  });
});

describe("P14 · Team", () => {
  it("marks someone present as it is tapped, and the rest in one go", async () => {
    mockWork.mark.mockResolvedValue({ ...REGISTER.members[0]!, status: "PRESENT" });
    mockWork.markRest.mockResolvedValue({ ...REGISTER, members: REGISTER.members.map((m) => ({ ...m, status: "PRESENT" })), notMarked: 0 });
    renderRouter("./app", { initialUrl: "/painter/work/team" });

    await waitFor(() => expect(screen.getByTestId("member-m1")).toBeTruthy());
    expect(screen.getByText("At Gupta flat")).toBeTruthy();
    fireEvent.press(screen.getByTestId("mark-m1-HALF_DAY"));
    await waitFor(() => expect(mockWork.mark).toHaveBeenCalledWith(TODAY, "m1", "HALF_DAY"));
    await waitFor(() => expect(screen.getByText("1 not marked yet")).toBeTruthy());

    fireEvent.press(screen.getByTestId("mark-rest"));
    await waitFor(() => expect(mockWork.markRest).toHaveBeenCalledWith(TODAY, "PRESENT"));
    await waitFor(() => expect(screen.getByText("Everyone is marked.")).toBeTruthy());
  });

  it("shows what each is owed this month, or the advance still to work off", async () => {
    renderRouter("./app", { initialUrl: "/painter/work/team" });
    const wages = await waitFor(() => screen.getByTestId("team-wages"));
    expect(within(wages).getByText("₹6,000 to pay")).toBeTruthy();
    expect(within(wages).getByText("₹600 advance to work off")).toBeTruthy();
  });

  it("sends a painter with no team to the website to add one", async () => {
    mockWork.register.mockResolvedValue({ ...REGISTER, members: [], notMarked: 0 });
    renderRouter("./app", { initialUrl: "/painter/work/team" });
    await waitFor(() => expect(screen.getByText("No one on your team yet. Add them on the painter website.")).toBeTruthy());
  });
});

describe("P15–P16 · Estimates", () => {
  it("opens an estimate, with what the customer said, and sends it on WhatsApp with its link", async () => {
    renderRouter("./app", { initialUrl: "/painter/work/estimates" });
    await waitFor(() => expect(screen.getByTestId("estimate-e1")).toBeTruthy());
    fireEvent.press(screen.getByTestId("estimate-e1"));
    await waitFor(() => expect(screen).toHavePathname("/painter/work/estimates/e1"));

    await waitFor(() => expect(screen.getByTestId("estimate-answer")).toBeTruthy());
    expect(screen.getByText("“Start on Monday”")).toBeTruthy();
    expect(screen.getByText("Walls — Royale")).toBeTruthy();
    fireEvent.press(screen.getByTestId("estimate-whatsapp"));
    expect(openURL).toHaveBeenCalledTimes(1);
    const url = decodeURIComponent(String(openURL.mock.calls[0]![0]));
    expect(url).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(url).toContain("Estimate no. 7 for Mr Gupta: ₹45,000");
    expect(url).toContain("/e/tok123");
  });

  it("saves what the customer answered at the door", async () => {
    mockWork.estimate.mockResolvedValue({ ...ESTIMATE, status: "OPEN", customerAnsweredAt: null, customerNote: null });
    mockWork.setEstimateStatus.mockResolvedValue({ ...ESTIMATE, status: "DECLINED" });
    renderRouter("./app", { initialUrl: "/painter/work/estimates/e1" });
    await waitFor(() => expect(screen.getByText("Declined")).toBeTruthy());
    fireEvent.press(screen.getByText("Declined"));
    await waitFor(() => expect(mockWork.setEstimateStatus).toHaveBeenCalledWith("e1", "DECLINED"));
  });
});

describe("P17–P18 · Sites", () => {
  it("shows what the job made and what is still to collect, and writes money down", async () => {
    mockWork.addSiteMoney.mockResolvedValue({ id: "x2" });
    renderRouter("./app", { initialUrl: "/painter/work/sites" });
    await waitFor(() => expect(screen.getByTestId("site-s1")).toBeTruthy());
    fireEvent.press(screen.getByTestId("site-s1"));
    await waitFor(() => expect(screen).toHavePathname("/painter/work/sites/s1"));

    const money = await waitFor(() => screen.getByTestId("site-money"));
    expect(within(money).getByText("What the job made")).toBeTruthy();
    expect(within(money).getByText("₹27,200")).toBeTruthy();
    expect(within(money).getByText("₹35,000")).toBeTruthy();

    // Without an amount, nothing is sent.
    fireEvent.press(screen.getByTestId("site-save"));
    await waitFor(() => expect(screen.getByTestId("site-problem")).toBeTruthy());
    expect(mockWork.addSiteMoney).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("category-PART"));
    fireEvent.changeText(screen.getByTestId("site-amount"), "15,000");
    fireEvent.press(screen.getByTestId("mode-UPI"));
    fireEvent.press(screen.getByTestId("site-save"));
    await waitFor(() =>
      expect(mockWork.addSiteMoney).toHaveBeenCalledWith("s1", expect.objectContaining({ category: "PART", amountPaise: 15_000_00, mode: "UPI" })),
    );
  });
});

describe("P19–P20 · Shops", () => {
  it("lists what each shop owes, and confirms a payment arrived", async () => {
    mockWork.received.mockResolvedValue({ ...KHATA.payments[0], painterStatus: "RECEIVED" });
    renderRouter("./app", { initialUrl: "/painter/work/shops" });
    await waitFor(() => expect(screen.getByTestId("shop-k1")).toBeTruthy());
    expect(screen.getByText("₹1,500 due")).toBeTruthy();
    fireEvent.press(screen.getByTestId("shop-k1"));
    await waitFor(() => expect(screen).toHavePathname("/painter/work/shops/k1"));

    await waitFor(() => expect(screen.getByTestId("payment-p1")).toBeTruthy());
    fireEvent.press(screen.getByTestId("received-p1"));
    await waitFor(() => expect(mockWork.received).toHaveBeenCalledWith("p1"));
  });

  it("tells the shop a payment didn't arrive, with what was checked", async () => {
    mockWork.notReceived.mockResolvedValue({ ...KHATA.payments[0], painterStatus: "NOT_RECEIVED" });
    renderRouter("./app", { initialUrl: "/painter/work/shops/k1" });
    await waitFor(() => expect(screen.getByTestId("not-received-p1")).toBeTruthy());
    fireEvent.press(screen.getByTestId("not-received-p1"));
    fireEvent.changeText(screen.getByTestId("checked-p1"), "Nothing in PhonePe");
    fireEvent.press(screen.getByTestId("tell-shop-p1"));
    await waitFor(() => expect(mockWork.notReceived).toHaveBeenCalledWith("p1", "Nothing in PhonePe"));
  });

  it("talks a missing payment out with the shop", async () => {
    mockWork.khata.mockResolvedValue({
      ...KHATA,
      payments: [
        {
          ...KHATA.payments[0]!,
          painterStatus: "NOT_RECEIVED",
          notes: [
            { id: "n1", author: "PAINTER", text: "Nothing in PhonePe", createdAt: "2026-11-20T10:00:00" },
            { id: "n2", author: "SHOP", text: "Sent at 4 pm", reference: "6152 0987", createdAt: "2026-11-20T12:00:00" },
          ],
        },
      ],
    });
    mockWork.paymentNote.mockResolvedValue(KHATA.payments[0]);
    renderRouter("./app", { initialUrl: "/painter/work/shops/k1" });
    await waitFor(() => expect(screen.getByText("Sent at 4 pm")).toBeTruthy());
    expect(screen.getByText("UTR 6152 0987")).toBeTruthy();
    expect(screen.getByText("It arrived after all")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("reply-p1"), "Not in my bank either");
    fireEvent.press(screen.getByTestId("send-note-p1"));
    await waitFor(() => expect(mockWork.paymentNote).toHaveBeenCalledWith("p1", "Not in my bank either"));
  });

  it("reminds the shop of what it owes, once a week", async () => {
    mockWork.remind.mockResolvedValue({ ...SHARMA, duesRemindedAt: "2026-11-23T10:00:00" });
    renderRouter("./app", { initialUrl: "/painter/work/shops/k1" });
    await waitFor(() => expect(screen.getByTestId("khata-remind")).toBeTruthy());
    expect(screen.getByText(/^Owed since/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("khata-remind"));
    await waitFor(() => expect(mockWork.remind).toHaveBeenCalledWith("k1"));
  });

  it("says when the painter last reminded them, in place of the button", async () => {
    const yesterday = new Date(Date.now() - 86_400_000 + 330 * 60_000).toISOString().slice(0, 19);
    mockWork.khata.mockResolvedValue({ ...KHATA, shop: { ...SHARMA, duesRemindedAt: yesterday } });
    renderRouter("./app", { initialUrl: "/painter/work/shops/k1" });
    await waitFor(() => expect(screen.getByTestId("khata-reminded")).toBeTruthy());
    expect(screen.queryByTestId("khata-remind")).toBeNull();
  });
});
