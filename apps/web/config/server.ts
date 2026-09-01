import { parseServerEnvironment } from "@lingo-pilot/config/runtime/environment";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

export const serverConfig = parseServerEnvironment({
  APP_TIMEZONE: process.env.APP_TIMEZONE,
  DATABASE_URL: process.env.DATABASE_URL,
  LINGO_PROFILE: process.env.LINGO_PROFILE,
  LINGO_TEST_MODE: process.env.LINGO_TEST_MODE,
  NEXT_PUBLIC_APP_URL: appUrl,
  NODE_ENV: process.env.NODE_ENV,
});
