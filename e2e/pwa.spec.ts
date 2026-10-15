import { expect, test } from "@playwright/test";

test("the app is installable", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "Finora", display: "standalone", start_url: "/dashboard" });
  expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toEqual(["any", "any", "maskable"]);
  expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual(["/transactions/new", "/accounts", "/goals"]);

  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["cache-control"]).toContain("no-store");
});

// The service worker only registers in production builds (CI runs `next start`).
test("pages seen before open offline; unseen ones explain why", async ({ page, context }) => {
  test.skip(!process.env.CI, "needs the production build");

  await page.goto("/goals");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The first load registers the worker; the second goes through it and is cached.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Metas" })).toBeVisible();

  await context.setOffline(true);
  await page.goto("/goals");
  await expect(page.getByRole("heading", { name: "Metas" })).toBeVisible();

  await page.goto("/transactions?month=2020-01");
  await expect(page.getByRole("heading", { name: "Você está sem internet" })).toBeVisible();
  await context.setOffline(false);
});
