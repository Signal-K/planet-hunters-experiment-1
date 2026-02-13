import { expect, test } from "@playwright/test";

test.describe("Planet Hunters web app", () => {
  test("loads shell and iframe", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Planet Hunters Web" })).toBeVisible();
    await expect(page.locator("#game-frame")).toHaveAttribute("src", "/game/index.html");
  });

  test("serves Godot build entrypoint", async ({ request }) => {
    const response = await request.get("/game/index.html");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body.toLowerCase()).toContain("<html");
  });

  test("stores and restores persistence marker across reload", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => localStorage.getItem("planet_hunters_web_shell_bootstrap_v1") !== null);
    const first = await page.evaluate(() => localStorage.getItem("planet_hunters_web_shell_bootstrap_v1"));
    expect(first).toBeTruthy();

    await page.reload();
    const second = await page.evaluate(() => localStorage.getItem("planet_hunters_web_shell_bootstrap_v1"));
    expect(second).toBe(first);
  });
});
