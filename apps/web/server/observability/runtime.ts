import { deploymentMetadata, serverConfig } from "../../config/server";
import { noopTelemetryHooks } from "./contracts";
import { createLogger } from "./logger";
import { createRequestObserver } from "./request";

export const serverLogger = createLogger({
  service: "lingo-pilot-web",
  environment: serverConfig.profile,
  version: deploymentMetadata.version,
  deploymentId: deploymentMetadata.deploymentId,
  pretty: serverConfig.profile !== "production",
});

export const observeRequest = createRequestObserver(
  serverLogger,
  noopTelemetryHooks,
);
