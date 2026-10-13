import { expect, test } from "@playwright/test";
import { readCredentials } from "./test-user";

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("private pages send visitors to the login page", async ({ page }) => {
    await page.goto("/transactions");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });

  test("a wrong password shows a clear message and keeps the email", async ({ page }) => {
    const { email } = readCredentials();
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("senha-errada-123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue(email);
  });

  test("sign-up rejects a short password before calling Supabase", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Nome").fill("Teste");
    await page.getByLabel("E-mail").fill("curta@finora.test");
    // The browser enforces minLength too; remove it to reach the server check.
    await page.getByLabel("Senha").evaluate((input) => input.removeAttribute("minlength"));
    await page.getByLabel("Senha").fill("123");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Use uma senha com pelo menos 8 caracteres.")).toBeVisible();
  });

  test("the demo account opens with sample data", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Entrar como demo" }).click();
    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
    await expect(page.getByText("Maiores gastos do mês")).toBeVisible();
  });
});

test("a new account starts with an empty dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Seu resumo começa aqui")).toBeVisible();
});
