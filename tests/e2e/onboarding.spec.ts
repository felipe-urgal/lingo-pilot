import { expect, test } from "@playwright/test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
}

async function signup(page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/app\/onboarding$/);
}

test("signup/login -> onboarding A0 -> Today -> resumable lesson -> completed session", async ({
  page,
}) => {
  const email = uniqueEmail("a0");
  const password = "correct-horse-17";
  await signup(page, email, password);

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app\/onboarding$/);

  await page
    .getByLabel("Objetivo principal (opcional)")
    .selectOption("conversation");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Meta diária").selectOption("20");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Começar do zero (A0)").check();
  await page.getByRole("button", { name: "Começar minha jornada" }).click();

  await expect(page).toHaveURL(/\/app\/today$/);
  await expect(
    page.getByRole("heading", { name: "Sua próxima ação está pronta." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Como funciona uma aula" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Começar estudo" }).click();

  await expect(page).toHaveURL(
    /\/app\/lesson\/lesson\.a0\.bootstrap\.orientation/,
  );
  await expect(
    page.getByRole("heading", { name: "Como funciona uma aula" }),
  ).toBeVisible();
  await expect(page.getByText("Passo 1 de 2")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Passo 2 de 2")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Passo 2 de 2")).toBeVisible();
  await expect(page.getByText("Estudo de hoje concluído.")).toHaveCount(0);
  await page.getByRole("button", { name: "Concluir aula" }).click();

  await expect(page).toHaveURL(/\/app\/today$/);
  await expect(
    page.getByRole("heading", { name: "Estudo de hoje concluído." }),
  ).toBeVisible();
});

test("false beginner can choose A2 manual entry without fabricated completion UI", async ({
  page,
}) => {
  await signup(page, uniqueEmail("a2"), "correct-horse-18");

  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Já estudei antes").check();
  await page.getByLabel(/A2/).check();
  await page.getByRole("button", { name: "Começar minha jornada" }).click();

  await expect(page).toHaveURL(/\/app\/today$/);
  await expect(
    page.getByRole("heading", {
      name: "Sua próxima aula ainda não está disponível.",
    }),
  ).toBeVisible();
  await expect(page.getByText(/concluíd|dominad/i)).toHaveCount(0);
});
