/**
 * Mobile viewport behaviour — rotate prompt, install banner, desktop chrome suppressed.
 *
 * Narrative paths covered:
 *   SP12  Mobile portrait → rotate prompt visible
 *   SP13  Mobile landscape → rotate prompt absent
 *   SP14  Mobile non-PWA → install banner appears after 2s
 *   SP15  Desktop → no rotate prompt, heading visible
 */
import { expect, test } from "@playwright/test";

test.describe("Mobile portrait — rotate prompt", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 portrait

  // SP12
  test("SP12: portrait mobile shows rotate-device overlay", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("text=Rotate your device to landscape for the best experience")
    ).toBeVisible({ timeout: 3_000 });
  });

  // SP14 - install banner appears after 2s on mobile non-PWA
  test("SP14: mobile non-PWA shows install banner after 2 seconds", async ({ page }) => {
    // Use a narrow landscape viewport (width < 768) so isMobile=true but no portrait rotate prompt
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto("/");
    await expect(page.locator("text=Open Fullscreen")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Mobile landscape — no rotate prompt", () => {
  test.use({ viewport: { width: 844, height: 390 } }); // iPhone 14 landscape

  // SP13
  test("SP13: landscape mobile does not show rotate-device overlay", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#game-frame");
    await expect(
      page.locator("text=Rotate your device to landscape for the best experience")
    ).not.toBeVisible();
  });
});

test.describe("Desktop — standard shell chrome", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  // SP15
  test("SP15: desktop shows title heading and hides rotate prompt", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#game-frame");
    await expect(page.locator("h1")).toContainText("Star Sailors");
    await expect(
      page.locator("text=Rotate your device to landscape for the best experience")
    ).not.toBeVisible();
    // Install banner also absent on desktop
    await page.waitForTimeout(3_000);
    await expect(page.locator("text=Open Fullscreen")).not.toBeVisible();
  });
});
