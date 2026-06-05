import { chromium } from "playwright";
import fs from "node:fs/promises";

const outputDir = process.env.E2E_OUTPUT_DIR || "/output";
const url = process.env.WEB_E2E_URL || "http://127.0.0.1:8080/index.html";

// Simulate realistic user pacing between interactions
const THINK_TIME_MS = 1200;
const ANIMATION_WAIT_MS = 800;

async function screenshot(page, name) {
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: true });
  console.log(`[e2e] screenshot: ${name}`);
}

async function userClick(page, xRatio, yRatio, stepName) {
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error(`Canvas not found when trying to interact with: ${stepName}`);
  }
  const x = box.x + box.width * xRatio;
  const y = box.y + box.height * yRatio;
  console.log(`[e2e] user click at (${xRatio.toFixed(2)}, ${yRatio.toFixed(2)}) → ${stepName}`);
  await page.mouse.move(x, y, { steps: 5 });
  await page.waitForTimeout(200);
  await page.mouse.click(x, y);
  await page.waitForTimeout(ANIMATION_WAIT_MS);
  await screenshot(page, stepName);
}

async function waitForGameCanvas(page) {
  console.log(`[e2e] navigating to ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  console.log("[e2e] waiting for Godot canvas to appear");
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 60000 });

  // Let the game engine fully initialise before interacting
  console.log("[e2e] letting game initialise (5s)");
  await page.waitForTimeout(5000);

  await screenshot(page, "00-game-loaded");
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

const page = await browser.newPage({
  viewport: { width: 540, height: 960 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true
});

const consoleMessages = [];
page.on("console", msg => {
  const text = msg.text();
  consoleMessages.push(`[${msg.type()}] ${text}`);
});
page.on("pageerror", err => {
  consoleMessages.push(`[pageerror] ${err.message}`);
});

const steps = [
  // [xRatio, yRatio, stepName]
  [0.50, 0.70, "01-tap-mission-board"],
  [0.50, 0.12, "02-tap-targets"],
  [0.50, 0.11, "03-tap-fabrication"],
  [0.50, 0.965, "04-tap-start-mining"],
  [0.50, 0.965, "05-tap-finish-mining"],
  [0.50, 0.965, "06-tap-debrief-continue"],
];

let passed = false;
try {
  await waitForGameCanvas(page);

  for (const [xRatio, yRatio, stepName] of steps) {
    await page.waitForTimeout(THINK_TIME_MS);
    await userClick(page, xRatio, yRatio, stepName);
  }

  const godotErrors = consoleMessages.filter(line =>
    /Parse Error|Compile Error|Failed to load script|Preload file .* does not exist/i.test(line)
  );

  if (godotErrors.length > 0) {
    throw new Error(`Godot script errors detected in browser console:\n${godotErrors.join("\n")}`);
  }

  passed = true;
  console.log("[e2e] all steps passed");
} finally {
  await fs.writeFile(`${outputDir}/browser-console.log`, consoleMessages.join("\n"));
  await fs.writeFile(
    `${outputDir}/e2e-report.json`,
    JSON.stringify(
      {
        status: passed ? "passed" : "failed",
        url,
        steps: steps.map(([, , name]) => name),
        consoleMessageCount: consoleMessages.length,
        timestamp: new Date().toISOString()
      },
      null,
      2
    )
  );
  await browser.close();
}
