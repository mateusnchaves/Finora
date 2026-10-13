import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { adminClient, CREDENTIALS_FILE, isTestEmail, TEST_EMAIL_DOMAIN, TEST_EMAIL_PREFIX } from "./test-user";

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

setup("create a test user and sign in", async ({ page }) => {
  const admin = adminClient();

  // Remove users left behind by runs that crashed before teardown.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const user of list?.users ?? []) {
    if (isTestEmail(user.email) && Date.now() - Date.parse(user.created_at) > STALE_AFTER_MS) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }

  // Confirmed on creation, so no email is sent. The new-user trigger adds default
  // categories and a "Conta principal" account.
  const email = `${TEST_EMAIL_PREFIX}${Date.now()}${TEST_EMAIL_DOMAIN}`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Teste" },
  });
  if (error || !data.user) throw error ?? new Error("Could not create the test user.");

  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(CREDENTIALS_FILE, JSON.stringify({ id: data.user.id, email, password }));

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();

  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
