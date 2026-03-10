#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error(
    "Usage: node scripts/validate_generated_batch_outputs.mjs <batch_id> <output_dir>\n" +
      "Example: node scripts/validate_generated_batch_outputs.mjs batch_l1_m1_starterrocket1 scene/assets/Rooms/generated/batch_l1_m1_starterrocket1"
  );
}

const [, , batchId, outputDirArg] = process.argv;
if (!batchId || !outputDirArg) {
  usage();
  process.exit(1);
}

const repoRoot = process.cwd();
const batchJsonPath = path.join(
  repoRoot,
  "scene/assets/Rooms/checklists/batches",
  `${batchId}.json`
);
const outputDir = path.isAbsolute(outputDirArg)
  ? outputDirArg
  : path.join(repoRoot, outputDirArg);

if (!fs.existsSync(batchJsonPath)) {
  console.error(`Missing batch definition: ${batchJsonPath}`);
  process.exit(1);
}
if (!fs.existsSync(outputDir)) {
  console.error(`Missing output directory: ${outputDir}`);
  process.exit(1);
}

const batch = JSON.parse(fs.readFileSync(batchJsonPath, "utf8"));
const rows = Array.isArray(batch.rows) ? batch.rows : [];
const requiredJsonKeys = [
  "asset_id",
  "room_id",
  "component",
  "tier",
  "state",
  "prompt_version",
  "generator",
  "generated_at_utc",
  "image_filename",
  "width",
  "height",
  "notes",
];

const problems = [];

for (const row of rows) {
  const assetId = row.asset_id;
  const pngPath = path.join(outputDir, `${assetId}.png`);
  const jsonPath = path.join(outputDir, `${assetId}.json`);
  if (!fs.existsSync(pngPath)) {
    problems.push(`Missing image: ${assetId}.png`);
  }
  if (!fs.existsSync(jsonPath)) {
    problems.push(`Missing sidecar: ${assetId}.json`);
    continue;
  }
  try {
    const sidecar = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    for (const key of requiredJsonKeys) {
      if (!(key in sidecar)) {
        problems.push(`Sidecar missing key '${key}': ${assetId}.json`);
      }
    }
    if (String(sidecar.asset_id || "") !== assetId) {
      problems.push(`asset_id mismatch in ${assetId}.json`);
    }
    if (String(sidecar.image_filename || "") !== `${assetId}.png`) {
      problems.push(`image_filename mismatch in ${assetId}.json`);
    }
  } catch (err) {
    problems.push(`Invalid JSON in ${assetId}.json (${err.message})`);
  }
}

const generatedFiles = fs.readdirSync(outputDir);
for (const file of generatedFiles) {
  if (!file.endsWith(".png") && !file.endsWith(".json") && !file.endsWith(".txt")) {
    continue;
  }
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  const known = rows.some((row) => row.asset_id === base);
  if (!known) {
    problems.push(`Unexpected output file: ${file}`);
  }
}

if (problems.length) {
  console.error(`Validation failed for ${batchId}. Issues: ${problems.length}`);
  for (const p of problems) {
    console.error(`- ${p}`);
  }
  process.exit(2);
}

console.log(
  `Validation passed for ${batchId}: ${rows.length} assets verified in ${path.relative(
    repoRoot,
    outputDir
  )}`
);
