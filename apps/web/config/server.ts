import { parseServerEnvironment } from "@lingo-pilot/config/runtime/environment";

export const serverConfig = parseServerEnvironment({
  APP_TIMEZONE: process.env.APP_TIMEZONE,
  LINGO_PROFILE: process.env.LINGO_PROFILE,
  LINGO_TEST_MODE: process.env.LINGO_TEST_MODE,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
});
