extends CanvasLayer
## LaunchWizard — 4-step mission setup: contractor → target → rocket → launch.
## Uses RocketsManager for all state reads and writes.

const RocketSpecs = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")

# ── Node refs ────────────────────────────────────────────────────────────
@onready var back_button: Button = $Root/TopBar/BackButton
@onready var eyebrow_label: Label = $Root/TopBar/TitleVBox/EyebrowLabel
@onready var title_label: Label = $Root/TopBar/TitleVBox/TitleLabel

@onready var step1_panel: Control = $Root/Step1Panel
@onready var contractor_list: VBoxContainer = $Root/Step1Panel/ContractorScroll/ContractorList

@onready var step2_panel: Control = $Root/Step2Panel
@onready var target_name_label: Label = $Root/Step2Panel/TargetCard/TargetVBox/TargetName
@onready var target_type_label: Label = $Root/Step2Panel/TargetCard/TargetVBox/TargetTypeLabel
@onready var target_dist_label: Label = $Root/Step2Panel/TargetCard/TargetVBox/TargetDistLabel

@onready var step3_panel: Control = $Root/Step3Panel
@onready var rocket_list: VBoxContainer = $Root/Step3Panel/RocketScroll/RocketList

@onready var step4_panel: Control = $Root/Step4Panel
@onready var summary_contractor: Label = $Root/Step4Panel/SummaryScroll/SummaryVBox/SummaryCard/SummaryContent/SummaryContractorName
@onready var summary_target: Label = $Root/Step4Panel/SummaryScroll/SummaryVBox/SummaryCard/SummaryContent/SummaryTargetName
@onready var summary_rocket: Label = $Root/Step4Panel/SummaryScroll/SummaryVBox/SummaryCard/SummaryContent/SummaryRocketName
@onready var cost_value_label: Label = $Root/Step4Panel/SummaryScroll/SummaryVBox/SummaryCostCard/CostHBox/CostValueLabel

@onready var cta_button: Button = $Root/BottomBar/CTAButton

# ── State ────────────────────────────────────────────────────────────────
var _step: int = 1
var _selected_contractor_id: String = ""
var _selected_contractor_name: String = ""
var _selected_target: Dictionary = {}
var _selected_rocket_id: String = ""
var _mission_stage: int = 1

const STEPS = {
	1: "Mission Board",
	2: "Select Target",
	3: "Select Rocket",
	4: "Confirm Launch",
}
const EYEBROWS = {
	1: "LAUNCHPAD · CONTRACTORS",
	2: "LAUNCHPAD · TARGET",
	3: "LAUNCHPAD · VESSEL",
	4: "LAUNCHPAD · CONFIRM",
}

func _ready() -> void:
	back_button.pressed.connect(_on_back)
	cta_button.pressed.connect(_on_cta)

	_mission_stage = RocketsManager.get_mission_stage()
	_populate_step1()
	_show_step(1)
	# Tell tutorial controller we entered the LaunchWizard
	var tc := _get_tc()
	if tc:
		tc.set_screen("missions")

# ── Step navigation ───────────────────────────────────────────────────────
func _show_step(step: int) -> void:
	_step = step
	step1_panel.visible = (step == 1)
	step2_panel.visible = (step == 2)
	step3_panel.visible = (step == 3)
	step4_panel.visible = (step == 4)

	title_label.text = STEPS.get(step, "")
	eyebrow_label.text = EYEBROWS.get(step, "LAUNCHPAD")

	match step:
		2: _populate_step2()
		3: _populate_step3()
		4: _populate_step4()

	# Sync tutorial controller screen so the coach shows the right step.
	# Note: _populate_step2/3/4 already ran in the match block above.
	var tc := _get_tc()
	match step:
		1:
			if tc: tc.set_screen("missions")
			# Auto-select first contractor during M1 so wizard can proceed
			if _is_tutorial_active() and _selected_contractor_id == "":
				_auto_select_first_contractor()
		2:
			# _populate_step2() above already auto-selects the target
			if tc: tc.set_screen("targets")
		3, 4:
			if tc: tc.set_screen("fab")

	# CTA label
	if step < 4:
		cta_button.text = "NEXT →"
		cta_button.modulate = Color.WHITE
	else:
		cta_button.text = "CONFIRM LAUNCH →"
	cta_button.disabled = _cta_should_be_disabled()

func _cta_should_be_disabled() -> bool:
	match _step:
		# During tutorial M1, first contractor and first target are
		# auto-selected, so never disable
		1: return _selected_contractor_id == "" and not _is_tutorial_active()
		2: return _selected_target.is_empty()
		3: return _selected_rocket_id == ""
		_: return false

func _on_cta() -> void:
	if _step < 4:
		_show_step(_step + 1)
	else:
		_launch()

# ── Helpers ───────────────────────────────────────────────────────────────
func _get_ac() -> Node:
	return get_tree().root.get_node_or_null("AppController")

# ── Tutorial helpers ──────────────────────────────────────────────────────
func _get_tc() -> Node:
	var tc := get_tree().root.get_node_or_null("TutorialController")
	if tc:
		return tc
	var ac := _get_ac()
	if ac and "_tutorial_controller" in ac:
		return ac._tutorial_controller
	return null

func _is_tutorial_active() -> bool:
	var tc := _get_tc()
	if tc == null:
		return false
	return bool(tc.tutorial_active)

func _auto_select_first_contractor() -> void:
	var contractors: Array
	if _mission_stage <= 1:
		contractors = RocketsManager.STARTER_CONTRACTOR_OFFERS
	else:
		contractors = RocketsManager.get_trip_contractors()
	if contractors.is_empty():
		return
	var c: Dictionary = contractors[0]
	var id := str(c.get("id", ""))
	var name_text := str(c.get("name", id))
	_selected_contractor_id = id
	_selected_contractor_name = name_text
	if _mission_stage <= 1:
		RocketsManager.select_starter_contractor(id)
	else:
		RocketsManager.select_trip_contractor(id)
	cta_button.disabled = false

func _on_back() -> void:
	if _step > 1:
		_show_step(_step - 1)
	else:
		get_tree().change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")

# ── Step 1: Contractor cards ──────────────────────────────────────────────
func _populate_step1() -> void:
	for child in contractor_list.get_children():
		child.queue_free()

	var contractors: Array
	if _mission_stage <= 1:
		contractors = RocketsManager.STARTER_CONTRACTOR_OFFERS
	else:
		contractors = RocketsManager.get_trip_contractors()

	for c in contractors:
		var card := _make_contractor_card(c)
		contractor_list.add_child(card)

const MINERAL_COLORS := {
	"Iron":      Color(0.851, 0.443, 0.314),
	"Nickel":    Color(0.725, 0.847, 1.0),
	"Cobalt":    Color(0.494, 0.784, 1.0),
	"Silicates": Color(0.725, 0.847, 1.0),
	"Copper":    Color(1.0, 0.820, 0.400),
	"Gold":      Color(1.0, 0.820, 0.400),
}

const CONTRACTOR_COLORS := {
	"aegis_defense":  Color(0.247, 0.663, 1.0),
	"lumen_consumer": Color(0.961, 0.651, 0.137),
	"helion_orbital": Color(0.753, 0.518, 1.0),
	"rocketlab":      Color(0.247, 0.663, 1.0),
	"astroforge":     Color(0.753, 0.518, 1.0),
	"spacex":         Color(1.0, 0.353, 0.416),
}

func _make_contractor_card(contractor: Dictionary) -> Control:
	var id        := str(contractor.get("id", ""))
	var name_text := str(contractor.get("name", id))
	var focus     := str(contractor.get("focus", contractor.get("role", "")))
	var accent: Color = CONTRACTOR_COLORS.get(id, Color(0.247, 0.663, 1.0))

	# Resolve minerals dict
	var minerals: Dictionary = contractor.get("requested_minerals", {})
	if minerals.is_empty():
		var ranges: Dictionary = contractor.get("mineral_ranges", {})
		for mineral in ranges.keys():
			var r = ranges[mineral]
			if typeof(r) == TYPE_ARRAY and r.size() >= 2:
				minerals[mineral] = "%d – %d" % [r[0], r[1]]

	# Estimate payout
	var est_payout: int = 0
	for mineral in minerals.keys():
		var qty_str = str(minerals[mineral])
		var qty := 0
		if qty_str.contains("–"):
			var parts := qty_str.split("–")
			qty = int(parts[0].strip_edges())
		else:
			qty = int(qty_str)
		est_payout += qty * 10_000_000

	# ── Outer card panel ─────────────────────────────────────────────
	var outer := PanelContainer.new()
	outer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	outer.add_theme_style_override("panel", _panel_style(accent, false))
	outer.set_meta("contractor_id", id)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 24)
	outer.add_child(vbox)

	# ── Top row: badge + name/title/brief ────────────────────────────
	var top_hbox := HBoxContainer.new()
	top_hbox.add_theme_constant_override("separation", 26)
	vbox.add_child(top_hbox)

	# Badge (circular, accent color, contractor initial)
	var badge := PanelContainer.new()
	badge.custom_minimum_size = Vector2(118.0, 118.0)
	badge.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	var badge_style := StyleBoxFlat.new()
	badge_style.bg_color = accent * Color(1.0, 1.0, 1.0, 0.25)
	badge_style.set_border_width_all(2)
	badge_style.border_color = accent * Color(1.0, 1.0, 1.0, 0.7)
	badge_style.set_corner_radius_all(999)
	badge.add_theme_style_override("panel", badge_style)
	var badge_center := CenterContainer.new()
	badge_center.anchors_preset = 15
	badge.add_child(badge_center)
	var initial_lbl := Label.new()
	initial_lbl.text = name_text.substr(0, 1).to_upper()
	initial_lbl.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-Bold.ttf"))
	initial_lbl.add_theme_font_size_override("font_size", 56)
	initial_lbl.add_theme_color_override("font_color", accent)
	badge_center.add_child(initial_lbl)
	top_hbox.add_child(badge)

	# Right column: contractor name + mission title + brief
	var info_vbox := VBoxContainer.new()
	info_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info_vbox.add_theme_constant_override("separation", 8)
	top_hbox.add_child(info_vbox)

	var cname_lbl := Label.new()
	cname_lbl.text = name_text.to_upper()
	cname_lbl.add_theme_font_override("font", load("res://Resources/Fonts/TurretRoad-Regular.ttf"))
	cname_lbl.add_theme_font_size_override("font_size", 24)
	cname_lbl.add_theme_color_override("font_color", accent)
	info_vbox.add_child(cname_lbl)

	# Mission title (generated from minerals)
	var mineral_names := " + ".join(minerals.keys())
	var title_lbl := Label.new()
	title_lbl.text = "%s SUPPLY RUN" % mineral_names.to_upper()
	title_lbl.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-Bold.ttf"))
	title_lbl.add_theme_font_size_override("font_size", 38)
	title_lbl.add_theme_color_override("font_color", Color(0.902, 0.937, 1.0))
	title_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	info_vbox.add_child(title_lbl)

	var brief_lbl := Label.new()
	brief_lbl.text = focus
	brief_lbl.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-SemiBold.ttf"))
	brief_lbl.add_theme_font_size_override("font_size", 24)
	brief_lbl.add_theme_color_override("font_color", Color(0.663, 0.722, 0.808))
	brief_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	info_vbox.add_child(brief_lbl)

	# ── Mineral chips row ─────────────────────────────────────────────
	if not minerals.is_empty():
		var chip_row := HBoxContainer.new()
		chip_row.add_theme_constant_override("separation", 16)
		vbox.add_child(chip_row)
		for mineral in minerals.keys():
			var mc: Color = MINERAL_COLORS.get(mineral, Color(0.902, 0.937, 1.0))
			var chip := PanelContainer.new()
			var chip_style := StyleBoxFlat.new()
			chip_style.bg_color = Color(0.031, 0.063, 0.11, 0.7)
			chip_style.set_border_width_all(1)
			chip_style.border_color = mc * Color(1.0, 1.0, 1.0, 0.33)
			chip_style.set_corner_radius_all(6)
			chip_style.content_margin_left   = 22
			chip_style.content_margin_right  = 22
			chip_style.content_margin_top    = 8
			chip_style.content_margin_bottom = 8
			chip.add_theme_style_override("panel", chip_style)
			var chip_lbl := Label.new()
			chip_lbl.text = "%s ×%s" % [mineral.to_upper(), str(minerals[mineral])]
			chip_lbl.add_theme_font_override("font", load("res://Resources/Fonts/TurretRoad-Regular.ttf"))
			chip_lbl.add_theme_font_size_override("font_size", 26)
			chip_lbl.add_theme_color_override("font_color", mc)
			chip.add_child(chip_lbl)
			chip_row.add_child(chip)

	# ── Dashed divider ────────────────────────────────────────────────
	var divider := ColorRect.new()
	divider.custom_minimum_size = Vector2(0.0, 2.0)
	divider.color = Color(0.247, 0.663, 1.0, 0.18)
	vbox.add_child(divider)

	# ── Payout row ────────────────────────────────────────────────────
	var payout_hbox := HBoxContainer.new()
	payout_hbox.add_theme_constant_override("separation", 22)
	vbox.add_child(payout_hbox)

	if est_payout > 0:
		var francs_lbl := Label.new()
		francs_lbl.text = "▲ ~%s" % _fmt(int(est_payout * 1.2))
		francs_lbl.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-Bold.ttf"))
		francs_lbl.add_theme_font_size_override("font_size", 48)
		francs_lbl.add_theme_color_override("font_color", Color(0.961, 0.651, 0.137))
		payout_hbox.add_child(francs_lbl)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	payout_hbox.add_child(spacer)

	var btn := Button.new()
	btn.text = "SELECT →"
	btn.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-SemiBold.ttf"))
	btn.add_theme_font_size_override("font_size", 26)
	btn.add_theme_color_override("font_color", Color(0.047, 0.071, 0.118))
	btn.add_theme_style_override("normal", _cta_style_cyan())
	btn.add_theme_style_override("hover", _cta_style_cyan_hover())
	btn.pressed.connect(func(): _select_contractor(id, name_text, outer))
	payout_hbox.add_child(btn)

	return outer

func _select_contractor(id: String, name: String, card: PanelContainer) -> void:
	_selected_contractor_id = id
	_selected_contractor_name = name
	# Highlight selected card — keep accent color per-card
	for child in contractor_list.get_children():
		if child is PanelContainer:
			var cid := str(child.get_meta("contractor_id", ""))
			var is_sel: bool = (cid == id)
			var accent: Color = CONTRACTOR_COLORS.get(cid, Color(0.247, 0.663, 1.0))
			child.add_theme_style_override("panel", _panel_style(accent, is_sel))
	cta_button.disabled = false

	# Commit selection to RocketsManager
	if _mission_stage <= 1:
		RocketsManager.select_starter_contractor(id)
	else:
		RocketsManager.select_trip_contractor(id)

# ── Step 2: Target ────────────────────────────────────────────────────────
func _populate_step2() -> void:
	var target := RocketsManager.get_predefined_mission_target(_mission_stage)
	if target.is_empty():
		target = {"label": "Assigned Target", "type": "asteroid", "distance_au": 0.0}

	_selected_target = target
	target_name_label.text = str(target.get("label", "Unknown"))
	target_type_label.text = "TYPE · %s" % str(target.get("type", "asteroid")).to_upper()
	var dist: float = float(target.get("distance_au", 0.0))
	target_dist_label.text = "DISTANCE · %.1f AU" % dist
	cta_button.disabled = false

# ── Step 3: Rocket selection ──────────────────────────────────────────────
func _populate_step3() -> void:
	for child in rocket_list.get_children():
		child.queue_free()

	var unlocked: Array = RocketsManager.get_unlocked()
	if unlocked.is_empty():
		unlocked = ["starterrocket1"]

	for rocket_id in unlocked:
		var card := _make_rocket_card(rocket_id)
		rocket_list.add_child(card)

	# Auto-select first available rocket
	if not unlocked.is_empty():
		_selected_rocket_id = str(unlocked[0])
		cta_button.disabled = false

func _make_rocket_card(rocket_id: String) -> Control:
	var rid := str(rocket_id)
	var cost: int = RocketSpecs.get_cost(rid)

	var display_name := rid.replace("starterrocket", "SR").to_upper()

	var outer := PanelContainer.new()
	outer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	outer.add_theme_style_override("panel", _panel_style(Color(0.247, 0.663, 1.0), _selected_rocket_id == rid))
	outer.set_meta("rocket_id", rid)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	outer.add_child(vbox)

	var name_lbl := Label.new()
	name_lbl.text = display_name
	name_lbl.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-Bold.ttf"))
	name_lbl.add_theme_font_size_override("font_size", 36)
	name_lbl.add_theme_color_override("font_color", Color(0.902, 0.937, 1.0))
	vbox.add_child(name_lbl)

	if cost > 0:
		var cost_lbl := Label.new()
		cost_lbl.text = "COST · ▲ %s" % _fmt(cost)
		cost_lbl.add_theme_font_override("font", load("res://Resources/Fonts/TurretRoad-Regular.ttf"))
		cost_lbl.add_theme_font_size_override("font_size", 22)
		cost_lbl.add_theme_color_override("font_color", Color(0.961, 0.651, 0.137))
		vbox.add_child(cost_lbl)

	var btn := Button.new()
	btn.text = "SELECT →"
	btn.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-SemiBold.ttf"))
	btn.add_theme_font_size_override("font_size", 22)
	btn.add_theme_color_override("font_color", Color(0.047, 0.071, 0.118))
	btn.add_theme_style_override("normal", _cta_style_cyan())
	btn.pressed.connect(func(): _select_rocket(rid, outer))
	vbox.add_child(btn)

	return outer

func _select_rocket(rid: String, card: PanelContainer) -> void:
	_selected_rocket_id = rid
	for child in rocket_list.get_children():
		if child is PanelContainer:
			child.add_theme_style_override("panel", _panel_style(Color(0.247, 0.663, 1.0), str(child.get_meta("rocket_id", "")) == rid))
	cta_button.disabled = false

# ── Step 4: Summary ───────────────────────────────────────────────────────
func _populate_step4() -> void:
	summary_contractor.text = _selected_contractor_name if _selected_contractor_name != "" else "—"
	summary_target.text = str(_selected_target.get("label", "—"))
	summary_rocket.text = _selected_rocket_id.replace("starterrocket", "SR").to_upper()

	var cost: int = 0
	if not _selected_rocket_id.is_empty():
		cost = RocketSpecs.get_cost(_selected_rocket_id)
	cost_value_label.text = "▲ %s" % _fmt(cost)

# ── Launch ─────────────────────────────────────────────────────────────────
func _launch() -> void:
	var ac := get_tree().root.get_node_or_null("AppController")
	if ac == null:
		push_warning("LaunchWizard: AppController not found")
		get_tree().change_scene_to_file("res://Scenes/UI/SidescrollMining.tscn")
		return

	# Deduct cost
	var cost: int = 0
	if not _selected_rocket_id.is_empty():
		cost = RocketSpecs.get_cost(_selected_rocket_id)
	if cost > 0 and ac.has_method("add_franc_balance"):
		ac.add_franc_balance(-cost, "rocket_purchase")

	# Record the active mission in state
	var target_id := str(_selected_target.get("id", "mission-1-training-target"))
	var now := int(Time.get_unix_time_from_system())
	var travel_secs := int(float(_selected_target.get("distance_au", 3.0)) * 120)
	RocketsManager.add_mission(_selected_rocket_id, target_id, now, travel_secs)
	RocketsManager.set_launched(_selected_rocket_id)

	# Notify tutorial
	var tc := get_tree().root.get_node_or_null("TutorialController")
	if tc and tc.has_method("complete_step"):
		tc.complete_step(7)  # step 7 = LAUNCH (was 5, shifted +2 for build mode steps)

	get_tree().change_scene_to_file("res://Scenes/UI/SidescrollMining.tscn")

# ── Helpers ───────────────────────────────────────────────────────────────
func _fmt(v: int) -> String:
	if v >= 1_000_000_000: return "%.1fB" % (v / 1_000_000_000.0)
	if v >= 1_000_000:     return "%.1fM" % (v / 1_000_000.0)
	if v >= 1_000:         return "%.1fK" % (v / 1_000.0)
	return str(v)

func _panel_style(accent: Color, selected: bool) -> StyleBoxFlat:
	# Matches chrome.jsx Panel: dark gradient bg, 1px accent border, r=12
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.047, 0.082, 0.125, 0.9)  # ~rgba(12,21,32,0.9) — avg of gradient stops
	sb.border_color = accent * Color(1.0, 1.0, 1.0, 0.4) if not selected else accent * Color(1.0, 1.0, 1.0, 0.8)
	sb.set_border_width_all(2 if selected else 1)
	sb.set_corner_radius_all(12)
	sb.content_margin_left   = 32
	sb.content_margin_right  = 32
	sb.content_margin_top    = 28
	sb.content_margin_bottom = 28
	return sb

func _card_style(selected: bool) -> StyleBoxFlat:
	return _panel_style(Color(0.247, 0.663, 1.0), selected)

func _cta_style_cyan() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.247, 0.663, 1.0)
	sb.set_corner_radius_all(10)
	sb.content_margin_left   = 20
	sb.content_margin_right  = 20
	sb.content_margin_top    = 12
	sb.content_margin_bottom = 12
	return sb

func _cta_style_cyan_hover() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.424, 0.761, 1.0)
	sb.set_corner_radius_all(10)
	sb.content_margin_left   = 20
	sb.content_margin_right  = 20
	sb.content_margin_top    = 12
	sb.content_margin_bottom = 12
	return sb
