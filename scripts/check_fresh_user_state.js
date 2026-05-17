#!/usr/bin/env node

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

const BASELINE = {
  "scene/franc_balance.json": { balance: 0 },
  "scene/mission_logs.json": { missions: [] },
  "scene/subcontractors.json": {
    affinity: {},
    reputation: {},
    cooldowns: {},
    consecutive_use: {},
    last_mission_sub: "",
  },
  "scene/rockets_state.json": {
    unlocked: ["starterrocket1"],
    placed: [],
    launched: [],
    destroyed: [],
    missions: [],
    selected_target: "",
    preview_target: {},
    detected_targets: [],
    seen_asteroids: [],
    seen_planets: [],
    scan_counts: {},
    status_changed_at: {},
    mission_progress_completed: 0,
    completed_mission_badges: [],
    control_station_built: false,
    scanner_station_built: false,
    scanner_unlocked: false,
    scanner_unlock_dialog_seen: false,
    scanner_next_scan_at: 0,
    trip_contract_offer: {},
    operation_mode: "contract",
    candidate_visit_blocks: {},
    target_annotation_levels: {},
    tess_classifications: {},
    discovery_bonus_claimed: {},
    rocket_customizations: {},
    rocket_wear: {},
    archived_rocket_wear: {},
    mission_briefings_seen: {},
    mission_progress_schema_version: 2,
    pending_mission_guidance_id: 0,
    launch_fallback_notice: "",
    inventory: {
      Iron: 0,
      Nickel: 0,
      Cobalt: 0,
      Platinum: 0,
    },
    returning: [],
    arrived: {},
    returned_mission: {},
    returning_started: {},
    starter_contract_offer: {},
    revealed_sectors: [],
  },
};

function normalize(value) {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(normalize(value));
}

function loadJsonFile(absPath) {
  return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

function loadJsonFromGit(rev, relPath) {
  const raw = execFileSync("git", ["show", `${rev}:${relPath}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return JSON.parse(raw);
}

function diffPathsForTreeish(rev) {
  const mismatches = [];
  for (const [relPath, expected] of Object.entries(BASELINE)) {
    let actual;
    try {
      actual = loadJsonFromGit(rev, relPath);
    } catch (error) {
      mismatches.push(`${relPath} missing from ${rev}`);
      continue;
    }
    if (stableStringify(actual) !== stableStringify(expected)) {
      mismatches.push(relPath);
    }
  }
  return mismatches;
}

function diffWorkingTree() {
  const mismatches = [];
  for (const [relPath, expected] of Object.entries(BASELINE)) {
    const absPath = path.join(repoRoot, relPath);
    const actual = loadJsonFile(absPath);
    if (stableStringify(actual) !== stableStringify(expected)) {
      mismatches.push(relPath);
    }
  }
  return mismatches;
}

function writeBaseline() {
  for (const [relPath, expected] of Object.entries(BASELINE)) {
    const absPath = path.join(repoRoot, relPath);
    fs.writeFileSync(absPath, `${JSON.stringify(expected, null, 2)}\n`);
  }
}

function printMismatchMessage(label, mismatches) {
  if (mismatches.length === 0) {
    return;
  }
  console.error(`${label} contains non-fresh local state:`);
  for (const relPath of mismatches) {
    console.error(`- ${relPath}`);
  }
}

const mode = process.argv[2] || "check";

if (mode === "write") {
  writeBaseline();
  process.exit(0);
}

if (mode === "check-working-tree") {
  const mismatches = diffWorkingTree();
  printMismatchMessage("Working tree", mismatches);
  process.exit(mismatches.length === 0 ? 0 : 1);
}

if (mode === "check-push") {
  const refs = fs.readFileSync(0, "utf8").trim().split("\n").filter(Boolean);
  const mismatches = new Set();
  for (const line of refs) {
    const [localRef, localSha] = line.split(/\s+/);
    if (!localRef || !localSha || /^0+$/.test(localSha)) {
      continue;
    }
    for (const relPath of diffPathsForTreeish(localSha)) {
      mismatches.add(relPath);
    }
  }
  const sorted = Array.from(mismatches).sort();
  printMismatchMessage("Push", sorted);
  if (sorted.length > 0) {
    console.error("Run `node scripts/check_fresh_user_state.js write` and recommit the refreshed defaults before pushing.");
    process.exit(1);
  }
  process.exit(0);
}

console.error("Usage: node scripts/check_fresh_user_state.js [write|check-working-tree|check-push]");
process.exit(2);
