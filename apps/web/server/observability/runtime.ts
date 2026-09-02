import { observabilityConfig } from "../../config/observability";
import { noopTelemetryHooks } from "./contracts";
import { createLogger } from "./logger";
import { createRequestObserver } from "./request";

export const serverLogger = createLogger({
  service: "lingo-pilot-web",
  environment: observabilityConfig.environment,
  version: observabilityConfig.version,
  deploymentId: observabilityConfig.deploymentId,
  pretty: observabilityConfig.pretty,
});

export const observeRequest = createRequestObserver(
  serverLogger,
  noopTelemetryHooks,
);
