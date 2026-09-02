import { defineConfig } from "vitest/config";

const nodePackageNames = [
  "ai",
  "config",
  "content",
  "db",
  "domain",
  "learning",
  "test-support",
  "ui",
] as const;

export default defineConfig({
  test: {
    coverage: {
      exclude: ["**/*.test.*", "**/test/**"],
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
    },
    projects: [
      {
        oxc: {
          jsx: {
            importSource: "react",
            runtime: "automatic",
          },
        },
        test: {
          environment: "jsdom",
          include: ["test/**/*.component.test.tsx"],
          name: "web",
          root: "apps/web",
          setupFiles: ["./test/setup.ts"],
        },
      },
      {
        test: {
          environment: "node",
          include: ["server/**/*.test.ts"],
          name: "web-server",
          root: "apps/web",
        },
      },
      ...nodePackageNames.map((packageName) => ({
        test: {
          environment: "node" as const,
          include: ["src/**/*.test.ts"],
          name: packageName,
          passWithNoTests: true,
          root: `packages/${packageName}`,
        },
      })),
    ],
  },
});
