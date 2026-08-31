import globals from "globals";
import { baseConfig } from "./base.js";

export const nodeJsConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
];
