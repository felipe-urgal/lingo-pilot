import { baseConfig } from "@lingo-pilot/config/eslint/base";

export default [
  ...baseConfig,
  {
    files: ["scripts/**/*.mjs", "test/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
];
