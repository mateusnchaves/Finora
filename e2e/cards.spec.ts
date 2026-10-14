import { expect, test } from "@playwright/test";
import { monthOf, shiftMonth, todayISO } from "../src/lib/dates";

/*
 * A card that closes on the 1st and is due on the 28th: a purchase on the 15th of last month
 * is in the bill that closed this month (closed or, after the 28th, overdue), and its second
 * installment lands in the bill that is open now.
 */
test("credit card: installments, bill and payment", async ({ page }) => {
  const thisMonth = monthOf(todayISO());
  const purchaseDate = `${shiftMonth(thisMonth, -1)}-15`;

  await page.goto("/accounts/new");
  await page.getByLabel("Nome").fill("Cartão E2E");
  await page.getByLabel("Tipo").selectOption({ label: "Cartão de crédito" });
  await page.getByLabel("Dia do fechamento").fill("1");
  await page.getByLabel("Dia do vencimento").fill("28");
  await page.getByLabel("Limite (opcional)").fill("3.000,00");
  await page.getByRole("button", { name: "Adicionar conta" }).click();
  await expect(page).toHaveURL(/\/accounts$/);

  await page.getByRole("link", { name: /Cartão E2E/ }).click();
  await expect(page).toHaveURL(/\/cards\//);
  const cardUrl = page.url().split("?")[0];
  await expect(page.getByText("Fecha dia 1 · vence dia 28")).toBeVisible();

  // 3x of R$ 100 on the card.
  await page.goto("/transactions/new");
  await page.getByLabel("Valor").fill("300,00");
  await page.getByLabel("Descrição").fill("Fone E2E");
  await page.getByLabel("Data").fill(purchaseDate);
  await page.getByLabel("Conta", { exact: true }).selectOption({ label: "Cartão E2E" });
  await page.getByLabel("Parcelas").selectOption("3");
  await page.getByRole("button", { name: "Adicionar lançamento" }).click();
  await expect(page).toHaveURL(/\/transactions\?month=/);
  await expect(page.getByRole("link", { name: /Fone E2E/ })).toContainText("Parcela 1/3");
  await expect(page.getByRole("link", { name: /Fone E2E/ })).toContainText("− R$ 100,00");

  // The closed bill: R$ 100, ready to pay.
  await page.goto(`${cardUrl}?month=${thisMonth}`);
  await expect(page.getByText(/Fechada|Vencida/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Fone E2E/ })).toContainText("Parcela 1/3");
  // Rows render their own <li>; nesting them breaks hydration.
  await expect(page.locator("li li")).toHaveCount(0);
  await page.getByRole("link", { name: "Pagar R$ 100,00" }).click();

  // The payment form arrives filled in: a transfer from the bank account to the card.
  await expect(page.getByLabel("Valor")).toHaveValue("100,00");
  await expect(page.getByLabel("Entra na conta")).toHaveValue(/.+/);
  await expect(page.getByLabel("Sai da conta")).not.toHaveValue("");
  await page.getByRole("button", { name: "Adicionar lançamento" }).click();
  await expect(page).toHaveURL(/\/transactions\?month=/);

  await page.goto(`${cardUrl}?month=${thisMonth}`);
  // The badge text also holds the icon ligature, so match the end of it.
  await expect(page.getByText(/Paga$/)).toBeVisible();

  // The open bill holds installment 2/3; the limit counts all three.
  await page.goto(cardUrl);
  await expect(page.getByRole("link", { name: /Fone E2E/ })).toContainText("Parcela 2/3");
  await expect(page.getByText("R$ 200,00 usados de R$ 3.000,00")).toBeVisible();

  // Deleting the whole purchase removes every installment.
  await page.getByRole("link", { name: /Fone E2E/ }).click();
  await expect(page.getByText("Parcela 2 de 3.")).toBeVisible();
  await page.getByRole("button", { name: "Excluir todas as parcelas" }).click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(page).toHaveURL(/\/transactions\?month=/);
  await page.goto(cardUrl);
  await expect(page.getByText("Nenhuma compra nesta fatura.")).toBeVisible();
});

test("only card expenses can be split", async ({ page }) => {
  await page.goto("/transactions/new");
  await page.getByLabel("Conta", { exact: true }).selectOption({ label: "Conta principal" });
  await expect(page.getByLabel("Parcelas")).toHaveCount(0);
});
