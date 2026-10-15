import { expect, test } from "@playwright/test";

// No test sends a message: that would use the AI quota. The panel itself is checked.
test("Clara opens from any page with suggestions and a message box", async ({ page }) => {
  await page.goto("/goals");
  const launcher = page.getByRole("button", { name: "Conversar com a Clara, assistente financeira" });

  if (!process.env.GEMINI_API_KEY) {
    // Without a key there is no button at all, and the rest of the app works.
    await expect(launcher).toHaveCount(0);
    return;
  }

  await launcher.click();
  const panel = page.getByRole("dialog", { name: "Clara" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Oi, eu sou a Clara.")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Resumo do mês" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Como estão minhas metas?" })).toBeVisible();
  await expect(panel.getByLabel("Mensagem para a Clara")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});
