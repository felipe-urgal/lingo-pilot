const environment = process.env.LINGO_PROFILE ?? process.env.NODE_ENV ?? "unknown";

export const observabilityConfig = Object.freeze({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment,
  pretty: environment !== "production",
  version: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
});
