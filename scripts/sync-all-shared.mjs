#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
// Authoring sources (shared/authoring/*.toml) compile first: they write the runtime files the other syncs copy.
const authoring = spawnSync(process.execPath, [resolve(root, "scripts", "authoring.mjs"), args.includes("--check") ? "check" : "compile"], { stdio: "inherit" });
if (authoring.status !== 0) process.exit(authoring.status ?? 1);
for (const script of ["sync-shared.mjs", "sync-base-site.mjs", "sync-native-fonts.mjs", "sync-native-assets.mjs"]) {
  const result = spawnSync(process.execPath, [resolve(root, "scripts", script), ...args], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
