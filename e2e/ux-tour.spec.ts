/**
 * UX Tour — captures reference screenshots of every major screen for design
 * and copy work. Screenshots land in test-results/ux-tour/ and are committed
 * to the repo so they can be linked from kanban ticket descriptions.
 *
 * Run with:
 *   npx playwright test e2e/ux-tour.spec.ts --project="Desktop Chrome" --reporter=line
 */
import { expect, test } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOTS_DIR = path.join(__dirname, "../e2e/screenshots");

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

async function save(page: import("@playwright/test").Page, name: string) {
  const dest = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`📸  ${name}`);
}

// ── Shell screens ─────────────────────────────────────────────────────────────

test("shell · fresh load (no progress)", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await save(page, "shell-fresh");
});

test("shell · mission 1 complete (pre-SR2 unlock)", async ({ page }) => {
  await page.addInitScript(() => {
    document.cookie =
      "planet_hunters_progress_v1=mission1_complete; path=/; max-age=86400";
    localStorage.setItem(
      "planet_hunters_xp_state_v1",
      JSON.stringify({ experience_level: 2, experience_xp: 120, updated_at: new Date().toISOString() })
    );
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await save(page, "shell-mission1-complete");
});

test("shell · level-up banner (level 3)", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "planet_hunters_xp_state_v1",
      JSON.stringify({ experience_level: 3, experience_xp: 0, updated_at: new Date().toISOString() })
    );
  });
  await page.goto("/");
  // Trigger the level-up banner by simulating the shell event
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { source: "planet-hunters", event: "level_up", payload: { new_level: 3 } },
        origin: window.location.origin,
      })
    );
  });
  await page.waitForTimeout(400);
  await save(page, "shell-level-up-banner");
});

test("shell · mobile portrait (rotation prompt)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await save(page, "shell-mobile-portrait");
});

test("shell · mobile landscape (game active)", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await save(page, "shell-mobile-landscape");
});

// ── Game screens (requires WASM load — skipped in CI) ─────────────────────────

const GAME_TIMEOUT = 90_000;

test("game · mining minigame header + button guide", async ({ page }) => {
  test.slow(); // allow extra time for WASM
  await page.goto("/");
  await page.waitForSelector("#game-frame", { timeout: 10_000 });

  // Wait for app_ready postMessage
  await page.evaluate(
    (timeoutMs: number) =>
      new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("app_ready timeout")), timeoutMs);
        window.addEventListener("message", function h(e) {
          if ((e.data as { source?: string; event?: string })?.source === "planet-hunters" &&
            (e.data as { event?: string }).event === "app_ready") {
            clearTimeout(t);
            window.removeEventListener("message", h);
            resolve();
          }
        });
      }),
    GAME_TIMEOUT
  );

  // Navigate the game to the mining scene via postMessage
  const frame = page.frameLocator("#game-frame");
  await page.waitForTimeout(2000);
  await save(page, "game-initial-state");

  // Try to trigger navigation to mining scene via shell message
  await page.evaluate(() => {
    const frame = document.querySelector("#game-frame") as HTMLIFrameElement;
    if (frame?.contentWindow) {
      frame.contentWindow.postMessage(
        { source: "shell", event: "navigate_to_mining", payload: {} },
        "*"
      );
    }
  });
  await page.waitForTimeout(3000);
  await save(page, "game-mining-header");
});
