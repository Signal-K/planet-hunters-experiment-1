/**
 * XP State Mechanic Tests
 *
 * Verifies that the shell correctly initialises from seeded XP state and
 * responds to XP events emitted by the game.
 *
 * ARCHITECTURE NOTE — Why no waitForGameReady():
 * Godot 4 WASM requires WebGL2. Headless Chrome on macOS does not expose
 * WebGL2 (SwiftShader covers OpenGL ES only). So the WASM never boots in
 * headless test runs on macOS. The shell is fully testable without the WASM:
 *   - State seeding via localStorage (read before React mounts)
 *   - Event handling via postMessage simulation (same-origin dispatch)
 * The waitForGameReady() helper in GameDriver is available for non-headless
 * or Linux CI environments where WebGL2 is available.
 *
 * Coverage:
 *   XP-01  Fresh start → shell localStorage contains no XP override (defaults to level 1)
 *   XP-02  Seeded level 3 → shell preserves seeded level in localStorage after load
 *   XP-03  experience_state_updated event → shell localStorage updated
 *   XP-04  Level-up event → shell shows level-up banner
 */
import { expect, test } from "@playwright/test";
import { GameDriver, XP_STATE_KEY } from "./game-driver";

test.describe("XP state loading from shell", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("XP-01: fresh start — shell localStorage has no XP state override", async ({ page }) => {
    const driver = new GameDriver(page);
    await driver.clearGameState();
    await driver.load();

    const stored = await driver.readXpState();
    // On a fresh start with no seeded state, the shell has nothing in localStorage yet
    expect(stored).toBeNull();
  });

  test("XP-02: seeded level 3 — shell preserves seeded level in localStorage", async ({ page }) => {
    const driver = new GameDriver(page);
    await driver.clearGameState();
    await driver.seedXpState({ experience_level: 3, experience_xp: 0 });
    await driver.load();

    // The seeded value is in localStorage before React mounts, and React reads it
    const stored = await driver.readXpState();
    expect(stored).not.toBeNull();
    expect(stored!.experience_level).toBe(3);
  });

  test("XP-03: experience_state_updated event updates shell localStorage", async ({ page }) => {
    const driver = new GameDriver(page);
    await driver.clearGameState();
    await driver.load();
    // Give React time to mount the message listener (useEffect)
    await page.waitForTimeout(300);

    await driver.simulateGameEvent("experience_state_updated", {
      experience_level: 2,
      experience_xp: 50,
    });

    await page.waitForTimeout(200);
    const stored = await driver.readXpState();
    expect(stored).not.toBeNull();
    expect(stored!.experience_level).toBe(2);
    expect(stored!.experience_xp).toBe(50);
  });

  test("XP-04: level-up event shows level-up banner in shell", async ({ page }) => {
    const driver = new GameDriver(page);
    await driver.clearGameState();
    await driver.load();
    await page.waitForTimeout(300);

    await driver.simulateGameEvent("experience_state_updated", {
      experience_level: 2,
      experience_xp: 0,
    });

    // Shell renders a level-up banner with text "Level 2 reached"
    await expect(page.locator("text=Level 2 reached")).toBeVisible({ timeout: 5_000 });
  });
});
