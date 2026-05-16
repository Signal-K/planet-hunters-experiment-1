#!/usr/bin/env node
/**
 * Landnám — Full user playthrough script
 * Launches Godot natively, screenshots + clicks through the game as a new user.
 * Run: node explore-game.mjs
 */

import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = path.join(__dirname, "game-exploration-screenshots");
const LOG_FILE = path.join(SHOTS_DIR, "_playthrough_log.md");
const SCENE_PATH = path.join(__dirname, "scene");
const GODOT = "/Applications/Dev/Godot4.5.app/Contents/MacOS/Godot";
// User data lives here (Godot user:// on macOS)
const USER_DATA = path.join(
  process.env.HOME,
  "Library/Application Support/Godot/app_userdata/scene"
);

// ── helpers ─────────────────────────────────────────────────────────────────

let shotIdx = 0;
const log = [];

function note(msg) {
  console.log(msg);
  log.push(msg);
}

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 15000, ...opts }).trim();
  } catch (e) {
    return e.message?.slice(0, 100) || "";
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function appleScript(script) {
  try {
    return execSync(`osascript -e '${script.replace(/'/g, "\\'")}'`, {
      encoding: "utf8",
      timeout: 10000,
    }).trim();
  } catch (e) {
    return "";
  }
}

function screenshot(label) {
  const name = `${String(shotIdx++).padStart(3, "0")}-${label.replace(/[^a-z0-9]/gi, "_")}.png`;
  const p = path.join(SHOTS_DIR, name);
  sh(`screencapture "${p}"`);
  note(`📸 ${name}`);
  return p;
}

// Click at absolute screen coordinates
function click(x, y, label = "") {
  appleScript(`tell application "System Events" to click at {${x}, ${y}}`);
  if (label) note(`  🖱  click (${x},${y}) — ${label}`);
}

// Get Godot window bounds: returns {x, y, w, h, cx, cy}
function getWindowBounds() {
  const raw = appleScript(
    'tell application "System Events" to tell process "Godot" to get bounds of window 1'
  );
  // returns "x1, y1, x2, y2"
  const parts = raw.split(",").map((s) => parseInt(s.trim(), 10));
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  const [x1, y1, x2, y2] = parts;
  return {
    x: x1, y: y1,
    w: x2 - x1, h: y2 - y1,
    cx: Math.round((x1 + x2) / 2),
    cy: Math.round((y1 + y2) / 2),
    // game viewport starts below title bar (~28px) and excludes bottom nav
    gameX: x1,
    gameY: y1 + 28,
    gameW: x2 - x1,
    gameH: y2 - y1 - 28,
  };
}

// Click at a position relative to the game window: rx,ry in 0..1
function clickRel(bounds, rx, ry, label = "") {
  const x = Math.round(bounds.gameX + bounds.gameW * rx);
  const y = Math.round(bounds.gameY + bounds.gameH * ry);
  click(x, y, label);
}

// ── setup ────────────────────────────────────────────────────────────────────

fs.mkdirSync(SHOTS_DIR, { recursive: true });
// Clear old screenshots
for (const f of fs.readdirSync(SHOTS_DIR)) {
  fs.unlinkSync(path.join(SHOTS_DIR, f));
}

note("# Landnám — New User Playthrough\n");
note(`Date: ${new Date().toISOString()}`);
note(`Scene: ${SCENE_PATH}\n`);

// ── 1. Kill any running Godot ────────────────────────────────────────────────
note("## Step 0: Kill existing Godot & clear save data");
sh("pkill -x Godot 2>/dev/null; sleep 1; true");

// Clear tutorial + progress save data for a fresh-user experience
if (fs.existsSync(USER_DATA)) {
  const files = fs.readdirSync(USER_DATA);
  note(`  User data dir found, files: ${files.join(", ")}`);
  for (const f of files) {
    if (f.endsWith(".cfg") || f.endsWith(".json") || f === "tutorial_v2.cfg") {
      fs.unlinkSync(path.join(USER_DATA, f));
      note(`  Deleted save: ${f}`);
    }
  }
} else {
  note(`  No user data dir found at: ${USER_DATA}`);
  // Try alternate path
  const alt = path.join(process.env.HOME, "Library/Application Support/Godot/app_userdata");
  if (fs.existsSync(alt)) {
    note(`  Listing alt: ${fs.readdirSync(alt).join(", ")}`);
  }
}

// ── 2. Launch Godot ──────────────────────────────────────────────────────────
note("\n## Step 1: Launch game");
const godot = spawn(GODOT, ["--path", SCENE_PATH, "--resolution", "1280x720"], {
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let godotLog = "";
godot.stdout.on("data", (d) => { godotLog += d.toString(); });
godot.stderr.on("data", (d) => { godotLog += d.toString(); });
godot.unref();
note(`  Godot PID: ${godot.pid}`);

// Wait for window to appear
note("  Waiting for window...");
await sleep(6000);

// Bring to front
appleScript('tell application "Godot" to activate');
await sleep(1000);

let bounds = getWindowBounds();
note(`  Window bounds: ${JSON.stringify(bounds)}`);
if (!bounds) {
  note("  ERROR: Could not get window bounds");
  process.exit(1);
}

screenshot("01-startup");

// ── 3. Observe initial state ─────────────────────────────────────────────────
note("\n## Step 2: Observe initial game state");
await sleep(3000);
screenshot("02-initial-state");

// ── 4. Tutorial click-through ────────────────────────────────────────────────
// The game starts at Earth base. As a new user, I'll:
// - Look around, click on things I see
// - Follow any tutorial prompts
// - Try to launch a rocket / complete a mission

note("\n## Step 3: Exploring as new user");

// Refresh bounds in case window moved
bounds = getWindowBounds();

// Click center of screen (dismiss any intro popup / start)
note("\n### 3a: Clicking center to start/dismiss intro");
for (let i = 0; i < 3; i++) {
  clickRel(bounds, 0.5, 0.5, "center-dismiss");
  await sleep(1500);
}
screenshot("03-after-center-clicks");

// Click lower portion (buttons often at bottom)
note("\n### 3b: Looking for bottom nav buttons");
await sleep(2000);
bounds = getWindowBounds();
for (const [rx, label] of [[0.15, "nav-1"], [0.3, "nav-2"], [0.5, "nav-3"], [0.7, "nav-4"], [0.85, "nav-5"]]) {
  clickRel(bounds, rx, 0.88, label);
  await sleep(1200);
  screenshot(`04-nav-${label}`);
}

// ── 5. Try to find and interact with launchpad ───────────────────────────────
note("\n## Step 4: Finding launchpad / mission start");
await sleep(2000);
bounds = getWindowBounds();

// Click around likely interactive areas based on earth_base scene
// Launchpad is usually visible on the game map
const interestPoints = [
  [0.5, 0.5, "center"],
  [0.35, 0.55, "left-building"],
  [0.6, 0.55, "right-building"],
  [0.5, 0.65, "lower-center"],
  [0.75, 0.45, "upper-right"],
  [0.25, 0.45, "upper-left"],
  [0.5, 0.35, "upper-center"],
];

for (const [rx, ry, label] of interestPoints) {
  bounds = getWindowBounds();
  clickRel(bounds, rx, ry, label);
  await sleep(2000);
  screenshot(`05-explore-${label}`);
}

// ── 6. Follow tutorial prompts ───────────────────────────────────────────────
note("\n## Step 5: Following tutorial prompts (clicking coach marks, next buttons)");
await sleep(1000);
bounds = getWindowBounds();

// Tutorial coach marks / next buttons are typically in certain positions
// Try clicking upper-right area (where tutorial popup appeared in startup screenshot)
const tutorialZones = [
  [0.78, 0.25, "tutorial-popup-area"],
  [0.85, 0.3, "tutorial-next-btn"],
  [0.5, 0.85, "bottom-action-btn"],
  [0.78, 0.25, "tutorial-popup-2"],
  [0.5, 0.5, "dismiss"],
];

for (const [rx, ry, label] of tutorialZones) {
  bounds = getWindowBounds();
  clickRel(bounds, rx, ry, label);
  await sleep(2000);
  screenshot(`06-tutorial-${label}`);
}

// ── 7. Look for mission / launch button ──────────────────────────────────────
note("\n## Step 6: Attempting to launch a mission");
await sleep(2000);
bounds = getWindowBounds();

// Scan bottom navigation more carefully
note("  Clicking bottom nav buttons systematically");
for (let i = 0; i <= 10; i++) {
  const rx = 0.05 + (i / 10) * 0.9;
  bounds = getWindowBounds();
  clickRel(bounds, rx, 0.9, `bottom-${i}`);
  await sleep(800);
}
await sleep(2000);
screenshot("07-bottom-nav-scan");

// Try middle-right area (launch button often there)
for (const [rx, ry, label] of [
  [0.85, 0.5, "right-panel"],
  [0.9, 0.7, "launch-area"],
  [0.5, 0.75, "lower-panel"],
]) {
  bounds = getWindowBounds();
  clickRel(bounds, rx, ry, label);
  await sleep(2000);
  screenshot(`08-mission-${label}`);
}

// ── 8. Extended observation period ───────────────────────────────────────────
note("\n## Step 7: Extended observation — waiting for any auto-progression");
for (let i = 1; i <= 6; i++) {
  await sleep(5000);
  bounds = getWindowBounds();
  // Occasionally click to see if anything is waiting for input
  if (i % 2 === 0) clickRel(bounds, 0.5, 0.5, "periodic-center");
  screenshot(`09-observation-t${i * 5}s`);
}

// ── 9. Try reset and replay (if stuck) ───────────────────────────────────────
note("\n## Step 8: Check current state, attempt second pass if stuck");
screenshot("10-before-reset");

// ── 10. Finalize ─────────────────────────────────────────────────────────────
note("\n## Summary");
note(`Total screenshots: ${shotIdx}`);
note(`Game log snippet:\n\`\`\`\n${godotLog.slice(-800)}\n\`\`\``);

fs.writeFileSync(LOG_FILE, log.join("\n") + "\n");
note(`\nLog saved to: ${LOG_FILE}`);
note("Playthrough complete.");
