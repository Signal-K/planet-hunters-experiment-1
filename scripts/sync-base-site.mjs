#!/usr/bin/env node

// Copies the shared base site map into web (Turbopack cannot import outside web/). Native bundles
// shared/layout directly. `--check` fails when the web copy drifted.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "shared/layout/base-site.json");
const target = resolve(root, "web/lib/scene/base-site.json");
const text = JSON.stringify(JSON.parse(await readFile(source, "utf8")), null, 2) + "\n";
let current = "";
try { current = await readFile(target, "utf8"); } catch { /* first run */ }
if (process.argv.includes("--check")) {
  if (current !== text) {
    console.error(`Out of sync: ${target} (run npm run sync:shared)`);
    process.exit(1);
  }
  console.log("base-site.json in sync");
} else if (current !== text) {
  await writeFile(target, text);
  console.log(`Wrote ${target}`);
}
