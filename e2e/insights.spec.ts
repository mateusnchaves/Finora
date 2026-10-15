import { expect, test } from "@playwright/test";

// No test sends a question: that would use the API quota. With a key configured, the page
// offers the suggested questions; without one it says the assistant is unavailable.
test("the assistant page explains itself with or without an API key", async ({ page }) => {
  await page.goto("/insights");
  await expect(page.getByRole("heading", { name: "Assistente" })).toBeVisible();

  if (process.env.GEMINI_API_KEY) {
    await expect(page.getByRole("button", { name: "Como estão minhas metas?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gerar resumo" })).toBeVisible();
    await expect(page.getByLabel("Ou pergunte com suas palavras")).toBeVisible();
  } else {
    await expect(page.getByText("Assistente indisponível")).toBeVisible();
  }
});
