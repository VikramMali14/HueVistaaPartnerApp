// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // The board reader's page is generated (scripts/build-board-reader.mjs) and mostly pdf.js.
    ignores: ["dist/*", ".expo/*", "node_modules/*", "android/*", "ios/*", "**/*.generated.ts"],
  },
]);
