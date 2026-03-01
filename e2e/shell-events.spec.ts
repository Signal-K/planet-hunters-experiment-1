/**
 * Shell event handling — all postMessage scenarios from the Godot game iframe.
 *
 * Narrative paths covered:
 *   SP03  first_mission_completed  → survey overlay shown (first time)
 *   SP04  first_mission_completed  → survey NOT re-triggered when already shown
 *   SP05  mission_debrief_resolved → survey triggered if not yet shown
 *   SP06  feedback_requested       → feedback overlay shown
 *   SP07  XP level 1→2             → level-up banner with hint text
 *   SP08  XP level 2→3             → level-up banner with different hint
 *   SP09  XP same level            → no banner
 *   SP10  mine_hit                 → no JS error (vibrate no-op in headless)
 *   SP11  rocket_landed            → no JS error
 */
import { expect, test } from "@playwright/test";

/** Dispatch a planet-hunters game event into the shell. */
async function gameEvent(
  page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never,
  eventName: string,
  payload: Record<string, unknown> = {}
) {
  await (page as import("@playwright/test").Page).evaluate(
    ({ eventName, payload }: { eventName: string; payload: Record<string, unknown> }) => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { source: "planet-hunters", event: eventName, payload },
          origin: window.location.origin,
        })
      );
    },
    { eventName, payload }
  );
}

// Use a typed page helper to satisfy TS in the helper below.
async function dispatchGameEvent(
  page: import("@playwright/test").Page,
  eventName: string,
  payload: Record<string, unknown> = {}
) {
  await page.evaluate(
    ({ eventName, payload }: { eventName: string; payload: Record<string, unknown> }) => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { source: "planet-hunters", event: eventName, payload },
          origin: window.location.origin,
        })
      );
    },
    { eventName, payload }
  );
}

test.describe("Shell postMessage event handling", () => {
  test.beforeEach(async ({ page }) => {
    // Clear all persisted state before each test for isolation
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("planet_hunters_exit_survey_first_mission_v1");
      localStorage.removeItem("planet_hunters_xp_state_v1");
      localStorage.removeItem("planet_hunters_action_log_v1");
    });
  });

  // SP03 - first_mission_completed triggers survey overlay
  test("SP03: first_mission_completed shows survey overlay", async ({ page }) => {
    await page.waitForSelector("#game-frame");
    await dispatchGameEvent(page, "first_mission_completed", {
      mission_count: 1,
      action: "orbit_sale",
      badge: "miner",
    });
    await expect(page.locator(`#planet-hunters-survey-overlay`)).toBeVisible({
      timeout: 10_000,
    });
  });

  // SP04 - survey not shown a second time in same boot
  test("SP04: first_mission_completed does not re-trigger survey after it was shown", async ({
    page,
  }) => {
    await page.waitForSelector("#game-frame");
    // Mark survey as already shown via localStorage flag
    await page.evaluate(() => {
      localStorage.setItem(
        "planet_hunters_exit_survey_first_mission_v1",
        new Date().toISOString()
      );
    });
    await dispatchGameEvent(page, "first_mission_completed", { mission_count: 1 });
    // Survey should not appear — wait briefly and confirm absence
    await page.waitForTimeout(2_000);
    await expect(page.locator(`#planet-hunters-survey-overlay`)).not.toBeVisible();
  });

  // SP05 - mission_debrief_resolved also triggers survey (first time)
  test("SP05: mission_debrief_resolved triggers survey if not yet shown", async ({ page }) => {
    await page.waitForSelector("#game-frame");
    await dispatchGameEvent(page, "mission_debrief_resolved", {
      mission_count: 1,
      action: "earth_sale",
    });
    await expect(page.locator(`#planet-hunters-survey-overlay`)).toBeVisible({
      timeout: 10_000,
    });
  });

  // SP06 - feedback_requested shows feedback overlay
  test("SP06: feedback_requested shows feedback overlay", async ({ page }) => {
    await page.waitForSelector("#game-frame");
    await dispatchGameEvent(page, "feedback_requested", {});
    await expect(page.locator(`#planet-hunters-feedback-overlay`)).toBeVisible({
      timeout: 5_000,
    });
  });

  // SP07 - XP level 1→2 shows level-up banner
  test("SP07: XP level-up 1→2 shows celebration banner with hint", async ({ page }) => {
    await page.waitForSelector("#game-frame");
    // Ensure XP starts at level 1 (no prior state)
    await dispatchGameEvent(page, "xp_updated", { experience_level: 2, experience_xp: 150 });
    await expect(page.locator("text=Level 2 reached")).toBeVisible({ timeout: 3_000 });
    await expect(page.locator("text=Longer range unlocked")).toBeVisible({ timeout: 500 });
    // Auto-dismisses after 4s
    await expect(page.locator("text=Level 2 reached")).not.toBeVisible({ timeout: 6_000 });
  });

  // SP08 - XP level 2→3 shows different hint
  test("SP08: XP level-up 2→3 shows correct hint for level 3", async ({ page }) => {
    await page.waitForSelector("#game-frame");
    // Prime level 2 first
    await page.evaluate(() => {
      localStorage.setItem(
        "planet_hunters_xp_state_v1",
        JSON.stringify({ experience_level: 2, experience_xp: 150, updated_at: new Date().toISOString() })
      );
    });
    await dispatchGameEvent(page, "xp_updated", { experience_level: 3, experience_xp: 300 });
    await expect(page.locator("text=Level 3 reached")).toBeVisible({ timeout: 3_000 });
    await expect(page.locator("text=Faster mining speed unlocked")).toBeVisible({ timeout: 500 });
  });

  // SP09 - Same level XP update → no banner
  test("SP09: XP event at same level does not show banner", async ({ page }) => {
    await page.waitForSelector("#game-frame");
    await page.evaluate(() => {
      localStorage.setItem(
        "planet_hunters_xp_state_v1",
        JSON.stringify({ experience_level: 2, experience_xp: 150, updated_at: new Date().toISOString() })
      );
    });
    await dispatchGameEvent(page, "xp_updated", { experience_level: 2, experience_xp: 200 });
    await page.waitForTimeout(500);
    await expect(page.locator("text=Level 2 reached")).not.toBeVisible();
  });

  // SP10 - mine_hit fires without JS errors
  test("SP10: mine_hit event fires without throwing", async ({ page }) => {
    await page.waitForSelector("#game-frame");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await dispatchGameEvent(page, "mine_hit", {});
    await page.waitForTimeout(200);
    expect(errors).toHaveLength(0);
  });

  // SP11 - rocket_landed fires without JS errors
  test("SP11: rocket_landed event fires without throwing", async ({ page }) => {
    await page.waitForSelector("#game-frame");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await dispatchGameEvent(page, "rocket_landed", {});
    await page.waitForTimeout(200);
    expect(errors).toHaveLength(0);
  });
});
