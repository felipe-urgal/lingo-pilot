export type RuntimeProfile = "development" | "e2e" | "test" | "production";
export type WebProfile = "dev" | "e2e";

export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export interface PublicRuntimeConfig {
  readonly appUrl: string;
}

export interface ServerRuntimeConfig {
  readonly profile: RuntimeProfile;
  readonly timeZone: string;
  readonly testMode: boolean;
  readonly public: PublicRuntimeConfig;
}

export interface WebProfileEnvironment {
  readonly LINGO_PROFILE: "development" | "e2e";
  readonly LINGO_TEST_MODE: "false" | "true";
  readonly NEXT_PUBLIC_APP_URL: string;
}

export declare const WEB_HOST: "127.0.0.1";
export declare const WEB_PORT: 5400;
export declare const E2E_PORT: 5401;
export declare const DEFAULT_TIME_ZONE: "UTC";

export declare class EnvironmentValidationError extends Error {
  readonly key?: string;
  constructor(message: string, key?: string);
}

export declare function canonicalAppUrl(profile: WebProfile): string;

export declare function createWebProfileEnvironment(
  profile: WebProfile,
): Readonly<WebProfileEnvironment>;

export declare function parsePublicEnvironment(
  source: EnvironmentSource,
): Readonly<PublicRuntimeConfig>;

export declare function parseServerEnvironment(
  source: EnvironmentSource,
): Readonly<ServerRuntimeConfig>;
