"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    let disposed = false;
    let removeOnlineListener: (() => void) | undefined;

    void navigator.serviceWorker
      .register("/sw.mjs", { scope: "/", type: "module" })
      .then((registration) => {
        if (disposed) return;

        const checkForUpdate = () => {
          void registration.update().catch(() => undefined);
        };

        window.addEventListener("online", checkForUpdate);
        removeOnlineListener = () => window.removeEventListener("online", checkForUpdate);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      removeOnlineListener?.();
    };
  }, []);

  return null;
}
