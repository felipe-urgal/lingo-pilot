"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let registrationAttempt:
      | Promise<ServiceWorkerRegistration | undefined>
      | undefined;

    const ensureRegistration = () => {
      if (registration) return Promise.resolve(registration);
      if (registrationAttempt) return registrationAttempt;

      registrationAttempt = navigator.serviceWorker
        .register("/sw.mjs", { scope: "/", type: "module" })
        .then((nextRegistration) => {
          if (!disposed) registration = nextRegistration;
          return nextRegistration;
        })
        .catch(() => undefined)
        .finally(() => {
          registrationAttempt = undefined;
        });

      return registrationAttempt;
    };

    const handleOnline = () => {
      if (disposed) return;

      if (registration) {
        void registration.update().catch(() => undefined);
        return;
      }

      // The first registration can fail when the page is loaded offline.
      // Reconnect retries registration instead of requiring a page reload.
      void ensureRegistration();
    };

    window.addEventListener("online", handleOnline);
    void ensureRegistration();

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
