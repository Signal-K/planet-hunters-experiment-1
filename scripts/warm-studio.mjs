#!/usr/bin/env node
// Compiles the Scene Studio's routes right after `make up`, in the background, so opening the Studio does not wait on them.
// Next's dev server builds each route on its first request (about 10 seconds for the Studio, and the game stage after it, on a
// cold container), and asking for several at once can make one of them fail with a 500 while they race. Warming them one at a
// time, in order, leaves nothing to compile when you open the page.
//   node scripts/warm-studio.mjs           start warming in the background and return (what `make up` runs)
//   node scripts/warm-studio.mjs --wait    warm in the foreground and print each timing
import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const base = process.env.LANDNAM_WEB_URL ?? "http://localhost:3001";
const logPath = join(tmpdir(), "landnam-warm-studio.log");

// In the order the Studio asks for them. The open route answers 415 with no body, which still compiles it.
const ROUTES = [
  ["GET", "/game/studio"],
  ["GET", "/api/dev/studio?index=1"],
  ["GET", "/game/storyboard/comments"],
  ["POST", "/api/dev/studio/open"],
  ["GET", "/game/stage?preset=sandbox%3Asandbox-hub"],
];

if (!process.argv.includes("--wait")) {
  const log = openSync(logPath, "w");
  const child = spawn(process.execPath, [process.argv[1], "--wait"], { detached: true, stdio: ["ignore", log, log] });
  child.unref();
  closeSync(log);
  console.log(`Warming the Studio in the background (progress: ${logPath})`);
  process.exit(0);
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const say = (text) => console.log(`${new Date().toISOString().slice(11, 19)} ${text}`);

async function ready(timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(`${base}/api/backend-health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(1000);
  }
  return false;
}

if (!(await ready(180_000))) {
  say(`The dev server at ${base} did not come up within 3 minutes; nothing warmed.`);
  process.exit(0);
}
const began = Date.now();
for (const [method, path] of ROUTES) {
  const start = Date.now();
  try {
    const res = await fetch(base + path, { method, signal: AbortSignal.timeout(120_000), redirect: "manual" });
    await res.arrayBuffer();
    say(`${method} ${path} ${res.status} in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (error) {
    say(`${method} ${path} failed after ${((Date.now() - start) / 1000).toFixed(1)}s: ${error.message}`);
  }
}
say(`Studio warm in ${((Date.now() - began) / 1000).toFixed(1)}s`);
