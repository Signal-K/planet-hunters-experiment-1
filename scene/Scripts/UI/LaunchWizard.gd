extends Control
## Mobile-first launch wizard — Contractor > Target > Rocket > Confirm.
## Static scaffold (header / scroll / footer) is defined in LaunchWizard.tscn
## so designers can adjust layout in the Godot editor without touching this file.
## Dynamic card content is built here at runtime.

const RocketSpecs    = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const MapStepScript  = preload("res://Scripts/UI/LaunchWizardMapStep.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const AsteroidDetailViewScene = preload("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn")
const ContractorCardScene = preload("res://Scenes/UI/Templates/LaunchWizardContractorCard.tscn")
const MineralChipScene = preload("res://Scenes/UI/Templates/LaunchWizardMineralChip.tscn")
const RocketTileScene = preload("res://Scenes/UI/Templates/LaunchWizardRocketTile.tscn")
const RocketPartScene = preload("res://Scenes/UI/Templates/LaunchWizardRocketPart.tscn")
const ConfirmRowScene = preload("res://Scenes/UI/Templates/LaunchWizardConfirmRow.tscn")
const StatChipScene = preload("res://Scenes/UI/Templates/LaunchWizardStatChip.tscn")
const TargetDetailScene = preload("res://Scenes/UI/Templates/LaunchWizardTargetDetail.tscn")
const EmptyStateLabelScene = preload("res://Scenes/UI/Templates/LaunchWizardEmptyStateLabel.tscn")

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
const C_CONTRACT_BG := Color(0.038, 0.058, 0.112, 1.0)
const C_CONTRACT_BG_2 := Color(0.055, 0.082, 0.150, 1.0)
const C_ON_SURF     := Color(0.106, 0.137, 0.196, 1.0)
const C_ON_SURF_VAR := Color(0.330, 0.380, 0.450, 1.0)
const C_ON_DARK     := Color(0.900, 0.940, 0.980, 1.0)
const C_ON_DARK_VAR := Color(0.640, 0.730, 0.840, 1.0)
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
var _m3_review_auto_target_id: String = ""

# Live-update widget refs
var _map_step:          MapStepScript  = null
var _target_detail:     PanelContainer = null
var _assembly_vbox:     VBoxContainer  = null
var _asm_status_label:  Label          = null
var _asm_tweens:        Array          = []

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
@onready var _contractor_step: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/ContractorStep
@onready var _contractor_title: Label = $Scaffold/Scroll/ScrollMargin/CardList/ContractorStep/IntroPanel/Margin/VBox/TitleLabel
@onready var _contractor_subtitle: Label = $Scaffold/Scroll/ScrollMargin/CardList/ContractorStep/IntroPanel/Margin/VBox/SubtitleLabel
@onready var _contractor_grid: GridContainer = $Scaffold/Scroll/ScrollMargin/CardList/ContractorStep/ContractorGrid
@onready var _custom_mission_card: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/ContractorStep/CustomMissionCard
@onready var _target_step: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep
@onready var _target_title: Label = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/IntroPanel/Margin/VBox/TitleLabel
@onready var _target_subtitle: Label = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/IntroPanel/Margin/VBox/SubtitleLabel
@onready var _classification_card: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/ClassificationCard
@onready var _classification_copy: Label = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/ClassificationCard/Margin/VBox/CopyLabel
@onready var _classification_facts: HBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/ClassificationCard/Margin/VBox/FactsRow
@onready var _classify_planet_btn: Button = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/ClassificationCard/Margin/VBox/ButtonsRow/PlanetButton
@onready var _classify_not_planet_btn: Button = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/ClassificationCard/Margin/VBox/ButtonsRow/NotPlanetButton
@onready var _classify_mark_dip_btn: Button = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/ClassificationCard/Margin/VBox/ButtonsRow/MarkDipButton
@onready var _map_panel: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/MapPanel
@onready var _map_step_node: MapStepScript = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/MapPanel/MapStep
@onready var _target_detail_card: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/TargetDetailCard
@onready var _target_detail_box: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/TargetDetailCard/Margin/VBox
@onready var _target_hint_label: Label = $Scaffold/Scroll/ScrollMargin/CardList/TargetStep/TargetDetailCard/Margin/VBox/HintLabel
@onready var _rocket_step: HBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/RocketStep
@onready var _rocket_list_column: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/RocketStep/RocketListColumn
@onready var _assembly_hint_label: Label = $Scaffold/Scroll/ScrollMargin/CardList/RocketStep/AssemblyPanel/Margin/VBox/HintLabel
@onready var _confirm_step: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep
@onready var _confirm_rows_box: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/SummaryCard/Margin/VBox/RowsBox
@onready var _confirm_travel_time_label: Label = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/SummaryCard/Margin/VBox/TravelTimeLabel
@onready var _confirm_note_label: Label = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/SummaryCard/Margin/VBox/NoteLabel
@onready var _assembly_vbox_scene: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/RocketStep/AssemblyPanel/Margin/VBox/PartsBox
@onready var _asm_status_label_scene: Label = $Scaffold/Scroll/ScrollMargin/CardList/RocketStep/AssemblyPanel/Margin/VBox/StatusLabel
@onready var _footer_bg:    ColorRect       = $Scaffold/Footer/FooterBg
@onready var _cancel_btn:   Button          = $Scaffold/Footer/FooterRow/CancelBtn
@onready var _next_btn:     Button          = $Scaffold/Footer/FooterRow/NextBtn

var _step_dots: Array = []

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	_apply_styles()
	_create_dots()
	_wire_buttons()
	_assembly_vbox = _assembly_vbox_scene
	_asm_status_label = _asm_status_label_scene
	_card_list.add_theme_constant_override("separation", 16)
	
	_load_planning_state()
	_show_step(_step)

func _load_planning_state() -> void:
	_is_free_ops = RocketsManager.is_free_operations_unlocked()
	
	# 1. Load Step
	var saved_step = RocketsManager.get_planning_step()
	_step = clamp(saved_step, 0, 3) as Step
	
	# 2. Load Contractor
	if _is_free_ops:
		_selected_contractor = RocketsManager.get_trip_selected_contractor()
	else:
		_selected_contractor = RocketsManager.get_starter_selected_contractor()
		
	# 3. Load Target
	var tid = RocketsManager.get_selected_target()
	if tid != "":
		_selected_target = RocketsManager.get_target_details(tid)
		if RocketsManager.get_mission_stage() == 3 and RocketsManager.get_tess_classification(tid) == "planet" and int(_step) <= int(Step.TARGET):
			_step = Step.ROCKET
		
	# 4. Load Rocket
	_selected_rocket = RocketsManager.get_planning_rocket_type()

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
	if _map_step_node and not _map_step_node.target_selected.is_connected(_on_map_target_selected):
		_map_step_node.target_selected.connect(_on_map_target_selected)
	_style_action_button(_classify_planet_btn, false)
	_style_action_button(_classify_not_planet_btn, false)
	_style_action_button(_classify_mark_dip_btn, false)
	_classify_planet_btn.pressed.connect(_on_primary_classification_button_pressed)
	_classify_not_planet_btn.pressed.connect(_on_not_planet_button_pressed)
	_classify_mark_dip_btn.pressed.connect(_on_mark_dip_button_pressed)

# ── Step management ───────────────────────────────────────────────────────────

func _show_step(s: Step) -> void:
	for t in _asm_tweens:
		if t and t.is_valid():
			t.kill()
	_asm_tweens.clear()
	_step              = s
	RocketsManager.set_planning_step(int(s))
	_map_step          = _map_step_node
	_target_detail     = null
	_assembly_vbox     = _assembly_vbox_scene
	_asm_status_label  = _asm_status_label_scene
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
			_next_btn.text     = "Next >"
			_next_btn.disabled = _selected_contractor.is_empty()
		Step.TARGET:
			_cancel_btn.text   = "< Back"
			_next_btn.text     = "Next >"
			_next_btn.disabled = _selected_target.is_empty()
		Step.ROCKET:
			_cancel_btn.text   = "< Back"
			_next_btn.text     = "Next >"
			_next_btn.disabled = _selected_rocket.is_empty()
		Step.CONFIRM:
			_cancel_btn.text   = "< Back"
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
	_clear_step_content()
	match _step:
		Step.CONTRACTOR: _build_contractor_step()
		Step.TARGET:     _build_target_step()
		Step.ROCKET:     _build_rocket_step()
		Step.CONFIRM:    _build_confirm_step()

func _clear_step_content() -> void:
	for child in _card_list.get_children():
		if child == _contractor_step or child == _target_step or child == _rocket_step or child == _confirm_step:
			child.visible = false
			continue
		child.queue_free()
	if _contractor_grid:
		_clear_container_children(_contractor_grid)
	if _classification_facts:
		_clear_container_children(_classification_facts)
	if _target_detail_box:
		_clear_container_children_except(_target_detail_box, [_target_hint_label])
		if _target_hint_label.get_parent() != _target_detail_box:
			_target_hint_label.reparent(_target_detail_box)
		_target_hint_label.visible = true
		_target_hint_label.text = "< Tap a target on the map above"
	if _rocket_list_column:
		_clear_container_children(_rocket_list_column)
	if _assembly_vbox:
		_clear_container_children(_assembly_vbox)
	if _confirm_rows_box:
		_clear_container_children(_confirm_rows_box)

func _clear_container_children(container: Node) -> void:
	for child in container.get_children():
		child.queue_free()

func _clear_container_children_except(container: Node, keep: Array) -> void:
	for child in container.get_children():
		if child in keep:
			continue
		child.queue_free()

# ── Step: Contractor ──────────────────────────────────────────────────────────

func _build_contractor_step() -> void:
	_is_free_ops = RocketsManager.is_free_operations_unlocked()
	var stage    := RocketsManager.get_mission_stage()

	_contractor_step.visible = true
	_contractor_title.text = "Mission %d contract" % stage
	_contractor_subtitle.text = "Pick the buyer. Their order defines the haul."
	_contractor_grid.columns = _contractor_grid_columns()

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

	_custom_mission_card.visible = true

func _add_contractor_card(c: Dictionary) -> void:
	var c_id      := str(c.get("id", ""))
	var c_name    := str(c.get("name", "Unknown"))
	var c_focus   := str(c.get("focus", c.get("role", "")))
	var minerals  := c.get("requested_minerals", {}) as Dictionary
	var selected  := c_id == str(_selected_contractor.get("id", ""))
	var icon      := _contractor_icon(c_focus)

	var card := ContractorCardScene.instantiate() as PanelContainer
	if card == null:
		return
	card.custom_minimum_size = _contractor_tile_min_size()
	_contractor_grid.add_child(card)
	card.add_theme_stylebox_override("panel", _contract_card_box(selected))

	_set_label_text(card, "Margin/VBox/TopRow/IconPanel/IconLabel", icon)
	_set_label_text(card, "Margin/VBox/TopRow/TitleColumn/NameLabel", c_name)
	_set_label_text(card, "Margin/VBox/TopRow/TitleColumn/BriefLabel", _contractor_brief(c_focus))
	_set_label_text(card, "Margin/VBox/TopRow/StatusLabel", "SELECTED" if selected else "")
	_set_label_text(card, "Margin/VBox/OrderColumn/HeaderRow/TagLabel", _contractor_contract_tag(c))

	var chips := card.get_node_or_null("Margin/VBox/OrderColumn/MineralGrid") as GridContainer
	if chips:
		for child in chips.get_children():
			child.queue_free()

	if not minerals.is_empty():
		for mname in minerals.keys():
			if chips:
				chips.add_child(_mineral_chip(str(mname), minerals[mname], true))
	else:
		if chips:
			chips.add_child(_mineral_chip("Open route", 0, true))

	var btn := card.get_node_or_null("Margin/VBox/SelectButton") as Button
	if btn == null:
		return
	btn.text = "Selected" if selected else "Select contract"
	_style_action_button(btn, selected)
	btn.pressed.connect(func():
		_selected_contractor = c
		if _is_free_ops:
			RocketsManager.select_trip_contractor(c_id)
		else:
			RocketsManager.select_starter_contractor(c_id)
		_rebuild_cards()
		_update_footer()
	)

func _contractor_grid_columns() -> int:
	var width := get_viewport_rect().size.x
	if width >= 1180.0:
		return 3
	if width >= 760.0:
		return 2
	return 1

func _contractor_tile_min_size() -> Vector2:
	var columns := _contractor_grid_columns()
	var height := 250.0 if columns >= 3 else 230.0
	return Vector2(320, height)

func _contractor_brief(focus: String) -> String:
	var f := focus.strip_edges()
	if f == "":
		return "Standard delivery contract"
	if f.find("—") != -1:
		return f.split("—")[0].strip_edges()
	if f.find("-") != -1:
		return f.split("-")[0].strip_edges()
	if f.length() > 42:
		return f.substr(0, 39).strip_edges() + "..."
	return f

func _contractor_contract_tag(c: Dictionary) -> String:
	var effect := str(c.get("effect", "")).strip_edges()
	match effect:
		"build_discount":
			return "BUILD DISCOUNT"
		"payout_bonus":
			return "PAYOUT BONUS"
		_:
			return "ORDER"

func _set_label_text(root: Node, path: NodePath, value: String) -> void:
	var label := root.get_node_or_null(path) as Label
	if label:
		label.text = value

func _contract_card_box(selected: bool) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = C_CONTRACT_BG_2 if selected else C_CONTRACT_BG
	s.corner_radius_top_left = 8
	s.corner_radius_top_right = 8
	s.corner_radius_bottom_left = 8
	s.corner_radius_bottom_right = 8
	s.shadow_color = Color(0, 0, 0, 0.18)
	s.shadow_size = 8
	s.shadow_offset = Vector2(0, 3)
	s.content_margin_left = 0
	s.content_margin_right = 0
	s.content_margin_top = 0
	s.content_margin_bottom = 0
	s.border_width_left = 3 if selected else 1
	s.border_width_right = 3 if selected else 1
	s.border_width_top = 3 if selected else 1
	s.border_width_bottom = 3 if selected else 1
	s.border_color = C_ACCENT if selected else Color(C_ACCENT, 0.20)
	return s

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
	_target_step.visible = true
	var stage := RocketsManager.get_mission_stage()
	_targets = RocketsManager.get_selectable_targets_for_stage(stage)
	if _targets.is_empty():
		_targets = RocketsManager.get_selectable_targets_for_stage()
	_target_title.text = "Select destination"
	_target_subtitle.text = "Tap a target on the map to choose where your rocket is headed."

	if _targets.is_empty():
		_classification_card.visible = false
		_map_panel.visible = false
		_target_detail_card.visible = true
		_target_hint_label.text = "No targets available. Complete a scan mission first."
		return

	if stage == 3:
		var review_target: Dictionary = _first_unclassified_m3_target()
		if not review_target.is_empty():
			_build_m3_review_gate(review_target)
			return
		if _selected_target.is_empty():
			var confirmed_target: Dictionary = _first_confirmed_m3_target()
			if not confirmed_target.is_empty():
				_selected_target = confirmed_target
				RocketsManager.select_target(str(confirmed_target.get("id", "")))
				AppControllerHelper.record_tutorial_action("select_launch_target", {
					"target_id": str(confirmed_target.get("id", "")),
					"auto_selected": true,
					"source": "mission3_review_gate"
				})
				_update_footer()
				call_deferred("_show_step", Step.ROCKET)
				return
		_classification_card.visible = false
	else:
		_classification_card.visible = false

	_map_panel.visible = true
	_target_detail_card.visible = true

	# Auto-select first target if none chosen yet
	if _selected_target.is_empty() and not _targets.is_empty():
		_selected_target = _targets[0]
		RocketsManager.select_target(str(_selected_target.get("id", "")))
		_update_footer()

	var _vp_h := get_viewport_rect().size.y
	_map_panel.custom_minimum_size = Vector2(0, max(420.0, _vp_h * 0.62))
	_map_step = _map_step_node
	_map_step.setup(_targets, str(_selected_target.get("id", "")))
	_target_detail = _target_detail_card

	if _selected_target.is_empty():
		_target_hint_label.visible = true
		_target_hint_label.text = "< Tap a target on the map above"
	else:
		_refresh_target_detail(_selected_target)

func _build_m3_review_gate(target: Dictionary) -> void:
	_target_title.text = "Review candidate"
	_target_subtitle.text = "Mission 3 routes a confirmed TESS candidate directly into launch setup."
	_map_panel.visible = false
	_target_detail_card.visible = false
	_classification_card.visible = true
	_classification_card.set_meta("target_id", str(target.get("id", "")))
	_classification_card.set_meta("review_screen_only", true)
	_classification_copy.text = "Open the full review screen for %s, classify the lightcurve, and mission control will route the result automatically." % str(target.get("label", target.get("id", "TESS candidate")))
	_classification_copy.add_theme_color_override("font_color", C_ON_DARK_VAR)
	_clear_container_children(_classification_facts)
	_classification_facts.add_child(_stat_chip("TIC", str(target.get("ticId", "cached")), true))
	_classification_facts.add_child(_stat_chip("Period", "%.2f d" % float(target.get("period_days", 0.0)), true))
	_classification_facts.add_child(_stat_chip("Star", str(target.get("parent_star", "TESS")), true))
	_classify_planet_btn.visible = true
	_classify_planet_btn.text = "Open Review"
	_style_action_button(_classify_planet_btn, true)
	_classify_not_planet_btn.visible = false
	_classify_mark_dip_btn.visible = false
	_selected_target = {}
	RocketsManager.clear_selected_target()
	_update_footer()
	var review_target_id: String = str(target.get("id", ""))
	if review_target_id != "" and review_target_id != _m3_review_auto_target_id:
		_m3_review_auto_target_id = review_target_id
		call_deferred("_open_m3_review_for_target_id", review_target_id)

func _on_map_target_selected(t: Dictionary) -> void:
	_selected_target = t
	RocketsManager.select_target(str(t.get("id", "")))
	AppControllerHelper.record_tutorial_action("select_launch_target", {
		"target_id": str(t.get("id", "")),
		"source": "launch_wizard_map"
	})
	_update_footer()
	_refresh_target_detail(t)

func _refresh_target_detail(t: Dictionary) -> void:
	if not _target_detail or not is_instance_valid(_target_detail):
		return
	_clear_container_children_except(_target_detail_box, [_target_hint_label])
	var detail := TargetDetailScene.instantiate() as VBoxContainer
	if detail == null:
		return
	_target_detail_box.add_child(detail)
	_target_hint_label.visible = false

	var t_label  := str(t.get("label", t.get("name", "Unknown")))
	var t_type   := str(t.get("type", "asteroid"))
	var t_dist   := float(t.get("distance_au", 0.0))
	var t_reward := RocketsManager.get_target_reward_ratio(str(t.get("id", "")))

	var icon_label := detail.get_node_or_null("HeaderRow/IconLabel") as Label
	var name_label := detail.get_node_or_null("HeaderRow/NameLabel") as Label
	var stats := detail.get_node_or_null("StatsRow") as HBoxContainer
	var science := detail.get_node_or_null("ScienceLabel") as Label
	if icon_label:
		icon_label.text = "🪐" if t_type == "planet" else "☄"
		icon_label.add_theme_color_override("font_color", C_ACCENT)
	if name_label:
		name_label.text = t_label
		name_label.add_theme_color_override("font_color", C_ON_SURF)
	if stats:
		_clear_container_children(stats)
	for pair: Array in [
		["Type",     t_type.capitalize()],
		["Distance", "%.1f AU" % t_dist],
		["Yield",    "%d%%" % int(t_reward * 100)],
	]:
		if stats:
			stats.add_child(_stat_chip(str(pair[0]), str(pair[1])))

	var source := str(t.get("science_source", "")).strip_edges()
	var system := str(t.get("star_system_name", t.get("parent_star", ""))).strip_edges()
	var period := float(t.get("period_days", 0.0))
	if source != "" or system != "" or period > 0.0:
		var science_line := []
		if source != "":
			science_line.append(source)
		if system != "":
			science_line.append(system)
		if period > 0.0:
			science_line.append("%.2f day period" % period)
		if science:
			science.visible = true
			science.text = " · ".join(science_line)
			science.add_theme_color_override("font_color", C_ON_SURF_VAR)
	elif science:
		science.visible = false

func _add_m3_classification_card() -> void:
	var target := _first_unclassified_m3_target()
	if target.is_empty():
		var systems := RocketsManager.get_unlocked_star_systems(3)
		_classification_card.visible = true
		_classification_copy.text = "Candidate review complete. %d star system(s) are now available in the target map." % systems.size()
		_classification_copy.add_theme_color_override("font_color", C_OK)
		_clear_container_children(_classification_facts)
		_classify_planet_btn.visible = false
		_classify_not_planet_btn.visible = false
		_classify_mark_dip_btn.visible = false
		_classification_card.set_meta("target_id", "")
		return

	var label := str(target.get("label", target.get("id", "TESS candidate")))
	_classification_card.visible = true
	_classification_copy.text = "%s is a cached TESS/TIC lightcurve. Decide whether the dip looks like a planet before you route a rocket." % label
	_classification_copy.add_theme_color_override("font_color", C_ON_DARK_VAR)
	_clear_container_children(_classification_facts)
	_classification_facts.add_child(_stat_chip("TIC", str(target.get("ticId", "cached")), true))
	_classification_facts.add_child(_stat_chip("Period", "%.2f d" % float(target.get("period_days", 0.0)), true))
	_classification_facts.add_child(_stat_chip("Star", str(target.get("parent_star", "TESS")), true))
	_classify_planet_btn.visible = true
	_classify_not_planet_btn.visible = true
	_classify_mark_dip_btn.visible = true
	_classification_card.set_meta("target_id", str(target.get("id", "")))

func _first_unclassified_m3_target() -> Dictionary:
	for target_any in _targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		var target_id := str(target.get("id", ""))
		if target_id == "":
			continue
		if str(target.get("anomalySet", "")) != "telescope-tess":
			continue
		if RocketsManager.get_tess_classification(target_id) == "":
			return target
	return {}

func _first_confirmed_m3_target() -> Dictionary:
	for target_any in _targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		var target_id := str(target.get("id", ""))
		if target_id == "":
			continue
		if RocketsManager.get_tess_classification(target_id) == "planet":
			return target
	return {}

func _on_primary_classification_button_pressed() -> void:
	var target_id := str(_classification_card.get_meta("target_id", ""))
	if target_id == "":
		return
	if bool(_classification_card.get_meta("review_screen_only", false)):
		_open_m3_review_for_target_id(target_id)
		return
	_on_m3_classification_pressed(target_id, "planet")

func _on_not_planet_button_pressed() -> void:
	var target_id := str(_classification_card.get_meta("target_id", ""))
	if target_id == "" or bool(_classification_card.get_meta("review_screen_only", false)):
		return
	_on_m3_classification_pressed(target_id, "not_planet")

func _on_mark_dip_button_pressed() -> void:
	var target_id := str(_classification_card.get_meta("target_id", ""))
	if target_id == "" or bool(_classification_card.get_meta("review_screen_only", false)):
		return
	_on_m3_classification_pressed(target_id, "dip")

func _open_m3_review_for_target_id(target_id: String) -> void:
	if target_id == "" or get_node_or_null("M3ReviewOverlay") != null:
		return
	var target_data: Dictionary = RocketsManager.get_target_details(target_id)
	if target_data.is_empty():
		return
	var overlay := ColorRect.new()
	overlay.name = "M3ReviewOverlay"
	overlay.color = Color(0.02, 0.03, 0.08, 0.98)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(overlay)

	var detail_view = AsteroidDetailViewScene.instantiate()
	if detail_view == null:
		overlay.queue_free()
		return
	overlay.add_child(detail_view)
	detail_view.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	detail_view.initialize(target_data, true)
	if detail_view.has_signal("classification_submitted"):
		detail_view.classification_submitted.connect(func(result: Dictionary) -> void:
			overlay.queue_free()
			_on_m3_review_submitted(result)
		)
	if detail_view.has_signal("back_pressed"):
		detail_view.back_pressed.connect(func() -> void:
			if is_instance_valid(overlay):
				overlay.queue_free()
		)

func _on_m3_review_submitted(result: Dictionary) -> void:
	var target_id := str(result.get("target_id", ""))
	var confirmed := bool(result.get("confirmed", false))
	if confirmed and target_id != "":
		var details := RocketsManager.get_target_details(target_id)
		if not details.is_empty():
			_selected_target = details
			RocketsManager.select_target(target_id)
			AppControllerHelper.record_tutorial_action("select_launch_target", {
				"target_id": target_id,
				"auto_selected": true,
				"source": "mission3_review"
			})
		_update_footer()
		_show_step(Step.ROCKET)
		return
	if target_id != "" and str(_selected_target.get("id", "")) == target_id:
		_selected_target = {}
	RocketsManager.clear_selected_target()
	_targets = RocketsManager.get_selectable_targets_for_stage(3)
	_show_step(Step.TARGET)

func _on_m3_classification_pressed(target_id: String, verdict: String) -> void:
	var result := RocketsManager.classify_candidate_target(target_id, verdict, 1)
	AppControllerHelper.record_tutorial_action("classify_candidate", {
		"target_id": target_id,
		"verdict": verdict,
		"confirmed": bool(result.get("confirmed", false))
	})
	if bool(result.get("confirmed", false)):
		var details := RocketsManager.get_target_details(target_id)
		if not details.is_empty():
			_selected_target = details
			RocketsManager.select_target(target_id)
			AppControllerHelper.record_tutorial_action("select_launch_target", {
				"target_id": target_id,
				"auto_selected": true,
				"source": "launch_wizard_inline"
			})
	else:
		if str(_selected_target.get("id", "")) == target_id:
			_selected_target = {}
		_targets = RocketsManager.get_selectable_targets_for_stage(3)
	_show_step(Step.TARGET)

# ── Step: Rocket ──────────────────────────────────────────────────────────────

func _build_rocket_step() -> void:
	_rockets = RocketsManager.get_unlocked()
	_rocket_step.visible = true

	if _rockets.is_empty():
		_assembly_hint_label.text = "No rockets unlocked yet."
		return

	for r in _rockets:
		_add_rocket_tile(r, _rocket_list_column)

	if _selected_rocket:
		_refresh_assembly(_selected_rocket)
	else:
		_assembly_hint_label.text = "Select\na rocket"
		_assembly_hint_label.visible = true

func _add_rocket_tile(rtype: String, parent: VBoxContainer) -> void:
	var selected := rtype == _selected_rocket
	var card := RocketTileScene.instantiate() as PanelContainer
	if card == null:
		return
	parent.add_child(card)
	card.add_theme_stylebox_override("panel", _make_card_style(selected, true))
	_set_label_text(card, "Margin/VBox/TopRow/IconLabel", "🚀")
	_set_label_text(card, "Margin/VBox/TopRow/NameLabel", RocketSpecs.get_display_name(rtype))
	_set_label_text(card, "Margin/VBox/TopRow/SelectedLabel", "✓" if selected else "")
	var stats_row := card.get_node_or_null("Margin/VBox/StatsRow") as HBoxContainer
	if stats_row:
		_clear_container_children(stats_row)
	var cost_b := RocketSpecs.get_cost(rtype) / 1_000_000_000
	for pair: Array in [
		["Speed",  "%.1fx" % RocketSpecs.get_speed_multiplier(rtype)],
		["Cargo",  "%.1fx" % RocketSpecs.get_cargo_multiplier(rtype)],
		["Cost",   "%dB F" % cost_b],
	]:
		if stats_row:
			stats_row.add_child(_stat_chip(str(pair[0]), str(pair[1])))
	var btn := card.get_node_or_null("Margin/VBox/ButtonRow/SelectButton") as Button
	if btn == null:
		return
	btn.text = "Selected ✓" if selected else "Select"
	_style_action_button(btn, selected)
	btn.pressed.connect(func():
		if _selected_rocket != rtype:
			_selected_rocket = rtype
			RocketsManager.set_planning_rocket_type(rtype)
			_update_footer()
			_refresh_assembly(rtype)
			# Rebuild tile styles without full step fade
			_rebuild_rocket_tiles(parent)
	)

func _rebuild_rocket_tiles(parent: VBoxContainer) -> void:
	_clear_container_children(parent)
	for r in _rockets:
		_add_rocket_tile(r, parent)

func _refresh_assembly(rtype: String) -> void:
	if not _assembly_vbox or not is_instance_valid(_assembly_vbox):
		return
	for t in _asm_tweens:
		if t and t.is_valid():
			t.kill()
	_asm_tweens.clear()
	for c in _assembly_vbox.get_children():
		c.queue_free()
	if _asm_status_label and is_instance_valid(_asm_status_label):
		_asm_status_label.add_theme_color_override("font_color", Color(0.22, 0.80, 0.45, 0.0))
	_assembly_hint_label.visible = false

	var parts: Array = ROCKET_PARTS.get(rtype, [
		{"name": "CMD POD", "color": Color(0.66, 0.76, 0.88), "h": 40},
		{"name": "TANK",    "color": Color(0.48, 0.60, 0.78), "h": 60},
		{"name": "ENGINE",  "color": Color(0.34, 0.48, 0.72), "h": 44},
	])

	var delay := 0.0
	for part: Dictionary in parts:
		var pbox := RocketPartScene.instantiate() as PanelContainer
		if pbox == null:
			continue
		pbox.size_flags_horizontal = SIZE_EXPAND_FILL
		pbox.custom_minimum_size   = Vector2(0, int(part.get("h", 40)))
		pbox.mouse_filter          = Control.MOUSE_FILTER_IGNORE
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

		var icon := _part_icon(str(part.get("name", "")))
		var part_text := "%s  %s" % [icon, str(part.get("name", ""))] if icon != "" else str(part.get("name", ""))
		var plbl := pbox.get_node_or_null("PartLabel") as Label
		if plbl:
			plbl.text = part_text
		_assembly_vbox.add_child(pbox)

		# Snap-in animation: fade in sequentially
		pbox.modulate.a = 0.0
		var tw := create_tween()
		_asm_tweens.append(tw)
		tw.tween_interval(delay)
		tw.tween_property(pbox, "modulate:a", 1.0, 0.22).set_ease(Tween.EASE_OUT)
		delay += 0.12

	# Reveal the "assembled & ready" status label after parts appear
	if _asm_status_label and is_instance_valid(_asm_status_label):
		_asm_status_label.add_theme_color_override("font_color", Color(0.22, 0.80, 0.45, 0.0))
		var status_tween := create_tween()
		_asm_tweens.append(status_tween)
		status_tween.tween_interval(delay + 0.1)
		status_tween.tween_property(_asm_status_label, "theme_override_colors/font_color",
			Color(0.22, 0.80, 0.45, 1.0), 0.3).set_ease(Tween.EASE_OUT)

# ── Step: Confirm ─────────────────────────────────────────────────────────────

func _build_confirm_step() -> void:
	_confirm_step.visible = true

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
		var summary_row := ConfirmRowScene.instantiate() as HBoxContainer
		if summary_row == null:
			continue
		_set_label_text(summary_row, "IconLabel", str(row[0]))
		_set_label_text(summary_row, "KeyLabel", str(row[1]))
		_set_label_text(summary_row, "ValueLabel", str(row[2]))
		var icon_label := summary_row.get_node_or_null("IconLabel") as Label
		var key_label := summary_row.get_node_or_null("KeyLabel") as Label
		var value_label := summary_row.get_node_or_null("ValueLabel") as Label
		if icon_label:
			icon_label.add_theme_color_override("font_color", C_ACCENT)
		if key_label:
			key_label.add_theme_color_override("font_color", C_ON_SURF_VAR)
		if value_label:
			value_label.add_theme_color_override("font_color", C_ON_SURF)
		_confirm_rows_box.add_child(summary_row)

	if _selected_rocket:
		var dur_sec := RocketSpecs.get_mission_seconds(_selected_rocket)
		_confirm_travel_time_label.text = "Estimated travel time: ~%d min" % (dur_sec / 60)
		_confirm_travel_time_label.visible = true
	else:
		_confirm_travel_time_label.visible = false

	_confirm_note_label.text = "Once launched the rocket departs immediately."

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
	RocketsManager.clear_planning_state()
	launched.emit(rocket_id, target_id)

func _make_card_style(selected: bool, padded: bool) -> StyleBoxFlat:
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
	return s

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

func _part_icon(part_name: String) -> String:
	var n := part_name.to_lower()
	if "cmd" in n or "command" in n: return "◉"
	if "tank" in n: return "▬"
	if "engine" in n or "drive" in n or "core" in n: return "▽"
	if "ion" in n: return "⚡"
	return "▪"

func _style_action_button(btn: Button, is_selected: bool) -> void:
	var bg  := C_ICE_TINT if is_selected else C_ACCENT
	var fg  := C_ACCENT   if is_selected else C_WHITE
	btn.add_theme_color_override("font_color", fg)
	btn.add_theme_font_size_override("font_size", 15)
	btn.add_theme_stylebox_override("normal",  _box(bg, 8))
	btn.add_theme_stylebox_override("hover",   _box(C_ACCENT_DIM, 8))
	btn.add_theme_stylebox_override("pressed", _box(C_ACCENT_DIM, 8))
	btn.add_theme_stylebox_override("focus",   _box(bg, 8))

func _stat_chip(key: String, val: String, dark: bool = false) -> VBoxContainer:
	var v := StatChipScene.instantiate() as VBoxContainer
	if v == null:
		v = VBoxContainer.new()
	var key_label := v.get_node_or_null("KeyLabel") as Label
	var value_label := v.get_node_or_null("ValueLabel") as Label
	if key_label:
		key_label.text = key
		key_label.add_theme_color_override("font_color", C_ON_DARK_VAR if dark else C_ON_SURF_VAR)
	if value_label:
		value_label.text = val
		value_label.add_theme_color_override("font_color", C_ON_DARK if dark else C_ON_SURF)
	return v

func _mineral_chip(mineral: String, qty: Variant, dark: bool = false) -> PanelContainer:
	var col: Color = MINERAL_TINTS.get(mineral, C_ACCENT)
	var p := MineralChipScene.instantiate() as PanelContainer
	if p == null:
		p = PanelContainer.new()
	p.size_flags_horizontal = SIZE_EXPAND_FILL
	var s := StyleBoxFlat.new()
	s.bg_color                   = Color(col.r, col.g, col.b, 0.24 if dark else 0.18)
	s.border_width_left          = 1
	s.border_width_right         = 1
	s.border_width_top           = 1
	s.border_width_bottom        = 1
	s.border_color               = Color(col.r, col.g, col.b, 0.72 if dark else 0.65)
	s.corner_radius_top_left     = 6
	s.corner_radius_top_right    = 6
	s.corner_radius_bottom_left  = 6
	s.corner_radius_bottom_right = 6
	s.content_margin_left        = 10 if dark else 8
	s.content_margin_right       = 10 if dark else 8
	s.content_margin_top         = 7 if dark else 3
	s.content_margin_bottom      = 7 if dark else 3
	p.add_theme_stylebox_override("panel", s)
	var qty_int := int(float(str(qty)))
	var fg := C_ON_DARK if dark else Color(col.r * 0.55, col.g * 0.55, col.b * 0.55, 1.0)
	var lbl := p.get_node_or_null("Label") as Label
	if lbl == null:
		lbl = _label("", fg, 15 if dark else 12)
		p.add_child(lbl)
	lbl.text = mineral if qty_int <= 0 else "%s  %d" % [mineral, qty_int]
	lbl.add_theme_color_override("font_color", fg)
	lbl.add_theme_font_size_override("font_size", 15 if dark else 12)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER if dark else HORIZONTAL_ALIGNMENT_LEFT
	return p

func _add_empty_msg(text: String) -> void:
	var lbl := EmptyStateLabelScene.instantiate() as Label
	if lbl == null:
		return
	lbl.text = text
	lbl.add_theme_color_override("font_color", C_ON_SURF_VAR)
	_card_list.add_child(lbl)
