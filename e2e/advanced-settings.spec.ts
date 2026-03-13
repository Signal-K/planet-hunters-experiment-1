import { test, expect } from "@playwright/test";

test.describe("Advanced Settings & Mission Jumps", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Navigate to Menu if not already there
    // (Assuming the shell starts in Game or Menu based on config)
  });

  test("can access advanced settings and trigger instant mining", async ({ page }) => {
    // 1. Open Menu
    await page.click('text=Exit to Menu'); // If in game
    
    // 2. Show advanced settings
    const advancedToggle = page.locator('text=Show Advanced Settings');
    await advancedToggle.click();
    
    // 3. Verify buttons exist
    await expect(page.locator('text=🚀 Instant Mining (Auto-Setup)')).toBeVisible();
    await expect(page.locator('text=📈 Skip to Level 3 (Unlock Missions)')).toBeVisible();
    
    // 4. Trigger Instant Mining
    await page.click('text=🚀 Instant Mining (Auto-Setup)');
    
    // 5. Verify navigation to Game
    // (GameScreen is just a View in RN, but we can check for the GodotHost)
    // In the web shell, Godot is in an iframe with id 'game-frame'
    const gameFrame = page.locator('#game-frame');
    await expect(gameFrame).toBeVisible();
  });

  test("can skip to level 3", async ({ page }) => {
    await page.click('text=Exit to Menu');
    await page.click('text=Show Advanced Settings');
    
    // Mock the alert
    page.on('dialog', dialog => dialog.accept());
    
    await page.click('text=📈 Skip to Level 3 (Unlock Missions)');
    
    // Check if state updated (Francs/XP in MenuScreen)
    await expect(page.locator('text=Lvl 3')).toBeVisible();
    await expect(page.locator('text=250K F')).toBeVisible();
  });
});
