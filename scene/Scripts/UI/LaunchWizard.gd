extends Control
## Mobile-first launch wizard — Contractor > Target > Rocket > Confirm.
## Static scaffold (header / scroll / footer) is defined in LaunchWizard.tscn
## so designers can adjust layout in the Godot editor without touching this file.
## Dynamic card content is built here at runtime.

const RocketSpecs    = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const RoomCatalog = preload("res://Scripts/Utils/RoomCatalog.gd")
const RoomSpriteAtlas = preload("res://Scripts/UI/RoomSpriteAtlas.gd")
const MapStepScript  = preload("res://Scripts/UI/LaunchWizardMapStep.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const AsteroidDetailViewScene = preload("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn")
const ContractorCardScene = preload("res://Scenes/UI/Templates/LaunchWizardContractorCard.tscn")
const ContractorCardSelectedScene = preload("res://Scenes/UI/Templates/LaunchWizardContractorCardSelected.tscn")
const MineralChipScene = preload("res://Scenes/UI/Templates/LaunchWizardMineralChip.tscn")
const StatChipScene = preload("res://Scenes/UI/Templates/LaunchWizardStatChip.tscn")
const StatChipDarkScene = preload("res://Scenes/UI/Templates/LaunchWizardStatChipDark.tscn")
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
const C_VIOLET      := Color(0.506, 0.392, 0.906, 1.0)
const C_FAB_BG      := Color(0.047, 0.075, 0.133, 1.0)
const C_FAB_PANEL   := Color(0.098, 0.122, 0.184, 0.96)
const C_FAB_PANEL_H := Color(0.137, 0.165, 0.227, 0.98)
const C_FAB_SLOT    := Color(0.180, 0.204, 0.270, 1.0)
const C_FAB_LINE    := Color(0.247, 0.278, 0.318, 1.0)
const C_FAB_BLUE    := Color(0.220, 0.631, 0.953, 1.0)
const C_FAB_AMBER   := Color(0.996, 0.702, 0.000, 1.0)
const C_FAB_GREEN   := Color(0.290, 0.871, 0.502, 1.0)

# Mineral chip tint colours
const MINERAL_TINTS: Dictionary = {
	"Iron":      Color(0.90, 0.58, 0.28),
	"Nickel":    Color(0.55, 0.68, 0.78),
	"Cobalt":    Color(0.28, 0.48, 0.84),
	"Silicates": Color(0.72, 0.74, 0.40),
	"Platinum":  Color(0.78, 0.82, 0.92),
	"Gold":      Color(0.92, 0.78, 0.16),
}

# ── State ─────────────────────────────────────────────────────────────────────
var _step: Step = Step.CONTRACTOR
var _selected_contractor: Dictionary = {}
var _selected_target:     Dictionary = {}
var _selected_rocket:     String     = ""
var _is_free_ops:         bool       = false
var _use_trip_contract:   bool       = false
var _contractors:         Array      = []
var _targets:             Array      = []
var _rockets:             Array      = []
var _m3_review_auto_target_id: String = ""

# Live-update widget refs
var _map_step:          MapStepScript  = null
var _target_detail:     PanelContainer = null
var _selected_assembly_room_id: String = ""
var _fabrication_bay_root: Control = null

signal back_pressed
signal launched(rocket_id: String, target_id: String)

# ── Scene nodes (from LaunchWizard.tscn) ──────────────────────────────────────
@onready var _background:   ColorRect       = $Background
@onready var _header_bg:    ColorRect       = $Scaffold/Header/HeaderBg
@onready var _header_title: Label           = $Scaffold/Header/HeaderRow/StepTitle
@onready var _dot_box:      HBoxContainer   = $Scaffold/Header/HeaderRow/DotBox
@onready var _back_btn:     Button          = $Scaffold/Header/HeaderRow/BackBtn
@onready var _scroll:       ScrollContainer = $Scaffold/Scroll
@onready var _scroll_margin: MarginContainer = $Scaffold/Scroll/ScrollMargin
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
@onready var _rocket_step: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/RocketStep
@onready var _confirm_step: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep
@onready var _confirm_readiness_label: Label = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/ReadinessBadge/ReadinessLabel
@onready var _confirm_contractor_manifest: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/ManifestGrid/ContractorManifestCard
@onready var _confirm_target_manifest: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/ManifestGrid/TargetManifestCard
@onready var _confirm_rocket_manifest: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/ManifestGrid/RocketManifestCard
@onready var _confirm_rows_box: VBoxContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/SummaryCard/Margin/VBox/RowsBox
@onready var _confirm_travel_fact: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/SummaryCard/Margin/VBox/FactsRow/TravelFactCard
@onready var _confirm_cost_fact: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/SummaryCard/Margin/VBox/FactsRow/CostFactCard
@onready var _confirm_yield_fact: PanelContainer = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/SummaryCard/Margin/VBox/FactsRow/YieldFactCard
@onready var _confirm_note_label: Label = $Scaffold/Scroll/ScrollMargin/CardList/ConfirmStep/SummaryCard/Margin/VBox/NoteLabel
@onready var _footer_bg:    ColorRect       = $Scaffold/Footer/FooterBg
@onready var _cancel_btn:   Button          = $Scaffold/Footer/FooterRow/CancelBtn
@onready var _footer_status_label: Label    = $Scaffold/Footer/FooterRow/StatusLabel
@onready var _next_btn:     Button          = $Scaffold/Footer/FooterRow/NextBtn

var _step_dots: Array = []

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	var viewport := get_viewport()
	if viewport and not viewport.size_changed.is_connected(_on_viewport_size_changed):
		viewport.size_changed.connect(_on_viewport_size_changed)
	_wire_buttons()
	_step_dots = _dot_box.get_children()
	
	_load_planning_state()
	_show_step(_step)
	call_deferred("refresh_layout_for_viewport")
	call_deferred("_stabilize_layout_after_startup")

func _on_viewport_size_changed() -> void:
	refresh_layout_for_viewport()

func _stabilize_layout_after_startup() -> void:
	var tree := get_tree()
	if tree == null:
		return
	await tree.process_frame
	refresh_layout_for_viewport()
	await tree.process_frame
	refresh_layout_for_viewport()

func refresh_layout_for_viewport() -> void:
	var viewport := get_viewport_rect().size
	if viewport == Vector2.ZERO:
		return

	size = viewport
	custom_minimum_size = viewport
	position = Vector2.ZERO

	var compact := viewport.x < 900.0
	var narrow := viewport.x < 1280.0
	var side_margin := 14 if compact else (20 if narrow else 28)
	var vertical_margin := 14 if compact else 20
	var header_height := 64 if compact else 72
	var footer_height := 84 if compact else 88

	_background.custom_minimum_size = viewport
	_scroll_margin.add_theme_constant_override("margin_left", side_margin)
	_scroll_margin.add_theme_constant_override("margin_right", side_margin)
	_scroll_margin.add_theme_constant_override("margin_top", vertical_margin)
	_scroll_margin.add_theme_constant_override("margin_bottom", vertical_margin)

	var header := _header_bg.get_parent() as Control
	if header:
		header.custom_minimum_size.y = header_height
	var footer := _footer_bg.get_parent() as Control
	if footer:
		footer.custom_minimum_size.y = footer_height

	_back_btn.custom_minimum_size = Vector2(44, 44 if compact else 48)
	_cancel_btn.custom_minimum_size.y = 52 if compact else 56
	_next_btn.custom_minimum_size.y = 52 if compact else 56
	if _footer_status_label:
		_footer_status_label.visible = not compact

	if _contractor_grid:
		_contractor_grid.columns = _contractor_grid_columns()
		for child in _contractor_grid.get_children():
			if child is Control:
				(child as Control).custom_minimum_size = _contractor_tile_min_size()

	if _step == Step.TARGET and _map_panel.visible:
		call_deferred("_fit_map_to_scroll")

	if _card_list:
		_card_list.queue_sort()
	if _contractor_grid:
		_contractor_grid.queue_sort()

func _load_planning_state() -> void:
	_is_free_ops = RocketsManager.is_free_operations_unlocked()
	_use_trip_contract = _is_free_ops or RocketsManager.get_mission_stage() >= 2

	# 1. Load Step
	var saved_step = RocketsManager.get_planning_step()
	_step = clamp(saved_step, 0, 3) as Step

	# 2. Load Contractor
	if _use_trip_contract:
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
	if _selected_contractor.is_empty():
		_step = Step.CONTRACTOR
	elif _selected_target.is_empty():
		_step = min(_step, Step.TARGET) as Step
	elif _selected_rocket.is_empty():
		_step = min(_step, Step.ROCKET) as Step

func _wire_buttons() -> void:
	_back_btn.pressed.connect(_on_back)
	_cancel_btn.pressed.connect(_on_cancel)
	_next_btn.pressed.connect(_on_next)
	if _map_step_node and not _map_step_node.target_selected.is_connected(_on_map_target_selected):
		_map_step_node.target_selected.connect(_on_map_target_selected)
	_classify_planet_btn.pressed.connect(_on_primary_classification_button_pressed)
	_classify_not_planet_btn.pressed.connect(_on_not_planet_button_pressed)
	_classify_mark_dip_btn.pressed.connect(_on_mark_dip_button_pressed)

# ── Step management ───────────────────────────────────────────────────────────

func _show_step(s: Step) -> void:
	_step              = s
	RocketsManager.set_planning_step(int(s))
	_map_step          = _map_step_node
	_target_detail     = null
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
			_cancel_btn.text   = "BACK"
			_next_btn.text     = "PROCEED"
			_next_btn.disabled = _selected_contractor.is_empty()
			if _footer_status_label:
				_footer_status_label.text = "SYSTEM STATUS: OPTIMAL  •  CONTRACT BOARD ONLINE"
		Step.TARGET:
			_cancel_btn.text   = "BACK"
			_next_btn.text     = "PROCEED"
			_next_btn.disabled = _selected_target.is_empty()
			if _footer_status_label:
				_footer_status_label.text = "TARGET MAP LINKED  •  ROUTE SELECTION ACTIVE"
		Step.ROCKET:
			_cancel_btn.text   = "BACK"
			_next_btn.text     = "PROCEED"
			_next_btn.disabled = _selected_rocket.is_empty()
			if _footer_status_label:
				_footer_status_label.text = "FABRICATION RAIL SYNCED  •  LOADOUT REVIEW IN PROGRESS"
		Step.CONFIRM:
			_cancel_btn.text   = "BACK"
			_next_btn.text     = "LAUNCH MISSION"
			_next_btn.disabled = false
			if _footer_status_label:
				_footer_status_label.text = "SYSTEMS NOMINAL  •  MISSION LOG READY FOR DISPATCH"

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
		# Record tutorial progress
		var app = preload("res://Scripts/Utils/AppControllerHelper.gd").get_instance()
		if app and app.has_method("record_tutorial_action"):
			if _step == Step.CONTRACTOR:
				app.record_tutorial_action("accept_contractor_offer")
			elif _step == Step.TARGET:
				app.record_tutorial_action("select_launch_target")
			elif _step == Step.ROCKET:
				app.record_tutorial_action("create_rocket")
		
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
	if _fabrication_bay_root and is_instance_valid(_fabrication_bay_root):
		_fabrication_bay_root.queue_free()
	_fabrication_bay_root = null

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
	_use_trip_contract = _is_free_ops or stage >= 2

	_contractor_step.visible = true
	_contractor_title.text = "MISSION %d // PICK A BUYER" % stage
	_contractor_subtitle.text = "Companies pay you to mine specific minerals. Pick one — they tell you exactly what to collect, and you earn a bonus on top of the standard market price when you deliver it."
	_contractor_grid.columns = _contractor_grid_columns()

	if _use_trip_contract:
		var offer := RocketsManager.ensure_trip_contract_offer()
		var offer_contractors = offer.get("contractors", [])
		_contractors = offer_contractors if typeof(offer_contractors) == TYPE_ARRAY else []
	else:
		RocketsManager.ensure_starter_contract_offer()
		_contractors = RocketsManager.get_starter_contractors()

	if _contractors.is_empty():
		_add_empty_msg("No contractors available right now.")
	else:
		for idx in range(_contractors.size()):
			var c_any = _contractors[idx]
			if typeof(c_any) != TYPE_DICTIONARY:
				continue
			_add_contractor_card(c_any as Dictionary, idx)

	_custom_mission_card.visible = true

func _add_contractor_card(c: Dictionary, idx: int = 0) -> void:
	var c_id      := str(c.get("id", ""))
	var c_name    := str(c.get("name", "Unknown"))
	var c_focus   := str(c.get("focus", c.get("role", "")))
	var minerals  := c.get("requested_minerals", {}) as Dictionary
	var selected  := c_id == str(_selected_contractor.get("id", ""))

	var card_scene := ContractorCardSelectedScene if selected else ContractorCardScene
	var card := card_scene.instantiate() as PanelContainer
	if card == null:
		return
	card.custom_minimum_size = _contractor_tile_min_size()
	_contractor_grid.add_child(card)

	_set_label_text(card, "Margin/VBox/TopRow/IconPanel/IconLabel", _contractor_code(c_name, c_focus))
	_set_label_text(card, "Margin/VBox/TopRow/TitleColumn/MetaLabel", "[ CON_%02d ]" % (idx + 1))
	_set_label_text(card, "Margin/VBox/TopRow/TitleColumn/NameLabel", c_name)
	_set_label_text(card, "Margin/VBox/TopRow/TitleColumn/BriefLabel", _contractor_brief(c_focus).to_upper())
	_set_label_text(card, "Margin/VBox/TopRow/StatusLabel", "ONLINE" if selected else "STANDBY")
	_set_label_text(card, "Margin/VBox/OrderColumn/HeaderRow/TagLabel", _contractor_contract_tag(c))

	var chips := card.get_node_or_null("Margin/VBox/OrderColumn/OrderPanel/MineralGrid") as GridContainer
	if chips:
		for child in chips.get_children():
			child.queue_free()

	if not minerals.is_empty():
		for mname in minerals.keys():
			if chips:
				chips.add_child(_mineral_chip(str(mname), minerals[mname], true))
	else:
		if chips:
			chips.add_child(_mineral_chip("Collect anything", 0, true))

	var btn := card.get_node_or_null("Margin/VBox/SelectButton") as Button
	if btn == null:
		return
	btn.text = "CONTRACT SECURED" if selected else "LOCK CONTRACT"
	btn.pressed.connect(func():
		_selected_contractor = c
		if _use_trip_contract:
			RocketsManager.select_trip_contractor(c_id)
		else:
			RocketsManager.select_starter_contractor(c_id)
		_rebuild_cards()
		_update_footer()
	)

func _contractor_grid_columns() -> int:
	var width := get_viewport_rect().size.x
	if width >= 1320.0:
		return 3
	if width >= 880.0:
		return 2
	return 1

func _contractor_tile_min_size() -> Vector2:
	var columns := _contractor_grid_columns()
	var width := 420.0 if columns >= 3 else (380.0 if columns == 2 else 0.0)
	var height := 360.0 if columns >= 3 else 332.0
	return Vector2(width, height)

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
			return "ROCKET BUILD DISCOUNT"
		"payout_bonus":
			return "DELIVERY BONUS"
		_:
			return "BONUS ON DELIVERY"

func _set_label_text(root: Node, path: NodePath, value: String) -> void:
	var label := root.get_node_or_null(path) as Label
	if label:
		label.text = value

func _contractor_code(name_text: String, focus: String) -> String:
	var compact := name_text.strip_edges().to_upper().replace("-", "").replace("_", "").replace(" ", "")
	if compact.length() >= 3:
		return compact.substr(0, 3)
	var fallback := focus.strip_edges().to_upper().replace("-", "").replace("_", "").replace(" ", "")
	if fallback.length() >= 3:
		return fallback.substr(0, 3)
	return "CTR"

# ── Step: Target ──────────────────────────────────────────────────────────────

func _build_target_step() -> void:
	_target_step.visible = true
	var stage := RocketsManager.get_mission_stage()
	_targets = RocketsManager.get_selectable_targets_for_stage(stage)
	if _targets.is_empty():
		_targets = RocketsManager.get_selectable_targets_for_stage()
	_target_title.text = "Select target"
	_target_subtitle.text = "Choose a destination from the sector map and confirm the route."

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

	# Open the new space/galaxy map for target selection.
	# RocketsManager restores full LaunchWizard state on return.
	RocketsManager.set_map_return_mode(true)
	var map_scene := "res://Scenes/UI/SpaceMap/galaxy_map.tscn" \
		if stage >= 3 else "res://Scenes/UI/SpaceMap/space_map.tscn"
	get_tree().change_scene_to_file(map_scene)

func _fit_map_to_scroll() -> void:
	var h := _scroll.size.y
	if h < 200.0:
		h = get_viewport_rect().size.y - 120.0
	_map_panel.custom_minimum_size = Vector2(0, maxf(h * 0.66, 420.0))
	if _map_step and is_instance_valid(_map_step):
		_map_step.queue_redraw()

func _build_m3_review_gate(target: Dictionary) -> void:
	_target_title.text = "Review candidate"
	_target_subtitle.text = "Mission 3 routes a confirmed TESS candidate directly into launch setup."
	_map_panel.visible = false
	_target_detail_card.visible = false
	_classification_card.visible = true
	_classification_card.set_meta("target_id", str(target.get("id", "")))
	_classification_card.set_meta("review_screen_only", true)
	_classification_copy.text = "Open the full review screen for %s, classify the lightcurve, and mission control will route the result automatically." % str(target.get("label", target.get("id", "TESS candidate")))
	_clear_container_children(_classification_facts)
	_classification_facts.add_child(_stat_chip("TIC", str(target.get("ticId", "cached")), true))
	_classification_facts.add_child(_stat_chip("Period", "%.2f d" % float(target.get("period_days", 0.0)), true))
	_classification_facts.add_child(_stat_chip("Star", str(target.get("parent_star", "TESS")), true))
	_classify_planet_btn.visible = true
	_classify_planet_btn.text = "Open Review"
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
	if name_label:
		name_label.text = t_label
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
	elif science:
		science.visible = false

func _add_m3_classification_card() -> void:
	var target := _first_unclassified_m3_target()
	if target.is_empty():
		var systems := RocketsManager.get_unlocked_star_systems(3)
		_classification_card.visible = true
		_classification_copy.text = "Candidate review complete. %d star system(s) are now available in the target map." % systems.size()
		_clear_container_children(_classification_facts)
		_classify_planet_btn.visible = false
		_classify_not_planet_btn.visible = false
		_classify_mark_dip_btn.visible = false
		_classification_card.set_meta("target_id", "")
		return

	var label := str(target.get("label", target.get("id", "TESS candidate")))
	_classification_card.visible = true
	_classification_copy.text = "%s is a cached TESS/TIC lightcurve. Decide whether the dip looks like a planet before you route a rocket." % label
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

	_fabrication_bay_root = _build_fabrication_bay_screen()
	_rocket_step.add_child(_fabrication_bay_root)

func _build_fabrication_bay_screen() -> PanelContainer:
	var shell := PanelContainer.new()
	shell.name = "FabricationBayUnified"
	shell.size_flags_horizontal = SIZE_EXPAND_FILL
	shell.size_flags_vertical = SIZE_EXPAND_FILL
	shell.custom_minimum_size = Vector2(0, 640)
	shell.add_theme_stylebox_override("panel", _fabrication_style(C_FAB_BG, C_FAB_LINE, 1, 4, 20))

	var outer := VBoxContainer.new()
	outer.add_theme_constant_override("separation", 18)
	shell.add_child(outer)

	var canvas := ScrollContainer.new()
	canvas.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	canvas.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	canvas.size_flags_vertical = SIZE_EXPAND_FILL
	canvas.custom_minimum_size = Vector2(0, 456)
	outer.add_child(canvas)

	var modules := HBoxContainer.new()
	modules.alignment = BoxContainer.ALIGNMENT_CENTER
	modules.size_flags_horizontal = SIZE_EXPAND_FILL
	modules.add_theme_constant_override("separation", 24)
	canvas.add_child(modules)

	var installed := _installed_rooms_for_rocket(_selected_rocket)
	if installed.is_empty():
		for slot_name in ["CHASSIS", "PROPULSION", "MINING DRILL"]:
			modules.add_child(_build_fabrication_empty_slot(slot_name))
	else:
		for room_any in installed:
			if typeof(room_any) != TYPE_DICTIONARY:
				continue
			var room_inst: Dictionary = room_any
			var room_def := RoomCatalog.get_room(str(room_inst.get("room_id", "")))
			if room_def.is_empty():
				continue
			modules.add_child(_build_fabrication_module_tile(room_inst, room_def))

	outer.add_child(_build_fabrication_footer(installed))
	return shell

func _build_fabrication_module_tile(room_inst: Dictionary, room_def: Dictionary) -> Button:
	var room_id := str(room_inst.get("room_id", ""))
	var selected := room_id == _selected_assembly_room_id
	var is_propulsion := str(room_def.get("category", "")) == "power" or room_id.find("thruster") != -1 or room_id.find("engine") != -1
	var accent := C_FAB_AMBER if is_propulsion else C_FAB_BLUE

	var tile := Button.new()
	tile.name = "FabricationModule_%s" % room_id
	tile.flat = true
	tile.text = ""
	tile.custom_minimum_size = Vector2(256, 320)
	tile.size_flags_horizontal = 0
	tile.add_theme_stylebox_override("normal", _fabrication_style(C_FAB_PANEL, accent if selected else C_FAB_LINE, 2 if selected else 1, 4, 16))
	tile.add_theme_stylebox_override("hover", _fabrication_style(C_FAB_PANEL_H, accent, 2, 4, 16))
	tile.add_theme_stylebox_override("pressed", _fabrication_style(C_FAB_PANEL_H, accent, 2, 4, 16))
	tile.add_theme_stylebox_override("focus", _fabrication_style(C_FAB_PANEL_H, accent, 2, 4, 16))

	var stack := VBoxContainer.new()
	stack.set_anchors_preset(Control.PRESET_FULL_RECT)
	stack.add_theme_constant_override("separation", 0)
	tile.add_child(stack)

	var header := HBoxContainer.new()
	header.custom_minimum_size = Vector2(0, 58)
	header.add_theme_constant_override("separation", 8)
	stack.add_child(header)

	var label := _fabrication_label(_module_role_label(room_def, room_inst), 13, accent)
	label.size_flags_horizontal = SIZE_EXPAND_FILL
	label.add_theme_constant_override("line_spacing", 0)
	header.add_child(label)

	var status := ColorRect.new()
	status.color = C_FAB_GREEN
	status.custom_minimum_size = Vector2(8, 8)
	header.add_child(status)

	var art_panel := PanelContainer.new()
	art_panel.size_flags_vertical = SIZE_EXPAND_FILL
	art_panel.add_theme_stylebox_override("panel", _fabrication_style(C_FAB_SLOT, Color(0, 0, 0, 0), 0, 0, 16))
	stack.add_child(art_panel)

	var art_stack := VBoxContainer.new()
	art_stack.alignment = BoxContainer.ALIGNMENT_CENTER
	art_stack.add_theme_constant_override("separation", 14)
	art_panel.add_child(art_stack)

	var icon := TextureRect.new()
	icon.custom_minimum_size = Vector2(196, 168)
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.texture = _texture_for_room(room_id)
	art_stack.add_child(icon)

	var code := _fabrication_label(_module_code(room_def), 12, C_ON_DARK)
	code.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	code.add_theme_stylebox_override("normal", _fabrication_style(Color(0.02, 0.03, 0.06, 0.78), accent, 1, 4, 10))
	art_stack.add_child(code)

	tile.pressed.connect(func() -> void:
		_selected_assembly_room_id = room_id
		if _fabrication_bay_root and is_instance_valid(_fabrication_bay_root):
			_fabrication_bay_root.queue_free()
		_fabrication_bay_root = _build_fabrication_bay_screen()
		_rocket_step.add_child(_fabrication_bay_root)
	)
	return tile

func _build_fabrication_empty_slot(slot_name: String) -> PanelContainer:
	var slot := PanelContainer.new()
	slot.custom_minimum_size = Vector2(256, 320)
	slot.add_theme_stylebox_override("panel", _fabrication_style(Color(0.027, 0.055, 0.114, 0.55), C_FAB_LINE, 2, 4, 16, true))
	var stack := VBoxContainer.new()
	stack.alignment = BoxContainer.ALIGNMENT_CENTER
	stack.add_theme_constant_override("separation", 14)
	slot.add_child(stack)
	var title := _fabrication_label(slot_name, 13, C_ON_DARK_VAR)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(title)
	var plus := _fabrication_label("+", 48, C_ON_DARK_VAR)
	plus.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(plus)
	var hint := _fabrication_label("SELECT VESSEL", 12, C_ON_DARK_VAR)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(hint)
	return slot

func _build_fabrication_footer(installed: Array) -> PanelContainer:
	var footer := PanelContainer.new()
	footer.custom_minimum_size = Vector2(0, 112)
	footer.add_theme_stylebox_override("panel", _fabrication_style(Color(0.180, 0.204, 0.270, 0.96), C_FAB_BLUE, 1, 0, 22))

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 20)
	footer.add_child(row)

	var progress := HBoxContainer.new()
	progress.size_flags_horizontal = SIZE_EXPAND_FILL
	progress.alignment = BoxContainer.ALIGNMENT_CENTER
	progress.add_theme_constant_override("separation", 10)
	row.add_child(progress)
	for step_label in ["LOCATION SET", "MISSION SET"]:
		progress.add_child(_fabrication_progress_label(step_label, true))
		progress.add_child(_fabrication_rule())
	progress.add_child(_fabrication_progress_label("ASSEMBLY %s" % ("COMPLETE" if _selected_rocket != "" else "PENDING"), _selected_rocket != ""))
	progress.add_child(_fabrication_rule())
	progress.add_child(_fabrication_progress_label("LAUNCH READY", false))

	var chooser_box := VBoxContainer.new()
	chooser_box.custom_minimum_size = Vector2(330, 0)
	chooser_box.add_theme_constant_override("separation", 6)
	row.add_child(chooser_box)
	var chooser_label := _fabrication_label("PREBUILT ROCKETS", 11, C_ON_DARK_VAR)
	chooser_box.add_child(chooser_label)

	var chooser := OptionButton.new()
	chooser.custom_minimum_size = Vector2(0, 42)
	chooser.add_theme_stylebox_override("normal", _fabrication_style(C_FAB_PANEL, C_FAB_LINE, 1, 4, 8))
	chooser.add_theme_stylebox_override("hover", _fabrication_style(C_FAB_PANEL_H, C_FAB_BLUE, 1, 4, 8))
	chooser.add_theme_color_override("font_color", C_ON_DARK)
	if _rockets.is_empty():
		chooser.add_item("NO ROCKETS UNLOCKED")
		chooser.disabled = true
	else:
		chooser.add_item("SELECT VESSEL")
		chooser.set_item_disabled(0, true)
		chooser.select(0)
		for idx in range(_rockets.size()):
			var rtype := str(_rockets[idx])
			chooser.add_item("%s - %s" % [_rocket_short_code(rtype), RocketSpecs.get_display_name(rtype)])
			if rtype == _selected_rocket:
				chooser.select(idx + 1)
		chooser.item_selected.connect(func(index: int) -> void:
			var rocket_index := index - 1
			if rocket_index < 0 or rocket_index >= _rockets.size():
				return
			_selected_rocket = str(_rockets[rocket_index])
			RocketsManager.set_planning_rocket_type(_selected_rocket)
			var rooms := _installed_rooms_for_rocket(_selected_rocket)
			_selected_assembly_room_id = str(rooms[0].get("room_id", "")) if not rooms.is_empty() else ""
			_update_footer()
			if _fabrication_bay_root and is_instance_valid(_fabrication_bay_root):
				_fabrication_bay_root.queue_free()
			_fabrication_bay_root = _build_fabrication_bay_screen()
			_rocket_step.add_child(_fabrication_bay_root)
		)
	chooser_box.add_child(chooser)

	var launch_box := VBoxContainer.new()
	launch_box.custom_minimum_size = Vector2(220, 0)
	launch_box.add_theme_constant_override("separation", 7)
	row.add_child(launch_box)
	var ready_text := "FLIGHT SYSTEMS NOMINAL" if _selected_rocket != "" else "AWAITING ASSEMBLY"
	launch_box.add_child(_fabrication_label(ready_text, 13, C_FAB_AMBER if _selected_rocket == "" else C_FAB_GREEN))
	launch_box.add_child(_fabrication_label(_fabrication_metric_summary(installed), 12, C_ON_DARK_VAR))
	return footer

func _installed_rooms_for_rocket(rtype: String) -> Array:
	if rtype == "":
		return []
	var layout := RoomCatalog.create_layout_for_rocket_type(rtype)
	var installed := _sorted_installed_rooms(layout)
	if not installed.is_empty() and not _room_id_in_list(_selected_assembly_room_id, installed):
		_selected_assembly_room_id = str(installed[0].get("room_id", ""))
	return installed

func _module_role_label(room_def: Dictionary, room_inst: Dictionary) -> String:
	var category := str(room_def.get("category", "")).to_upper()
	if category == "POWER":
		return "PROPULSION"
	if category == "MINING":
		return "MINING DRILL"
	if str(room_inst.get("bay_id", "")) == "core_mid":
		return "CHASSIS"
	return category if category != "" else "MODULE"

func _module_code(room_def: Dictionary) -> String:
	var words := str(room_def.get("name", "MODULE")).to_upper().split(" ")
	var parts: Array[String] = []
	for word in words:
		if str(word).is_empty():
			continue
		parts.append(str(word).substr(0, min(4, str(word).length())))
		if parts.size() >= 2:
			break
	return "-".join(parts)

func _fabrication_metric_summary(installed: Array) -> String:
	if _selected_rocket == "":
		return "Select a vessel to populate the fabrication bay"
	var layout := RoomCatalog.create_layout_for_rocket_type(_selected_rocket)
	var science := RoomCatalog.science_multipliers(layout) if not layout.is_empty() else {"payout_multiplier": 1.0}
	var output_bonus := int(round((float(science.get("payout_multiplier", 1.0)) - 1.0) * 100.0))
	return "%d modules  //  %.1f AU  //  %+d%% output" % [installed.size(), RocketSpecs.get_max_range_au(_selected_rocket), output_bonus]

func _fabrication_progress_label(text_value: String, complete: bool) -> Label:
	var label := _fabrication_label(("[OK] " if complete else "[ ] ") + text_value, 11, C_FAB_BLUE if complete else C_ON_DARK_VAR)
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return label

func _fabrication_rule() -> ColorRect:
	var rule := ColorRect.new()
	rule.color = C_FAB_LINE
	rule.custom_minimum_size = Vector2(28, 1)
	return rule

func _fabrication_label(text_value: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text_value
	label.add_theme_color_override("font_color", color)
	label.add_theme_font_size_override("font_size", font_size)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label

func _fabrication_style(bg: Color, border: Color, border_width: int = 1, radius: int = 4, margin: int = 0, dashed: bool = false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.border_width_left = border_width
	style.border_width_top = border_width
	style.border_width_right = border_width
	style.border_width_bottom = border_width
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_right = radius
	style.corner_radius_bottom_left = radius
	style.content_margin_left = margin
	style.content_margin_top = margin
	style.content_margin_right = margin
	style.content_margin_bottom = margin
	if dashed:
		style.border_blend = true
	return style

func _sorted_installed_rooms(layout: Dictionary) -> Array:
	var bays: Dictionary = layout.get("bays", {})
	var rows: Array = []
	for bay_id in ["core_engine", "core_mid", "core_aft", "expansion_t2"]:
		if not bays.has(bay_id):
			continue
		for room_inst_any in bays[bay_id].get("rooms", []):
			if typeof(room_inst_any) != TYPE_DICTIONARY:
				continue
			var room_inst: Dictionary = room_inst_any
			rows.append({
				"bay_id": bay_id,
				"room_id": room_inst.get("room_id", ""),
				"tier": room_inst.get("tier", 1),
				"offline": bool(room_inst.get("offline", false))
			})
	return rows

func _room_id_in_list(room_id: String, rooms: Array) -> bool:
	for room_any in rooms:
		if typeof(room_any) != TYPE_DICTIONARY:
			continue
		if str((room_any as Dictionary).get("room_id", "")) == room_id:
			return true
	return false

func _texture_for_room(room_id: String) -> Texture2D:
	var generated_path := "res://assets/Rooms/generated_parts_512/%s.png" % room_id
	if ResourceLoader.exists(generated_path):
		return load(generated_path) as Texture2D
	return RoomSpriteAtlas.texture_for_room(room_id)

# ── Step: Confirm ─────────────────────────────────────────────────────────────

func _build_confirm_step() -> void:
	_confirm_step.visible = true

	var c_name   := str(_selected_contractor.get("name", "—"))
	var c_focus  := _contractor_brief(str(_selected_contractor.get("focus", _selected_contractor.get("role", ""))))
	var t_label  := str(_selected_target.get("label", _selected_target.get("name", "—")))
	var t_type   := str(_selected_target.get("type", "asteroid")).capitalize()
	var r_name   := RocketSpecs.get_display_name(_selected_rocket) if _selected_rocket else "—"
	var cost_str := ("%dB F" % (RocketSpecs.get_cost(_selected_rocket) / 1_000_000_000)) if _selected_rocket else "—"
	var reward_ratio := RocketsManager.get_target_reward_ratio(str(_selected_target.get("id", "")))
	var haul_summary := _confirm_haul_summary()
	var dur_sec := RocketSpecs.get_mission_seconds(_selected_rocket) if _selected_rocket else 0

	_set_manifest_card(_confirm_contractor_manifest, "CONTRACTOR", "CTR", c_name, c_focus if c_focus != "" else "Delivery contract")
	_set_manifest_card(_confirm_target_manifest, "TARGET", "TGT", t_label, t_type)
	_set_manifest_card(_confirm_rocket_manifest, "VESSEL", "RKT", r_name, _rocket_short_code(_selected_rocket))

	_bind_confirm_row("ContractorRow", "🏭", "Contractor", c_name)
	_bind_confirm_row("TargetRow", "🎯", "Target", "%s · %s" % [t_label, t_type])
	_bind_confirm_row("RocketRow", "🚀", "Rocket", r_name)
	_bind_confirm_row("CostRow", "💰", "Cost", cost_str)

	_set_fact_card(_confirm_travel_fact, "EST. TRAVEL TIME", "—" if dur_sec <= 0 else "~%d min" % (dur_sec / 60), "Route locked for departure")
	_set_fact_card(_confirm_cost_fact, "LAUNCH COST", cost_str, "Mission budget confirmed")
	_set_fact_card(_confirm_yield_fact, "EXPECTED YIELD", "%d%%" % int(reward_ratio * 100), haul_summary)

	_confirm_readiness_label.text = "SYSTEMS NOMINAL // FLIGHT READY"
	_confirm_note_label.text = "Once launched the rocket departs immediately."

func _bind_confirm_row(node_name: String, icon: String, key: String, value: String) -> void:
	var row := _confirm_rows_box.get_node_or_null(node_name) as HBoxContainer
	if row == null:
		return
	_set_label_text(row, "IconLabel", icon)
	_set_label_text(row, "KeyLabel", key)
	_set_label_text(row, "ValueLabel", value)

func _set_manifest_card(card: PanelContainer, kicker: String, icon: String, title: String, subtitle: String) -> void:
	if card == null:
		return
	_set_label_text(card, "VBox/KickerLabel", kicker)
	_set_label_text(card, "VBox/ContentRow/IconPanel/IconLabel", icon)
	_set_label_text(card, "VBox/ContentRow/TextColumn/TitleLabel", title)
	_set_label_text(card, "VBox/ContentRow/TextColumn/SubtitleLabel", subtitle)

func _set_fact_card(card: PanelContainer, label_text: String, value_text: String, detail_text: String) -> void:
	if card == null:
		return
	_set_label_text(card, "VBox/LabelLabel", label_text)
	_set_label_text(card, "VBox/ValueLabel", value_text)
	_set_label_text(card, "VBox/DetailLabel", detail_text)

func _confirm_haul_summary() -> String:
	var minerals := _selected_contractor.get("requested_minerals", {}) as Dictionary
	if minerals.is_empty():
		return "Collect any minerals"
	var parts: Array[String] = []
	for mineral_any in minerals.keys():
		var mineral := str(mineral_any)
		var qty := int(float(str(minerals[mineral_any])))
		parts.append("%s %d" % [mineral, qty])
		if parts.size() >= 2:
			break
	return ", ".join(parts)

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

func _rocket_short_code(rtype: String) -> String:
	match rtype:
		"starterrocket1":
			return "SR-1"
		"starterrocket2":
			return "SR-2"
		"starterrocket3":
			return "SR-3"
		_:
			return "ROCKET"

func _stat_chip(key: String, val: String, dark: bool = false) -> VBoxContainer:
	var scene := StatChipDarkScene if dark else StatChipScene
	var v := scene.instantiate() as VBoxContainer
	if v == null:
		v = VBoxContainer.new()
	var key_label := v.get_node_or_null("KeyLabel") as Label
	var value_label := v.get_node_or_null("ValueLabel") as Label
	if key_label:
		key_label.text = key
	if value_label:
		value_label.text = val
	return v

func _mineral_chip(mineral: String, qty: Variant, _dark: bool = false) -> PanelContainer:
	var p := MineralChipScene.instantiate() as PanelContainer
	if p == null:
		return PanelContainer.new()
	p.size_flags_horizontal = SIZE_EXPAND_FILL

	var qty_int := int(float(str(qty)))
	var name_lbl := p.get_node_or_null("VBox/NameLabel") as Label
	var qty_lbl  := p.get_node_or_null("VBox/QtyLabel")  as Label
	if name_lbl:
		name_lbl.text = _mineral_short_code(mineral)
		name_lbl.visible = true
	if qty_lbl:
		qty_lbl.text    = str(qty_int) if qty_int > 0 else "—"
		qty_lbl.visible = true
	return p

func _mineral_short_code(mineral: String) -> String:
	match mineral.to_lower():
		"iron":
			return "FE (IRON)"
		"nickel":
			return "NI (NICKEL)"
		"cobalt":
			return "CO (COBALT)"
		"silicates":
			return "SI (SILICATES)"
		"platinum":
			return "PT (PLATINUM)"
		"gold":
			return "AU (GOLD)"
		_:
			return mineral.to_upper()

func _add_empty_msg(text: String) -> void:
	var lbl := EmptyStateLabelScene.instantiate() as Label
	if lbl == null:
		return
	lbl.text = text
	_card_list.add_child(lbl)
