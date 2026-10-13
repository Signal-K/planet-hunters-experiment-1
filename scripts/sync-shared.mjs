#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const check = process.argv.includes("--check");
const tokens = JSON.parse(await readFile(resolve(root, "shared/tokens/tokens.json"), "utf8"));

const cssFile = resolve(root, "web/app/globals.css");
const swiftFile = resolve(root, "native/App/Theme.generated.swift");

const cssNames = {
  void: "--ln-void", bg: "--ln-bg", bgGrid: "--ln-bg-grid", surface: "--ln-surface", surface2: "--ln-surface-2", surface3: "--ln-surface-3", overlay: "--ln-overlay",
  cyan: "--ln-cyan", cyanBright: "--ln-cyan-bright", cyanPress: "--ln-cyan-press", cyanSoft: "--ln-cyan-soft", cyanBorder: "--ln-cyan-border",
  blueprintBg: "--ln-blueprint-bg", blueprintPaper: "--ln-blueprint-paper", blueprintPaper2: "--ln-blueprint-paper-2",
  blueprintInk: "--ln-blueprint-ink", blueprintBlue: "--ln-blueprint-blue", blueprintLineStrong: "--ln-blueprint-line-strong",
  amber: "--ln-amber", amberBright: "--ln-amber-bright", amberPress: "--ln-amber-press", amberSoft: "--ln-amber-soft", amberBorder: "--ln-amber-border",
  mapSun: "--ln-map-sun", mapSunSoft: "--ln-map-sun-soft", blueprintCrimson: "--ln-crimson", blueprintCrimsonBright: "--ln-crimson-bright",
  blueprintCrimsonPress: "--ln-crimson-press", blueprintCrimsonSoft: "--ln-crimson-soft", blueprintCrimsonBorder: "--ln-crimson-border",
  ok: "--ln-ok", okSoft: "--ln-ok-soft", warn: "--ln-warn", warnSoft: "--ln-warn-soft", crit: "--ln-crit", critSoft: "--ln-crit-soft",
  mineralSilicon: "--ln-mineral-silicon", mineralIron: "--ln-mineral-iron", mineralIce: "--ln-mineral-ice", mineralCarbon: "--ln-mineral-carbon", mineralGold: "--ln-mineral-gold", mineralRare: "--ln-mineral-rare",
  text: "--ln-text", textDim: "--ln-text-dim", textMuted: "--ln-text-muted", textGhost: "--ln-text-ghost", textOnCyan: "--ln-text-on-cyan", textOnAmber: "--ln-text-on-amber", textInverse: "--ln-text-inverse",
  hairline: "--ln-hairline", hairlineStrong: "--ln-hairline-strong", divider: "--ln-divider", shell: "--ln-shell", panel: "--ln-panel", panel2: "--ln-panel-2", border: "--ln-border", payout: "--ln-payout", play: "--ln-play", purpleDepth: "--ln-purple-depth"
};

function cssBlock() {
  const colors = Object.entries(cssNames).map(([key, name]) => `  ${name}: ${tokens.colors[key]};`);
  const radii = Object.entries(tokens.radii).map(([key, value]) => `  --ln-r-${key}: ${value};`);
  const text = Object.entries(tokens.text).map(([key, value]) => `  --ln-fs-${key}: ${value};`);
  return [
    "  /* BEGIN GENERATED SHARED TOKENS — run npm run sync:shared */",
    "  /* Accent naming: blueprintBlue is canonical; --ln-cyan remains a legacy web alias. Amber is the warm selection/currency accent. The Sun (--ln-map-sun) is ice-white with a cyan glow. */",
    ...colors, ...radii, ...text,
    "  /* END GENERATED SHARED TOKENS */"
  ].join("\n");
}

function pascal(key) {
  return `${key[0].toUpperCase()}${key.slice(1)}`;
}

function hex(value) {
  if (!value.startsWith("#")) throw new Error(`Native Color tokens must be hex values: ${value}`);
  return `0x${value.slice(1).toUpperCase()}`;
}

function swiftColor(value) {
  if (value.startsWith("#")) return `hex(${hex(value)})`;
  const rgba = value.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/);
  if (!rgba) throw new Error(`Unsupported color for native Theme: ${value}`);
  const [, r, g, b, a] = rgba;
  const channel = (n) => Number(n).toString(16).padStart(2, "0").toUpperCase();
  return `hex(0x${channel(r)}${channel(g)}${channel(b)}, ${a})`;
}

function swiftFileContents() {
  const colors = Object.entries(tokens.colors)
    .filter(([, value]) => value.startsWith("#"))
    .map(([key, value]) => `    static let token${pascal(key)} = hex(${hex(value)})`);
  const aliases = Object.entries(tokens.nativeAliases).map(([alias, key]) => {
    const value = tokens.colors[key];
    if (!value) throw new Error(`nativeAliases.${alias} points at missing color ${key}`);
    return value.startsWith("#")
      ? `    static let ${alias} = token${pascal(key)}`
      : `    static let ${alias} = ${swiftColor(value)}`;
  });
  const preserved = Object.entries(tokens.nativePreserved ?? {}).map(([alias, value]) => `    static let ${alias} = ${swiftColor(value)}`);
  const derived = Object.entries(tokens.nativeDerived ?? {}).map(([alias, spec]) => {
    if (!spec.of || typeof spec.opacity !== "number") throw new Error(`nativeDerived.${alias} needs of and opacity`);
    return `    static let ${alias} = ${spec.of}.opacity(${spec.opacity})`;
  });
  const aliasNames = [...Object.keys(tokens.nativeAliases), ...Object.keys(tokens.nativePreserved ?? {}), ...Object.keys(tokens.nativeDerived ?? {})];
  const seen = new Set();
  for (const name of aliasNames) {
    if (seen.has(name)) throw new Error(`Duplicate native Theme alias: ${name}`);
    seen.add(name);
  }
  return `// Generated by scripts/sync-shared.mjs from shared/tokens/tokens.json. Do not edit.\nimport SwiftUI\n\n/// Shared palette values and compatibility aliases consumed by the native UI.\nextension Theme {\n${colors.join("\n")}\n\n    // Existing Theme names intentionally remain stable for native call sites.\n${[...aliases, ...preserved, ...derived].join("\n")}\n}\n`;
}

async function sync(file, next) {
  let current = "";
  try { current = await readFile(file, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (current === next) return false;
  if (check) { console.error(`Out of sync: ${file}`); return true; }
  await writeFile(file, next);
  console.log(`Updated ${file}`);
  return false;
}

const css = await readFile(cssFile, "utf8");
const begin = "  /* BEGIN GENERATED SHARED TOKENS — run npm run sync:shared */";
const end = "  /* END GENERATED SHARED TOKENS */";
const start = css.indexOf(begin);
const finish = css.indexOf(end);
if (start < 0 || finish < start) throw new Error("globals.css is missing generated shared-token markers");
const nextCss = `${css.slice(0, start)}${cssBlock()}${css.slice(finish + end.length)}`;
for (const anchor of ["--ln-void: #0a0a0c", "--ln-amber: #175f9b", "--ln-map-sun: #eefcff", "--ln-blueprint-bg: #eef3f8", "--ln-play: #2ec4b6"]) {
  if (!nextCss.includes(anchor)) throw new Error(`Generated palette dropped ${anchor}`);
}
// SSL-520 dusk scene rules live outside the generated block. Regenerating tokens must not delete them.
if (css.includes("SSL-520:")) {
  for (const anchor of ["SSL-520: close side-on Base", "--ln-world-dusk-top: #2a2766", "--hub-sky-top: var(--ln-world-dusk-top)"]) {
    if (!nextCss.includes(anchor)) throw new Error(`Generated CSS would drop the dusk restyle anchor: ${anchor}`);
  }
}
const stale = (await sync(cssFile, nextCss)) || (await sync(swiftFile, swiftFileContents()));
if (stale) process.exitCode = 1;
