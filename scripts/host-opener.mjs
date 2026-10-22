#!/usr/bin/env node
// Cursor helper: lets the Scene Studio (in Docker, inside Cursor's browser) open scripts in Cursor.
// `node scripts/host-opener.mjs start | stop | status | serve`. `make up` runs start. See web/lib/authoring/host-opener.ts.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const [major, minor] = process.versions.node.split(".").map(Number);
const stripsTypes = major > 22 || (major === 22 && minor >= 18);
const result = spawnSync(
  process.execPath,
  ["--no-warnings", ...(stripsTypes ? [] : ["--experimental-strip-types"]), resolve(root, "web/lib/authoring/host-opener.ts"), ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
