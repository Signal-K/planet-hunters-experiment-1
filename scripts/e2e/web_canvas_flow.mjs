import { chromium } from "playwright";
import fs from "node:fs/promises";
import pngjs from "pngjs";

const { PNG } = pngjs;

const outputDir = process.env.E2E_OUTPUT_DIR || "/output";
const url = process.env.WEB_E2E_URL || "http://127.0.0.1:8080/index.html";

const screenshots = [];
const consoleMessages = [];

function badConsoleLines() {
  return consoleMessages.filter(line =>
    /Parse Error|Compile Error|SCRIPT ERROR|Failed to load script|Preload file .* does not exist|pageerror/i.test(line)
  );
}

async function writeScreenshot(page, name) {
  const file = `${outputDir}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  screenshots.push(`${name}.png`);
  return file;
}

async function clickCanvas(page, xRatio, yRatio, label) {
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error(`Canvas not ready before ${label}`);
  }
  await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
  await page.waitForTimeout(900);
  return writeScreenshot(page, label);
}

function averageRegionBrightness(png, region) {
  const x0 = Math.max(0, Math.floor(region.x * png.width));
  const y0 = Math.max(0, Math.floor(region.y * png.height));
  const x1 = Math.min(png.width, Math.floor((region.x + region.w) * png.width));
  const y1 = Math.min(png.height, Math.floor((region.y + region.h) * png.height));
  let total = 0;
  let count = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const idx = (png.width * y + x) * 4;
      total += (png.data[idx] + png.data[idx + 1] + png.data[idx + 2]) / 3;
      count += 1;
    }
  }
  return total / Math.max(count, 1);
}

async function assertNotWhiteMap(file, label) {
  const bytes = await fs.readFile(file);
  const png = PNG.sync.read(bytes);
  const brightness = averageRegionBrightness(png, { x: 0.18, y: 0.16, w: 0.64, h: 0.56 });
  if (brightness > 205) {
    throw new Error(`${label} looks blown out/white; average brightness ${brightness.toFixed(1)}`);
  }
  return brightness;
}

async function waitForGodotCanvas(page) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(4500);
  await writeScreenshot(page, "00-build-select-structure");
}

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--enable-webgl2"
  ]
});

const page = await browser.newPage({
  viewport: { width: 540, height: 960 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true
});

page.on("console", msg => {
  consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
});
page.on("pageerror", err => {
  consoleMessages.push(`[pageerror] ${err.message}`);
});

let solarBrightness = null;
let galaxyBrightness = null;

try {
  await waitForGodotCanvas(page);

  await clickCanvas(page, 0.50, 0.84, "01-placement-screen");
  await clickCanvas(page, 0.50, 0.84, "02-earth-base-with-placed-launchpad");

  await clickCanvas(page, 0.38, 0.95, "03-mission-board");
  await clickCanvas(page, 0.83, 0.25, "04-solar-target-map");
  solarBrightness = await assertNotWhiteMap(`${outputDir}/04-solar-target-map.png`, "Solar system map");

  await clickCanvas(page, 0.27, 0.47, "05-rocket-fabrication");
  await clickCanvas(page, 0.50, 0.94, "06-transit");
  await clickCanvas(page, 0.50, 0.62, "07-mining");
  await clickCanvas(page, 0.22, 0.30, "08-mined-ore");
  await clickCanvas(page, 0.50, 0.94, "09-debrief");
  await clickCanvas(page, 0.50, 0.94, "10-returned-base");

  await clickCanvas(page, 0.63, 0.95, "11-galaxy-map");
  galaxyBrightness = await assertNotWhiteMap(`${outputDir}/11-galaxy-map.png`, "Galaxy map");

  const badConsole = badConsoleLines();
  await fs.writeFile(`${outputDir}/browser-console.log`, consoleMessages.join("\n"));
  await fs.writeFile(`${outputDir}/e2e-report.json`, JSON.stringify({
    status: badConsole.length === 0 ? "passed" : "failed",
    url,
    screenshots,
    solarBrightness,
    galaxyBrightness,
    consoleMessageCount: consoleMessages.length
  }, null, 2));
  if (badConsole.length > 0) {
    throw new Error(`Browser console contained Godot errors:\n${badConsole.join("\n")}`);
  }
} finally {
  await browser.close();
}
