import { expect, test } from "@playwright/test";

test("isolated E2E server renders the basic login route", async ({ page }) => {
  const response = await page.goto("/login");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});
