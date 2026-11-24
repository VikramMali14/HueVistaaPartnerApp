import { plural, setLanguage, t } from "..";
import { en } from "../en";
import { hi } from "../hi";

describe("t", () => {
  it("looks up a nested key, the shop's and the painter's", () => {
    expect(t("shop.asks.approvePaid")).toBe("Approve, paid");
    expect(t("tabs.scan")).toBe("Scan");
  });

  it("fills placeholders", () => {
    expect(t("shop.today.questions", { n: 3 })).toBe("3 price questions to answer");
  });
});

describe("Hindi", () => {
  afterEach(() => setLanguage("en"));

  it("reads every string in the chosen language, and English again after", () => {
    setLanguage("hi");
    expect(t("tabs.prices")).toBe("दाम");
    expect(t("shop.asks.leave")).toBe("छुट्टी");
    setLanguage("en");
    expect(t("tabs.prices")).toBe("Prices");
  });

  it("counts nought as one in Hindi, as English doesn't", () => {
    expect(plural(0, "shop.prices.one", "shop.prices.count")).toBe(t("shop.prices.count", { n: 0 }));
    setLanguage("hi");
    expect(plural(0, "shop.prices.one", "shop.prices.count")).toBe(t("shop.prices.one", { n: 0 }));
  });

  it("has seven weekdays and twelve months in each language", () => {
    for (const table of [en, hi]) {
      expect(table.time.weekdaysShort.split(",")).toHaveLength(7);
      expect(table.time.weekdaysLong.split(",")).toHaveLength(7);
      expect(table.time.monthsShort.split(",")).toHaveLength(12);
    }
  });

  // The type already demands every key; this guards what a type can't see.
  it("has every English string, with the same placeholders, and none left blank", () => {
    const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    const problems: string[] = [];
    const walk = (e: Record<string, unknown>, h: Record<string, unknown> | undefined, at: string) => {
      for (const [k, v] of Object.entries(e)) {
        const key = at ? `${at}.${k}` : k;
        const theirs = h?.[k];
        if (typeof v === "string") {
          if (typeof theirs !== "string" || !theirs.trim()) problems.push(`missing ${key}`);
          else if (holes(theirs) !== holes(v)) problems.push(`placeholders ${key}`);
          else if (/!/.test(theirs)) problems.push(`exclamation ${key}`);
        } else walk(v as Record<string, unknown>, theirs as Record<string, unknown> | undefined, key);
      }
    };
    walk(en as unknown as Record<string, unknown>, hi as unknown as Record<string, unknown>, "");
    expect(problems).toEqual([]);
  });
});
