import { expect, test } from "@playwright/test";

test("add, edit and delete an expense", async ({ page }) => {
  await page.goto("/transactions/new");
  await expect(page.getByRole("heading", { name: "Novo lançamento" })).toBeVisible();

  await page.getByLabel("Valor").fill("123,45");
  await page.getByLabel("Descrição").fill("Mercado E2E");
  await page.getByLabel("Categoria").selectOption({ label: "Alimentação" });
  await page.getByRole("button", { name: "Adicionar lançamento" }).click();

  // Expenses use the real minus sign (U+2212).
  await expect(page).toHaveURL(/\/transactions\?month=/);
  await expect(page.getByRole("link", { name: /Mercado E2E/ })).toContainText("− R$ 123,45");

  await page.goto("/dashboard");
  await expect(page.getByText("Mercado E2E").first()).toBeVisible();

  await page.goto("/transactions");
  await page.getByRole("link", { name: /Mercado E2E/ }).click();
  await expect(page.getByRole("heading", { name: "Editar lançamento" })).toBeVisible();
  await page.getByLabel("Valor").fill("100,00");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("link", { name: /Mercado E2E/ })).toContainText("− R$ 100,00");

  await page.getByRole("link", { name: /Mercado E2E/ }).click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page).toHaveURL(/\/transactions\?month=/);
  await expect(page.getByRole("link", { name: /Mercado E2E/ })).toHaveCount(0);
});

test("a form error keeps what was typed", async ({ page }) => {
  await page.goto("/transactions/new");
  await page.getByLabel("Descrição").fill("Sem valor");
  await page.getByRole("button", { name: "Adicionar lançamento" }).click();
  await expect(page.locator("#field-amount-message")).toBeVisible();
  await expect(page.getByLabel("Descrição")).toHaveValue("Sem valor");
});

test("income shows in brand with a plus sign", async ({ page }) => {
  await page.goto("/transactions/new");
  await page.getByText("Receita", { exact: true }).click();
  await page.getByLabel("Valor").fill("2500");
  await page.getByLabel("Descrição").fill("Salário E2E");
  await page.getByRole("button", { name: "Adicionar lançamento" }).click();

  const amount = page.getByRole("link", { name: /Salário E2E/ }).getByText("+ R$ 2.500,00");
  await expect(amount).toBeVisible();
  await expect(amount).toHaveClass(/text-brand/);
});
