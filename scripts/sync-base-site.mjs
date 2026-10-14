#!/usr/bin/env node

// Copies the shared base site map and world scene files into web (Turbopack cannot import outside web/).
// Native bundles shared/layout and shared/scenes directly. `--check` fails when a web copy drifted.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const pairs = [
  ["shared/layout/base-site.json", "web/lib/scene/base-site.json"],
  ["shared/scenes/base-world.json", "web/lib/world/base-world.json"],
  ["shared/scenes/sky-events.json", "web/lib/world/sky-events.json"],
];
let drift = false;
for (const [from, to] of pairs) {
  const target = resolve(root, to);
  const text = JSON.stringify(JSON.parse(await readFile(resolve(root, from), "utf8")), null, 2) + "\n";
  let current = "";
  try { current = await readFile(target, "utf8"); } catch { /* first run */ }
  if (current === text) continue;
  if (process.argv.includes("--check")) {
    console.error(`Out of sync: ${to} (run npm run sync:shared)`);
    drift = true;
  } else {
    await writeFile(target, text);
    console.log(`Wrote ${to}`);
  }
}
if (drift) process.exit(1);
