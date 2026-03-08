import fs from 'node:fs';
import path from 'node:path';

const basePath = path.resolve('scene/assets/Rooms/checklists/room_component_asset_checklist.json');
const outDir = path.resolve('scene/assets/Rooms/checklists/batches');

const data = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const rows = data.asset_rows;

const ships = {
  starterrocket1: ['basic_thruster_t1', 'small_reactor_t1', 'small_tank_t1', 'cargo_bay_t1', 'mining_drill_t1', 'basic_nav_t1', 'basic_hull_t1'],
  starterrocket2: ['basic_thruster_t1', 'small_reactor_t1', 'small_tank_t1', 'cargo_bay_t1', 'mining_drill_t1', 'basic_nav_t1', 'basic_hull_t1', 'fusion_drive_t2', 'large_tank_t2', 'sample_lab_t2', 'comms_relay_t1'],
  starterrocket3: ['basic_thruster_t1', 'small_reactor_t1', 'small_tank_t1', 'cargo_bay_t1', 'mining_drill_t1', 'basic_nav_t1', 'basic_hull_t1', 'fusion_drive_t2', 'large_tank_t2', 'sample_lab_t2', 'comms_relay_t1', 'scanner_array_t2', 'drone_bay_t2', 'telescope_t2', 'broadcast_array_t2']
};

const progression = [
  { level: 'L1_M1', ship: 'starterrocket1', includeRooms: ships.starterrocket1, includePriorities: new Set(['p0', 'p1']), includeUsageStates: false, note: 'First launch loop' },
  { level: 'L2_M2', ship: 'starterrocket2', includeRooms: ships.starterrocket2, includePriorities: new Set(['p0', 'p1']), includeUsageStates: false, note: 'Upgrade path loop' },
  { level: 'L2_M3', ship: 'starterrocket2', includeRooms: [...ships.starterrocket2, 'scanner_array_t2'], includePriorities: new Set(['p0', 'p1']), includeUsageStates: false, note: 'Scanner unlock prep' },
  { level: 'L3_M4', ship: 'starterrocket3', includeRooms: ships.starterrocket3, includePriorities: new Set(['p0', 'p1']), includeUsageStates: false, note: 'Planetary exploration' },
  { level: 'L3_M5', ship: 'starterrocket3', includeRooms: [...ships.starterrocket3, 'resource_vault_t2', 'power_capacitor_t2', 'subsurface_probe_t2'], includePriorities: new Set(['p0', 'p1']), includeUsageStates: false, note: 'Contractor/optimization prep' }
];

const advancedRND = {
  batch_id: 'batch_advanced_rnd_t3_and_future',
  title: 'Advanced R&D Rooms (T3/Future)',
  includeRooms: ['ion_drive_t3', 'spectral_analyser_t3', 'subsurface_probe_t2', 'resource_vault_t2', 'power_capacitor_t2', 'fusion_reactor_t2', 'ablative_armour_t3'],
  includePriorities: new Set(['p0', 'p1']),
  includeUsageStates: false,
  note: 'Future-ready room coverage beyond currently installed layouts'
};

function isGlobalRow(r) {
  return r.room_id === 'global' || r.asset_type === 'style_anchor' || r.asset_type === 'shell_kit';
}

function byRooms(list, roomIds) {
  const roomSet = new Set(roomIds);
  return list.filter((r) => roomSet.has(r.room_id));
}

function baseTrim(list, includePriorities, includeUsageStates) {
  return list.filter((r) => {
    if (!includePriorities.has(r.priority)) return false;
    if (!includeUsageStates && r.asset_type === 'state_variant' && r.state_key.startsWith('usage_')) return false;
    return true;
  });
}

function sortRows(list) {
  const order = { style_anchor: 0, shell_kit: 1, component: 2, state_variant: 3, room_composite: 4 };
  return [...list].sort((a, b) => {
    if (a.room_id !== b.room_id) return a.room_id.localeCompare(b.room_id);
    if ((order[a.asset_type] ?? 9) !== (order[b.asset_type] ?? 9)) return (order[a.asset_type] ?? 9) - (order[b.asset_type] ?? 9);
    if (a.component_id !== b.component_id) return a.component_id.localeCompare(b.component_id);
    return a.state_key.localeCompare(b.state_key);
  });
}

function toCsv(list) {
  const headers = ['asset_id', 'asset_type', 'room_id', 'room_name', 'category', 'tier', 'component_id', 'component_name', 'component_kind', 'state_key', 'priority', 'prompt'];
  const esc = (v) => {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  return [headers.join(','), ...list.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n') + '\n';
}

function toMarkdown(batchId, title, note, list) {
  const lines = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`- Batch ID: \`${batchId}\``);
  lines.push(`- Purpose: ${note}`);
  lines.push(`- Asset Count: ${list.length}`);
  lines.push('');
  lines.push('## Ordered Prompt List');
  lines.push('');

  let idx = 1;
  for (const row of list) {
    lines.push(`${idx}. \`${row.asset_id}\` (${row.asset_type}, ${row.priority})`);
    lines.push(`   Prompt: ${row.prompt}`);
    idx += 1;
  }

  return lines.join('\n') + '\n';
}

fs.mkdirSync(outDir, { recursive: true });

const globals = rows.filter(isGlobalRow);
const p2UsagePack = sortRows(rows.filter((r) => r.asset_type === 'state_variant' && r.state_key.startsWith('usage_')));

const manifests = [];

for (const stage of progression) {
  const scoped = byRooms(rows, stage.includeRooms);
  const trimmed = sortRows(baseTrim([...globals, ...scoped], stage.includePriorities, stage.includeUsageStates));
  const batchId = `batch_${stage.level.toLowerCase()}_${stage.ship}`;
  const title = `${stage.level} ${stage.ship} Core Production`;

  const payload = {
    batch_id: batchId,
    title,
    level: stage.level,
    ship_type: stage.ship,
    note: stage.note,
    include_usage_states: stage.includeUsageStates,
    room_ids: stage.includeRooms,
    totals: {
      assets: trimmed.length,
      components: trimmed.filter((r) => r.asset_type === 'component').length,
      states: trimmed.filter((r) => r.asset_type === 'state_variant').length,
      composites: trimmed.filter((r) => r.asset_type === 'room_composite').length
    },
    rows: trimmed
  };

  manifests.push(payload);
  fs.writeFileSync(path.join(outDir, `${batchId}.json`), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outDir, `${batchId}.csv`), toCsv(trimmed), 'utf8');
  fs.writeFileSync(path.join(outDir, `${batchId}.md`), toMarkdown(batchId, title, stage.note, trimmed), 'utf8');
}

const advancedRows = sortRows(baseTrim([...globals, ...byRooms(rows, advancedRND.includeRooms)], advancedRND.includePriorities, advancedRND.includeUsageStates));
const advancedPayload = {
  batch_id: advancedRND.batch_id,
  title: advancedRND.title,
  note: advancedRND.note,
  room_ids: advancedRND.includeRooms,
  include_usage_states: advancedRND.includeUsageStates,
  totals: {
    assets: advancedRows.length,
    components: advancedRows.filter((r) => r.asset_type === 'component').length,
    states: advancedRows.filter((r) => r.asset_type === 'state_variant').length,
    composites: advancedRows.filter((r) => r.asset_type === 'room_composite').length
  },
  rows: advancedRows
};
manifests.push(advancedPayload);
fs.writeFileSync(path.join(outDir, `${advancedRND.batch_id}.json`), JSON.stringify(advancedPayload, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(outDir, `${advancedRND.batch_id}.csv`), toCsv(advancedRows), 'utf8');
fs.writeFileSync(path.join(outDir, `${advancedRND.batch_id}.md`), toMarkdown(advancedRND.batch_id, advancedRND.title, advancedRND.note, advancedRows), 'utf8');

const usagePayload = {
  batch_id: 'batch_usage_state_variants_all_rooms',
  title: 'Usage-State Variants (All Rooms)',
  note: 'Deferred p2 pack for runtime wear/consumption visuals',
  totals: {
    assets: p2UsagePack.length,
    states: p2UsagePack.length
  },
  rows: p2UsagePack
};
manifests.push(usagePayload);
fs.writeFileSync(path.join(outDir, 'batch_usage_state_variants_all_rooms.json'), JSON.stringify(usagePayload, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(outDir, 'batch_usage_state_variants_all_rooms.csv'), toCsv(p2UsagePack), 'utf8');
fs.writeFileSync(path.join(outDir, 'batch_usage_state_variants_all_rooms.md'), toMarkdown('batch_usage_state_variants_all_rooms', 'Usage-State Variants (All Rooms)', usagePayload.note, p2UsagePack), 'utf8');

const index = {
  generated_on: new Date().toISOString(),
  source: 'scene/assets/Rooms/checklists/room_component_asset_checklist.json',
  batches: manifests.map((m) => ({
    batch_id: m.batch_id,
    title: m.title,
    note: m.note,
    totals: m.totals,
    files: {
      json: `${m.batch_id}.json`,
      csv: `${m.batch_id}.csv`,
      md: `${m.batch_id}.md`
    }
  }))
};

fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');

const indexMd = [
  '# Room Asset Trimmed Batch Index',
  '',
  `Generated: ${index.generated_on}`,
  `Source: \`${index.source}\``,
  '',
  '## Batches',
  ...index.batches.map((b, i) => `${i + 1}. \`${b.batch_id}\` - ${b.title} (${b.totals.assets} assets)`),
  ''
].join('\n');
fs.writeFileSync(path.join(outDir, 'index.md'), indexMd, 'utf8');

console.log(`Wrote ${manifests.length} batch manifests + index to ${outDir}`);
for (const m of manifests) {
  console.log(`${m.batch_id}: ${m.totals.assets} assets`);
}
