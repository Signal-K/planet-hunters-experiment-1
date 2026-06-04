extends CanvasLayer
## MissionDebriefV2 — mission payout, contract status, cargo breakdown.
## Reads mining result from AppController._last_mining_result.
## Awards Francs, marks mission complete, returns to Earth Base.

const RocketsManager = preload("res://Scripts/Utils/RocketsManager.gd")

# ── Node refs ─────────────────────────────────────────────────────────────
@onready var sub_caption: Label = $Root/ContentScroll/ContentVBox/HeroSection/SubCaption
@onready var star1: Label = $Root/ContentScroll/ContentVBox/HeroSection/StarRow/Star1
@onready var star2: Label = $Root/ContentScroll/ContentVBox/HeroSection/StarRow/Star2
@onready var star3: Label = $Root/ContentScroll/ContentVBox/HeroSection/StarRow/Star3
@onready var reward_amount: Label = $Root/ContentScroll/ContentVBox/RewardCard/RewardHBox/RewardRight/RewardAmount
@onready var reward_xp: Label     = $Root/ContentScroll/ContentVBox/RewardCard/RewardHBox/RewardRight/RewardXP
@onready var contract_status: Label = $Root/ContentScroll/ContentVBox/ContractCard/ContractVBox/ContractHeader/ContractStatus
@onready var mineral_list: VBoxContainer = $Root/ContentScroll/ContentVBox/ContractCard/ContractVBox/MineralBreakdownList
@onready var cargo_list: VBoxContainer   = $Root/ContentScroll/ContentVBox/CargoCard/CargoVBox/CargoBreakdownList
@onready var cta_button: Button = $Root/BottomBar/CTAButton

# Star colors (lit = amber, unlit = very dark navy)
const COLOR_STAR_LIT  := Color(0.961, 0.651, 0.137, 1.0)
const COLOR_STAR_DIM  := Color(0.122, 0.165, 0.227, 1.0)
const COLOR_OK        := Color(0.224, 0.827, 0.416, 1.0)
const COLOR_FAIL      := Color(1.0, 0.353, 0.416, 1.0)
const COLOR_INFO      := Color(0.494, 0.784, 1.0, 1.0)
const COLOR_AMBER     := Color(0.961, 0.651, 0.137, 1.0)
const COLOR_DIM       := Color(0.663, 0.722, 0.808, 1.0)
const COLOR_MUTED     := Color(0.365, 0.451, 0.565, 1.0)

const MINERAL_COLORS := {
	"Iron":      Color(0.851, 0.443, 0.314),
	"Nickel":    Color(0.725, 0.847, 1.0),
	"Cobalt":    Color(0.494, 0.784, 1.0),
	"Silicates": Color(0.725, 0.847, 1.0),
	"Copper":    Color(1.0, 0.820, 0.400),
	"Gold":      Color(1.0, 0.820, 0.400),
	"Silicon":   Color(0.725, 0.847, 1.0),
	"Carbon":    Color(0.416, 0.447, 0.502),
	"Ice":       Color(0.608, 0.925, 1.0),
}

const PRICE_PER_UNIT := 10_000_000  # 10M per mineral unit (placeholder until real pricing)
const BASE_XP := 80

func _ready() -> void:
	cta_button.pressed.connect(_on_return)

	var ac := _get_ac()
	var result: Dictionary = {}
	if ac and "_last_mining_result" in ac:
		result = ac._last_mining_result.duplicate(true)
	if ac and ac.has_method("mark_mining_result_synced"):
		ac.mark_mining_result_synced()

	_populate(result)
	_award_and_complete(result, ac)

func _get_ac() -> Node:
	return get_tree().root.get_node_or_null("AppController")

# ── Populate UI from result dict ──────────────────────────────────────────
func _populate(result: Dictionary) -> void:
	var cargo: Dictionary = result.get("cargo", result.get("minerals", {}))
	var target_label: String = result.get("target_label", str(result.get("target_id", "—")))

	# Get the active contractor offer to know what was required
	var offer: Dictionary = RocketsManager.get_trip_contract_offer()
	if offer.is_empty():
		offer = RocketsManager.get_starter_contract_offer()
	var required: Dictionary = offer.get("minerals_requested", {})

	# ── Payout calc ───────────────────────────────────────────────────
	var cargo_value: int = 0
	for mineral in cargo.keys():
		cargo_value += int(cargo[mineral]) * PRICE_PER_UNIT

	var req_met: bool = _requirements_met(cargo, required)
	var contractor_bonus: int = 0
	if req_met and not offer.is_empty():
		contractor_bonus = int(offer.get("payout", 0))
		if contractor_bonus == 0:
			contractor_bonus = cargo_value / 5
	var total: int = cargo_value + contractor_bonus

	var stage_bonus_xp: int = (int(RocketsManager.get_mission_stage()) - 1) * 40
	var xp: int = BASE_XP + stage_bonus_xp

	# Stars: 1 = any cargo, 2 = req met, 3 = req met + bonus
	var stars: int = 1 if cargo_value > 0 else 0
	if req_met: stars = 2
	if req_met and contractor_bonus > 0: stars = 3

	# ── Sub-caption ───────────────────────────────────────────────────
	var tname := target_label.to_upper() if target_label != "—" else "—"
	sub_caption.text = "FROM %s · SOL III ORBIT RE-ENTRY" % tname

	# ── Stars ─────────────────────────────────────────────────────────
	star1.add_theme_color_override("font_color", COLOR_STAR_LIT if stars >= 1 else COLOR_STAR_DIM)
	star2.add_theme_color_override("font_color", COLOR_STAR_LIT if stars >= 2 else COLOR_STAR_DIM)
	star3.add_theme_color_override("font_color", COLOR_STAR_LIT if stars >= 3 else COLOR_STAR_DIM)

	# ── Reward ────────────────────────────────────────────────────────
	reward_amount.text = "+%s" % _fmt(total)
	reward_xp.text = "+%d XP" % xp

	# ── Contract status ───────────────────────────────────────────────
	if required.is_empty():
		contract_status.text = "FREE MINING RUN"
		contract_status.add_theme_color_override("font_color", COLOR_INFO)
	elif req_met:
		contract_status.text = "DELIVERED"
		contract_status.add_theme_color_override("font_color", COLOR_OK)
	else:
		contract_status.text = "INCOMPLETE"
		contract_status.add_theme_color_override("font_color", COLOR_FAIL)

	# Mineral requirement rows
	for child in mineral_list.get_children():
		child.queue_free()
	for mineral in required.keys():
		mineral_list.add_child(_make_mineral_row(mineral, int(cargo.get(mineral, 0)), int(required[mineral])))

	# ── Cargo breakdown ───────────────────────────────────────────────
	for child in cargo_list.get_children():
		child.queue_free()
	if cargo.is_empty():
		var lbl := Label.new()
		lbl.text = "— NOTHING COLLECTED —"
		lbl.add_theme_font_override("font", load("res://Resources/Fonts/TurretRoad-Regular.ttf"))
		lbl.add_theme_font_size_override("font_size", 27)
		lbl.add_theme_color_override("font_color", COLOR_MUTED)
		cargo_list.add_child(lbl)
	else:
		for mineral in cargo.keys():
			var qty := int(cargo[mineral])
			if qty > 0:
				cargo_list.add_child(_make_cargo_row(mineral, qty))

# ── Award + mark complete ─────────────────────────────────────────────────
func _award_and_complete(result: Dictionary, ac: Node) -> void:
	if ac == null:
		return

	var cargo: Dictionary = result.get("cargo", result.get("minerals", {}))
	var cargo_value: int = 0
	for mineral in cargo.keys():
		cargo_value += int(cargo[mineral]) * PRICE_PER_UNIT

	var offer := RocketsManager.get_trip_contract_offer()
	if offer.is_empty():
		offer = RocketsManager.get_starter_contract_offer()
	var required: Dictionary = offer.get("minerals_requested", {})
	var req_met := _requirements_met(cargo, required)

	var bonus: int = 0
	if req_met and not offer.is_empty():
		bonus = int(offer.get("payout", 0))
		if bonus == 0:
			bonus = cargo_value / 5

	var total := cargo_value + bonus

	# Add Francs
	if ac.has_method("add_franc_balance"):
		ac.add_franc_balance(total, "mission_payout")

	# Add minerals to inventory
	if not cargo.is_empty():
		RocketsManager.add_to_inventory(cargo)

	# Mark mission complete
	var badge := "mission-%d-%d" % [RocketsManager.get_mission_stage(), int(Time.get_unix_time_from_system())]
	RocketsManager.mark_mission_completed(badge)

	RocketsManager.clear_trip_contract_offer()
	RocketsManager.clear_starter_contract_offer()

	# Notify tutorial
	var tc := get_tree().root.get_node_or_null("TutorialController")
	if tc and tc.has_method("complete_step"):
		tc.complete_step(11)  # step 11 = DEBRIEF (was 9, shifted +2 for build mode steps)

func _on_return() -> void:
	get_tree().change_scene_to_file("res://Scenes/Earth/earth_base_1.tscn")

# ── Helpers ───────────────────────────────────────────────────────────────
func _requirements_met(cargo: Dictionary, required: Dictionary) -> bool:
	if required.is_empty():
		return false
	for mineral in required.keys():
		if int(cargo.get(mineral, 0)) < int(required[mineral]):
			return false
	return true

func _make_mineral_row(mineral: String, got: int, needed: int) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 22)

	var col: Color = MINERAL_COLORS.get(mineral, Color(0.902, 0.937, 1.0))
	var done: bool = (got >= needed)

	var name_lbl := Label.new()
	name_lbl.text = mineral.to_upper()
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-SemiBold.ttf"))
	name_lbl.add_theme_font_size_override("font_size", 30)
	name_lbl.add_theme_color_override("font_color", col)
	row.add_child(name_lbl)

	# Progress bar
	var bar_bg := PanelContainer.new()
	bar_bg.custom_minimum_size = Vector2(200.0, 12.0)
	bar_bg.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var bar_bg_style := StyleBoxFlat.new()
	bar_bg_style.bg_color = Color(0.024, 0.035, 0.059)
	bar_bg_style.set_border_width_all(1)
	bar_bg_style.border_color = col * Color(1, 1, 1, 0.3)
	bar_bg_style.set_corner_radius_all(4)
	bar_bg.add_theme_style_override("panel", bar_bg_style)
	var bar_fill := ColorRect.new()
	bar_fill.anchors_preset = -1
	bar_fill.anchor_left   = 0.0
	bar_fill.anchor_top    = 0.0
	bar_fill.anchor_right  = clampf(float(got) / float(max(needed, 1)), 0.0, 1.0)
	bar_fill.anchor_bottom = 1.0
	bar_fill.color = col
	bar_bg.add_child(bar_fill)
	row.add_child(bar_bg)

	var count_lbl := Label.new()
	count_lbl.text = "%d / %d%s" % [got, needed, "  ✓" if done else ""]
	count_lbl.add_theme_font_override("font", load("res://Resources/Fonts/TurretRoad-Regular.ttf"))
	count_lbl.add_theme_font_size_override("font_size", 28)
	count_lbl.add_theme_color_override("font_color", COLOR_OK if done else COLOR_FAIL)
	row.add_child(count_lbl)
	return row

func _make_cargo_row(mineral: String, qty: int) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 22)

	var col: Color = MINERAL_COLORS.get(mineral, Color(0.902, 0.937, 1.0))
	var line_total: int = qty * PRICE_PER_UNIT

	var name_lbl := Label.new()
	name_lbl.text = mineral.to_upper()
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-SemiBold.ttf"))
	name_lbl.add_theme_font_size_override("font_size", 30)
	name_lbl.add_theme_color_override("font_color", col)
	row.add_child(name_lbl)

	var qty_lbl := Label.new()
	qty_lbl.text = "×%d" % qty
	qty_lbl.add_theme_font_override("font", load("res://Resources/Fonts/TurretRoad-Regular.ttf"))
	qty_lbl.add_theme_font_size_override("font_size", 26)
	qty_lbl.add_theme_color_override("font_color", COLOR_DIM)
	row.add_child(qty_lbl)

	var val_lbl := Label.new()
	val_lbl.text = "▲ %s" % _fmt(line_total)
	val_lbl.add_theme_font_override("font", load("res://Resources/Fonts/Oxanium-Bold.ttf"))
	val_lbl.add_theme_font_size_override("font_size", 32)
	val_lbl.add_theme_color_override("font_color", COLOR_AMBER)
	row.add_child(val_lbl)
	return row

func _fmt(v: int) -> String:
	if v >= 1_000_000_000: return "%.1fB" % (v / 1_000_000_000.0)
	if v >= 1_000_000:     return "%.1fM" % (v / 1_000_000.0)
	if v >= 1_000:         return "%.1fK" % (v / 1_000.0)
	return str(v)
