extends Control
## Mobile-first launch wizard — Contractor > Target > Rocket > Confirm.
## Static scaffold (header / scroll / footer) is defined in LaunchWizard.tscn
## so designers can adjust layout in the Godot editor without touching this file.
## Dynamic card content is built here at runtime.

const RocketSpecs    = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const MapStepScript  = preload("res://Scripts/UI/LaunchWizardMapStep.gd")
const RocketCardScene = preload("res://Scenes/UI/Templates/LaunchWizardRocketCard.tscn")
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
const C_HEADER_BG   := Color(0.039, 0.071, 0.114, 1.0)  # #0a121d — deep command bg
const C_ACCENT      := Color(0.247, 0.663, 1.000, 1.0)  # #3fa9ff — command cyan
const C_ACCENT_DIM  := Color(0.110, 0.529, 0.863, 1.0)  # #1c87dc — cyan press
const C_ICE_TINT    := Color(0.247, 0.663, 1.000, 1.0)  # command cyan for selected text
const C_ICE_TINT_BG := Color(0.247, 0.663, 1.000, 0.16) # cyan soft bg
const C_PAGE_BG     := Color(0.039, 0.071, 0.114, 1.0)  # #0a121d — page bg
const C_SURF_LOW    := Color(0.055, 0.094, 0.157, 1.0)  # #0e1828 — surface low
const C_SURF_LOWEST := Color(0.071, 0.133, 0.212, 1.0)  # #122236 — cards/panels
const C_CONTRACT_BG := Color(0.039, 0.071, 0.114, 1.0)  # #0a121d — deep bg
const C_CONTRACT_BG_2 := Color(0.071, 0.133, 0.212, 1.0) # #122236 — card surface
const C_ON_SURF     := Color(0.902, 0.937, 1.000, 1.0)  # #e6efff — primary text
const C_ON_SURF_VAR := Color(0.663, 0.722, 0.808, 1.0)  # #a9b8ce — dim text
const C_ON_DARK     := Color(0.902, 0.937, 1.000, 1.0)  # #e6efff — primary readouts
const C_ON_DARK_VAR := Color(0.663, 0.722, 0.808, 1.0)  # #a9b8ce — secondary
const C_SHADOW      := Color(0.000, 0.000, 0.000, 0.45) # deep shadow
const C_WHITE       := Color(1.000, 1.000, 1.000, 1.0)
const C_OK          := Color(0.224, 0.827, 0.416, 1.0)  # #39d36a — status OK
const C_WARN        := Color(1.000, 0.702, 0.278, 1.0)  # #ffb347 — status warn
const C_LOCK        := Color(0.365, 0.451, 0.565, 1.0)  # #5d7390 — muted
const C_VIOLET      := Color(0.753, 0.518, 1.000, 1.0)  # #c084ff — rare mineral
const C_FAB_BG      := Color(0.039, 0.071, 0.114, 1.0)  # #0a121d — fab bg
const C_FAB_PANEL   := Color(0.071, 0.133, 0.212, 0.96) # #122236 — fab cards
const C_FAB_PANEL_H := Color(0.094, 0.188, 0.294, 0.98) # #18304b — fab hover
const C_FAB_SLOT    := Color(0.094, 0.188, 0.294, 1.0)  # #18304b — slot tile
const C_FAB_LINE    := Color(0.247, 0.663, 1.000, 0.18) # cyan hairline
const C_FAB_BLUE    := Color(0.247, 0.663, 1.000, 1.0)  # #3fa9ff — command cyan
const C_FAB_AMBER   := Color(0.961, 0.651, 0.137, 1.0)  # #f5a623 — vulcan amber
const C_FAB_GREEN   := Color(0.224, 0.827, 0.416, 1.0)  # #39d36a — status OK

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

	# Determine the minimum valid step given what's populated, then take the max
	# of that and the saved step. This prevents saved_step from holding the wizard
	# back on TARGET when contractor+target are already set, while still allowing
	# the user to land on CONFIRM if they were already there.
	var min_step: int
	if _selected_contractor.is_empty():
		min_step = int(Step.CONTRACTOR)
	elif _selected_target.is_empty():
		min_step = int(Step.TARGET)
	else:
		min_step = int(Step.ROCKET)
	_step = max(int(_step), min_step) as Step

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
		var app = AppControllerHelper.get_instance()
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
	# Remove any dynamically added rocket cards
	if _rocket_step:
		for child in _rocket_step.get_children():
			if child.get_meta("rocket_card", false):
				child.queue_free()

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

	# Auto-select the best available target before opening the map,
	# so the map opens with something already selected.
	if _selected_target.is_empty():
		var auto := RocketsManager.ensure_selected_target_for_launch()
		if auto.get("ok", false):
			RocketsManager.select_target(str(auto.get("target_id", "")))

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
	if not _target_detail_card or not is_instance_valid(_target_detail_card):
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

	if _selected_rocket == "" and not _rockets.is_empty():
		_selected_rocket = str(_rockets[0])
		RocketsManager.set_planning_rocket_type(_selected_rocket)

	_build_rocket_cards()
	_update_footer()

func _build_rocket_cards() -> void:
	if _rockets.is_empty():
		var lbl := EmptyStateLabelScene.instantiate() as Label
		if lbl:
			lbl.text = "No rockets unlocked yet."
			lbl.set_meta("rocket_card", true)
			_rocket_step.add_child(lbl)
		return
	for rtype_any in _rockets:
		_add_rocket_card(str(rtype_any))

func _add_rocket_card(rtype: String) -> void:
	var selected := rtype == _selected_rocket
	var card := RocketCardScene.instantiate() as PanelContainer
	card.set_meta("rocket_card", true)

	var bg := C_FAB_PANEL_H if selected else C_FAB_PANEL
	var border := C_FAB_BLUE if selected else C_FAB_LINE
	var border_w := 2 if selected else 1
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(border_w)
	style.set_corner_radius_all(8)
	style.content_margin_left   = 20
	style.content_margin_right  = 20
	style.content_margin_top    = 16
	style.content_margin_bottom = 16
	card.add_theme_stylebox_override("panel", style)

	var cost_f  := float(RocketSpecs.get_cost(rtype)) / 1_000_000_000.0
	var dur_sec := RocketSpecs.get_mission_seconds(rtype)
	var dur_str := "%d min" % (dur_sec / 60) if dur_sec >= 60 else "%ds" % dur_sec

	_set_label_text(card, "Margin/VBox/HeaderRow/NameLabel", RocketSpecs.get_display_name(rtype))
	_set_label_text(card, "Margin/VBox/HeaderRow/StatusLabel", "SELECTED" if selected else "AVAILABLE")
	_set_label_text(card, "Margin/VBox/StatsRow/RangeChip/ValueLabel",    "%.0f AU" % RocketSpecs.get_max_range_au(rtype))
	_set_label_text(card, "Margin/VBox/StatsRow/CostChip/ValueLabel",     "%.1fB F" % cost_f)
	_set_label_text(card, "Margin/VBox/StatsRow/DurationChip/ValueLabel", dur_str)

	var name_lbl := card.get_node_or_null("Margin/VBox/HeaderRow/NameLabel") as Label
	if name_lbl:
		name_lbl.add_theme_color_override("font_color", C_FAB_BLUE if selected else C_ON_SURF)

	var status_lbl := card.get_node_or_null("Margin/VBox/HeaderRow/StatusLabel") as Label
	if status_lbl:
		status_lbl.add_theme_color_override("font_color", C_FAB_BLUE if selected else C_ON_SURF_VAR)

	for chip_path in ["Margin/VBox/StatsRow/RangeChip", "Margin/VBox/StatsRow/CostChip", "Margin/VBox/StatsRow/DurationChip"]:
		var key_lbl := card.get_node_or_null(chip_path + "/KeyLabel") as Label
		if key_lbl:
			key_lbl.add_theme_color_override("font_color", C_ON_SURF_VAR)
		var val_lbl := card.get_node_or_null(chip_path + "/ValueLabel") as Label
		if val_lbl:
			val_lbl.add_theme_color_override("font_color", C_ON_SURF)

	var select_btn := card.get_node_or_null("Margin/VBox/SelectButton") as Button
	if select_btn:
		select_btn.visible = not selected
		select_btn.text = "Select"
		select_btn.pressed.connect(func() -> void:
			_selected_rocket = rtype
			RocketsManager.set_planning_rocket_type(rtype)
			_update_footer()
			for child in _rocket_step.get_children():
				if child.get_meta("rocket_card", false):
					child.queue_free()
			_build_rocket_cards()
		)

	_rocket_step.add_child(card)

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
