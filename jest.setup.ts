/**
 * Jest setup: the official in-memory mocks for native modules that have no JavaScript
 * fallback. Each library ships its own mock for exactly this purpose.
 *
 * jest.mock() factories run before imports are set up, so they must load the mock with
 * require() — that is Jest's documented pattern, hence the lint exception.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@react-native-community/netinfo", () => require("@react-native-community/netinfo/jest/netinfo-mock.js"));

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// The gesture root (app/_layout.tsx) through the library's own test double.
require("react-native-gesture-handler/jestSetup");

// Taps that buzz: nothing to feel in Jest. Each call is recorded, so a test can say a mark buzzed.
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy", Soft: "soft", Rigid: "rigid" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

// Reanimated and its worklets run on the UI thread, which Jest has none of: both libraries'
// own mocks run every animation as a plain style, so screens render as they settle.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

// The board reader (P7) runs pdf.js in a WebView, which Jest has no browser for: the WebView is
// an empty view here, and the 2 MB page it would load is left out. The reading itself is proved
// in Chromium (scripts/verify-board-reader.mjs); the conversation with it is unit-tested
// (board-reader-protocol.test.ts).
jest.mock("react-native-webview", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  const { View } = require("react-native");
  const WebView = forwardRef(function WebView(props: Record<string, unknown>, ref: unknown) {
    useImperativeHandle(ref, () => ({ postMessage: () => {}, injectJavaScript: () => {} }));
    return require("react").createElement(View, { testID: props.testID ?? "webview" });
  });
  return { __esModule: true, WebView, default: WebView };
});
jest.mock("@/features/painter/board-reader/reader-html.generated", () => ({ READER_HTML: "<!doctype html>", READER_INPUTS: {} }));
