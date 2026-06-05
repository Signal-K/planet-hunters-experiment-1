import { chromium } from "playwright";
import fs from "node:fs/promises";

const outputDir = process.env.E2E_OUTPUT_DIR || "/output";
const url = process.env.WEB_E2E_URL || "http://127.0.0.1:8080/index.html";

async function screenshot(page, name) {
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: true });
}

async function clickCanvas(page, xRatio, yRatio, label) {
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error(`Canvas not ready before ${label}`);
  }
  await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
  await page.waitForTimeout(900);
  await screenshot(page, label);
}

async function waitForCanvas(page) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(4000);
  await screenshot(page, "00-earth-base");
}

const browser = await chromium.launch({ headless: true });
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

try {
  await waitForCanvas(page);
  await clickCanvas(page, 0.50, 0.70, "01-mission-board");
  await clickCanvas(page, 0.50, 0.12, "02-targets");
  await clickCanvas(page, 0.50, 0.11, "03-fab");
  await clickCanvas(page, 0.50, 0.965, "04-mining");
  await clickCanvas(page, 0.50, 0.965, "05-debrief");
  await clickCanvas(page, 0.50, 0.965, "06-returned-base");

  const badConsole = consoleMessages.filter(line =>
    /Parse Error|Compile Error|Failed to load script|Preload file .* does not exist/i.test(line)
  );
  await fs.writeFile(`${outputDir}/browser-console.log`, consoleMessages.join("\n"));
  await fs.writeFile(`${outputDir}/e2e-report.json`, JSON.stringify({
    status: badConsole.length === 0 ? "passed" : "failed",
    url,
    screenshots: [
      "00-earth-base.png",
      "01-mission-board.png",
      "02-targets.png",
      "03-fab.png",
      "04-mining.png",
      "05-debrief.png",
      "06-returned-base.png"
    ],
    consoleMessageCount: consoleMessages.length
  }, null, 2));
  if (badConsole.length > 0) {
    throw new Error(`Browser console contained Godot errors:\n${badConsole.join("\n")}`);
  }
} finally {
  await browser.close();
}
