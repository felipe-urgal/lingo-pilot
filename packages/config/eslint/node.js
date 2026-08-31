import globals from "globals";
import { baseConfig } from "./base.js";

export const nodeEnvironmentConfig = {
  languageOptions: {
    globals: globals.node,
  },
};

export const nodeJsConfig = [...baseConfig, nodeEnvironmentConfig];
