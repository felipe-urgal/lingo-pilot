import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistration } from "../app/service-worker-registration";

const originalServiceWorker = navigator.serviceWorker;
const originalSecureContext = window.isSecureContext;

afterEach(() => {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: originalServiceWorker,
  });
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: originalSecureContext,
  });
  vi.restoreAllMocks();
});

describe("ServiceWorkerRegistration", () => {
  it("checks for a worker update when connectivity returns", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const register = vi.fn().mockResolvedValue({ update });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });

    const view = render(<ServiceWorkerRegistration />);

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith("/sw.mjs", {
        scope: "/",
        type: "module",
      }),
    );

    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));

    view.unmount();
    window.dispatchEvent(new Event("online"));
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("keeps registration failure non-blocking", async () => {
    const register = vi.fn().mockRejectedValue(new Error("offline"));
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });

    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
  });
});
