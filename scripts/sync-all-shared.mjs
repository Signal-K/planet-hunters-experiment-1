#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
for (const script of ["sync-shared.mjs", "sync-base-site.mjs", "sync-native-fonts.mjs", "sync-native-assets.mjs"]) {
  const result = spawnSync(process.execPath, [resolve(root, "scripts", script), ...args], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
