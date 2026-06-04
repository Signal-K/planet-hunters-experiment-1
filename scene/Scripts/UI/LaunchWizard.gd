extends Control
## Mobile-first launch wizard — Contractor > Target > Rocket > Confirm.
## Static scaffold (header / scroll / footer) is defined in LaunchWizard.tscn
## so designers can adjust layout in the Godot editor without touching this file.
## Dynamic card content is built here at runtime.

const RocketSpecs    = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const GameplayAnalytics = preload("res://Scripts/Systems/GameplayAnalytics.gd")
const MapStepScript  = preload("res://Scripts/UI/LaunchWizardMapStep.gd")
const RocketCardScene = preload("res://Scenes/UI/Templates/LaunchWizardRocketCard.tscn")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const AsteroidDetailViewScene = preload("res://Scenes/UI/AsteroidDetail/asteroid_detail_view.tscn")
const ContractorCardScene = preload("res://Scenes/UI/Templates/LaunchWizardContractorCard.tscn")
const ContractorCardSelectedScene = preload("res://Scenes/UI/Templates/LaunchWizardContractorCardSelected.tscn")
const StatChipScene = preload("res://Scenes/UI/Templates/LaunchWizardStatChip.tscn")
const StatChipDarkScene = preload("res://Scenes/UI/Templates/LaunchWizardStatChipDark.tscn")
const TargetDetailScene = preload("res://Scenes/UI/Templates/LaunchWizardTargetDetail.tscn")
const EmptyStateLabelScene = preload("res://Scenes/UI/Templates/LaunchWizardEmptyStateLabel.tscn")
const UILayout = preload("res://Scripts/UI/UILayout.gd")
const DS       = preload("res://Scripts/UI/DS.gd")

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
# Live-update widget refs
var _map_step:          MapStepScript  = null
var _target_detail:     PanelContainer = null
var _tutorial_overlay_visible_for_layout := false

signal back_pressed
signal launched(rocket_id: String, target_id: String)

# ── Scene nodes (from LaunchWizard.tscn) ──────────────────────────────────────
@onready var _background:   ColorRect       = $Background
@onready var _scaffold:     VBoxContainer   = $Scaffold
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
	_apply_display_fonts(self)
	_load_planning_state()
	_show_step(_step)
	call_deferred("_bind_tutorial_overlay_for_layout")
	call_deferred("refresh_layout_for_viewport")
	call_deferred("_stabilize_layout_after_startup")

func _apply_display_fonts(_root: Node) -> void:
	pass

func _stamp_display_fonts_r(root: Node, font: Font, scale: float) -> void:
	for child in root.get_children():
		if child is Label:
			var lbl := child as Label
			lbl.add_theme_font_override("font", font)
			var sz: int = lbl.theme_override_font_sizes.get("font_size", 0)
			if sz > 0 and sz < 20:
				lbl.add_theme_font_size_override("font_size", int(sz * scale))
		elif child is Button:
			var btn := child as Button
			btn.add_theme_font_override("font", font)
			var sz: int = btn.theme_override_font_sizes.get("font_size", 0)
			if sz > 0 and sz < 20:
				btn.add_theme_font_size_override("font_size", int(sz * scale))
		elif child is RichTextLabel:
			(child as RichTextLabel).add_theme_font_override("normal_font", font)
		if child.get_child_count() > 0:
			_stamp_display_fonts_r(child, font, scale)

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

	custom_minimum_size = viewport

	var portrait := UILayout.is_portrait(viewport)
	var compact := portrait or viewport.x < 900.0
	var narrow := viewport.x < 1280.0
	# Portrait uses tighter side margins to maximise usable card width.
	var side_margin := 12 if portrait else (14 if compact else (20 if narrow else 28))
	var vertical_margin := 10 if portrait else (14 if compact else 20)
	var header_zone := UILayout.zone(UILayout.Zone.APP_HEADER, viewport)
	var body_zone := UILayout.zone(UILayout.Zone.APP_BODY, viewport)
	var footer_zone := UILayout.zone(UILayout.Zone.APP_FOOTER, viewport)
	if _has_visible_tutorial_overlay():
		header_zone = UILayout.zone(UILayout.Zone.APP_HEADER_WITH_COACH, viewport)
		body_zone = UILayout.zone(UILayout.Zone.APP_BODY_WITH_COACH, viewport)
	var header_height := int(header_zone.size.y)
	var footer_height := int(footer_zone.size.y)

	# On the contractor step with the tutorial coach visible in landscape, shrink
	# the scroll content's right margin so cards don't extend under the coach panel.
	# The coach is anchored top-right; pulling the right edge left ensures every
	# contractor row — including the first — is fully clear of the panel.
	# In portrait the coach sits at the bottom, so no adjustment is needed there.
	var right_margin := side_margin
	if _step == Step.CONTRACTOR and _has_visible_tutorial_overlay() \
			and not UILayout.is_portrait(viewport):
		var coach_zone := UILayout.zone(UILayout.Zone.TUTORIAL_COACH, viewport)
		# right_margin = distance from viewport right to the coach panel's left edge + gap
		var coach_clearance := int(viewport.x - coach_zone.position.x) + 8
		right_margin = maxi(right_margin, coach_clearance)

	_background.custom_minimum_size = viewport
	_place_scaffold_in_zones(header_zone, body_zone, footer_zone)
	_scroll_margin.add_theme_constant_override("margin_left", side_margin)
	_scroll_margin.add_theme_constant_override("margin_right", right_margin)
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
	if _contractor_step:
		_contractor_step.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN if not portrait else Control.SIZE_EXPAND_FILL
		if not portrait:
			_contractor_step.custom_minimum_size.x = 820.0
		else:
			_contractor_step.custom_minimum_size.x = 0.0

	if _contractor_grid:
		_contractor_grid.columns = 1

	if _step == Step.TARGET and _map_panel.visible:
		call_deferred("_fit_map_to_scroll")

	if _card_list:
		_card_list.queue_sort()
	if _contractor_grid:
		_contractor_grid.queue_sort()

func _place_scaffold_in_zones(header_zone: Rect2, body_zone: Rect2, footer_zone: Rect2) -> void:
	if _scaffold == null:
		return
	var left := minf(minf(header_zone.position.x, body_zone.position.x), footer_zone.position.x)
	var top := minf(minf(header_zone.position.y, body_zone.position.y), footer_zone.position.y)
	var content_right := minf(header_zone.end.x, body_zone.end.x)
	var right := content_right if content_right < footer_zone.end.x else footer_zone.end.x
	var bottom := maxf(maxf(header_zone.end.y, body_zone.end.y), footer_zone.end.y)
	UILayout.place(_scaffold, Rect2(left, top, right - left, bottom - top))

func _bind_tutorial_overlay_for_layout() -> void:
	var tree := get_tree()
	if tree == null or tree.root == null:
		return
	if not tree.root.child_entered_tree.is_connected(_on_root_child_entered_tree_for_layout):
		tree.root.child_entered_tree.connect(_on_root_child_entered_tree_for_layout)
	var overlay := tree.root.find_child("TutorialCoachOverlay", true, false)
	if overlay is CanvasItem:
		_bind_tutorial_canvas_item_for_layout(overlay as CanvasItem)
	_tutorial_overlay_visible_for_layout = _has_visible_tutorial_overlay()
	refresh_layout_for_viewport()

func _on_root_child_entered_tree_for_layout(node: Node) -> void:
	if node != null and str(node.name) == "TutorialCoachOverlay" and node is CanvasItem:
		_bind_tutorial_canvas_item_for_layout(node as CanvasItem)
		call_deferred("refresh_layout_for_viewport")

func _bind_tutorial_canvas_item_for_layout(canvas_item: CanvasItem) -> void:
	if not canvas_item.visibility_changed.is_connected(_on_tutorial_overlay_layout_visibility_changed):
		canvas_item.visibility_changed.connect(_on_tutorial_overlay_layout_visibility_changed)

func _on_tutorial_overlay_layout_visibility_changed() -> void:
	var now_visible := _has_visible_tutorial_overlay()
	if now_visible == _tutorial_overlay_visible_for_layout:
		return
	_tutorial_overlay_visible_for_layout = now_visible
	refresh_layout_for_viewport()

func _has_visible_tutorial_overlay() -> bool:
	var tree := get_tree()
	if tree == null or tree.root == null:
		return false
	var overlay := tree.root.find_child("TutorialCoachOverlay", true, false)
	if overlay == null:
		return false
	if overlay is CanvasItem:
		return (overlay as CanvasItem).visible
	return true

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
			_next_btn.text     = "OPEN TARGET MAP" if not _selected_contractor.is_empty() else "CHOOSE BUYER"
			_next_btn.disabled = _selected_contractor.is_empty()
			if _footer_status_label:
				_footer_status_label.text = "BUYER CHOSEN  •  TARGET MAP READY" if not _selected_contractor.is_empty() else "PICK ONE BUYER  •  TARGET MAP UNLOCKS NEXT"
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
	_contractor_title.text = "PICK YOUR BUYER"
	_contractor_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	_contractor_subtitle.text = "Choose one order. It sets the cargo request and pushes you to target selection."
	_contractor_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	_contractor_grid.columns = 1

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

func _add_contractor_card(c: Dictionary, _idx: int = 0) -> void:
	var c_id     := str(c.get("id", ""))
	var c_name   := str(c.get("name", "Unknown"))
	var c_focus  := str(c.get("focus", c.get("role", "")))
	var minerals := c.get("requested_minerals", {}) as Dictionary
	var selected := c_id == str(_selected_contractor.get("id", ""))
	var status := _contractor_status(_idx, selected)

	var card_scene := ContractorCardSelectedScene if selected else ContractorCardScene
	var card := card_scene.instantiate() as PanelContainer
	if card == null:
		return
	_contractor_grid.add_child(card)
	_configure_contractor_card_layout(card)

	_set_label_text(card, "Margin/VBox/HeaderRow/CodePanel/CodeLabel", _contractor_code(c_name, c_focus))
	_set_label_text(card, "Margin/VBox/HeaderRow/IdentityCol/NameLabel", c_name.to_upper())
	_set_label_text(card, "Margin/VBox/HeaderRow/IdentityCol/FocusLabel", _contractor_flavour(c, _idx))
	_set_label_text(card, "Margin/VBox/HeaderRow/IdentityCol/MetaRow/StatusBadge/StatusLabel", status if not selected else "SELECTED")
	_set_label_text(card, "Margin/VBox/HeaderRow/IdentityCol/MetaRow/RouteLabel", "READY -> TARGET MAP" if selected else _contractor_reward_text(c, _idx))
	_style_status_badge(card, "Margin/VBox/HeaderRow/IdentityCol/MetaRow/StatusBadge", status if not selected else "SELECTED")
	_style_contractor_card(card, c, _idx, selected, status)
	_populate_mineral_order(card.get_node_or_null("Margin/VBox/HeaderRow/MineralPanel/MineralBox/MineralsList") as VBoxContainer, minerals, selected)

	var btn := _contractor_select_button(card)
	if btn == null:
		return
	btn.text = "READY" if selected else "CHOOSE"
	btn.pressed.connect(func():
		_selected_contractor = c
		if _use_trip_contract:
			RocketsManager.select_trip_contractor(c_id)
		else:
			RocketsManager.select_starter_contractor(c_id)
		GameplayAnalytics.emit_event("contractor_signed", {
			"contractor_id": c_id,
			"contractor_name": c_name,
			"contractor_focus": c_focus
		})
		_rebuild_cards()
		_update_footer()
	)

func _contractor_status(idx: int, selected: bool) -> String:
	if selected:
		return "SELECTED"
	var statuses := ["URGENT", "STABLE", "ACTIVE"]
	return str(statuses[idx % statuses.size()])

func _contractor_route_label(c: Dictionary, idx: int) -> String:
	var effect := str(c.get("effect", "")).strip_edges()
	match effect:
		"build_discount":
			return "BUILD DISCOUNT"
		"payout_bonus":
			return "PAYOUT PREMIUM"
		_:
			return "ORDER %02d" % (idx + 1)

func _contractor_reward_text(c: Dictionary, idx: int) -> String:
	var effect := str(c.get("effect", "")).strip_edges()
	match effect:
		"build_discount":
			var pct := int(round(float(c.get("build_discount_pct", 0.0)) * 100.0))
			return "-%d%% BUILD COST" % pct if pct > 0 else "CHEAPER BUILD"
		"payout_bonus":
			var mult := float(c.get("payout_bonus_mult", 1.0))
			return "%.2fx PAYOUT" % mult if mult > 1.0 else "PAYOUT BONUS"
		_:
			return "ORDER %02d" % (idx + 1)

func _contractor_code(name_text: String, focus: String) -> String:
	var compact := name_text.strip_edges().to_upper().replace("-", "").replace("_", "").replace(" ", "")
	if compact.length() >= 3:
		return compact.substr(0, 3)
	var fallback := focus.strip_edges().to_upper().replace("-", "").replace("_", "").replace(" ", "")
	if fallback.length() >= 3:
		return fallback.substr(0, 3)
	return "CTR"

func _configure_contractor_card_layout(card: Node) -> void:
	var width := get_viewport_rect().size.x
	var compact := width < 760.0
	var code_panel := card.get_node_or_null("Margin/VBox/HeaderRow/CodePanel") as Control
	var mineral_panel := card.get_node_or_null("Margin/VBox/HeaderRow/MineralPanel") as Control
	var select_button := card.get_node_or_null("Margin/VBox/HeaderRow/SelectButton") as Control
	if code_panel:
		code_panel.custom_minimum_size.x = 64.0 if compact else 104.0
	if mineral_panel:
		mineral_panel.custom_minimum_size.x = 0.0 if compact else 360.0
	if select_button:
		select_button.custom_minimum_size.x = 112.0 if compact else 150.0

func _contractor_select_button(card: Node) -> Button:
	var btn := card.get_node_or_null("Margin/VBox/HeaderRow/SelectButton") as Button
	if btn == null:
		btn = card.get_node_or_null("Margin/VBox/SelectButton") as Button
	return btn

func _populate_mineral_order(container: VBoxContainer, minerals: Dictionary, selected: bool) -> void:
	if container == null:
		return
	_clear_container_children(container)
	var chip_row := HBoxContainer.new()
	chip_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip_row.add_theme_constant_override("separation", 8)
	container.add_child(chip_row)
	if minerals.is_empty():
		_add_mineral_order_chip(chip_row, "Any", "OPEN", selected)
		return
	for mineral_any in minerals.keys():
		var mineral := str(mineral_any)
		_add_mineral_order_chip(chip_row, mineral, "%dt" % int(minerals[mineral_any]), selected)

func _add_mineral_order_row(container: VBoxContainer, mineral: String, amount: String, selected: bool) -> void:
	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	container.add_child(row)

	var name_label := Label.new()
	name_label.text = mineral
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.add_theme_font_size_override("font_size", 13)
	name_label.add_theme_color_override("font_color", Color(0.78, 0.91, 1.0, 1.0) if selected else Color(0.78, 0.78, 0.82, 0.92))
	row.add_child(name_label)

	var amount_label := Label.new()
	amount_label.text = amount
	amount_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	amount_label.add_theme_font_size_override("font_size", 13)
	amount_label.add_theme_color_override("font_color", Color(0.78, 0.91, 1.0, 1.0) if selected else Color(0.78, 0.78, 0.82, 0.92))
	row.add_child(amount_label)

func _add_mineral_order_chip(container: HBoxContainer, mineral: String, amount: String, selected: bool) -> void:
	var tint: Color = MINERAL_TINTS.get(mineral, Color(0.72, 0.82, 0.92))
	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(tint.r, tint.g, tint.b, 0.24 if selected else 0.14)
	sb.border_color = Color(tint.r, tint.g, tint.b, 0.78 if selected else 0.42)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 10.0
	sb.content_margin_right = 10.0
	sb.content_margin_top = 8.0
	sb.content_margin_bottom = 8.0
	chip.add_theme_stylebox_override("panel", sb)
	container.add_child(chip)

	var label := Label.new()
	label.text = "%s  %s" % [_mineral_symbol(mineral), amount]
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 15)
	label.add_theme_color_override("font_color", Color(1.0, 0.96, 0.86, 1.0) if selected else Color(0.90, 0.88, 0.82, 0.94))
	chip.add_child(label)

func _mineral_symbol(mineral: String) -> String:
	match mineral:
		"Iron":
			return "Fe"
		"Nickel":
			return "Ni"
		"Cobalt":
			return "Co"
		"Silicates":
			return "Si"
		"Platinum":
			return "Pt"
		"Gold":
			return "Au"
		_:
			return mineral.substr(0, mini(2, mineral.length())).to_upper()

func _style_contractor_card(card: PanelContainer, c: Dictionary, idx: int, selected: bool, status: String) -> void:
	var palette := _contractor_palette(c, idx)
	var accent: Color = palette["accent"]
	var warm: Color = palette["warm"]
	var bg: Color = palette["bg_selected"] if selected else palette["bg"]
	var border: Color = accent if selected else Color(accent.r, accent.g, accent.b, 0.42)
	var panel := StyleBoxFlat.new()
	panel.bg_color = bg
	panel.border_color = border
	panel.set_border_width_all(2 if selected else 1)
	panel.set_corner_radius_all(8)
	panel.shadow_color = Color(accent.r, accent.g, accent.b, 0.26 if selected else 0.10)
	panel.shadow_size = 18 if selected else 8
	panel.content_margin_left = 0.0
	panel.content_margin_right = 0.0
	panel.content_margin_top = 0.0
	panel.content_margin_bottom = 0.0
	card.add_theme_stylebox_override("panel", panel)
	card.custom_minimum_size.y = 156.0

	var rail := card.get_node_or_null("AccentRail") as Panel
	if rail:
		var rail_style := StyleBoxFlat.new()
		rail_style.bg_color = accent
		rail.add_theme_stylebox_override("panel", rail_style)
		rail.custom_minimum_size.x = 7.0 if selected else 5.0
	var code_panel := card.get_node_or_null("Margin/VBox/HeaderRow/CodePanel") as PanelContainer
	if code_panel:
		var code_style := StyleBoxFlat.new()
		code_style.bg_color = Color(accent.r, accent.g, accent.b, 0.18 if selected else 0.10)
		code_style.border_color = Color(accent.r, accent.g, accent.b, 0.72)
		code_style.set_border_width_all(1)
		code_style.set_corner_radius_all(8)
		code_style.content_margin_left = 12.0
		code_style.content_margin_right = 12.0
		code_style.content_margin_top = 14.0
		code_style.content_margin_bottom = 14.0
		code_panel.add_theme_stylebox_override("panel", code_style)
	var mineral_panel := card.get_node_or_null("Margin/VBox/HeaderRow/MineralPanel") as PanelContainer
	if mineral_panel:
		var mineral_style := StyleBoxFlat.new()
		mineral_style.bg_color = Color(0.02, 0.026, 0.038, 0.68)
		mineral_style.border_color = Color(warm.r, warm.g, warm.b, 0.34)
		mineral_style.set_border_width_all(1)
		mineral_style.set_corner_radius_all(8)
		mineral_style.content_margin_left = 14.0
		mineral_style.content_margin_right = 14.0
		mineral_style.content_margin_top = 12.0
		mineral_style.content_margin_bottom = 12.0
		mineral_panel.add_theme_stylebox_override("panel", mineral_style)
	var btn := _contractor_select_button(card)
	if btn:
		var btn_style := StyleBoxFlat.new()
		btn_style.bg_color = Color(warm.r, warm.g, warm.b, 0.92 if selected else 0.18)
		btn_style.border_color = Color(warm.r, warm.g, warm.b, 1.0)
		btn_style.set_border_width_all(1)
		btn_style.set_corner_radius_all(6)
		btn_style.content_margin_left = 18.0
		btn_style.content_margin_right = 18.0
		btn_style.content_margin_top = 10.0
		btn_style.content_margin_bottom = 10.0
		var hover := btn_style.duplicate()
		hover.bg_color = Color(warm.r, warm.g, warm.b, 1.0 if selected else 0.32)
		btn.add_theme_stylebox_override("normal", btn_style)
		btn.add_theme_stylebox_override("hover", hover)
		btn.add_theme_stylebox_override("pressed", hover)
		btn.add_theme_stylebox_override("focus", hover)
		btn.add_theme_color_override("font_color", Color(0.04, 0.045, 0.055, 1.0) if selected else Color(warm.r, warm.g, warm.b, 1.0))
		btn.add_theme_color_override("font_hover_color", Color(0.04, 0.045, 0.055, 1.0) if selected else Color(1, 0.96, 0.80, 1))
		btn.add_theme_font_size_override("font_size", 15)
	for path in [
		"Margin/VBox/HeaderRow/CodePanel/CodeLabel",
		"Margin/VBox/HeaderRow/IdentityCol/NameLabel",
		"Margin/VBox/HeaderRow/IdentityCol/FocusLabel",
		"Margin/VBox/HeaderRow/IdentityCol/MetaRow/RouteLabel",
		"Margin/VBox/HeaderRow/MineralPanel/MineralBox/OrderLabel",
	]:
		var label := card.get_node_or_null(path) as Label
		if label == null:
			continue
		if str(path).ends_with("CodeLabel"):
			label.add_theme_color_override("font_color", accent)
			label.add_theme_font_size_override("font_size", 26)
		elif str(path).ends_with("NameLabel"):
			label.add_theme_color_override("font_color", Color(0.98, 0.98, 0.94, 1.0))
			label.add_theme_font_size_override("font_size", 23)
		elif str(path).ends_with("RouteLabel"):
			label.add_theme_color_override("font_color", warm)
			label.add_theme_font_size_override("font_size", 12)
		elif str(path).ends_with("OrderLabel"):
			label.add_theme_color_override("font_color", Color(warm.r, warm.g, warm.b, 0.86))
			label.text = "CARGO"
		else:
			label.add_theme_color_override("font_color", Color(0.78, 0.82, 0.88, 0.92))

func _contractor_palette(c: Dictionary, idx: int) -> Dictionary:
	var identity := (str(c.get("name", "")) + " " + str(c.get("focus", c.get("role", "")))).to_lower()
	if identity.find("defense") != -1 or identity.find("aegis") != -1:
		return {
			"accent": Color(1.00, 0.36, 0.28, 1.0),
			"warm": Color(1.00, 0.72, 0.28, 1.0),
			"bg": Color(0.145, 0.058, 0.058, 0.96),
			"bg_selected": Color(0.235, 0.078, 0.066, 0.98),
		}
	if identity.find("lumen") != -1 or identity.find("consumer") != -1:
		return {
			"accent": Color(0.44, 0.92, 0.62, 1.0),
			"warm": Color(1.00, 0.84, 0.32, 1.0),
			"bg": Color(0.050, 0.125, 0.096, 0.96),
			"bg_selected": Color(0.055, 0.190, 0.128, 0.98),
		}
	if identity.find("helion") != -1 or identity.find("orbital") != -1:
		return {
			"accent": Color(0.66, 0.62, 1.00, 1.0),
			"warm": Color(0.96, 0.58, 1.00, 1.0),
			"bg": Color(0.072, 0.065, 0.150, 0.96),
			"bg_selected": Color(0.102, 0.088, 0.235, 0.98),
		}
	var accents := [
		Color(0.28, 0.76, 1.00, 1.0),
		Color(0.96, 0.65, 0.14, 1.0),
		Color(0.74, 0.92, 0.38, 1.0),
	]
	var accent: Color = accents[idx % accents.size()]
	return {
		"accent": accent,
		"warm": Color(1.00, 0.78, 0.28, 1.0),
		"bg": Color(0.045, 0.070, 0.110, 0.96),
		"bg_selected": Color(0.060, 0.105, 0.165, 0.98),
	}

func _style_status_badge(root: Node, path: NodePath, status: String) -> void:
	var badge := root.get_node_or_null(path) as PanelContainer
	if badge == null:
		return
	var sb := StyleBoxFlat.new()
	sb.corner_radius_top_left = 2
	sb.corner_radius_top_right = 2
	sb.corner_radius_bottom_right = 2
	sb.corner_radius_bottom_left = 2
	sb.content_margin_left = 8.0
	sb.content_margin_top = 4.0
	sb.content_margin_right = 8.0
	sb.content_margin_bottom = 4.0
	sb.border_width_left = 1
	sb.border_width_top = 1
	sb.border_width_right = 1
	sb.border_width_bottom = 1
	match status:
		"URGENT":
			sb.bg_color = Color(0.58, 0.0, 0.039, 0.76)
			sb.border_color = Color(1.0, 0.706, 0.671, 0.80)
		"SELECTED":
			sb.bg_color = Color(0.247, 0.663, 1.0, 0.22)
			sb.border_color = Color(0.729, 0.902, 1.0, 0.92)
		"ACTIVE":
			sb.bg_color = Color(0.153, 0.153, 0.161, 0.86)
			sb.border_color = Color(0.745, 0.776, 0.882, 0.74)
		_:
			sb.bg_color = Color(0.235, 0.282, 0.416, 0.72)
			sb.border_color = Color(0.729, 0.773, 0.929, 0.72)
	badge.add_theme_stylebox_override("panel", sb)

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

func _contractor_flavour(c: Dictionary, idx: int) -> String:
	var identity := (str(c.get("name", "")) + " " + str(c.get("focus", c.get("role", "")))).to_lower()
	if identity.find("defense") != -1 or identity.find("aegis") != -1:
		return "High-risk security shipment"
	if identity.find("lumen") != -1 or identity.find("consumer") != -1:
		return "Clean supply run"
	if identity.find("helion") != -1 or identity.find("orbital") != -1:
		return "Deep-orbit fabrication order"
	var briefs := ["Fast cash route", "Balanced cargo order", "Long-haul buyer"]
	return briefs[idx % briefs.size()]

func _set_label_text(root: Node, path: NodePath, value: String) -> void:
	var label := root.get_node_or_null(path) as Label
	if label:
		label.text = value

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

	_classification_card.visible = false

	# Auto-select the best available target before opening the map,
	# so the map opens with something already selected.
	if _selected_target.is_empty():
		var auto := RocketsManager.ensure_selected_target_for_launch()
		if auto.get("ok", false):
			RocketsManager.select_target(str(auto.get("target_id", "")))
			# Reload _selected_target from the manager so detail panel can show it.
			var auto_tid := str(auto.get("target_id", ""))
			if auto_tid != "":
				_selected_target = RocketsManager.get_target_details(auto_tid)

	# In portrait, show the inline map panel instead of navigating to the map
	# scene — the LaunchWizardMapStep embedded in the scene handles tap-to-pick.
	var vp := get_viewport_rect().size
	if UILayout.is_portrait(vp):
		_show_inline_map()
		return

	RocketsManager.set_map_return_mode(true)
	var map_scene := "res://Scenes/UI/SpaceMap/galaxy_map.tscn" \
		if stage >= 3 else "res://Scenes/UI/SpaceMap/space_map.tscn"
	get_tree().change_scene_to_file(map_scene)

func _fit_map_to_scroll() -> void:
	var vp := get_viewport_rect().size
	var portrait := UILayout.is_portrait(vp)
	var h := _scroll.size.y
	if h < 200.0:
		h = vp.y - 120.0
	# In portrait, the map occupies ~52% of the scroll area (min 320 px) so
	# the target detail panel is still visible below it without needing to scroll.
	var map_h: float = maxf(h * 0.52, 320.0) if portrait else maxf(h * 0.66, 420.0)
	_map_panel.custom_minimum_size = Vector2(0, map_h)
	if _map_step and is_instance_valid(_map_step):
		_map_step.queue_redraw()

## Show the inline orbital-ring map embedded in the LaunchWizard scaffold.
## Used only in portrait mode — landscape navigates to space_map.tscn instead.
func _show_inline_map() -> void:
	# Enrich _targets with distance_au so LaunchWizardMapStep can draw rings.
	var enriched: Array = []
	for t_any in _targets:
		if typeof(t_any) != TYPE_DICTIONARY:
			continue
		var t: Dictionary = t_any.duplicate()
		if not t.has("distance_au") or float(t.get("distance_au", 0.0)) <= 0.0:
			var profile := RocketsManager.build_target_profile(
				str(t.get("id", "")), str(t.get("type", "asteroid"))
			)
			t["distance_au"] = float(profile.get("distance_au", 0.0))
		enriched.append(t)
	_targets = enriched

	var sel_id := str(_selected_target.get("id", ""))
	_map_panel.visible = true
	_target_detail_card.visible = true
	if _map_step_node and is_instance_valid(_map_step_node):
		_map_step_node.setup(_targets, sel_id)

	if not _selected_target.is_empty():
		_refresh_target_detail(_selected_target)
	else:
		_target_hint_label.text = "Tap a target on the map to select your destination."
		_target_hint_label.visible = true

	call_deferred("_fit_map_to_scroll")

func _on_map_target_selected(t: Dictionary) -> void:
	_selected_target = t
	RocketsManager.select_target(str(t.get("id", "")))
	AppControllerHelper.record_tutorial_action("select_launch_target", {
		"target_id": str(t.get("id", "")),
		"source": "launch_wizard_map"
	})
	_update_footer()
	_refresh_target_detail(t)
	# In portrait inline-map mode, keep the MapStep selection ring in sync.
	if _map_step_node and is_instance_valid(_map_step_node):
		_map_step_node.set_selected(str(t.get("id", "")))

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


func _on_primary_classification_button_pressed() -> void:
	pass

func _on_not_planet_button_pressed() -> void:
	pass

func _on_mark_dip_button_pressed() -> void:
	pass

# ── Step: Rocket ──────────────────────────────────────────────────────────────

func _build_rocket_step() -> void:
	_rockets = RocketsManager.get_unlocked()
	_rocket_step.visible = true

	if _selected_rocket == "" and not _rockets.is_empty():
		_selected_rocket = str(_rockets[0])
		RocketsManager.set_planning_rocket_type(_selected_rocket)

	var vp := get_viewport_rect().size
	if UILayout.is_portrait(vp):
		_build_rocket_step_portrait()
	else:
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

# ── Portrait rocket step (Fab layout) ─────────────────────────────────────────

## Portrait-specific Fab assembly screen. Shows the selected rocket as a large
## highlighted panel (image + key stats), with a horizontally-scrolling chip
## strip below so the player can switch between available rocket types.
func _build_rocket_step_portrait() -> void:
	if _rockets.is_empty():
		var lbl := EmptyStateLabelScene.instantiate() as Label
		if lbl:
			lbl.text = "No rockets unlocked yet."
			lbl.set_meta("rocket_card", true)
			_rocket_step.add_child(lbl)
		return

	var selected := _selected_rocket
	var dur_sec  := RocketSpecs.get_mission_seconds(selected)
	var dur_str  := "%d min" % (dur_sec / 60) if dur_sec >= 60 else "%ds" % dur_sec
	var cost_f   := float(RocketSpecs.get_cost(selected)) / 1_000_000_000.0
	var range_au := RocketSpecs.get_max_range_au(selected)

	# ── Selected-vessel panel ───────────────────────────────────────────────
	var panel := PanelContainer.new()
	panel.set_meta("rocket_card", true)
	var ps := StyleBoxFlat.new()
	ps.bg_color = C_FAB_PANEL_H
	ps.border_color = C_FAB_BLUE
	ps.set_border_width_all(2)
	ps.set_corner_radius_all(DS.R_CARD)
	ps.content_margin_left  = 16; ps.content_margin_right  = 16
	ps.content_margin_top   = 16; ps.content_margin_bottom = 16
	panel.add_theme_stylebox_override("panel", ps)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 14)

	# Header row: icon backplate + name/ID column
	var header_row := HBoxContainer.new()
	header_row.add_theme_constant_override("separation", 14)

	var icon_plate := PanelContainer.new()
	var ips := StyleBoxFlat.new()
	ips.bg_color    = Color(C_FAB_BLUE.r, C_FAB_BLUE.g, C_FAB_BLUE.b, 0.14)
	ips.border_color = Color(C_FAB_BLUE.r, C_FAB_BLUE.g, C_FAB_BLUE.b, 0.35)
	ips.set_border_width_all(1)
	ips.set_corner_radius_all(6)
	ips.content_margin_left = 10; ips.content_margin_right = 10
	ips.content_margin_top  = 10; ips.content_margin_bottom = 10
	icon_plate.add_theme_stylebox_override("panel", ips)
	icon_plate.custom_minimum_size = Vector2(72, 60)
	var icon_lbl := Label.new()
	icon_lbl.text = "🚀"
	icon_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon_lbl.vertical_alignment   = VERTICAL_ALIGNMENT_CENTER
	icon_lbl.add_theme_font_size_override("font_size", 28)
	icon_plate.add_child(icon_lbl)
	header_row.add_child(icon_plate)

	var name_col := VBoxContainer.new()
	name_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_col.add_theme_constant_override("separation", 4)
	var name_lbl := Label.new()
	name_lbl.text = RocketSpecs.get_display_name(selected)
	name_lbl.add_theme_color_override("font_color", C_FAB_BLUE)
	name_lbl.add_theme_font_size_override("font_size", DS.F_BODY)
	name_lbl.add_theme_font_size_override("font_size", DS.F_TITLE)
	var id_lbl := Label.new()
	id_lbl.text = selected.to_upper()
	id_lbl.add_theme_color_override("font_color", C_ON_SURF_VAR)
	id_lbl.add_theme_font_size_override("font_size", DS.F_CAPTION)
	var sel_badge := Label.new()
	sel_badge.text = "■  SELECTED"
	sel_badge.add_theme_color_override("font_color", C_FAB_BLUE)
	sel_badge.add_theme_font_size_override("font_size", DS.F_CAPTION)
	name_col.add_child(name_lbl)
	name_col.add_child(id_lbl)
	name_col.add_child(sel_badge)
	header_row.add_child(name_col)
	vbox.add_child(header_row)

	# Stats row: RANGE / COST / TIME chips
	var stats_row := HBoxContainer.new()
	stats_row.add_theme_constant_override("separation", 8)
	for pair: Array in [
		["RANGE", "%.0f AU" % range_au],
		["COST",  "%.1fB F" % cost_f],
		["TIME",  dur_str],
	]:
		var chip := PanelContainer.new()
		var cs := StyleBoxFlat.new()
		cs.bg_color = C_FAB_SLOT
		cs.set_corner_radius_all(4)
		cs.content_margin_left = 10; cs.content_margin_right = 10
		cs.content_margin_top  = 6;  cs.content_margin_bottom = 6
		chip.add_theme_stylebox_override("panel", cs)
		chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var cv := VBoxContainer.new()
		cv.add_theme_constant_override("separation", 2)
		var k := Label.new()
		k.text = str(pair[0])
		k.add_theme_color_override("font_color", C_ON_SURF_VAR)
		k.add_theme_font_size_override("font_size", DS.F_CAPTION)
		var v := Label.new()
		v.text = str(pair[1])
		v.add_theme_color_override("font_color", C_ON_SURF)
		v.add_theme_font_size_override("font_size", DS.F_BODY)
		cv.add_child(k)
		cv.add_child(v)
		chip.add_child(cv)
		stats_row.add_child(chip)
	vbox.add_child(stats_row)

	panel.add_child(vbox)
	_rocket_step.add_child(panel)

	# ── Vessel-switch chip strip ────────────────────────────────────────────
	if _rockets.size() > 1:
		var strip_label := Label.new()
		strip_label.text = "AVAILABLE VESSELS"
		strip_label.add_theme_color_override("font_color", C_ON_SURF_VAR)
		strip_label.add_theme_font_size_override("font_size", DS.F_CAPTION)
		strip_label.set_meta("rocket_card", true)
		_rocket_step.add_child(strip_label)

		var scroll := ScrollContainer.new()
		scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_ALWAYS
		scroll.vertical_scroll_mode   = ScrollContainer.SCROLL_MODE_DISABLED
		scroll.custom_minimum_size    = Vector2(0, 56)
		scroll.set_meta("rocket_card", true)

		var chip_row := HBoxContainer.new()
		chip_row.add_theme_constant_override("separation", 8)
		chip_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		for rtype_any in _rockets:
			var rtype := str(rtype_any)
			var is_sel := rtype == _selected_rocket
			var chip_btn := Button.new()
			chip_btn.text = RocketSpecs.get_display_name(rtype)
			_style_chip_btn(chip_btn, is_sel, C_FAB_BLUE)
			chip_btn.pressed.connect(func() -> void:
				_selected_rocket = rtype
				RocketsManager.set_planning_rocket_type(rtype)
				_update_footer()
				for child in _rocket_step.get_children():
					if child.get_meta("rocket_card", false):
						child.queue_free()
				_build_rocket_step_portrait()
			)
			chip_row.add_child(chip_btn)

		scroll.add_child(chip_row)
		_rocket_step.add_child(scroll)

## Apply styled normal/hover/focus style boxes and font colour to a chip button.
## `accent` is the border/text tint colour; `selected` highlights with filled bg.
func _style_chip_btn(btn: Button, selected: bool, accent: Color) -> void:
	var norm := StyleBoxFlat.new()
	norm.bg_color     = Color(accent.r, accent.g, accent.b, 0.22 if selected else 0.07)
	norm.border_color = Color(accent.r, accent.g, accent.b, 0.75 if selected else 0.28)
	norm.set_border_width_all(1 if selected else 1)
	norm.set_corner_radius_all(DS.R_BTN)
	norm.content_margin_left  = 16; norm.content_margin_right  = 16
	norm.content_margin_top   = 9;  norm.content_margin_bottom = 9
	btn.add_theme_stylebox_override("normal", norm)
	var hover := norm.duplicate() as StyleBoxFlat
	hover.bg_color = Color(accent.r, accent.g, accent.b, 0.32)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("focus", norm)
	btn.add_theme_color_override("font_color", accent if selected else Color(0.78, 0.88, 1.0, 1.0))
	btn.add_theme_font_size_override("font_size", DS.F_CAPTION)

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
	GameplayAnalytics.emit_launch_started(rocket_id, target_id, target_type, {
		"target_label": target_label,
		"rocket_type": _selected_rocket,
		"contractor_id": str(_selected_contractor.get("id", "")),
		"contractor_name": str(_selected_contractor.get("name", ""))
	})
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

func _add_empty_msg(text: String) -> void:
	var lbl := EmptyStateLabelScene.instantiate() as Label
	if lbl == null:
		return
	lbl.text = text
	_card_list.add_child(lbl)
