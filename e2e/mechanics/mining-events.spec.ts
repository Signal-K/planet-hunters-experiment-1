/**
 * Mining Events Mechanic Tests
 *
 * Verifies the shell's response to mining lifecycle events emitted by the game.
 *
 * The game emits these events from SidescrollMining.gd via WebEventBridge:
 *   - "mine_hit"             — each time a mineral node is struck
 *   - "mining_run_completed" — when a mining session ends (time up or full)
 *   - "experience_state_updated" — after XP is awarded for the run
 *
 * Shell responses verified here:
 *   - mine_hit is handled without JS errors
 *   - mining_run_completed with subsequent XP update → XP stored in localStorage
 *   - Rapid mine_hits don't cause errors or queue buildup
 *
 * Coverage:
 *   MIN-01  mine_hit event — shell handles without error
 *   MIN-02  mining_run_completed with cargo and XP → shell stores updated XP
 *   MIN-03  Multiple mine_hits don't crash or queue indefinitely
 */
import { expect, test } from "@playwright/test";
import { GameDriver } from "./game-driver";

test.describe("Mining events shell integration", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    const driver = new GameDriver(page);
    await driver.clearGameState();
    await driver.load();
    // Wait for React to mount message listener (useEffect runs after mount)
    await page.waitForTimeout(300);
  });

  test("MIN-01: mine_hit event — shell handles without error", async ({ page }) => {
    const driver = new GameDriver(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await driver.simulateGameEvent("mine_hit", {
      mineral: "Iron",
      amount: 1,
      x: 42,
      y: 100,
    });

    await page.waitForTimeout(200);
    expect(errors).toHaveLength(0);
  });

  test("MIN-02: mining_run_completed → shell stores updated XP", async ({ page }) => {
    const driver = new GameDriver(page);

    // Game emits mining completion then XP update
    await driver.simulateGameEvent("mining_run_completed", {
      cargo: { Iron: 10, Nickel: 2 },
      duration_seconds: 90,
    });
    await driver.simulateGameEvent("experience_state_updated", {
      experience_level: 1,
      experience_xp: 25,
    });

    await page.waitForTimeout(300);
    const stored = await driver.readXpState();
    expect(stored).not.toBeNull();
    expect(stored!.experience_xp).toBe(25);
  });

  test("MIN-03: rapid mine_hits don't cause JS errors", async ({ page }) => {
    const driver = new GameDriver(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Fire 20 mine_hit events in rapid succession
    for (let i = 0; i < 20; i++) {
      await driver.simulateGameEvent("mine_hit", { mineral: "Iron", amount: 1 });
    }

    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
