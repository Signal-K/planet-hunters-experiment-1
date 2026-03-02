/**
 * Shell basics — loads correctly, serves all required static assets, persists
 * progress cookie on boot.
 */
import { expect, test } from "@playwright/test";

test.describe("Shell basics", () => {
  test("loads React shell with game iframe pointing at /game/index.html", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#game-frame")).toBeVisible();
    await expect(page.locator("#game-frame")).toHaveAttribute("src", /^\/game\/index\.html/);
  });

  test("serves all critical static assets with HTTP 200", async ({ request }) => {
    const paths = [
      "/",
      "/react-shell.js",
      "/manifest.json",
      "/sw.js",
      "/game/index.html",
      "/game/index.js",
    ];
    for (const path of paths) {
      const res = await request.get(path);
      expect(res.status(), `${path} should return 200`).toBe(200);
    }
  });

  test("manifest.json has display:fullscreen and orientation:landscape", async ({ request }) => {
    const res = await request.get("/manifest.json");
    const body = await res.json();
    expect(body.display).toBe("fullscreen");
    expect(body.orientation).toBe("landscape");
    expect(body.name).toMatch(/Star Sailors/);
  });

  test("sw.js is a valid service worker script", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("addEventListener");
    expect(text).toContain("install");
  });

  test("sets progress cookie with session-started marker on load", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForFunction(() =>
      document.cookie.includes("planet_hunters_progress_v1")
    );
    const cookies = await page.context().cookies();
    const c = cookies.find((x) => x.name === "planet_hunters_progress_v1");
    expect(c).toBeDefined();
    const parsed = JSON.parse(decodeURIComponent(c!.value));
    expect(["session-started", "game-loaded"]).toContain(parsed.marker);
  });

  test("PH_SAVE_PROGRESS postMessage updates progress cookie marker", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForSelector("#game-frame");
    await page.evaluate(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "PH_SAVE_PROGRESS", marker: "playwright-test-marker" },
        })
      );
    });
    await page.waitForFunction(() => {
      const match = document.cookie.match(/planet_hunters_progress_v1=([^;]+)/);
      if (!match) return false;
      try {
        return JSON.parse(decodeURIComponent(match[1])).marker === "playwright-test-marker";
      } catch {
        return false;
      }
    });
  });
});
