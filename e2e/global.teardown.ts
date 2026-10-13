import { existsSync, rmSync } from "node:fs";
import { test as teardown } from "@playwright/test";
import { adminClient, CREDENTIALS_FILE, isTestEmail, readCredentials } from "./test-user";

teardown("delete the test user", async () => {
  if (!existsSync(CREDENTIALS_FILE)) return;
  const { id, email } = readCredentials();
  // Every user-owned table cascades from auth.users, so this removes all test data.
  if (isTestEmail(email)) await adminClient().auth.admin.deleteUser(id);
  rmSync("e2e/.auth", { recursive: true, force: true });
});
