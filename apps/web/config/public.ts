import { parsePublicEnvironment } from "@lingo-pilot/config/runtime/environment";

export const publicConfig = parsePublicEnvironment({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
