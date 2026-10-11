#!/usr/bin/env node

import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "web/public/fonts");
const destination = resolve(root, "native/App/Resources/Fonts");
const check = process.argv.includes("--check");
const workspace = await mkdtemp(resolve(tmpdir(), "landnam-fonts-"));
let stale = false;

try {
  for (const name of (await readdir(source)).filter((file) => file.endsWith(".woff2")).sort()) {
    const output = resolve(workspace, name.replace(/\.woff2$/, ".ttf"));
    const conversion = spawnSync("python3", ["-c", "from fontTools.ttLib import TTFont; import sys; font = TTFont(sys.argv[1], recalcTimestamp=False); font.flavor = None; font.recalcTimestamp = False; font.save(sys.argv[2])", resolve(source, name), output], { encoding: "utf8" });
    if (conversion.status !== 0) throw new Error(`Could not convert ${name}: ${conversion.stderr || conversion.stdout}`);
    const expected = await readFile(output);
    const target = resolve(destination, name.replace(/\.woff2$/, ".ttf"));
    let actual = null;
    try { actual = await readFile(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (actual?.equals(expected)) continue;
    stale = true;
    if (check) { console.error(`Out of sync: ${target}`); continue; }
    await writeFile(target, expected);
    console.log(`Updated ${target}`);
  }
} finally {
  await rm(workspace, { recursive: true, force: true });
}
if (stale && check) process.exitCode = 1;
