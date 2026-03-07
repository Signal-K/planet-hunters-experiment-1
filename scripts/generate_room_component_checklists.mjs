import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('scene/assets/Rooms/checklists');
const today = new Date().toISOString().slice(0, 10);

const styleAnchorPrompt = 'Side-view cross-section cutaway of a single spacecraft interior room module. Illustrated sci-fi game asset style — clean detailed linework, metallic silver-grey interior walls with visible panel seams and riveted bolts, recessed floor lighting strips, equipment glowing with coloured sci-fi accent lights. Dark background (#0D0B14 deep space purple, near-black). No text, no labels, no UI. The module is a rectangular tile — flat top and bottom edges so it can stack with other modules. Landscape 2:1 ratio. Consistent illustrated style like a mobile space exploration game concept art, similar to how Pixel Starships looks but rendered in a modern illustrated style rather than retro pixel art. Single module only, no rocket exterior visible.';

const footer = 'match this style exactly; side-view cutaway module language; no text/no labels/no UI; consistent line weight and colour temperature with reference.';

const defaultStates = ['idle', 'active', 'cooldown', 'damaged', 'depleted'];
const usageStates = ['usage_0_24', 'usage_25_49', 'usage_50_74', 'usage_75_99', 'usage_100'];

const stateCue = {
  idle: 'stable indicator lights, neutral glow, no motion cues',
  active: 'brighter active glow, subtle motion/energy cues, engaged indicators',
  cooldown: 'reduced glow with cooling/venting cues and amber warning flicker',
  damaged: 'visible wear, sparks or cracks, warning lights and degraded output',
  depleted: 'minimal or no glow, offline indicators, depleted resource cues',
  usage_0_24: 'clean surfaces, low heat bloom, minimal wear',
  usage_25_49: 'mild scorch marks and minor scratches, slightly warmer highlights',
  usage_50_74: 'moderate wear, heat bloom, visible scratches and warning tint',
  usage_75_99: 'heavy wear, strong warning glow, soot/scuffs and stressed materials',
  usage_100: 'near-failure/depleted look, severe wear, emergency warning cues'
};

const rooms = [
  {
    room_id: 'basic_thruster_t1', room_name: 'Basic Thruster Room', category: 'propulsion', tier: 1,
    structural: ['right_wall_nozzle_mount', 'fuel_pipe_network', 'worn_metal_paneling'],
    interactive: [
      { id: 'rocket_nozzle_assembly', name: 'Rocket Nozzle Assembly', usageDriven: true },
      { id: 'thrust_control_panel_2dial', name: '2-Dial Thrust Control Panel', usageDriven: false }
    ]
  },
  {
    room_id: 'fusion_drive_t2', room_name: 'Fusion Drive Room', category: 'propulsion', tier: 2,
    structural: ['chamber_cradle', 'magnetic_containment_rings', 'cooling_pipe_network'],
    interactive: [
      { id: 'plasma_chamber_core', name: 'Plasma Chamber Core', usageDriven: true },
      { id: 'monitoring_terminal', name: 'Monitoring Terminal', usageDriven: false }
    ]
  },
  {
    room_id: 'ion_drive_t3', room_name: 'Ion Drive Room', category: 'propulsion', tier: 3,
    structural: ['ion_thruster_housing', 'electromagnetic_coil_casing', 'xenon_canister_rack'],
    interactive: [
      { id: 'ion_thruster_array', name: 'Ion Thruster Array', usageDriven: true },
      { id: 'precision_computer_terminal', name: 'Precision Computer Terminal', usageDriven: false },
      { id: 'xenon_canister_manifold', name: 'Xenon Canister Manifold', usageDriven: true }
    ]
  },
  {
    room_id: 'small_reactor_t1', room_name: 'Small Reactor Core Room', category: 'power', tier: 1,
    structural: ['reactor_housing_cylinder', 'wall_conduit_trunk_lines'],
    interactive: [
      { id: 'compact_reactor_core_sphere', name: 'Compact Reactor Core Sphere', usageDriven: true },
      { id: 'indicator_control_panels_pair', name: 'Indicator Control Panels', usageDriven: false },
      { id: 'power_output_terminal', name: 'Power Output Terminal', usageDriven: false }
    ]
  },
  {
    room_id: 'fusion_reactor_t2', room_name: 'Fusion Reactor Room', category: 'power', tier: 2,
    structural: ['containment_vessel_frame', 'reinforced_glass_window', 'thick_conduit_trunks', 'bolted_floor_plate'],
    interactive: [
      { id: 'magenta_energy_orb', name: 'Magenta Energy Orb', usageDriven: true },
      { id: 'multi_screen_monitor_station', name: 'Multi-Screen Monitoring Station', usageDriven: false }
    ]
  },
  {
    room_id: 'power_capacitor_t2', room_name: 'Power Capacitor Room', category: 'power', tier: 2,
    structural: ['capacitor_rack_frame', 'ceiling_cable_runs'],
    interactive: [
      { id: 'capacitor_cell_bank', name: 'Capacitor Cell Bank', usageDriven: true },
      { id: 'central_discharge_switch_panel', name: 'Central Discharge Switch Panel', usageDriven: false }
    ]
  },
  {
    room_id: 'small_tank_t1', room_name: 'Small Fuel Tank Room', category: 'fuel', tier: 1,
    structural: ['dual_tank_mounts', 'floor_fuel_line_routing'],
    interactive: [
      { id: 'fuel_tanks_dual', name: 'Dual Fuel Tanks', usageDriven: true },
      { id: 'pressure_gauges_pair', name: 'Pressure Gauges', usageDriven: false },
      { id: 'valve_panel', name: 'Valve Panel', usageDriven: false },
      { id: 'frosted_fuel_viewport_small', name: 'Frosted Fuel Viewport', usageDriven: true }
    ]
  },
  {
    room_id: 'large_tank_t2', room_name: 'Large Fuel Tank Room', category: 'fuel', tier: 2,
    structural: ['heavy_wall_brackets', 'pump_base_assembly', 'warning_stripe_zone'],
    interactive: [
      { id: 'main_fuel_tank', name: 'Main Fuel Tank', usageDriven: true },
      { id: 'automated_pumping_unit', name: 'Automated Pumping Unit', usageDriven: true },
      { id: 'pressure_readout_cluster', name: 'Pressure Readout Cluster', usageDriven: false },
      { id: 'frosted_fuel_viewport_large', name: 'Large Fuel Viewport', usageDriven: true }
    ]
  },
  {
    room_id: 'cargo_bay_t1', room_name: 'Cargo Bay Room', category: 'storage', tier: 1,
    structural: ['floor_anchor_grid', 'ceiling_rail_track'],
    interactive: [
      { id: 'ore_crates_set', name: 'Ore Crates', usageDriven: true },
      { id: 'specimen_containers_clamped', name: 'Specimen Containers', usageDriven: true },
      { id: 'ceiling_robotic_arm', name: 'Ceiling Robotic Arm', usageDriven: true },
      { id: 'inventory_terminal', name: 'Inventory Terminal', usageDriven: false }
    ]
  },
  {
    room_id: 'resource_vault_t2', room_name: 'Pressurised Resource Vault Room', category: 'storage', tier: 2,
    structural: ['sealed_rack_system', 'gasketed_container_slots'],
    interactive: [
      { id: 'reinforced_containers', name: 'Reinforced Containers', usageDriven: true },
      { id: 'circular_vault_door', name: 'Circular Vault Door', usageDriven: false },
      { id: 'environmental_control_unit', name: 'Environmental Control Unit', usageDriven: false },
      { id: 'status_indicator_cluster', name: 'Status Indicator Cluster', usageDriven: false }
    ]
  },
  {
    room_id: 'mining_drill_t1', room_name: 'Mining Drill Room', category: 'mining', tier: 1,
    structural: ['drill_mount_frame', 'floor_dampener_pads', 'hatch_seam_lines'],
    interactive: [
      { id: 'folded_drill_arm', name: 'Folded Drill Arm', usageDriven: true },
      { id: 'drill_bit_exposed', name: 'Exposed Drill Bit', usageDriven: true },
      { id: 'drill_cable_drum', name: 'Drill Cable Drum', usageDriven: true },
      { id: 'deployment_control_terminal', name: 'Deployment Control Terminal', usageDriven: false },
      { id: 'floor_deployment_hatch', name: 'Floor Deployment Hatch', usageDriven: false }
    ]
  },
  {
    room_id: 'subsurface_probe_t2', room_name: 'Subsurface Probe Room', category: 'mining', tier: 2,
    structural: ['launch_tube_housing', 'floor_launch_doors'],
    interactive: [
      { id: 'subsurface_probe_body', name: 'Subsurface Probe Body', usageDriven: true },
      { id: 'probe_folded_antennae', name: 'Probe Folded Antennae', usageDriven: false },
      { id: 'targeting_terminal', name: 'Targeting Terminal', usageDriven: false }
    ]
  },
  {
    room_id: 'drone_bay_t2', room_name: 'Mining Drone Bay Room', category: 'mining', tier: 2,
    structural: ['drone_rack_mounts', 'floor_launch_hatch_seams'],
    interactive: [
      { id: 'mining_drones_triplet', name: 'Mining Drones (x3)', usageDriven: true },
      { id: 'drone_charging_cables', name: 'Drone Charging Cables', usageDriven: true },
      { id: 'launch_control_terminal', name: 'Launch Control Terminal', usageDriven: false },
      { id: 'floor_launch_hatch', name: 'Floor Launch Hatch', usageDriven: false }
    ]
  },
  {
    room_id: 'basic_nav_t1', room_name: 'Basic Navigation Room', category: 'navigation', tier: 1,
    structural: ['nav_console_station', 'viewport_frame_right'],
    interactive: [
      { id: 'holographic_star_map_emitter', name: 'Holographic Star Map Emitter', usageDriven: false },
      { id: 'radar_sweep_display', name: 'Radar Sweep Display', usageDriven: false },
      { id: 'manual_flight_controls', name: 'Manual Flight Controls', usageDriven: true }
    ]
  },
  {
    room_id: 'scanner_array_t2', room_name: 'Scanner Array Room', category: 'navigation', tier: 2,
    structural: ['dual_terminal_stations', 'dish_connection_ports'],
    interactive: [
      { id: 'anomaly_hologram_core', name: 'Anomaly Hologram Core', usageDriven: false },
      { id: 'sensor_sweep_side_screen', name: 'Sensor Sweep Side Screen', usageDriven: false },
      { id: 'operator_seat', name: 'Operator Seat', usageDriven: false }
    ]
  },
  {
    room_id: 'spectral_analyser_t3', room_name: 'Spectral Analyser Room', category: 'navigation', tier: 3,
    structural: ['central_plinth', 'sample_tray_rail'],
    interactive: [
      { id: 'spectral_splitter_prism', name: 'Spectral Splitter Prism', usageDriven: false },
      { id: 'composition_band_display', name: 'Composition Band Display', usageDriven: false },
      { id: 'analytical_sample_trays', name: 'Analytical Sample Trays', usageDriven: true },
      { id: 'spectrograph_output_screen', name: 'Spectrograph Output Screen', usageDriven: false }
    ]
  },
  {
    room_id: 'basic_hull_t1', room_name: 'Basic Hull Plating Module', category: 'hull', tier: 1,
    structural: ['layered_armour_wall', 'reinforcement_struts'],
    interactive: [
      { id: 'inspection_access_panel', name: 'Inspection Access Panel', usageDriven: false },
      { id: 'damage_indicator_strip', name: 'Damage Indicator Strip', usageDriven: true }
    ]
  },
  {
    room_id: 'ablative_armour_t3', room_name: 'Ablative Armour Module', category: 'hull', tier: 3,
    structural: ['composite_multi_layer_wall', 'heat_dissipation_fins'],
    interactive: [
      { id: 'nano_repair_node_array', name: 'Nano-Repair Node Array', usageDriven: true },
      { id: 'self_diagnostics_panel', name: 'Self-Diagnostics Panel', usageDriven: false }
    ]
  },
  {
    room_id: 'sample_lab_t2', room_name: 'Sample Analysis Lab Room', category: 'science', tier: 2,
    structural: ['central_workbench', 'wall_vial_rack'],
    interactive: [
      { id: 'specimen_trays', name: 'Specimen Trays', usageDriven: true },
      { id: 'microscope_arm', name: 'Microscope Arm', usageDriven: true },
      { id: 'containment_tubes_pair', name: 'Containment Tubes (x2)', usageDriven: true },
      { id: 'composition_readout_screen', name: 'Composition Readout Screen', usageDriven: false }
    ]
  },
  {
    room_id: 'telescope_t2', room_name: 'Telescope Observation Room', category: 'science', tier: 2,
    structural: ['telescope_mount', 'sealed_roof_aperture_housing'],
    interactive: [
      { id: 'telescope_tube_main', name: 'Telescope Tube', usageDriven: true },
      { id: 'data_recording_station', name: 'Data Recording Station', usageDriven: false },
      { id: 'circular_star_chart_display', name: 'Circular Star Chart Display', usageDriven: false },
      { id: 'observer_chair', name: 'Observer Chair', usageDriven: false }
    ]
  },
  {
    room_id: 'comms_relay_t1', room_name: 'Comms Relay Room', category: 'communication', tier: 1,
    structural: ['antenna_diagram_panel_zone', 'ceiling_booster_mount'],
    interactive: [
      { id: 'transmission_console', name: 'Transmission Console', usageDriven: false },
      { id: 'waveform_display', name: 'Waveform Display', usageDriven: false },
      { id: 'rotating_dish_mechanism', name: 'Rotating Dish Mechanism', usageDriven: true },
      { id: 'signal_booster_components', name: 'Signal Booster Components', usageDriven: false }
    ]
  },
  {
    room_id: 'broadcast_array_t2', room_name: 'Broadcast Array Room', category: 'communication', tier: 2,
    structural: ['wall_schematic_zone', 'rack_bay_frame'],
    interactive: [
      { id: 'phased_array_schematic_display', name: 'Phased-Array Schematic Display', usageDriven: false },
      { id: 'signal_processing_rack', name: 'Signal Processing Rack', usageDriven: true },
      { id: 'waveform_monitor_bank', name: 'Waveform Monitor Bank', usageDriven: false },
      { id: 'directional_control_joystick', name: 'Directional Control Joystick', usageDriven: true }
    ]
  }
];

const rows = [];

rows.push({
  asset_id: 'style_anchor_v1',
  asset_type: 'style_anchor',
  room_id: 'global',
  room_name: 'Global Style Anchor',
  category: 'global',
  tier: 'n/a',
  component_id: 'style_anchor',
  component_name: 'Style Anchor',
  component_kind: 'reference',
  state_key: 'base',
  prompt: `${styleAnchorPrompt} ${footer}`,
  priority: 'p0'
});

['starter', 'mid', 'high'].forEach((variant) => {
  rows.push({
    asset_id: `shell_kit_${variant}_v1`,
    asset_type: 'shell_kit',
    room_id: 'global',
    room_name: `Global Shell Kit (${variant})`,
    category: 'global',
    tier: 'n/a',
    component_id: `shell_${variant}`,
    component_name: `Room Shell ${variant}`,
    component_kind: 'structural',
    state_key: 'base',
    prompt: `Using the attached style reference, create an empty spacecraft interior room shell component variant '${variant}' with metallic panel seams, floor light strips, and stackable flat top/bottom module edges. No major equipment. 2:1 side-view cross-section. ${footer}`,
    priority: 'p0'
  });
});

for (const room of rooms) {
  for (const structural of room.structural) {
    rows.push({
      asset_id: `${room.room_id}__${structural}__base`,
      asset_type: 'component',
      room_id: room.room_id,
      room_name: room.room_name,
      category: room.category,
      tier: room.tier,
      component_id: structural,
      component_name: structural.replaceAll('_', ' '),
      component_kind: 'structural',
      state_key: 'base',
      prompt: `Using the attached style reference, create a single isolated room component sprite for a spacecraft dollhouse interior system. Component: ${structural}. Category: ${room.room_name}. Side-view cross-section, clean cutout silhouette, no text, no labels, no UI, no characters. Designed for 2:1 room tile composition. ${footer}`,
      priority: 'p1'
    });
  }

  for (const component of room.interactive) {
    rows.push({
      asset_id: `${room.room_id}__${component.id}__base`,
      asset_type: 'component',
      room_id: room.room_id,
      room_name: room.room_name,
      category: room.category,
      tier: room.tier,
      component_id: component.id,
      component_name: component.name,
      component_kind: 'interactive',
      state_key: 'base',
      prompt: `Using the attached style reference, create a single isolated room component sprite for a spacecraft dollhouse interior system. Component: ${component.name}. Category: ${room.room_name}. Side-view cross-section, clean cutout silhouette, no text, no labels, no UI, no characters. Designed for 2:1 room tile composition. ${footer}`,
      priority: 'p0'
    });

    const states = [...defaultStates, ...(component.usageDriven ? usageStates : [])];
    for (const state of states) {
      rows.push({
        asset_id: `${room.room_id}__${component.id}__${state}`,
        asset_type: 'state_variant',
        room_id: room.room_id,
        room_name: room.room_name,
        category: room.category,
        tier: room.tier,
        component_id: component.id,
        component_name: component.name,
        component_kind: 'interactive',
        state_key: state,
        prompt: `Using the attached style reference and matching the base component exactly, create state variant '${state}' for component '${component.name}' in '${room.room_name}'. Change only state cues: ${stateCue[state]}. Preserve camera, scale, line weight, material details. No text, no labels, no UI. ${footer}`,
        priority: state.startsWith('usage_') ? 'p2' : 'p1'
      });
    }
  }

  rows.push({
    asset_id: `${room.room_id}__room_composite__v1`,
    asset_type: 'room_composite',
    room_id: room.room_id,
    room_name: room.room_name,
    category: room.category,
    tier: room.tier,
    component_id: 'room_composite',
    component_name: 'Room Composite',
    component_kind: 'composite',
    state_key: 'base',
    prompt: `Using the attached style reference, compose one 2:1 spacecraft room tile for '${room.room_name}' using these components: ${room.structural.concat(room.interactive.map((i) => i.id)).join(', ')}. Keep module shell rectangular with flat top/bottom for stacking. Include only listed components and consistent accent lighting. No text, no labels, no UI, no rocket exterior. ${footer}`,
    priority: 'p0'
  });
}

const checklist = {
  generated_on: new Date().toISOString(),
  source_doc: '.knowns/docs/game-design/room-component-prompt-system-for-rocket-interiors.md',
  style_anchor_prompt: styleAnchorPrompt,
  footer_clause: footer,
  totals: {
    rooms: rooms.length,
    assets: rows.length,
    components: rows.filter((r) => r.asset_type === 'component').length,
    state_variants: rows.filter((r) => r.asset_type === 'state_variant').length,
    composites: rows.filter((r) => r.asset_type === 'room_composite').length
  },
  rooms,
  asset_rows: rows
};

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

const headers = [
  'asset_id', 'asset_type', 'room_id', 'room_name', 'category', 'tier',
  'component_id', 'component_name', 'component_kind', 'state_key', 'priority', 'prompt'
];
const csvLines = [headers.join(',')];
for (const row of rows) {
  csvLines.push(headers.map((h) => csvEscape(row[h])).join(','));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const jsonPath = path.join(OUT_DIR, 'room_component_asset_checklist.json');
const csvPath = path.join(OUT_DIR, 'room_component_asset_checklist.csv');
fs.writeFileSync(jsonPath, `${JSON.stringify(checklist, null, 2)}\n`, 'utf8');
fs.writeFileSync(csvPath, `${csvLines.join('\n')}\n`, 'utf8');

const summaryPath = path.join(OUT_DIR, 'room_component_asset_checklist_summary.txt');
fs.writeFileSync(summaryPath, [
  `Generated: ${today}`,
  `Rooms: ${checklist.totals.rooms}`,
  `Total assets: ${checklist.totals.assets}`,
  `Base components: ${checklist.totals.components}`,
  `State variants: ${checklist.totals.state_variants}`,
  `Room composites: ${checklist.totals.composites}`,
  `JSON: ${jsonPath}`,
  `CSV: ${csvPath}`
].join('\n') + '\n', 'utf8');

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${csvPath}`);
console.log(`Wrote ${summaryPath}`);
console.log(`Totals: ${checklist.totals.assets} assets across ${checklist.totals.rooms} rooms`);
