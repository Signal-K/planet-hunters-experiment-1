/**
 * Mission Completion Mechanic Tests
 *
 * Verifies the shell's response to the full mission debrief sequence.
 *
 * The game emits these events from MissionDebrief.gd and AppController:
 *   - "mission_debrief_resolved" — player finishes debrief (sell/scrap/keep)
 *   - "experience_state_updated" — XP after debrief
 *   - "contractor_mission_complete" — contractor payout resolved
 *
 * Coverage:
 *   MIS-01  mission_debrief_resolved → XP stored in localStorage
 *   MIS-02  mission_debrief_resolved → recorded in shell action log
 *   MIS-03  contractor_mission_complete → no shell JS errors
 *   MIS-04  Seeded level 3 + debrief XP event → shell stores correct level + XP
 */
import { expect, test } from "@playwright/test";
import { GameDriver, ACTION_LOG_KEY } from "./game-driver";

test.describe("Mission completion shell integration", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    const driver = new GameDriver(page);
    await driver.clearGameState();
    await driver.load();
  });

  test("MIS-01: mission_debrief_resolved \u2192 XP stored in localStorage", async ({ page }) => {
    const driver = new GameDriver(page);

    await driver.simulateGameEvent("mission_debrief_resolved", {
      rocket_id: "starterrocket1",
      target_id: "mission-1-training-target",
      action: "sell_earth",
      payout: 500_000_000,
      mission_stage: 1,
    });
    await driver.simulateGameEvent("experience_state_updated", {
      experience_level: 1,
      experience_xp: 10,
    });

    const stored = await driver.readXpState();
    expect(stored).not.toBeNull();
    expect(stored!.experience_xp).toBe(10);
  });

  test("MIS-02: mission_debrief_resolved \u2192 recorded in shell action log", async ({ page }) => {
    const driver = new GameDriver(page);

    await driver.simulateGameEvent("mission_debrief_resolved", {
      rocket_id: "starterrocket1",
      target_id: "mission-1-training-target",
      action: "sell_earth",
      payout: 500_000_000,
      mission_stage: 1,
    });

    const log = await page.evaluate((key: string) => {
      const raw = localStorage.getItem(key);
      try {
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }, ACTION_LOG_KEY);

    // Action log entries use { t, e, p } format (e = event name)
    const entries = Array.isArray(log) ? log : [];
    const found = (entries as Array<{ e?: string }>).some(
      (entry) => entry.e === "mission_debrief_resolved"
    );
    expect(found).toBe(true);
  });

  test("MIS-03: contractor_mission_complete \u2192 no shell JS errors", async ({ page }) => {
    const driver = new GameDriver(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await driver.simulateGameEvent("contractor_mission_complete", {
      contractor_id: "nova_vance",
      payout: 1_200_000_000,
      mission_stage: 2,
    });

    expect(errors).toHaveLength(0);
  });

  test("MIS-04: seeded level 3 + debrief XP event \u2192 shell stores correct state", async ({
    page,
  }) => {
    const driver = new GameDriver(page);
    // Seed state BEFORE load
    await driver.seedXpState({ experience_level: 3, experience_xp: 20 });
    // Load will wait for app_ready, ensuring game sees the seeded state
    await driver.load();

    // Game sends XP update after debrief
    await driver.simulateGameEvent("experience_state_updated", {
      experience_level: 3,
      experience_xp: 40,
    });

    const stored = await driver.readXpState();
    expect(stored!.experience_level).toBe(3);
    expect(stored!.experience_xp).toBe(40);
  });
});
