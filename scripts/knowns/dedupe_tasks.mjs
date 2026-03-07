#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const tasksDir = path.join(rootDir, ".knowns", "tasks");
const archiveBaseDir = path.join(rootDir, ".knowns", "duplicates", "tasks");
const applyMode = process.argv.includes("--apply");

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return {};
  const end = raw.indexOf("\n---\n", 4);
  if (end < 0) return {};
  const block = raw.slice(4, end);
  const out = {};
  for (const line of block.split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

function epochOf(dateStr, fallbackEpoch) {
  const t = Date.parse(dateStr || "");
  return Number.isFinite(t) ? t : fallbackEpoch;
}

function canonicalSort(a, b) {
  if (a.updatedEpoch !== b.updatedEpoch) return b.updatedEpoch - a.updatedEpoch;
  if (a.mtimeMs !== b.mtimeMs) return b.mtimeMs - a.mtimeMs;
  return a.file.localeCompare(b.file);
}

async function loadTaskRecords() {
  const names = await fs.readdir(tasksDir);
  const taskFiles = names
    .filter((n) => n.startsWith("task-") && n.endsWith(".md"))
    .map((n) => path.join(tasksDir, n));
  const records = [];
  for (const fullPath of taskFiles) {
    const [raw, stat] = await Promise.all([
      fs.readFile(fullPath, "utf8"),
      fs.stat(fullPath),
    ]);
    const fm = parseFrontmatter(raw);
    const id = String(fm.id || "").trim();
    if (!id) continue;
    records.push({
      id,
      file: fullPath,
      rel: path.relative(rootDir, fullPath),
      status: String(fm.status || ""),
      updatedAt: String(fm.updatedAt || ""),
      updatedEpoch: epochOf(String(fm.updatedAt || ""), stat.mtimeMs),
      mtimeMs: stat.mtimeMs,
    });
  }
  return records;
}

async function main() {
  const records = await loadTaskRecords();
  const grouped = new Map();
  for (const rec of records) {
    if (!grouped.has(rec.id)) grouped.set(rec.id, []);
    grouped.get(rec.id).push(rec);
  }

  const duplicateGroups = [...grouped.entries()]
    .map(([id, list]) => [id, [...list].sort(canonicalSort)])
    .filter(([, list]) => list.length > 1)
    .sort(([a], [b]) => a.localeCompare(b));

  if (duplicateGroups.length === 0) {
    console.log("No duplicate task IDs found.");
    return;
  }

  console.log(`Duplicate task IDs found: ${duplicateGroups.length}`);
  for (const [id, list] of duplicateGroups) {
    const canonical = list[0];
    console.log(`\n- ${id}`);
    console.log(`  keep: ${canonical.rel} (status=${canonical.status || "unknown"}, updatedAt=${canonical.updatedAt || "n/a"})`);
    for (const dup of list.slice(1)) {
      console.log(`  dup : ${dup.rel} (status=${dup.status || "unknown"}, updatedAt=${dup.updatedAt || "n/a"})`);
    }
  }

  if (!applyMode) {
    console.log("\nDry run only. Re-run with --apply to archive duplicate copies.");
    return;
  }

  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveDir = path.join(archiveBaseDir, runStamp);
  await fs.mkdir(archiveDir, { recursive: true });

  let moved = 0;
  for (const [, list] of duplicateGroups) {
    for (const dup of list.slice(1)) {
      const target = path.join(archiveDir, path.basename(dup.file));
      await fs.rename(dup.file, target);
      moved += 1;
    }
  }

  console.log(`\nArchived ${moved} duplicate file(s) to ${path.relative(rootDir, archiveDir)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
