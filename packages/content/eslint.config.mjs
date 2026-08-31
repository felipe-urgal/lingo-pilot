import { baseConfig } from "@lingo-pilot/config/eslint/base";
import { nodeEnvironmentConfig } from "@lingo-pilot/config/eslint/node";

export default [
  ...baseConfig,
  {
    ...nodeEnvironmentConfig,
    files: ["scripts/**/*.mjs"],
  },
];
