export const LINGO_CACHE_PREFIX = "lingo-pilot-";
export const LINGO_SHELL_CACHE = `${LINGO_CACHE_PREFIX}shell-v1`;
export const LINGO_STATIC_CACHE = `${LINGO_CACHE_PREFIX}static-v1`;
export const OFFLINE_FALLBACK_PATH = "/offline";

const PRIVATE_PREFIXES = ["/app", "/api", "/login", "/signup"];

export function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isStaticAssetPath(pathname) {
  return pathname.startsWith("/_next/static/");
}

export function shouldCacheResponse({ method, pathname, responseOk }) {
  return method === "GET" && responseOk && isStaticAssetPath(pathname);
}

export function shouldClearCachesAfterResponse({ method, pathname, status }) {
  return method === "POST" && pathname === "/api/auth/logout" && status < 400;
}

export function isLingoCacheName(name) {
  return name.startsWith(LINGO_CACHE_PREFIX);
}
