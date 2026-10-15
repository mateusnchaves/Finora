import { expect, test } from "@playwright/test";
import { monthOf, shiftMonth, todayISO } from "../src/lib/dates";

test("goal: create, save, withdraw within limits, finish and delete", async ({ page }) => {
  // A deadline about five months away.
  const deadline = `${shiftMonth(monthOf(todayISO()), 5)}-28`;
  // Unique per attempt, so a retry is not confused by the goal a failed attempt left behind.
  const name = `Bicicleta ${Date.now()}`;
  const link = new RegExp(name);

  await page.goto("/goals/new");
  await page.getByLabel("Nome").fill(name);
  await page.getByText("Carro", { exact: true }).click();
  await page.getByLabel("Quanto quer juntar").fill("1.000,00");
  await page.getByLabel("Até quando (opcional)").fill(deadline);
  await page.getByRole("button", { name: "Criar meta" }).click();

  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText(/Guarde R\$ \d/)).toBeVisible();

  // Save R$ 400.
  await page.getByLabel("Valor").fill("400,00");
  await page.getByLabel("Observação (opcional)").fill("Primeiro aporte");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByText("R$ 400,00", { exact: true })).toBeVisible();
  await expect(page.getByText("Primeiro aporte")).toBeVisible();
  // The form clears for the next entry.
  await expect(page.getByLabel("Valor")).toHaveValue("");

  // Taking out more than was saved is refused.
  await page.getByText("Retirar", { exact: true }).click();
  await page.getByLabel("Valor").fill("500,00");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByText("A meta tem R$ 400,00 guardados; retire no máximo esse valor.")).toBeVisible();

  await page.getByLabel("Valor").fill("100,00");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByText("R$ 300,00", { exact: true })).toBeVisible();
  await expect(page.getByText("− R$ 100,00")).toBeVisible();

  // Reaching the target finishes the goal.
  await page.getByText("Guardar", { exact: true }).click();
  await page.getByLabel("Valor").fill("700,00");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByText(/Concluída$/)).toBeVisible();
  await expect(page.getByText("Meta atingida com R$ 1.000,00 guardados.")).toBeVisible();

  // The list shows it; the dashboard leaves finished goals out.
  await page.goto("/goals");
  await expect(page.getByRole("link", { name: link })).toContainText("R$ 1.000,00 de R$ 1.000,00");

  await page.getByRole("link", { name: link }).click();
  await page.getByRole("link", { name: "Editar meta" }).click();
  await expect(page.getByRole("heading", { name: "Editar meta" })).toBeVisible();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page).toHaveURL(/\/goals$/);
  await expect(page.getByRole("link", { name: link })).toHaveCount(0);
});

test("a new goal cannot have a past deadline", async ({ page }) => {
  await page.goto("/goals/new");
  await page.getByLabel("Nome").fill("Prazo vencido");
  await page.getByLabel("Quanto quer juntar").fill("500");
  await page.getByLabel("Até quando (opcional)").evaluate((input) => input.removeAttribute("min"));
  await page.getByLabel("Até quando (opcional)").fill("2020-01-01");
  await page.getByRole("button", { name: "Criar meta" }).click();
  await expect(page.getByText("Escolha uma data a partir de hoje.")).toBeVisible();
  await expect(page.getByLabel("Nome")).toHaveValue("Prazo vencido");
});
