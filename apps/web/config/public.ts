import { parsePublicEnvironment } from "@lingo-pilot/config/runtime/environment";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

export const publicConfig = parsePublicEnvironment({
  NEXT_PUBLIC_APP_URL: appUrl,
});
