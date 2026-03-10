#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error(
    "Usage: node scripts/generate_chatgpt_execution_pack.mjs <batch_id> [packet_size]\n" +
      "Example: node scripts/generate_chatgpt_execution_pack.mjs batch_l1_m1_starterrocket1 12"
  );
}

const [, , batchId, packetSizeArg] = process.argv;
if (!batchId) {
  usage();
  process.exit(1);
}

const packetSize = Math.max(parseInt(packetSizeArg || "12", 10) || 12, 1);
const repoRoot = process.cwd();
const batchPath = path.join(
  repoRoot,
  "scene/assets/Rooms/checklists/batches",
  `${batchId}.json`
);

if (!fs.existsSync(batchPath)) {
  console.error(`Batch file not found: ${batchPath}`);
  process.exit(1);
}

const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));
const rows = Array.isArray(batch.rows) ? batch.rows : [];
if (!rows.length) {
  console.error(`No rows found in: ${batchPath}`);
  process.exit(1);
}

const outDir = path.join(
  repoRoot,
  "scene/assets/Rooms/checklists/batches/execution",
  batchId
);
fs.mkdirSync(outDir, { recursive: true });

const packets = [];
for (let i = 0; i < rows.length; i += packetSize) {
  packets.push(rows.slice(i, i + packetSize));
}

const manifest = {
  batch_id: batchId,
  source_file: path.relative(repoRoot, batchPath),
  generated_at_utc: new Date().toISOString(),
  packet_size: packetSize,
  total_assets: rows.length,
  packet_count: packets.length,
  required_output_schema: {
    image: "<asset_id>.png",
    sidecar: "<asset_id>.json",
    note_optional: "<asset_id>.txt",
  },
};

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

const executionChecklistHeader = [
  "asset_id",
  "packet",
  "status",
  "image_file",
  "json_file",
  "qa_pass",
  "notes",
];
const checklistRows = [executionChecklistHeader.join(",")];

packets.forEach((packetRows, idx) => {
  const packetNum = idx + 1;
  const packetName = `packet_${String(packetNum).padStart(2, "0")}.json`;
  const packetPayload = {
    batch_id: batchId,
    packet_index: packetNum,
    packet_count: packets.length,
    asset_count: packetRows.length,
    instructions: {
      style_anchor_required: true,
      one_asset_per_prompt: true,
      filename_contract: "strict",
      no_extra_suffixes: true,
      no_text_or_ui: true,
    },
    assets: packetRows.map((row) => ({
      asset_id: row.asset_id,
      asset_type: row.asset_type,
      room_id: row.room_id,
      room_name: row.room_name,
      category: row.category,
      tier: row.tier,
      component_id: row.component_id,
      component_name: row.component_name,
      component_kind: row.component_kind,
      state_key: row.state_key,
      priority: row.priority,
      prompt: row.prompt,
      expected_files: {
        image: `${row.asset_id}.png`,
        sidecar: `${row.asset_id}.json`,
        note_optional: `${row.asset_id}.txt`,
      },
    })),
  };
  fs.writeFileSync(
    path.join(outDir, packetName),
    `${JSON.stringify(packetPayload, null, 2)}\n`
  );

  for (const row of packetRows) {
    checklistRows.push(
      [
        row.asset_id,
        packetName,
        "todo",
        `${row.asset_id}.png`,
        `${row.asset_id}.json`,
        "no",
        "",
      ].join(",")
    );
  }
});

fs.writeFileSync(
  path.join(outDir, "execution_checklist.csv"),
  `${checklistRows.join("\n")}\n`
);

console.log(
  `Generated execution pack for ${batchId}: ${rows.length} assets, ${packets.length} packets -> ${path.relative(
    repoRoot,
    outDir
  )}`
);
