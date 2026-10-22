#!/usr/bin/env node
// Landnam authoring CLI: compile, check or validate shared/authoring/*.toml. See `node scripts/authoring.mjs help`.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const [major, minor] = process.versions.node.split(".").map(Number);
const stripsTypes = major > 22 || (major === 22 && minor >= 18);
const result = spawnSync(
  process.execPath,
  ["--no-warnings", ...(stripsTypes ? [] : ["--experimental-strip-types"]), resolve(root, "web/lib/authoring/cli.ts"), ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, LANDNAM_REPO_ROOT: root } },
);
process.exit(result.status ?? 1);
