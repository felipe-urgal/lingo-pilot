import {
  LINGO_SHELL_CACHE,
  LINGO_STATIC_CACHE,
  OFFLINE_FALLBACK_PATH,
  isLingoCacheName,
  shouldCacheResponse,
  shouldClearCachesAfterResponse,
} from "./sw-policy.mjs";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(LINGO_SHELL_CACHE)
      .then((cache) => cache.add(OFFLINE_FALLBACK_PATH))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                isLingoCacheName(name) &&
                name !== LINGO_SHELL_CACHE &&
                name !== LINGO_STATIC_CACHE,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.method !== "GET") {
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      event.respondWith(handleLogout(request, url));
    }
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (shouldCacheResponse({
    method: request.method,
    pathname: url.pathname,
    responseOk: true,
  })) {
    event.respondWith(cacheFirstStaticAsset(request, url));
  }
});

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const fallback = await caches.match(OFFLINE_FALLBACK_PATH);
    return fallback ?? Response.error();
  }
}

async function cacheFirstStaticAsset(request, url) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (
    shouldCacheResponse({
      method: request.method,
      pathname: url.pathname,
      responseOk: response.ok,
    })
  ) {
    const cache = await caches.open(LINGO_STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function handleLogout(request, url) {
  const response = await fetch(request);
  if (
    shouldClearCachesAfterResponse({
      method: request.method,
      pathname: url.pathname,
      status: response.status,
    })
  ) {
    await clearLingoCaches();
  }
  return response;
}

async function clearLingoCaches() {
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => isLingoCacheName(name)).map((name) => caches.delete(name)),
  );
}
