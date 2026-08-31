import { createServer } from "node:net";

export const WEB_HOST = "127.0.0.1";
export const WEB_PORT = 5400;
export const E2E_PORT = 5401;

export function resolveWebPort(profile) {
  if (profile === "dev") return WEB_PORT;
  if (profile === "e2e") return E2E_PORT;

  throw new Error(`Unknown web profile: ${profile}`);
}

export async function assertPortAvailable(port, host = WEB_HOST) {
  await new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", (error) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EADDRINUSE"
      ) {
        reject(
          new Error(
            `LingoPilot cannot start because ${host}:${port} is already in use. ` +
              "The project never auto-increments ports; stop the conflicting process and retry.",
          ),
        );
        return;
      }

      reject(error);
    });

    server.listen(port, host, () => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });
}
