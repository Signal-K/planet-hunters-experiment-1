import { test, expect } from "@playwright/test";

/**
 * Advanced Settings & Mission Jumps
 *
 * The HUD and advanced settings only render inside the shell's `if (isPwa)`
 * early-return branch. isPwaMode() checks matchMedia("display-mode: standalone").
 * We spoof that query before page load so the shell takes the PWA code path.
 *
 * Flow (non-compact HUD, viewport 1280×800, isMobile=false):
 *   "Show HUD" → revealPwaHud() → showPwaHud=true (3.5s timer)
 *   "Exit to Menu" → toggles showPwaHudMenu=true AND cancels the timer
 *   "Show Advanced Settings" → showAdvanced=true → buttons appear
 */
test.describe("Advanced Settings & Mission Jumps", () => {
  // min(1280, 800) = 800 ≥ 768 → isMobile=false → non-compact HUD
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    // Spoof PWA standalone mode before the shell JS runs
    await page.addInitScript(() => {
      const orig = window.matchMedia.bind(window);
      (window as Window).matchMedia = (query: string): MediaQueryList => {
        if (
          query === "(display-mode: standalone)" ||
          query === "(display-mode: minimal-ui)"
        ) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList;
        }
        return orig(query);
      };
    });
    await page.goto("/");
    await page.waitForSelector("#game-frame");
  });

  test("can access advanced settings and trigger instant mining", async ({
    page,
  }) => {
    // Reveal HUD — only works now that isPwa=true
    await page.click("text=Show HUD");
    // Non-compact "Exit to Menu" opens dropdown and cancels the 3.5s auto-close timer
    await page.click("text=Exit to Menu");
    await page.click("text=Show Advanced Settings");

    await expect(
      page.locator("text=🚀 Instant Mining (Auto-Setup)")
    ).toBeVisible();
    await expect(
      page.locator("text=📈 Skip to Level 3 (Unlock Missions)")
    ).toBeVisible();

    // Instant Mining closes the dropdown; game iframe stays visible
    await page.click("text=🚀 Instant Mining (Auto-Setup)");
    await expect(page.locator("#game-frame")).toBeVisible();
  });

  test("can skip to level 3", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await page.click("text=Show HUD");
    await page.click("text=Exit to Menu");
    await page.click("text=Show Advanced Settings");
    await page.click("text=📈 Skip to Level 3 (Unlock Missions)");

    // HUD header (outside dropdown) shows updated state after skip
    await expect(page.locator("text=Lvl 3")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=250K F")).toBeVisible({ timeout: 5_000 });
  });
});
