const { expect, test } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const screenshotDir = path.join(process.cwd(), "test-results", "visual-screenshots");

test.beforeAll(() => {
  fs.mkdirSync(screenshotDir, { recursive: true });
});

test.beforeEach(async ({ page }, testInfo) => {
  const localFailures = [];
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failureText = request.failure()?.errorText || "failed";
    if (/\/game\/index\.(pck|wasm)$/.test(url) && failureText === "net::ERR_ABORTED") {
      return;
    }
    if (url.startsWith(testInfo.project.use.baseURL || "http://127.0.0.1")) {
      localFailures.push(`${request.method()} ${url}: ${failureText}`);
    }
  });
  page.on("pageerror", (error) => {
    localFailures.push(`pageerror: ${error.message}`);
  });
  page.__localFailures = localFailures;
});

test.afterEach(async ({ page }) => {
  expect(page.__localFailures || []).toEqual([]);
});

function sampledColorCount(buffer) {
  const png = PNG.sync.read(buffer);
  const colors = new Set();
  const stepX = Math.max(1, Math.floor(png.width / 80));
  const stepY = Math.max(1, Math.floor(png.height / 80));
  for (let y = 0; y < png.height; y += stepY) {
    for (let x = 0; x < png.width; x += stepX) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx] >> 4;
      const g = png.data[idx + 1] >> 4;
      const b = png.data[idx + 2] >> 4;
      colors.add(`${r}:${g}:${b}`);
    }
  }
  return colors.size;
}

function sampledPixelDelta(beforeBuffer, afterBuffer) {
  const before = PNG.sync.read(beforeBuffer);
  const after = PNG.sync.read(afterBuffer);
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);

  let changed = 0;
  let sampled = 0;
  const stepX = Math.max(1, Math.floor(before.width / 100));
  const stepY = Math.max(1, Math.floor(before.height / 100));
  for (let y = 0; y < before.height; y += stepY) {
    for (let x = 0; x < before.width; x += stepX) {
      const idx = (before.width * y + x) << 2;
      const delta =
        Math.abs(before.data[idx] - after.data[idx]) +
        Math.abs(before.data[idx + 1] - after.data[idx + 1]) +
        Math.abs(before.data[idx + 2] - after.data[idx + 2]);
      if (delta > 24) {
        changed += 1;
      }
      sampled += 1;
    }
  }
  return changed / sampled;
}

async function waitForGameCanvas(page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const gameFrame = page.locator("#game-frame");
  await expect(gameFrame).toBeVisible();
  await expect(page.frameLocator("#game-frame").getByText(/WebGL2/i)).toHaveCount(0);
  await expect(page.frameLocator("#game-frame").locator("canvas")).toBeVisible();
  await page.waitForTimeout(1000);

  return gameFrame;
}

function firstTutorialCtaPoint(viewport) {
  if (viewport.width <= 500) {
    return { x: Math.round(viewport.width * 0.78), y: 225 };
  }
  return { x: viewport.width - 205, y: 416 };
}

test("web shell opens directly into the game frame", async ({ page }, testInfo) => {
  const gameFrame = await waitForGameCanvas(page);
  await expect(page.getByText("Play Now")).toHaveCount(0);
  await expect(page.getByText(/rotate your device/i)).toHaveCount(0);
  await expect(page.getByText(/open fullscreen/i)).toHaveCount(0);

  const box = await gameFrame.boundingBox();
  expect(box, "game frame should have layout dimensions").not.toBeNull();
  expect(box.width).toBeGreaterThan(300);
  expect(box.height).toBeGreaterThan(500);

  const screenshot = await page.screenshot({
    path: path.join(screenshotDir, `${testInfo.project.name}-shell.png`),
    fullPage: true,
  });
  expect(sampledColorCount(screenshot), "rendered page should have varied pixels").toBeGreaterThan(24);
});

test("first tutorial CTA advances into build mode", async ({ page }, testInfo) => {
  await waitForGameCanvas(page);

  const before = await page.screenshot({
    path: path.join(screenshotDir, `${testInfo.project.name}-before-build-cta.png`),
    fullPage: true,
  });

  await page.mouse.click(...Object.values(firstTutorialCtaPoint(page.viewportSize())));
  await page.waitForTimeout(1200);

  const after = await page.screenshot({
    path: path.join(screenshotDir, `${testInfo.project.name}-after-build-cta.png`),
    fullPage: true,
  });

  expect(sampledPixelDelta(before, after), "BUILD tutorial CTA should visibly change the game state").toBeGreaterThan(0.05);
});
