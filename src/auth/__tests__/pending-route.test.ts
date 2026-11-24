import { forgetRememberedRoute, isRememberablePath, peekRememberedRoute, rememberRoute } from "../pending-route";

afterEach(() => forgetRememberedRoute());

describe("isRememberablePath", () => {
  it.each(["/painter/claim/0VkTlzUw5CGJ-bTtxixeiS0nVfg", "/painter/vouchers", "/shop/asks", "/settings"])("accepts %s", (path) => {
    expect(isRememberablePath(path)).toBe(true);
  });

  it.each([
    ["another host", "//evil.example/x"],
    ["a full URL", "https://evil.example"],
    ["another scheme", "javascript:alert(1)"],
    ["a backslash", "/\\evil.example"],
    ["just the root", "/"],
    ["the root with a query", "/?token=abc"],
    ["Welcome", "/welcome"],
    ["the code screen", "/code?phone=1"],
    ["email sign-in", "/email"],
    ["a shop's emailed code", "/email-code?challenge=x"],
    ["a refused sign-in", "/not-partner"],
    ["something huge", `/${"a".repeat(600)}`],
  ])("refuses %s", (_why, path) => {
    expect(isRememberablePath(path)).toBe(false);
  });

  it("does not mistake a page that only starts like a sign-in screen", () => {
    expect(isRememberablePath("/codes")).toBe(true);
    expect(isRememberablePath("/emails")).toBe(true);
  });
});

describe("remembering", () => {
  it("keeps the latest acceptable page until it is forgotten", () => {
    rememberRoute("/painter/vouchers");
    rememberRoute("/welcome");
    expect(peekRememberedRoute()).toBe("/painter/vouchers");
    rememberRoute("/shop/asks");
    expect(peekRememberedRoute()).toBe("/shop/asks");
    forgetRememberedRoute();
    expect(peekRememberedRoute()).toBeNull();
  });

  // On a cold start a guard can report its own segment while its redirect is on the way.
  it("keeps the page asked for when only its section is reported after it", () => {
    rememberRoute("/painter/claim/0VkTlzUw5CGJ-bTtxixeiS0nVfg");
    rememberRoute("/painter?token=0VkTlzUw5CGJ-bTtxixeiS0nVfg");
    expect(peekRememberedRoute()).toBe("/painter/claim/0VkTlzUw5CGJ-bTtxixeiS0nVfg");
    // A sibling that merely starts the same way is a new page.
    rememberRoute("/painter/claims");
    expect(peekRememberedRoute()).toBe("/painter/claims");
  });
});
