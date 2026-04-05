/**
 * Narrative path integration — full shell-side event sequences matching every
 * distinct player journey through the game.
 *
 * These tests simulate what the Godot game emits via postMessage for each path
 * and assert that the React shell responds correctly end-to-end.
 *
 * Path map (aligns with TutorialCatalog mission stages):
 *
 *   NP01  Mission 1 full completion → survey triggered after debrief
 *   NP02  Mission 1 → Mission 2 XP progression → level-up at each threshold
 *   NP03  Mission 1 → skip survey (already seen) → no duplicate overlay
 *   NP04  Mission 5 contractor path → complete_contractor_mission fires no errors
 *   NP05  Mission 5 survey path → mission_debrief_resolved fires no errors
 *   NP06  Multiple debrief action types (orbit_sale, earth_sale, keep, scrap)
 *   NP07  Feedback mid-session then continues normally
 *   NP08  XP progression through all 5 levels with correct banner text each time
 *   NP09  Progress cookie updated at each mission checkpoint
 */
import { expect, test } from "@playwright/test";

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

async function saveProgress(page: import("@playwright/test").Page, marker: string) {
  await page.evaluate((marker: string) => {
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "PH_SAVE_PROGRESS", marker } })
    );
  }, marker);
}

async function clearSurveyFlag(page: import("@playwright/test").Page) {
  await page.evaluate(() =>
    localStorage.removeItem("planet_hunters_exit_survey_first_mission_v1")
  );
}

async function setXpLevel(page: import("@playwright/test").Page, level: number, xp: number) {
  await page.evaluate(
    ({ level, xp }: { level: number; xp: number }) => {
      localStorage.setItem(
        "planet_hunters_xp_state_v1",
        JSON.stringify({ experience_level: level, experience_xp: xp, updated_at: new Date().toISOString() })
      );
    },
    { level, xp }
  );
}

test.describe("Narrative paths", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("planet_hunters_exit_survey_first_mission_v1");
      localStorage.removeItem("planet_hunters_xp_state_v1");
      localStorage.removeItem("planet_hunters_action_log_v1");
    });
    await page.waitForSelector("#game-frame");
    // Wait for the game's own ready signal before we start simulating events
    // This ensures no boot-time race condition overwrites our simulated state.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Timed out waiting for app_ready")), 30000);
          window.addEventListener("message", (e) => {
            if (e.data?.source === "planet-hunters" && e.data?.event === "app_ready") {
              clearTimeout(timer);
              resolve();
            }
          });
        })
    );
  });

  // NP01 — Mission 1 full completion path
  test("NP01: Mission 1 full path — launch → mine → return → debrief → survey shown", async ({
    page,
  }) => {
    // Simulate the full M1 postMessage sequence the Godot game emits
    await saveProgress(page, "launch_outbound");
    await saveProgress(page, "arrived_at_mining_site");
    await dispatchGameEvent(page, "xp_updated", { experience_level: 1, experience_xp: 50 });
    await saveProgress(page, "returned_home");
    await dispatchGameEvent(page, "first_mission_completed", {
      mission_count: 1,
      action: "orbit_sale",
      badge: "miner",
    });
    await expect(page.locator("#planet-hunters-survey-overlay")).toBeVisible({ timeout: 10_000 });
  });

  // NP02 — Missions 1 → 2 XP progression
  test("NP02: M1→M2 XP progression shows level-up banner at level 2", async ({ page }) => {
    // After M1 debrief, XP reaches level 2
    await dispatchGameEvent(page, "xp_updated", { experience_level: 2, experience_xp: 100 });
    await expect(page.locator("text=Level 2 reached")).toBeVisible({ timeout: 5_000 });
    // Dismiss the banner, move to M2
    await expect(page.locator("text=Level 2 reached")).not.toBeVisible({ timeout: 12_000 });
    await saveProgress(page, "m2_launch_outbound");
    // No new banner until level increases
    await dispatchGameEvent(page, "xp_updated", { experience_level: 2, experience_xp: 200 });
    await page.waitForTimeout(500);
    await expect(page.locator("text=Level 2 reached")).not.toBeVisible();
  });

  // NP03 — Survey already seen, second mission_debrief_resolved doesn't re-open it
  test("NP03: Second first_mission_completed call does not re-show survey", async ({ page }) => {
    await dispatchGameEvent(page, "first_mission_completed", {
      mission_count: 1,
      action: "earth_sale",
    });
    await expect(page.locator("#planet-hunters-survey-overlay")).toBeVisible({ timeout: 10_000 });
    // Close the survey
    await page.evaluate(() => {
      const overlay = document.getElementById("planet-hunters-survey-overlay");
      if (overlay) overlay.style.display = "none";
    });
    // Second trigger — should not re-open (flag now set in localStorage)
    await dispatchGameEvent(page, "first_mission_completed", { mission_count: 1 });
    await page.waitForTimeout(2_000);
    const overlay = page.locator("#planet-hunters-survey-overlay");
    const display = await overlay.evaluate((el: Element) => (el as HTMLElement).style.display);
    expect(display).toBe("none");
  });

  // NP04 — Mission 5 contractor path: complete_contractor_mission fires no errors
  test("NP04: M5 contractor path — accept_contractor then complete fires no errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await dispatchGameEvent(page, "contractor_accepted", { contractor_id: "survey_corp" });
    await saveProgress(page, "m5_launch_contractor");
    await dispatchGameEvent(page, "mission_debrief_resolved", {
      mission_count: 5,
      action: "complete_contractor_mission",
    });
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  // NP05 — Mission 5 survey route: no contractor, just debrief
  test("NP05: M5 survey path — no contractor, mission_debrief_resolved fires survey", async ({
    page,
  }) => {
    await setXpLevel(page, 1, 0); // Ensure survey hasn't been shown
    await dispatchGameEvent(page, "mission_debrief_resolved", {
      mission_count: 5,
      action: "earth_sale",
    });
    await expect(page.locator("#planet-hunters-survey-overlay")).toBeVisible({ timeout: 10_000 });
  });

  // NP06 — Multiple debrief action types all accepted without errors
  test("NP06: All debrief action types fire without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const actions = ["orbit_sale", "earth_sale", "keep", "scrap", "salvage", "leave", "archive"];
    // Survey will fire on the first one; mark as seen after first
    await dispatchGameEvent(page, "mission_debrief_resolved", {
      mission_count: 1,
      action: actions[0],
    });
    await page.evaluate(() =>
      localStorage.setItem(
        "planet_hunters_exit_survey_first_mission_v1",
        new Date().toISOString()
      )
    );
    for (const action of actions.slice(1)) {
      await dispatchGameEvent(page, "mission_debrief_resolved", {
        mission_count: 2,
        action,
      });
    }
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  // NP07 — Feedback mid-session then play continues normally
  test("NP07: feedback_requested mid-session, game continues after", async ({ page }) => {
    await saveProgress(page, "m2_launch_outbound");
    await dispatchGameEvent(page, "feedback_requested", {});
    await expect(page.locator("#planet-hunters-feedback-overlay")).toBeVisible({ timeout: 5_000 });
    // Game resumes: another progress save goes through without error
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await saveProgress(page, "m2_returned_home");
    await page.waitForTimeout(300);
    expect(errors).toHaveLength(0);
  });

  // NP08 — All 5 XP level-up banners show correct hints
  test("NP08: XP level-up banner text is correct for levels 2, 3, 4, 5", async ({ page }) => {
    const levels: Array<{ level: number; expected: string }> = [
      { level: 2, expected: "Longer range unlocked" },
      { level: 3, expected: "Faster mining speed unlocked" },
      { level: 4, expected: "Cargo capacity increased" },
      { level: 5, expected: "Advanced scanner unlocked" },
    ];
    for (const { level, expected } of levels) {
      await setXpLevel(page, level - 1, 100);
      await dispatchGameEvent(page, "xp_updated", {
        experience_level: level,
        experience_xp: level * 100,
      });
      await expect(page.locator(`text=${expected}`)).toBeVisible({ timeout: 5_000 });
      // Wait for auto-dismiss before next level
      await expect(page.locator(`text=Level ${level} reached`)).not.toBeVisible({
        timeout: 12_000,
      });
    }
  });

  // NP09 — Progress cookie updates at each mission checkpoint
  test("NP09: Progress cookie marker updates correctly at each mission checkpoint", async ({
    page,
  }) => {
    const checkpoints = [
      "m1_launch",
      "m1_arrived_mining",
      "m1_returned",
      "m2_launch",
      "m3_scan_complete",
      "m4_planet_launch",
      "m5_contractor_launch",
    ];
    for (const marker of checkpoints) {
      await saveProgress(page, marker);
      await page.waitForFunction((m: string) => {
        const match = document.cookie.match(/planet_hunters_progress_v1=([^;]+)/);
        if (!match) return false;
        try {
          return JSON.parse(decodeURIComponent(match[1])).marker === m;
        } catch {
          return false;
        }
      }, marker);
    }
  });
});
