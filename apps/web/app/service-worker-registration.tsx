"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    void navigator.serviceWorker
      .register("/sw.mjs", { scope: "/", type: "module" })
      .catch(() => undefined);
  }, []);

  return null;
}
