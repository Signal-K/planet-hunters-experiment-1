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

// head.created, head.modified and checkSumAdjustment change when a woff2 is
// unpacked, even when outlines and names are unchanged. Compare those away so
// a timestamp-only resave is not treated as a new font.
const canonical = `
from fontTools.ttLib import TTFont
import io, sys
font = TTFont(sys.argv[1])
font.flavor = None
font.recalcTimestamp = False
font["head"].created = 0
font["head"].modified = 0
font["head"].checkSumAdjustment = 0
buf = io.BytesIO()
font.save(buf)
sys.stdout.buffer.write(buf.getvalue())
`;

function canonicalBytes(file) {
  const result = spawnSync("python3", ["-c", canonical, file], { maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Could not read ${file}: ${result.stderr?.toString() || result.stdout?.toString()}`);
  return result.stdout;
}

try {
  for (const name of (await readdir(source)).filter((file) => file.endsWith(".woff2")).sort()) {
    const output = resolve(workspace, name.replace(/\.woff2$/, ".ttf"));
    const conversion = spawnSync("python3", ["-c", "from fontTools.ttLib import TTFont; import sys; font = TTFont(sys.argv[1], recalcTimestamp=False); font.flavor = None; font.recalcTimestamp = False; font.save(sys.argv[2])", resolve(source, name), output], { encoding: "utf8" });
    if (conversion.status !== 0) throw new Error(`Could not convert ${name}: ${conversion.stderr || conversion.stdout}`);
    const target = resolve(destination, name.replace(/\.woff2$/, ".ttf"));
    let actual = null;
    try { actual = await readFile(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (actual && canonicalBytes(output).equals(canonicalBytes(target))) continue;
    stale = true;
    if (check) { console.error(`Out of sync: ${target}`); continue; }
    await writeFile(target, await readFile(output));
    console.log(`Updated ${target}`);
  }
} finally {
  await rm(workspace, { recursive: true, force: true });
}
if (stale && check) process.exitCode = 1;
