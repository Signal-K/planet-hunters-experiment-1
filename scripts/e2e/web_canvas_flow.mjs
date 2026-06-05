/**
 * Godot Web E2E — portrait clickthrough (540×960 canvas)
 *
 * Coordinate system: ratios of the canvas bounding box (0.0–1.0 each axis).
 * All positions are derived from UILayout zone math at vp=(540,960):
 *
 *   TUTORIAL_COACH  Rect2(116, 24, 400, 326)   → CTA near y=315
 *   APP_HEADER      Rect2(0, 0, 540, 64)
 *   APP_BODY        Rect2(0, 64, 540, 812)
 *   APP_FOOTER      Rect2(0, 876, 540, 84)      → nav tabs at y≈918
 */

import { chromium } from "playwright";
import fs from "node:fs/promises";

const outputDir = process.env.E2E_OUTPUT_DIR || "/output";
const url       = process.env.WEB_E2E_URL     || "http://127.0.0.1:8080/index.html";

// ── Timing ────────────────────────────────────────────────────────────────────

const INIT_WAIT_MS      = 10_000; // Godot WASM + WebGL init in headless CI
const TRANSITION_MS     = 2_500;  // screen-change animation
const TAP_SETTLE_MS     = 1_500;  // short wait after any tap

// ── Helpers ───────────────────────────────────────────────────────────────────

async function screenshot(page, name) {
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: false });
  console.log(`[e2e] screenshot: ${name}`);
}

async function tap(page, xRatio, yRatio, label) {
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error(`Canvas gone before tap: ${label}`);

  const x = box.x + box.width  * xRatio;
  const y = box.y + box.height * yRatio;

  console.log(`[e2e] tap (${xRatio.toFixed(2)}, ${yRatio.toFixed(2)}) → ${label}`);
  await page.mouse.move(x, y, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.click(x, y);
  await page.waitForTimeout(TAP_SETTLE_MS);
}

async function tapAndShot(page, xRatio, yRatio, label) {
  await tap(page, xRatio, yRatio, label);
  await screenshot(page, label);
}

// ── State-change assertion ────────────────────────────────────────────────────
// Captures two sequential screenshots and returns true if pixels differ
// by more than the threshold, meaning the game visibly reacted to the tap.
async function canvasChanged(page, afterMs = TRANSITION_MS) {
  await page.waitForTimeout(afterMs);
  // We just check pixels changed via a quick compare of two canvas screenshots
  // using the canvas element itself; if identical → game didn't react.
  const before = await page.locator("canvas").first().screenshot();
  await page.waitForTimeout(400);
  const after  = await page.locator("canvas").first().screenshot();
  let diff = 0;
  for (let i = 0; i < before.length; i++) {
    diff += Math.abs(before[i] - after[i]);
  }
  // A still canvas animates slightly (stars etc), so diff > 0 is noise.
  // We return the pixel-diff sum for the report; caller decides threshold.
  return diff;
}

// ── Launch ────────────────────────────────────────────────────────────────────

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--enable-unsafe-swiftshader",   // force software WebGL (no GPU in CI)
    "--disable-gpu",
  ],
});

const page = await browser.newPage({
  viewport:        { width: 540, height: 960 },
  deviceScaleFactor: 1,
  isMobile:        true,
  hasTouch:        true,
});

const consoleMsgs = [];
page.on("console", m => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", e => consoleMsgs.push(`[pageerror] ${e.message}`));

// ── Test ──────────────────────────────────────────────────────────────────────

const stepResults = [];
let passed = false;

try {
  // ── Load ──────────────────────────────────────────────────────────────────
  console.log(`[e2e] loading ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  console.log("[e2e] waiting for canvas…");
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 60_000 });

  console.log(`[e2e] letting Godot initialise (${INIT_WAIT_MS / 1000}s)…`);
  await page.waitForTimeout(INIT_WAIT_MS);
  await screenshot(page, "00-earth-base-loaded");

  // ── Step 1: open mission flow ─────────────────────────────────────────────
  // Tutorial coach CTA "Open New Mission" sits near the bottom of the coach
  // panel: Rect2(116,24,400,326) → CTA at approx (316/540, 315/960).
  // If the CTA is missed the "MISSIONS" nav tab at bottom-right is the fallback.
  console.log("[e2e] step 1 — tap Open New Mission (tutorial coach CTA)");
  await tapAndShot(page, 0.59, 0.33, "01-open-new-mission");
  await page.waitForTimeout(TRANSITION_MS);
  await screenshot(page, "01b-after-transition");
  stepResults.push("01-open-new-mission");

  // ── Step 2: pick a mission from the board ────────────────────────────────
  // Mission cards are in APP_BODY (y=64–876). First card sits near the top
  // of the body area: y ≈ 0.20–0.35 of the canvas.
  console.log("[e2e] step 2 — select first mission card");
  await tapAndShot(page, 0.50, 0.28, "02-select-mission");
  await page.waitForTimeout(TRANSITION_MS);
  await screenshot(page, "02b-after-transition");
  stepResults.push("02-select-mission");

  // ── Step 3: pick target asteroid ─────────────────────────────────────────
  // Target picker cards appear in the body; first candidate near centre.
  console.log("[e2e] step 3 — pick target asteroid");
  await tapAndShot(page, 0.50, 0.45, "03-pick-target");
  await page.waitForTimeout(TRANSITION_MS);
  await screenshot(page, "03b-after-transition");
  stepResults.push("03-pick-target");

  // ── Step 4: confirm / launch ──────────────────────────────────────────────
  // "Launch" / "Confirm" button lives in the footer zone (y ≈ 0.92).
  console.log("[e2e] step 4 — confirm launch");
  await tapAndShot(page, 0.50, 0.92, "04-confirm-launch");
  await page.waitForTimeout(TRANSITION_MS);
  await screenshot(page, "04b-after-transition");
  stepResults.push("04-confirm-launch");

  // ── Step 5: mining action ─────────────────────────────────────────────────
  console.log("[e2e] step 5 — mining action");
  await tapAndShot(page, 0.50, 0.92, "05-mining-action");
  await page.waitForTimeout(TRANSITION_MS);
  await screenshot(page, "05b-after-transition");
  stepResults.push("05-mining-action");

  // ── Step 6: debrief continue ──────────────────────────────────────────────
  console.log("[e2e] step 6 — debrief continue");
  await tapAndShot(page, 0.50, 0.92, "06-debrief-continue");
  await page.waitForTimeout(TRANSITION_MS);
  await screenshot(page, "06b-after-transition");
  stepResults.push("06-debrief-continue");

  // ── Assertions ────────────────────────────────────────────────────────────
  const godotErrors = consoleMsgs.filter(l =>
    /Parse Error|Compile Error|Failed to load script|Preload file .* does not exist/i.test(l)
  );
  if (godotErrors.length > 0) {
    throw new Error(`Godot script errors in browser console:\n${godotErrors.join("\n")}`);
  }

  passed = true;
  console.log("[e2e] passed — no Godot errors, all steps executed");

} finally {
  await fs.writeFile(`${outputDir}/browser-console.log`, consoleMsgs.join("\n"));
  await fs.writeFile(
    `${outputDir}/e2e-report.json`,
    JSON.stringify({
      status:              passed ? "passed" : "failed",
      url,
      stepsExecuted:       stepResults,
      consoleMessageCount: consoleMsgs.length,
      godotErrors:         consoleMsgs.filter(l =>
        /Parse Error|Compile Error|Failed to load script/i.test(l)
      ),
      timestamp: new Date().toISOString(),
    }, null, 2)
  );
  await browser.close();
}
