import type { PriceItem, PricePack } from "@/api/endpoints/shop";

/**
 * The price list's search, as the counter types it: "apex 20" finds Apex Ultima and lights up its
 * 20 L row. Ported from HueVistaFrontEnd/src/lib/price-list.ts (searchItems, packMatches) — keep the
 * two in step, so a search finds the same items on the phone as on the website.
 *
 * Words are letters and digits, Latin or Devanagari; everything else is a space. (The website's
 * Unicode classes are spelt out here: the phone's JavaScript engine is not relied on for them.)
 */

/**
 * A pack size written one way, so "20l", "20 ltr" and "20 L" are one: lower case, no spaces, and the
 * units the counter types spelt as the list spells them. Mirrors PriceKeys.packKey on the server.
 */
export function packKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[\s.]+/g, "")
    .replace(/(millilitres|milliliters|millilitre|milliliter|mls)$/, "ml")
    .replace(/(litres|liters|litre|liter|ltrs|ltr|lts|lt)$/, "l")
    .replace(/(kilograms|kilogram|kilos|kilo|kgs)$/, "kg")
    .replace(/(grams|gram|gms|gm|grm)$/, "g")
    .replace(/(pieces|piece|pcs|nos)$/, "pc");
}

function words(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .trim();
}

/** What a search reads about an item: its words, and its pack sizes both as written and squeezed. */
function haystack(item: PriceItem): string {
  return [item.name, item.brand ?? "", item.category ?? "", item.nicknames ?? "", ...item.packs.flatMap((p) => [p.label, packKey(p.label)])]
    .map(words)
    .join(" ");
}

const UNIT = /^(l|lt|lts|ltr|ltrs|litre|litres|liter|liters|ml|kg|kgs|g|gm|gms|pc|pcs)$/;

/** The search box's words, each one squeezed the way pack sizes are, so "20 ltr" finds "20 L". */
export function searchTerms(query: string): string[] {
  const raw = words(query).split(" ").filter(Boolean);
  // "20 ltr" is two words but one pack size: join a number to a unit that follows it.
  const joined: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const word = raw[i]!;
    const next = raw[i + 1];
    if (/^\d+(\.\d+)?$/.test(word) && next && UNIT.test(next)) {
      joined.push(packKey(word + next));
      i++;
    } else {
      joined.push(word);
    }
  }
  return joined;
}

/**
 * The items a search finds: every word of it must appear somewhere in the item — its name, company,
 * category, other names or a pack size. Items whose name starts with the first word come first;
 * otherwise the list keeps its order.
 */
export function searchItems(items: readonly PriceItem[], query: string): PriceItem[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [...items];
  const hits = items.filter((item) => {
    const hay = haystack(item);
    return terms.every((term) => hay.includes(term));
  });
  const first = terms[0]!;
  return hits
    .map((item, index) => ({ item, index, starts: words(item.name).startsWith(first) ? 0 : 1 }))
    .sort((a, b) => a.starts - b.starts || a.index - b.index)
    .map((x) => x.item);
}

/** Whether a pack is the one a search names — "apex 20" lights up the 20 L row. */
export function packMatches(pack: PricePack, query: string): boolean {
  const key = packKey(pack.label);
  const number = key.match(/^\d+(\.\d+)?/)?.[0];
  return searchTerms(query).some((term) => term === key || (number !== undefined && term === number));
}
