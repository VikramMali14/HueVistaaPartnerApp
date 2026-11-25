import type { PriceItem } from "@/api/endpoints/shop";

import { packKey, packMatches, searchItems, searchTerms } from "../price-search";

/** The counter's search, held to the website's (HueVistaFrontEnd lib/__tests__/price-list.test.ts). */
const item = (id: string, name: string, packs: string[], extra: Partial<PriceItem> = {}): PriceItem => ({
  id,
  name,
  packs: packs.map((label, i) => ({ id: `${id}-${i}`, label, sellingPrice: 100 })),
  ...extra,
});

const LIST: PriceItem[] = [
  item("a", "Tractor Emulsion", ["1 L", "4 L", "20 L"], { brand: "Asian Paints" }),
  item("b", "Apex Ultima", ["1 L", "4 L", "10 L", "20 L"], { brand: "Asian Paints", category: "Exterior" }),
  item("c", "Wall Putty", ["20 kg", "40 kg"], { brand: "Birla White", nicknames: "putty, white cement" }),
];

describe("packKey and searchTerms", () => {
  it("writes a pack size one way however it is typed", () => {
    for (const typed of ["20l", "20 ltr", "20 L", "20 litres", "20 Lt."]) expect(packKey(typed)).toBe("20l");
    expect(packKey("40 kgs")).toBe("40kg");
    expect(packKey("500 ML")).toBe("500ml");
  });

  it("joins a number to the unit after it", () => {
    expect(searchTerms("apex 20 ltr")).toEqual(["apex", "20l"]);
    expect(searchTerms("  Apex,  Ultima ")).toEqual(["apex", "ultima"]);
  });
});

describe("searchItems", () => {
  it("finds every word somewhere in the item, its packs included", () => {
    expect(searchItems(LIST, "apex 20").map((i) => i.id)).toEqual(["b"]);
    expect(searchItems(LIST, "asian 20 l").map((i) => i.id)).toEqual(["a", "b"]);
    expect(searchItems(LIST, "white cement").map((i) => i.id)).toEqual(["c"]);
    expect(searchItems(LIST, "exterior").map((i) => i.id)).toEqual(["b"]);
  });

  it("puts names starting with the first word first, and keeps the list's order otherwise", () => {
    expect(searchItems(LIST, "a").map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("keeps the whole list for an empty search, and finds nothing for a word no item has", () => {
    expect(searchItems(LIST, "   ")).toHaveLength(3);
    expect(searchItems(LIST, "dulux")).toEqual([]);
  });
});

describe("packMatches", () => {
  it("lights up the pack a search names", () => {
    const apex = LIST[1]!;
    expect(apex.packs.filter((p) => packMatches(p, "apex 20")).map((p) => p.label)).toEqual(["20 L"]);
    expect(apex.packs.filter((p) => packMatches(p, "apex 10 ltr")).map((p) => p.label)).toEqual(["10 L"]);
    expect(apex.packs.filter((p) => packMatches(p, "apex")).map((p) => p.label)).toEqual([]);
  });
});
