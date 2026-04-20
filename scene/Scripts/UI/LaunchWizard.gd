extends Control
## Mobile-first launch wizard — Contractor → Target → Rocket → Confirm.
## Static scaffold (header / scroll / footer) is defined in LaunchWizard.tscn
## so designers can adjust layout in the Godot editor without touching this file.
## Dynamic card content is built here at runtime.

const RocketSpecs    = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const MapStepScript  = preload("res://Scripts/UI/LaunchWizardMapStep.gd")

enum Step { CONTRACTOR = 0, TARGET = 1, ROCKET = 2, CONFIRM = 3 }

# ── Palette ───────────────────────────────────────────────────────────────────
const C_HEADER_BG   := Color(0.055, 0.086, 0.165, 1.0)  # deep space navy
const C_ACCENT      := Color(0.220, 0.540, 0.800, 1.0)  # ice blue — CTAs
const C_ACCENT_DIM  := Color(0.160, 0.420, 0.650, 1.0)  # hover / dim
const C_ICE_TINT    := Color(0.820, 0.918, 0.960, 1.0)  # pale ice — selected bg
const C_ICE_TINT_BG := Color(0.820, 0.918, 0.960, 0.35)
const C_PAGE_BG     := Color(0.940, 0.950, 0.965, 1.0)
const C_SURF_LOW    := Color(0.928, 0.940, 0.955, 1.0)
const C_SURF_LOWEST := Color(1.000, 1.000, 1.000, 1.0)
const C_ON_SURF     := Color(0.106, 0.137, 0.196, 1.0)
const C_ON_SURF_VAR := Color(0.330, 0.380, 0.450, 1.0)
const C_SHADOW      := Color(0.055, 0.086, 0.165, 0.10)
const C_WHITE       := Color(1.000, 1.000, 1.000, 1.0)
const C_OK          := Color(0.129, 0.588, 0.486, 1.0)
const C_WARN        := Color(0.851, 0.467, 0.024, 1.0)
const C_LOCK        := Color(0.520, 0.560, 0.610, 1.0)

# Mineral chip tint colours
const MINERAL_TINTS: Dictionary = {
	"Iron":      Color(0.90, 0.58, 0.28),
	"Nickel":    Color(0.55, 0.68, 0.78),
	"Cobalt":    Color(0.28, 0.48, 0.84),
	"Silicates": Color(0.72, 0.74, 0.40),
	"Platinum":  Color(0.78, 0.82, 0.92),
	"Gold":      Color(0.92, 0.78, 0.16),
}

# Visual rocket component specs (cosmetic only — launch uses rocket type)
const ROCKET_PARTS: Dictionary = {
	"starterrocket1": [
		{"name": "CMD ALPHA",  "color": Color(0.66, 0.76, 0.88), "h": 38},
		{"name": "T-100 TANK", "color": Color(0.48, 0.60, 0.78), "h": 56},
		{"name": "E-CORE",     "color": Color(0.34, 0.48, 0.72), "h": 44},
	],
	"starterrocket2": [
		{"name": "CMD BETA",   "color": Color(0.66, 0.76, 0.88), "h": 42},
		{"name": "T-200 TANK", "color": Color(0.48, 0.60, 0.78), "h": 72},
		{"name": "ION DRIVE",  "color": Color(0.26, 0.42, 0.68), "h": 52},
	],
	"starterrocket3": [
		{"name": "CMD BETA",     "color": Color(0.66, 0.76, 0.88), "h": 42},
		{"name": "T-200 × 2",   "color": Color(0.48, 0.60, 0.78), "h": 92},
		{"name": "ION DRV × 3", "color": Color(0.22, 0.38, 0.65), "h": 62},
	],
}

# ── State ─────────────────────────────────────────────────────────────────────
var _step: Step = Step.CONTRACTOR
var _selected_contractor: Dictionary = {}
var _selected_target:     Dictionary = {}
var _selected_rocket:     String     = ""
var _is_free_ops:         bool       = false
var _contractors:         Array      = []
var _targets:             Array      = []
var _rockets:             Array      = []

# Live-update widget refs
var _map_step:        MapStepScript = null
var _target_detail:   PanelContainer      = null
var _assembly_vbox:   VBoxContainer       = null

signal back_pressed
signal launched(rocket_id: String, target_id: String)

# ── Scene nodes (from LaunchWizard.tscn) ──────────────────────────────────────
@onready var _background:   ColorRect       = $Background
@onready var _header_bg:    ColorRect       = $Scaffold/Header/HeaderBg
@onready var _header_title: Label           = $Scaffold/Header/HeaderRow/StepTitle
@onready var _dot_box:      HBoxContainer   = $Scaffold/Header/HeaderRow/DotBox
@onready var _back_btn:     Button          = $Scaffold/Header/HeaderRow/BackBtn
@onready var _scroll:       ScrollContainer = $Scaffold/Scroll
@onready var _card_list:    VBoxContainer   = $Scaffold/Scroll/ScrollMargin/CardList
@onready var _footer_bg:    ColorRect       = $Scaffold/Footer/FooterBg
@onready var _cancel_btn:   Button          = $Scaffold/Footer/FooterRow/CancelBtn
@onready var _next_btn:     Button          = $Scaffold/Footer/FooterRow/NextBtn

var _step_dots: Array = []

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	_apply_styles()
	_create_dots()
	_wire_buttons()
	_card_list.add_theme_constant_override("separation", 16)
	_show_step(Step.CONTRACTOR)

func _apply_styles() -> void:
	_background.color = C_PAGE_BG
	_header_bg.color  = C_HEADER_BG
	_footer_bg.color  = C_SURF_LOW

	_back_btn.add_theme_color_override("font_color", C_WHITE)
	_back_btn.add_theme_font_size_override("font_size", 32)

	_header_title.add_theme_color_override("font_color", C_WHITE)
	_header_title.add_theme_font_size_override("font_size", 20)

	_cancel_btn.add_theme_color_override("font_color", C_ON_SURF_VAR)
	_cancel_btn.add_theme_font_size_override("font_size", 16)
	_cancel_btn.add_theme_stylebox_override("normal",  _box(C_SURF_LOWEST, 12))
	_cancel_btn.add_theme_stylebox_override("hover",   _box(C_ICE_TINT, 12))
	_cancel_btn.add_theme_stylebox_override("pressed", _box(C_ICE_TINT, 12))
	_cancel_btn.add_theme_stylebox_override("focus",   _box(C_SURF_LOWEST, 12))

	_next_btn.add_theme_color_override("font_color", C_WHITE)
	_next_btn.add_theme_font_size_override("font_size", 17)
	_next_btn.add_theme_stylebox_override("normal",   _box(C_ACCENT, 12))
	_next_btn.add_theme_stylebox_override("hover",    _box(C_ACCENT_DIM, 12))
	_next_btn.add_theme_stylebox_override("pressed",  _box(C_ACCENT_DIM, 12))
	_next_btn.add_theme_stylebox_override("focus",    _box(C_ACCENT, 12))
	_next_btn.add_theme_stylebox_override("disabled", _box(Color(0.6, 0.6, 0.6, 1.0), 12))

func _create_dots() -> void:
	_step_dots.clear()
	for _i in 4:
		var d := ColorRect.new()
		d.custom_minimum_size = Vector2(8, 8)
		d.color = Color(1, 1, 1, 0.3)
		_dot_box.add_child(d)
		_step_dots.append(d)

func _wire_buttons() -> void:
	_back_btn.pressed.connect(_on_back)
	_cancel_btn.pressed.connect(_on_cancel)
	_next_btn.pressed.connect(_on_next)

# ── Step management ───────────────────────────────────────────────────────────

func _show_step(s: Step) -> void:
	_step          = s
	_map_step      = null
	_target_detail = null
	_assembly_vbox = null
	_update_header()
	_update_dots()
	_update_footer()
	if _scroll:
		_scroll.scroll_vertical = 0
	var tw := create_tween()
	tw.set_ease(Tween.EASE_IN_OUT)
	tw.tween_property(_card_list, "modulate:a", 0.0, 0.10)
	tw.tween_callback(_rebuild_cards)
	tw.tween_property(_card_list, "modulate:a", 1.0, 0.16)

func _update_header() -> void:
	const TITLES := ["Select Contractor", "Select Target", "Build Rocket", "Confirm Launch"]
	_header_title.text = TITLES[_step]

func _update_dots() -> void:
	for i in _step_dots.size():
		_step_dots[i].color = C_WHITE if i == int(_step) else Color(1, 1, 1, 0.3)

func _update_footer() -> void:
	match _step:
		Step.CONTRACTOR:
			_cancel_btn.text   = "Cancel"
			_next_btn.text     = "Next →"
			_next_btn.disabled = _selected_contractor.is_empty()
		Step.TARGET:
			_cancel_btn.text   = "← Back"
			_next_btn.text     = "Next →"
			_next_btn.disabled = _selected_target.is_empty()
		Step.ROCKET:
			_cancel_btn.text   = "← Back"
			_next_btn.text     = "Next →"
			_next_btn.disabled = _selected_rocket.is_empty()
		Step.CONFIRM:
			_cancel_btn.text   = "← Back"
			_next_btn.text     = "Launch Mission"
			_next_btn.disabled = false

func _on_back() -> void:
	if _step == Step.CONTRACTOR:
		back_pressed.emit()
	else:
		_show_step((int(_step) - 1) as Step)

func _on_cancel() -> void:
	if _step == Step.CONTRACTOR:
		back_pressed.emit()
	else:
		_show_step((int(_step) - 1) as Step)

func _on_next() -> void:
	if _step == Step.CONFIRM:
		_execute_launch()
	else:
		_show_step((int(_step) + 1) as Step)

# ── Card rebuild ──────────────────────────────────────────────────────────────

func _rebuild_cards() -> void:
	for child in _card_list.get_children():
		child.queue_free()
	match _step:
		Step.CONTRACTOR: _build_contractor_step()
		Step.TARGET:     _build_target_step()
		Step.ROCKET:     _build_rocket_step()
		Step.CONFIRM:    _build_confirm_step()

# ── Step: Contractor ──────────────────────────────────────────────────────────

func _build_contractor_step() -> void:
	_is_free_ops = RocketsManager.is_free_operations_unlocked()
	var stage    := RocketsManager.get_mission_stage()

	_add_section_label(
		"Mission %d" % stage,
		"Choose who you're mining for — they define the minerals you need to extract and your payout."
	)

	if _is_free_ops:
		RocketsManager.ensure_trip_contract_offer()
		_contractors = RocketsManager.get_trip_contractors()
	else:
		RocketsManager.ensure_starter_contract_offer()
		_contractors = RocketsManager.get_starter_contractors()

	if _contractors.is_empty():
		_add_empty_msg("No contractors available right now.")
	else:
		for c in _contractors:
			_add_contractor_card(c)

	_add_custom_mission_locked()

func _add_contractor_card(c: Dictionary) -> void:
	var c_id      := str(c.get("id", ""))
	var c_name    := str(c.get("name", "Unknown"))
	var c_focus   := str(c.get("focus", c.get("role", "")))
	var minerals  := c.get("requested_minerals", {}) as Dictionary
	var selected  := c_id == str(_selected_contractor.get("id", ""))
	var icon      := _contractor_icon(c_focus)

	# ── Outer card shell (white / selected-tinted, rounded, shadow) ──
	var card      := _make_card(selected, false)
	card.clip_contents = true
	_card_list.add_child(card)

	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 0)
	card.add_child(outer)

	# ── Coloured header band ──
	var band    := PanelContainer.new()
	var band_s  := StyleBoxFlat.new()
	band_s.bg_color                  = C_HEADER_BG if selected else C_ACCENT
	band_s.corner_radius_top_left    = 12
	band_s.corner_radius_top_right   = 12
	band_s.content_margin_left       = 14
	band_s.content_margin_right      = 14
	band_s.content_margin_top        = 12
	band_s.content_margin_bottom     = 12
	band.add_theme_stylebox_override("panel", band_s)
	outer.add_child(band)

	var band_row := HBoxContainer.new()
	band_row.add_theme_constant_override("separation", 10)
	band.add_child(band_row)

	var icon_lbl := _label(icon, C_WHITE, 26)
	icon_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	band_row.add_child(icon_lbl)

	var name_col := VBoxContainer.new()
	name_col.add_theme_constant_override("separation", 3)
	name_col.size_flags_horizontal = SIZE_EXPAND_FILL
	band_row.add_child(name_col)
	name_col.add_child(_label(c_name, C_WHITE, 21))
	if c_focus:
		var fl := _label(c_focus, Color(0.82, 0.92, 0.97, 0.88), 12)
		fl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		name_col.add_child(fl)

	if selected:
		var chk := _label("✓", C_WHITE, 22)
		chk.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		band_row.add_child(chk)

	# ── Body (minerals + button) ──
	var body := MarginContainer.new()
	body.add_theme_constant_override("margin_left",   14)
	body.add_theme_constant_override("margin_right",  14)
	body.add_theme_constant_override("margin_top",    12)
	body.add_theme_constant_override("margin_bottom", 12)
	outer.add_child(body)

	var body_col := VBoxContainer.new()
	body_col.add_theme_constant_override("separation", 10)
	body.add_child(body_col)

	if not minerals.is_empty():
		body_col.add_child(_label("Order requirements:", C_ON_SURF_VAR, 12))
		var chips := HBoxContainer.new()
		chips.add_theme_constant_override("separation", 6)
		body_col.add_child(chips)
		for mname: String in minerals:
			chips.add_child(_mineral_chip(mname, minerals[mname]))

	var btn_row := HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_END
	body_col.add_child(btn_row)

	var btn := _action_btn("Selected ✓" if selected else "Select", selected)
	btn.pressed.connect(func():
		_selected_contractor = c
		if _is_free_ops:
			RocketsManager.select_trip_contractor(c_id)
		else:
			RocketsManager.select_starter_contractor(c_id)
		_rebuild_cards()
		_update_footer()
	)
	btn_row.add_child(btn)

func _add_custom_mission_locked() -> void:
	var card := _make_card(false, true)
	card.modulate = Color(1, 1, 1, 0.52)
	_card_list.add_child(card)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	card.add_child(row)

	var lock := _label("🔒", C_LOCK, 28)
	lock.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	row.add_child(lock)

	var txt := VBoxContainer.new()
	txt.add_theme_constant_override("separation", 4)
	txt.size_flags_horizontal = SIZE_EXPAND_FILL
	row.add_child(txt)

	txt.add_child(_label("Custom Mission", C_ON_SURF, 18))
	var sub := _label("Design your own objective — unlocks after completing your first mission.", C_ON_SURF_VAR, 13)
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	txt.add_child(sub)

func _contractor_icon(focus: String) -> String:
	var f := focus.to_lower()
	if "defense" in f or "military" in f or "hardened" in f: return "🛡"
	if "consumer" in f or "electronic" in f or "device" in f: return "💡"
	if "orbital" in f or "frontier" in f:                     return "🛸"
	if "propulsion" in f or "launch" in f or "fuel" in f:     return "🚀"
	if "mining" in f or "extraction" in f or "ore" in f:      return "⛏"
	if "research" in f or "science" in f or "data" in f:      return "🔬"
	if "smelting" in f or "refin" in f or "specialist" in f:  return "⚗"
	return "🏭"

# ── Step: Target ──────────────────────────────────────────────────────────────

func _build_target_step() -> void:
	var stage := RocketsManager.get_mission_stage()
	_targets = RocketsManager.get_selectable_targets_for_stage(stage)
	if _targets.is_empty():
		_targets = RocketsManager.get_selectable_targets_for_stage()

	_add_section_label("Select destination", "Tap a target on the map to choose where your rocket is headed.")

	if _targets.is_empty():
		_add_empty_msg("No targets available. Complete a scan mission first.")
		return

	# ── Orbital map ──
	var map_wrap := PanelContainer.new()
	map_wrap.size_flags_horizontal = SIZE_EXPAND_FILL
	map_wrap.custom_minimum_size   = Vector2(0, 420)
	var mws := StyleBoxFlat.new()
	mws.bg_color                  = Color(0.028, 0.047, 0.118, 1.0)
	mws.corner_radius_top_left    = 12
	mws.corner_radius_top_right   = 12
	mws.corner_radius_bottom_left = 12
	mws.corner_radius_bottom_right= 12
	map_wrap.add_theme_stylebox_override("panel", mws)
	_card_list.add_child(map_wrap)

	var map := MapStepScript.new()
	map.size_flags_horizontal = SIZE_EXPAND_FILL
	map.size_flags_vertical   = SIZE_EXPAND_FILL
	map_wrap.add_child(map)
	_map_step = map
	map.setup(_targets, str(_selected_target.get("id", "")))
	map.target_selected.connect(_on_map_target_selected)

	# ── Detail panel (populated on selection) ──
	_target_detail = _make_card(false, true)
	_card_list.add_child(_target_detail)

	if _selected_target.is_empty():
		var hint := _label("← Tap a target on the map above", C_ON_SURF_VAR, 14)
		hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_target_detail.add_child(hint)
	else:
		_refresh_target_detail(_selected_target)

func _on_map_target_selected(t: Dictionary) -> void:
	_selected_target = t
	RocketsManager.select_target(str(t.get("id", "")))
	_update_footer()
	_refresh_target_detail(t)

func _refresh_target_detail(t: Dictionary) -> void:
	if not _target_detail or not is_instance_valid(_target_detail):
		return
	for c in _target_detail.get_children():
		c.queue_free()

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	_target_detail.add_child(vbox)

	var t_label  := str(t.get("label", t.get("name", "Unknown")))
	var t_type   := str(t.get("type", "asteroid"))
	var t_dist   := float(t.get("distance_au", 0.0))
	var t_reward := RocketsManager.get_target_reward_ratio(str(t.get("id", "")))

	var row1 := HBoxContainer.new()
	row1.add_theme_constant_override("separation", 10)
	vbox.add_child(row1)
	row1.add_child(_label("🪐" if t_type == "planet" else "☄", C_ACCENT, 26))
	var nlbl := _label(t_label, C_ON_SURF, 20)
	nlbl.size_flags_horizontal = SIZE_EXPAND_FILL
	row1.add_child(nlbl)

	var stats := HBoxContainer.new()
	stats.add_theme_constant_override("separation", 28)
	vbox.add_child(stats)
	for pair: Array in [
		["Type",     t_type.capitalize()],
		["Distance", "%.1f AU" % t_dist],
		["Yield",    "%d%%" % int(t_reward * 100)],
	]:
		stats.add_child(_stat_chip(str(pair[0]), str(pair[1])))

# ── Step: Rocket ──────────────────────────────────────────────────────────────

func _build_rocket_step() -> void:
	_rockets = RocketsManager.get_unlocked()
	_add_section_label("Build your rocket", "Select a vehicle — see how its components stack up before launch.")

	if _rockets.is_empty():
		_add_empty_msg("No rockets unlocked yet.")
		return

	# ── 2-column layout ──
	var builder := HBoxContainer.new()
	builder.size_flags_horizontal = SIZE_EXPAND_FILL
	builder.add_theme_constant_override("separation", 10)
	_card_list.add_child(builder)

	# Left: rocket selection tiles
	var list_col := VBoxContainer.new()
	list_col.add_theme_constant_override("separation", 8)
	list_col.size_flags_horizontal    = SIZE_EXPAND_FILL
	list_col.size_flags_stretch_ratio = 0.48
	builder.add_child(list_col)

	for r in _rockets:
		_add_rocket_tile(r, list_col)

	# Right: assembly preview panel
	var asm_panel := PanelContainer.new()
	asm_panel.size_flags_horizontal    = SIZE_EXPAND_FILL
	asm_panel.size_flags_stretch_ratio = 0.52
	asm_panel.custom_minimum_size      = Vector2(0, 260)
	var aps := StyleBoxFlat.new()
	aps.bg_color                   = Color(0.040, 0.062, 0.118, 1.0)
	aps.corner_radius_top_left     = 12
	aps.corner_radius_top_right    = 12
	aps.corner_radius_bottom_left  = 12
	aps.corner_radius_bottom_right = 12
	asm_panel.add_theme_stylebox_override("panel", aps)
	builder.add_child(asm_panel)

	var asm_margin := MarginContainer.new()
	asm_margin.add_theme_constant_override("margin_left",   10)
	asm_margin.add_theme_constant_override("margin_right",  10)
	asm_margin.add_theme_constant_override("margin_top",    12)
	asm_margin.add_theme_constant_override("margin_bottom", 12)
	asm_panel.add_child(asm_margin)

	var asm_outer := VBoxContainer.new()
	asm_outer.add_theme_constant_override("separation", 6)
	asm_margin.add_child(asm_outer)

	var asm_title := _label("ASSEMBLY", Color(0.82, 0.92, 0.97, 0.50), 14)
	asm_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	asm_outer.add_child(asm_title)

	_assembly_vbox = VBoxContainer.new()
	_assembly_vbox.add_theme_constant_override("separation", 3)
	_assembly_vbox.size_flags_vertical = SIZE_EXPAND_FILL
	_assembly_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	asm_outer.add_child(_assembly_vbox)

	# Launchpad bar at the bottom
	var pad := ColorRect.new()
	pad.custom_minimum_size = Vector2(0, 5)
	pad.color = Color(C_ACCENT, 0.45)
	asm_outer.add_child(pad)

	if _selected_rocket:
		_refresh_assembly(_selected_rocket)
	else:
		var hint := _label("← Select\na rocket", Color(0.82, 0.92, 0.97, 0.30), 13)
		hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_assembly_vbox.add_child(hint)

func _add_rocket_tile(rtype: String, parent: VBoxContainer) -> void:
	var selected := rtype == _selected_rocket
	var card     := _make_card(selected, true)
	parent.add_child(card)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	card.add_child(vbox)

	var row1 := HBoxContainer.new()
	row1.add_theme_constant_override("separation", 8)
	vbox.add_child(row1)
	row1.add_child(_label("🚀", C_ACCENT, 24))
	var nlbl := _label(RocketSpecs.get_display_name(rtype), C_ON_SURF, 19)
	nlbl.size_flags_horizontal = SIZE_EXPAND_FILL
	row1.add_child(nlbl)
	if selected:
		row1.add_child(_label("✓", C_ACCENT, 20))

	var stats_row := HBoxContainer.new()
	stats_row.add_theme_constant_override("separation", 12)
	vbox.add_child(stats_row)
	var cost_b := RocketSpecs.get_cost(rtype) / 1_000_000_000
	for pair: Array in [
		["Speed",  "%.1fx" % RocketSpecs.get_speed_multiplier(rtype)],
		["Cargo",  "%.1fx" % RocketSpecs.get_cargo_multiplier(rtype)],
		["Cost",   "%dB F" % cost_b],
	]:
		stats_row.add_child(_stat_chip(str(pair[0]), str(pair[1])))

	var btn_row := HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_END
	vbox.add_child(btn_row)
	var btn := _action_btn("Selected ✓" if selected else "Select", selected)
	btn.pressed.connect(func():
		if _selected_rocket != rtype:
			_selected_rocket = rtype
			_update_footer()
			_refresh_assembly(rtype)
			# Rebuild tile styles without full step fade
			_rebuild_rocket_tiles(parent)
	)
	btn_row.add_child(btn)

func _rebuild_rocket_tiles(parent: VBoxContainer) -> void:
	for c in parent.get_children():
		c.queue_free()
	for r in _rockets:
		_add_rocket_tile(r, parent)

func _refresh_assembly(rtype: String) -> void:
	if not _assembly_vbox or not is_instance_valid(_assembly_vbox):
		return
	for c in _assembly_vbox.get_children():
		c.queue_free()

	var parts: Array = ROCKET_PARTS.get(rtype, [
		{"name": "CMD POD", "color": Color(0.66, 0.76, 0.88), "h": 40},
		{"name": "TANK",    "color": Color(0.48, 0.60, 0.78), "h": 60},
		{"name": "ENGINE",  "color": Color(0.34, 0.48, 0.72), "h": 44},
	])

	var delay := 0.0
	for part: Dictionary in parts:
		var pbox := PanelContainer.new()
		pbox.size_flags_horizontal = SIZE_EXPAND_FILL
		pbox.custom_minimum_size   = Vector2(0, int(part.get("h", 40)))
		var ps := StyleBoxFlat.new()
		var pc: Color = part.get("color", C_ACCENT)
		ps.bg_color                  = pc
		ps.corner_radius_top_left    = 6
		ps.corner_radius_top_right   = 6
		ps.corner_radius_bottom_left = 6
		ps.corner_radius_bottom_right= 6
		ps.border_width_left         = 1
		ps.border_width_right        = 1
		ps.border_width_top          = 1
		ps.border_width_bottom       = 1
		ps.border_color              = Color(1, 1, 1, 0.22)
		ps.content_margin_left       = 6
		ps.content_margin_right      = 6
		ps.content_margin_top        = 4
		ps.content_margin_bottom     = 4
		pbox.add_theme_stylebox_override("panel", ps)

		var plbl := _label(str(part.get("name", "")), Color(1, 1, 1, 0.88), 14)
		plbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		plbl.vertical_alignment   = VERTICAL_ALIGNMENT_CENTER
		pbox.add_child(plbl)
		_assembly_vbox.add_child(pbox)

		# Snap-in animation: fade in sequentially (no position tween — VBoxContainer overrides it)
		pbox.modulate.a = 0.0
		var tw := create_tween()
		tw.tween_interval(delay)
		tw.tween_property(pbox, "modulate:a", 1.0, 0.22).set_ease(Tween.EASE_OUT)
		delay += 0.12

# ── Step: Confirm ─────────────────────────────────────────────────────────────

func _build_confirm_step() -> void:
	_add_section_label("Ready to launch", "Review your mission before the rocket departs.")

	var card := _make_card(false, true)
	_card_list.add_child(card)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 14)
	card.add_child(vbox)

	var c_name   := str(_selected_contractor.get("name", "—"))
	var t_label  := str(_selected_target.get("label", _selected_target.get("name", "—")))
	var r_name   := RocketSpecs.get_display_name(_selected_rocket) if _selected_rocket else "—"
	var cost_str := ("%dB F" % (RocketSpecs.get_cost(_selected_rocket) / 1_000_000_000)) if _selected_rocket else "—"

	for row: Array in [
		["🏭", "Contractor", c_name],
		["🎯", "Target",     t_label],
		["🚀", "Rocket",     r_name],
		["💰", "Cost",       cost_str],
	]:
		var hbox := HBoxContainer.new()
		hbox.add_theme_constant_override("separation", 10)
		vbox.add_child(hbox)
		hbox.add_child(_label(str(row[0]), C_ACCENT, 18))
		var kl := _label(str(row[1]), C_ON_SURF_VAR, 14)
		kl.custom_minimum_size = Vector2(100, 0)
		hbox.add_child(kl)
		var vl := _label(str(row[2]), C_ON_SURF, 16)
		vl.size_flags_horizontal = SIZE_EXPAND_FILL
		hbox.add_child(vl)

	var div := ColorRect.new()
	div.custom_minimum_size = Vector2(0, 1)
	div.color = C_SURF_LOW
	vbox.add_child(div)

	if _selected_rocket:
		var dur_sec := RocketSpecs.get_mission_seconds(_selected_rocket)
		vbox.add_child(_label("Estimated travel time: ~%d min" % (dur_sec / 60), C_ON_SURF_VAR, 13))

	var note := _label("Once launched the rocket departs immediately.", C_ACCENT_DIM, 13)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(note)

# ── Launch execution ──────────────────────────────────────────────────────────

func _execute_launch() -> void:
	if _selected_rocket.is_empty() or _selected_target.is_empty():
		push_error("LaunchWizard: missing rocket or target selection")
		return
	var target_id := _selected_target.get("id", "") as String
	var rocket_id := RocketsManager.add_placed(_selected_rocket, Vector2.ZERO)
	if rocket_id.is_empty():
		push_error("LaunchWizard: add_placed failed for type " + _selected_rocket)
		return
	var launch_time := int(Time.get_unix_time_from_system())
	if not RocketsManager.add_mission(rocket_id, target_id, launch_time):
		push_error("LaunchWizard: add_mission failed")
		return
	var target_label := _selected_target.get("label", target_id) as String
	var target_type  := _selected_target.get("type",  "asteroid") as String
	RocketsManager.set_preview_target(target_id, target_label, target_type, rocket_id)
	launched.emit(rocket_id, target_id)

# ── Widget helpers ────────────────────────────────────────────────────────────

func _make_card(selected: bool, padded: bool) -> PanelContainer:
	var p := PanelContainer.new()
	p.size_flags_horizontal = SIZE_EXPAND_FILL
	var s := StyleBoxFlat.new()
	s.bg_color                   = C_ICE_TINT_BG if selected else C_SURF_LOWEST
	s.corner_radius_top_left     = 12
	s.corner_radius_top_right    = 12
	s.corner_radius_bottom_left  = 12
	s.corner_radius_bottom_right = 12
	s.shadow_color               = C_SHADOW
	s.shadow_size                = 6
	s.shadow_offset              = Vector2(0, 2)
	if padded:
		s.content_margin_left   = 16
		s.content_margin_right  = 16
		s.content_margin_top    = 14
		s.content_margin_bottom = 14
	if selected:
		s.border_width_left   = 2
		s.border_width_right  = 2
		s.border_width_top    = 2
		s.border_width_bottom = 2
		s.border_color        = C_ACCENT
	p.add_theme_stylebox_override("panel", s)
	return p

func _box(color: Color, radius: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color                   = color
	s.corner_radius_top_left     = radius
	s.corner_radius_top_right    = radius
	s.corner_radius_bottom_left  = radius
	s.corner_radius_bottom_right = radius
	s.content_margin_left        = 16
	s.content_margin_right       = 16
	s.content_margin_top         = 8
	s.content_margin_bottom      = 8
	return s

func _label(text: String, color: Color, size: int) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_color_override("font_color", color)
	l.add_theme_font_size_override("font_size", size)
	return l

func _action_btn(text: String, is_selected: bool) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(120, 40)
	var bg  := C_ICE_TINT if is_selected else C_ACCENT
	var fg  := C_ACCENT   if is_selected else C_WHITE
	btn.add_theme_color_override("font_color", fg)
	btn.add_theme_font_size_override("font_size", 15)
	btn.add_theme_stylebox_override("normal",  _box(bg, 8))
	btn.add_theme_stylebox_override("hover",   _box(C_ACCENT_DIM, 8))
	btn.add_theme_stylebox_override("pressed", _box(C_ACCENT_DIM, 8))
	btn.add_theme_stylebox_override("focus",   _box(bg, 8))
	return btn

func _stat_chip(key: String, val: String) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	v.add_child(_label(key, C_ON_SURF_VAR, 13))
	v.add_child(_label(val, C_ON_SURF,     18))
	return v

func _mineral_chip(mineral: String, qty: Variant) -> PanelContainer:
	var col: Color = MINERAL_TINTS.get(mineral, C_ACCENT)
	var p := PanelContainer.new()
	var s := StyleBoxFlat.new()
	s.bg_color                   = Color(col.r, col.g, col.b, 0.18)
	s.border_width_left          = 1
	s.border_width_right         = 1
	s.border_width_top           = 1
	s.border_width_bottom        = 1
	s.border_color               = Color(col.r, col.g, col.b, 0.65)
	s.corner_radius_top_left     = 6
	s.corner_radius_top_right    = 6
	s.corner_radius_bottom_left  = 6
	s.corner_radius_bottom_right = 6
	s.content_margin_left        = 8
	s.content_margin_right       = 8
	s.content_margin_top         = 3
	s.content_margin_bottom      = 3
	p.add_theme_stylebox_override("panel", s)
	var qty_int := int(float(str(qty)))
	var fg      := Color(col.r * 0.55, col.g * 0.55, col.b * 0.55, 1.0)
	p.add_child(_label("%s  %d" % [mineral, qty_int], fg, 12))
	return p

func _add_section_label(title: String, subtitle: String) -> void:
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	vbox.add_child(_label(title,    C_ON_SURF,     28))
	var sub := _label(subtitle, C_ON_SURF_VAR, 15)
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(sub)
	_card_list.add_child(vbox)

func _add_empty_msg(text: String) -> void:
	var lbl := _label(text, C_ON_SURF_VAR, 16)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_card_list.add_child(lbl)
