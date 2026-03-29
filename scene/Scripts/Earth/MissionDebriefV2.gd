extends Control
## MissionDebriefV2 — clean mission completion screen.
## Shows goal status, cargo collected, and a sell + complete action.
## Triggered when a rocket returns to Earth (goingTo == "Earth" on arrival).

const RocketSpecs           = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager        = preload("res://Scripts/Utils/RocketsManager.gd")
const MineralPricing        = preload("res://Scripts/Utils/MineralPricing.gd")
const MiningInventory       = preload("res://Scripts/Utils/MiningInventory.gd")
const SectorRevealManager   = preload("res://Scripts/Utils/SectorRevealManager.gd")
const SubcontractorManager  = preload("res://Scripts/Utils/SubcontractorManager.gd")
const AppControllerHelper   = preload("res://Scripts/Utils/AppControllerHelper.gd")
const MissionLogManager     = preload("res://Scripts/Utils/MissionLogManager.gd")
const NumberFormat          = preload("res://Scripts/Utils/NumberFormat.gd")
const NavigationMixin       = preload("res://Scripts/Utils/NavigationMixin.gd")
const AppLogger             = preload("res://Scripts/Utils/Logger.gd")
const ResearchManager       = preload("res://Scripts/Utils/ResearchManager.gd")

const EARTH_SCENE               := "res://Scenes/Earth/earth_base_1.tscn"
const LAUNCHPAD_SCENE           := "res://Scenes/Earth/earth_launchpad.tscn"
const CONTRACTOR_ROUTE_MULT     := 1.2
const AFFINITY_BONUS_PER_POINT  := 0.005
const AFFINITY_BONUS_CAP        := 0.25
const ORDER_BONUS_CAP           := 0.15
const DISCOVERY_BONUS_MULT      := 1.10
const XP_BY_MISSION_STAGE       := {1: 80, 2: 120, 3: 160, 4: 200}
const XP_FREE_OPS               := 100

const PANEL_BG    := Color(0.04, 0.06, 0.12, 0.97)
const CYAN        := Color(0.28, 0.88, 0.96, 1.0)
const AMBER       := Color(0.941, 0.690, 0.188, 1.0)
const GREEN       := Color(0.30, 1.0, 0.45, 1.0)
const RED         := Color(1.0, 0.35, 0.35, 1.0)
const TEXT_COLOR  := Color(0.82, 0.84, 0.88, 1.0)
const TEXT_MUTED  := Color(0.55, 0.60, 0.68, 1.0)
const TITLE_COLOR := Color(0.95, 0.93, 0.90, 1.0)

var _returned: Dictionary       = {}
var _cargo: Dictionary          = {}
var _requested: Dictionary      = {}
var _contractor_id: String      = ""
var _contractor_name: String    = ""
var _operation_mode: String     = ""
var _order_ratio: float         = 1.0
var _affinity_before: int       = 0
var _payout: int                = 0
var _done := false
var _reward_resolved := false
var _debrief_resolved := false
var _salvage_applied := false
var _salvage_refund := 0
var _next_mission_brief: Dictionary = {}
var _phase := "reward"
var _guide_visible := false


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_returned = RocketsManager.get_returned_mission()
	if _returned.is_empty():
		_build_empty_ui()
		return
	_cargo          = _resolve_cargo(_returned)
	_operation_mode = str(_returned.get("operation_mode", "contract")).strip_edges().to_lower()
	_resolve_contractor_context()
	_payout         = _calc_payout()
	_reward_resolved = _cargo.is_empty()
	_salvage_refund = _calc_salvage_refund()
	_next_mission_brief = _build_next_mission_brief()
	_render_ui()


# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------

func _resolve_cargo(payload: Dictionary) -> Dictionary:
	var run_collected = payload.get("mining_run_collected", {})
	if typeof(run_collected) == TYPE_DICTIONARY and not run_collected.is_empty():
		return run_collected.duplicate(true)
	var tid = str(payload.get("target_id", ""))
	if tid == "":
		return {}
	var state = MiningInventory.load_state()
	var collected = state.get("targets", {}).get(tid, {}).get("collected", {})
	return collected.duplicate(true) if typeof(collected) == TYPE_DICTIONARY else {}


func _resolve_contractor_context() -> void:
	var starter_ctx = _returned.get("starter_contract_context", {})
	if typeof(starter_ctx) == TYPE_DICTIONARY and bool(starter_ctx.get("active", false)):
		_contractor_id   = str(starter_ctx.get("id", ""))
		_contractor_name = str(starter_ctx.get("name", "Contractor"))
		_requested       = starter_ctx.get("requested_minerals", {}).duplicate(true)
	else:
		_contractor_id   = str(_returned.get("trip_contractor_id", ""))
		_contractor_name = str(_returned.get("trip_contractor_name", ""))
		_requested       = _returned.get("trip_requested_minerals", {}).duplicate(true)
		if _contractor_id == "":
			var sel = RocketsManager.get_trip_selected_contractor()
			_contractor_id   = str(sel.get("id", ""))
			_contractor_name = str(sel.get("name", _contractor_name))
		if _requested.is_empty():
			var offer = RocketsManager.get_trip_contract_offer()
			if typeof(offer) == TYPE_DICTIONARY:
				_requested = offer.get("requested_minerals", {}).duplicate(true)
	if _contractor_name == "":
		var sub = SubcontractorManager.get_subcontractor(_contractor_id)
		_contractor_name = str(sub.get("name", ""))
	_affinity_before = SubcontractorManager.get_affinity(_contractor_id)
	_order_ratio     = _compute_order_ratio(_cargo, _requested)


func _compute_order_ratio(collected: Dictionary, requested: Dictionary) -> float:
	if requested.is_empty():
		return 1.0
	var req_total := 0
	var matched   := 0
	for k in requested.keys():
		var req: int = max(int(requested.get(k, 0)), 0)
		if req <= 0:
			continue
		req_total += req
		matched   += min(int(collected.get(str(k), 0)), req)
	if req_total <= 0:
		return 1.0
	return clamp(float(matched) / float(req_total), 0.0, 1.0)


func _calc_payout() -> int:
	var base := 0
	for mineral in _cargo.keys():
		base += MineralPricing.price_for(str(mineral), int(_cargo.get(mineral, 0)))
	var gross := int(round(float(base) * CONTRACTOR_ROUTE_MULT))
	var tid := str(_returned.get("target_id", ""))
	if tid != "" and not RocketsManager.has_discovery_bonus_claimed(tid):
		gross = int(round(float(gross) * DISCOVERY_BONUS_MULT))
	if _contractor_id != "":
		var aff_mult: float = 1.0 + min(float(_affinity_before) * AFFINITY_BONUS_PER_POINT, float(AFFINITY_BONUS_CAP))
		var ord_mult := 1.0 + (ORDER_BONUS_CAP * _order_ratio)
		gross = int(round(float(gross) * ord_mult * aff_mult))
	return min(gross, RocketsManager.get_free_ops_payout_cap())


# ---------------------------------------------------------------------------
# UI construction
# ---------------------------------------------------------------------------

func _render_ui() -> void:
	for child in get_children():
		remove_child(child)
		child.queue_free()
	if _returned.is_empty():
		_build_empty_ui()
		return
	_build_ui()


func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.color = PANEL_BG
	add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var vp := get_viewport()
	var vp_w := vp.get_visible_rect().size.x if vp else 1280.0
	var vp_h := vp.get_visible_rect().size.y if vp else 768.0

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(clampf(vp_w - 48.0, 480.0, 1100.0), 0.0)
	var style := StyleBoxFlat.new()
	style.bg_color          = Color(0.06, 0.09, 0.16, 0.98)
	style.border_color      = CYAN
	style.set_border_width_all(2)
	style.set_corner_radius_all(8)
	style.content_margin_left   = 28
	style.content_margin_right  = 28
	style.content_margin_top    = 24
	style.content_margin_bottom = 24
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size        = Vector2(0, clampf(vp_h * 0.88, 480.0, 820.0))
	scroll.horizontal_scroll_mode     = ScrollContainer.SCROLL_MODE_DISABLED
	panel.add_child(scroll)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 16)
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(vbox)

	_add_header(vbox)
	_add_sep(vbox, CYAN)
	_add_summary(vbox)
	if not _requested.is_empty():
		_add_sep(vbox, AMBER)
		_add_goal_section(vbox)
	_add_sep(vbox, CYAN)
	if _phase == "reward":
		_add_cargo_section(vbox)
		_add_sep(vbox, CYAN)
		_add_reward_actions(vbox)
	else:
		_add_reward_feedback(vbox)
		_add_sep(vbox, CYAN)
		_add_next_mission_handoff(vbox)
		_add_sep(vbox, CYAN)
		_add_handoff_actions(vbox)
	_add_button_guide(vbox)


func _build_empty_ui() -> void:
	var bg := ColorRect.new()
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.color = PANEL_BG
	add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 16)
	center.add_child(vbox)

	var title := Label.new()
	title.name = "Title"
	title.text = "Debrief"
	title.add_theme_font_size_override("font_size", 36)
	title.add_theme_color_override("font_color", TITLE_COLOR)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)

	var lbl := Label.new()
	lbl.text = "No mission data found."
	lbl.add_theme_font_size_override("font_size", 18)
	lbl.add_theme_color_override("font_color", TEXT_MUTED)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(lbl)

	var complete_btn := _make_button("Return to Base", false)
	complete_btn.name = "CompleteButton"
	complete_btn.pressed.connect(_return_to_base)
	vbox.add_child(complete_btn)

	var orbit_btn := _make_button("Open Launchpad →", false)
	orbit_btn.name = "OrbitButton"
	orbit_btn.pressed.connect(_on_open_launchpad_pressed)
	vbox.add_child(orbit_btn)


func _add_sep(vbox: VBoxContainer, color: Color) -> void:
	var sep := HSeparator.new()
	sep.add_theme_color_override("separator", Color(color.r, color.g, color.b, 0.28))
	vbox.add_child(sep)


func _add_header(vbox: VBoxContainer) -> void:
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 2)
	vbox.add_child(col)

	var eyebrow := Label.new()
	eyebrow.text = "MISSION COMPLETE"
	eyebrow.add_theme_font_size_override("font_size", 14)
	eyebrow.add_theme_color_override("font_color", CYAN)
	col.add_child(eyebrow)

	var title := Label.new()
	title.name = "Title"
	title.text = "Debrief"
	title.add_theme_font_size_override("font_size", 36)
	title.add_theme_color_override("font_color", TITLE_COLOR)
	col.add_child(title)


func _add_button_guide(vbox: VBoxContainer) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	vbox.add_child(row)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(spacer)

	var guide_btn := _make_button("? Guide", false)
	guide_btn.custom_minimum_size = Vector2(160, 44)
	guide_btn.add_theme_font_size_override("font_size", 16)
	guide_btn.pressed.connect(_toggle_button_guide)
	row.add_child(guide_btn)

	if not _guide_visible:
		return

	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.10, 0.18, 0.94)
	style.border_color = CYAN
	style.set_border_width_all(1)
	style.set_corner_radius_all(10)
	style.content_margin_left = 18
	style.content_margin_right = 18
	style.content_margin_top = 14
	style.content_margin_bottom = 14
	panel.add_theme_stylebox_override("panel", style)
	vbox.add_child(panel)

	var body := Label.new()
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_theme_color_override("font_color", TEXT_COLOR)
	body.add_theme_font_size_override("font_size", 14)
	body.text = _build_button_guide_text()
	panel.add_child(body)


func _build_button_guide_text() -> String:
	var entries: Array[String] = []
	if _phase == "reward":
		if not _cargo.is_empty():
			entries.append("Sell Minerals: Convert this run's cargo into francs and lock in the payout.")
		entries.append("Review Next Mission: Move from reward resolution into the next-mission briefing.")
		if not _reward_resolved:
			entries.append("Review Next Mission stays locked until the cargo payout is resolved.")
	else:
		entries.append("Open Launchpad: Leave debrief and start setting up the next mission.")
		if _salvage_refund > 0:
			entries.append("Scrap / Salvage Ship: Retire this ship now and receive the listed salvage refund.")
		else:
			entries.append("Scrap / Salvage Ship: No salvage value is available for this ship on this run.")
		entries.append("Return to Base: Leave debrief and go back to Earth base without opening launchpad.")
	return "\n".join(entries)


func _add_summary(vbox: VBoxContainer) -> void:
	var target_label := str(_returned.get("label", str(_returned.get("target_id", "Unknown"))))
	var rocket_id    := str(_returned.get("rocket_id", ""))

	var rows := [
		["Target",     target_label],
		["Rocket",     RocketSpecs.get_display_name(rocket_id) if rocket_id != "" else "—"],
		["Contractor", _contractor_name if _contractor_name != "" else "—"],
	]
	for pair in rows:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		vbox.add_child(row)
		var k := Label.new()
		k.text = pair[0]
		k.custom_minimum_size = Vector2(140, 0)
		k.add_theme_font_size_override("font_size", 18)
		k.add_theme_color_override("font_color", TEXT_MUTED)
		row.add_child(k)
		var v := Label.new()
		v.text = pair[1]
		v.add_theme_font_size_override("font_size", 18)
		v.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(v)

	# Next-mission hint
	var stage := int(RocketsManager.get_mission_stage())
	var hint   := _stage_hint(stage)
	if hint != "":
		var hint_lbl := Label.new()
		hint_lbl.text = hint
		hint_lbl.add_theme_font_size_override("font_size", 17)
		hint_lbl.add_theme_color_override("font_color", AMBER)
		hint_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(hint_lbl)


func _add_goal_section(vbox: VBoxContainer) -> void:
	var header := Label.new()
	header.text = "MISSION GOAL"
	header.add_theme_font_size_override("font_size", 15)
	header.add_theme_color_override("font_color", AMBER)
	vbox.add_child(header)

	var all_met := true
	var keys := _requested.keys()
	keys.sort()
	for mineral in keys:
		var need := int(_requested.get(mineral, 0))
		var have := int(_cargo.get(str(mineral), 0))
		var done := have >= need
		if not done:
			all_met = false

		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		vbox.add_child(row)

		var name_lbl := Label.new()
		name_lbl.text = str(mineral).capitalize()
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_font_size_override("font_size", 19)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(name_lbl)

		var qty_lbl := Label.new()
		qty_lbl.text = "%d / %d kg  %s" % [min(have, need), need, "✓" if done else "✗"]
		qty_lbl.add_theme_font_size_override("font_size", 19)
		qty_lbl.add_theme_color_override("font_color", GREEN if done else RED)
		row.add_child(qty_lbl)

	var verdict := Label.new()
	verdict.text = "Order fulfilled — bonus payout applied." if all_met \
		else "Order incomplete — standard payout."
	verdict.add_theme_font_size_override("font_size", 17)
	verdict.add_theme_color_override("font_color", GREEN if all_met else TEXT_MUTED)
	verdict.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(verdict)


func _add_cargo_section(vbox: VBoxContainer) -> void:
	var header := Label.new()
	header.text = "CARGO"
	header.add_theme_font_size_override("font_size", 15)
	header.add_theme_color_override("font_color", CYAN)
	vbox.add_child(header)

	if _cargo.is_empty():
		var empty := Label.new()
		empty.text = "No minerals collected."
		empty.add_theme_font_size_override("font_size", 18)
		empty.add_theme_color_override("font_color", TEXT_MUTED)
		vbox.add_child(empty)
		return

	var keys := _cargo.keys()
	keys.sort()
	for mineral in keys:
		var amt := int(_cargo.get(mineral, 0))
		if amt <= 0:
			continue
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		vbox.add_child(row)
		var name_lbl := Label.new()
		name_lbl.text = str(mineral).capitalize()
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_lbl.add_theme_font_size_override("font_size", 16)
		name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(name_lbl)
		var qty_lbl := Label.new()
		qty_lbl.text = "%d kg" % amt
		qty_lbl.add_theme_font_size_override("font_size", 16)
		qty_lbl.add_theme_color_override("font_color", CYAN)
		row.add_child(qty_lbl)


func _add_reward_actions(vbox: VBoxContainer) -> void:
	var acts := VBoxContainer.new()
	acts.add_theme_constant_override("separation", 10)
	vbox.add_child(acts)

	if not _cargo.is_empty():
		var label := "Sell Minerals to %s  (+%s F)" % [_contractor_name, NumberFormat.commas(str(_payout))] \
			if _contractor_name != "" \
			else "Sell Minerals  (+%s F)" % NumberFormat.commas(str(_payout))
		var sell_btn := _make_button(label, true)
		sell_btn.pressed.connect(_on_sell_pressed.bind(sell_btn))
		acts.add_child(sell_btn)

	var complete_btn := _make_button("Review Next Mission →", false)
	complete_btn.name = "CompleteButton"
	complete_btn.disabled = not _reward_resolved
	if not complete_btn.disabled:
		complete_btn.pressed.connect(_on_complete_pressed)
	else:
		complete_btn.add_theme_color_override("font_disabled_color", TEXT_MUTED)
	acts.add_child(complete_btn)

	var orbit_btn := _make_button("Return to Base", false)
	orbit_btn.name = "OrbitButton"
	orbit_btn.pressed.connect(_return_to_base)
	acts.add_child(orbit_btn)

	if not _reward_resolved:
		var note := Label.new()
		note.text = "Resolve cargo payout first, then the next mission briefing unlocks."
		note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		note.add_theme_font_size_override("font_size", 14)
		note.add_theme_color_override("font_color", TEXT_MUTED)
		acts.add_child(note)


func _add_reward_feedback(vbox: VBoxContainer) -> void:
	var header := Label.new()
	header.text = "REWARD CONFIRMED"
	header.add_theme_font_size_override("font_size", 12)
	header.add_theme_color_override("font_color", AMBER)
	vbox.add_child(header)

	var payout_lbl := Label.new()
	payout_lbl.text = "Payout delivered: +%s F" % NumberFormat.commas(str(_payout))
	payout_lbl.add_theme_font_size_override("font_size", 18)
	payout_lbl.add_theme_color_override("font_color", GREEN)
	vbox.add_child(payout_lbl)

	var feedback := Label.new()
	feedback.text = "Mission closed. Use this handoff to choose the next objective before leaving the debrief."
	feedback.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	feedback.add_theme_font_size_override("font_size", 14)
	feedback.add_theme_color_override("font_color", TEXT_MUTED)
	vbox.add_child(feedback)


func _add_next_mission_handoff(vbox: VBoxContainer) -> void:
	var header := Label.new()
	header.text = "NEXT MISSION"
	header.add_theme_font_size_override("font_size", 12)
	header.add_theme_color_override("font_color", CYAN)
	vbox.add_child(header)

	var card := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.12, 0.20, 0.96)
	style.border_color = AMBER
	style.set_border_width_all(1)
	style.set_corner_radius_all(8)
	style.content_margin_left = 18
	style.content_margin_right = 18
	style.content_margin_top = 16
	style.content_margin_bottom = 16
	card.add_theme_stylebox_override("panel", style)
	vbox.add_child(card)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	card.add_child(col)

	var title := Label.new()
	title.text = str(_next_mission_brief.get("title", "Your next mission is ready"))
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", TITLE_COLOR)
	col.add_child(title)

	for pair in [
		["Location", str(_next_mission_brief.get("location", "Earth Launchpad"))],
		["Contractor", str(_next_mission_brief.get("contractor", "Mission Control"))],
		["Mission", str(_next_mission_brief.get("objective", "Prepare the next launch."))]
	]:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		col.add_child(row)
		var key := Label.new()
		key.text = pair[0]
		key.custom_minimum_size = Vector2(120, 0)
		key.add_theme_font_size_override("font_size", 15)
		key.add_theme_color_override("font_color", TEXT_MUTED)
		row.add_child(key)
		var value := Label.new()
		value.text = pair[1]
		value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		value.add_theme_font_size_override("font_size", 15)
		value.add_theme_color_override("font_color", TEXT_COLOR)
		row.add_child(value)

	var note := Label.new()
	note.text = str(_next_mission_brief.get("note", "Open the launchpad to continue the loop."))
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.add_theme_font_size_override("font_size", 14)
	note.add_theme_color_override("font_color", AMBER)
	col.add_child(note)


func _add_handoff_actions(vbox: VBoxContainer) -> void:
	var acts := VBoxContainer.new()
	acts.add_theme_constant_override("separation", 10)
	vbox.add_child(acts)

	var launchpad_btn := _make_button("Open Launchpad →", true)
	launchpad_btn.name = "CompleteButton"
	launchpad_btn.pressed.connect(_on_open_launchpad_pressed)
	acts.add_child(launchpad_btn)

	var salvage_btn := _make_button(
		"Scrap / Salvage Ship  (+%s F)" % NumberFormat.commas(str(_salvage_refund)),
		false
	)
	salvage_btn.disabled = _salvage_applied or _salvage_refund <= 0
	if not salvage_btn.disabled:
		salvage_btn.pressed.connect(_on_salvage_pressed.bind(salvage_btn))
	acts.add_child(salvage_btn)

	var return_btn := _make_button("Return to Base", false)
	return_btn.name = "OrbitButton"
	return_btn.pressed.connect(_return_to_base)
	acts.add_child(return_btn)

	var explain := Label.new()
	explain.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	explain.add_theme_font_size_override("font_size", 14)
	if _salvage_applied:
		explain.text = "Ship salvage has been applied. Future reusable/repairable ships can replace this action without changing the handoff flow."
	elif _salvage_refund > 0:
		explain.text = "Scrap/salvage is explicit here, but the debrief flow keeps it separate so reusable/repairable ships can replace this behavior later."
	else:
		explain.text = "No salvage value is available for this ship."
	explain.add_theme_color_override("font_color", TEXT_MUTED)
	acts.add_child(explain)


func _make_button(text: String, primary: bool) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(0, 56)
	var color := AMBER if primary else CYAN
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0, 0, 0, 0)
	normal.border_color = color
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(28)
	normal.content_margin_left  = 18
	normal.content_margin_right = 18
	normal.content_margin_top    = 10
	normal.content_margin_bottom = 10
	var hover := normal.duplicate()
	hover.bg_color = Color(color.r, color.g, color.b, 0.12)
	var pressed_style := normal.duplicate()
	pressed_style.bg_color = Color(color.r, color.g, color.b, 0.22)
	btn.add_theme_stylebox_override("normal", normal)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("pressed", pressed_style)
	btn.add_theme_stylebox_override("focus", hover)
	btn.add_theme_color_override("font_color", color)
	btn.add_theme_color_override("font_hover_color", color)
	btn.add_theme_color_override("font_pressed_color", color)
	btn.add_theme_font_size_override("font_size", 20)
	return btn


func _toggle_button_guide() -> void:
	_guide_visible = not _guide_visible
	_render_ui()


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

func _on_sell_pressed(btn: Button) -> void:
	if _done:
		return
	btn.disabled = true
	btn.text = "Sold ✓"

	var app = AppControllerHelper.get_instance()
	var tid := str(_returned.get("target_id", ""))

	RocketsManager.consume_from_inventory(_cargo)
	for mineral in _cargo.keys():
		MineralPricing.record_player_sale(str(mineral))

	if tid != "" and not RocketsManager.has_discovery_bonus_claimed(tid):
		RocketsManager.mark_discovery_bonus_claimed(tid)
	if tid != "":
		SectorRevealManager.reveal_for_target(tid)

	if app:
		var net := _payout
		if app.has_outstanding_loan():
			net = app.repay_loan_from_payout(_payout)
		app.add_franc_balance(net, "mission_sale")

	if _contractor_id != "" and app:
		SubcontractorManager.add_affinity(_contractor_id, 1)
		SubcontractorManager.record_mission_completion(_contractor_id)
		app.add_experience(1, "affinity")

	RocketsManager.clear_trip_contract_offer()
	_clear_cargo(tid)
	_reward_resolved = true
	_render_ui()


func _on_complete_pressed() -> void:
	if _done or not _reward_resolved:
		return
	_resolve_debrief_once()
	_phase = "handoff"
	_render_ui()


func _resolve_debrief_once() -> void:
	if _debrief_resolved:
		return
	_done = true

	var app    = AppControllerHelper.get_instance()
	var rid    := str(_returned.get("rocket_id", ""))
	var tid    := str(_returned.get("target_id", ""))
	var stage  := int(RocketsManager.get_mission_stage())
	var xp_amt: int = XP_BY_MISSION_STAGE.get(stage, XP_FREE_OPS)

	if app:
		app.add_experience(xp_amt, "mission_completion")

	MissionLogManager.add_mission({
		"timestamp":           Time.get_datetime_string_from_system(),
		"rocket_id":           rid,
		"target_id":           tid,
		"label":               str(_returned.get("label", "")),
		"target_type":         str(_returned.get("type", "asteroid")),
		"operation_mode":      _operation_mode,
		"subcontractor_id":    _contractor_id,
		"subcontractor_name":  _contractor_name,
		"payout":              _payout,
		"cargo":               _cargo.duplicate(true),
		"requested_minerals":  _requested.duplicate(true),
		"order_completion_pct": int(round(_order_ratio * 100.0)),
		"affinity_before":     _affinity_before
	})

	AppControllerHelper.record_tutorial_action("resolve_mission_debrief")
	RocketsManager.finalize_return(rid)
	RocketsManager.clear_returned_mission()
	_debrief_resolved = true


func _on_open_launchpad_pressed() -> void:
	_resolve_debrief_once()
	_prepare_launchpad_handoff()
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var sm = tree.current_scene.get_node_or_null("SceneManager") if tree.current_scene else null
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene(LAUNCHPAD_SCENE)
	else:
		tree.change_scene_to_file(LAUNCHPAD_SCENE)


func _on_salvage_pressed(btn: Button) -> void:
	if _salvage_applied:
		return
	_resolve_debrief_once()
	var rocket_id = str(_returned.get("rocket_id", ""))
	if rocket_id == "":
		return
	var app = AppControllerHelper.get_instance()
	if app and _salvage_refund > 0:
		app.add_franc_balance(_salvage_refund, "rocket_salvage")
	var ok = RocketsManager.set_destroyed(rocket_id, "scrapped_after_debrief")
	if ok:
		_salvage_applied = true
		btn.disabled = true
		btn.text = "Ship Salvaged ✓"
	_render_ui()


func _clear_cargo(target_id: String) -> void:
	if target_id == "":
		return
	var data    = MiningInventory.load_state()
	var targets = data.get("targets", {})
	targets.erase(target_id)
	data["targets"] = targets
	MiningInventory.save_state(data)


func _stage_hint(stage: int) -> String:
	match stage:
		1: return "Complete debrief to unlock Mission 2."
		2: return "Complete debrief to unlock Mission 3."
		3: return "Complete debrief to unlock Mission 4."
		4: return "Complete debrief to unlock Free Operations."
	return ""


func _return_to_base() -> void:
	_resolve_debrief_once()
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	var sm = tree.current_scene.get_node_or_null("SceneManager") if tree.current_scene else null
	if sm and sm.has_method("change_to_scene"):
		sm.change_to_scene(EARTH_SCENE)
	else:
		NavigationMixin.go_back_to_earth(tree)


func _calc_salvage_refund() -> int:
	var rocket_id = str(_returned.get("rocket_id", ""))
	if rocket_id == "":
		return 0
	var base_cost = RocketSpecs.get_cost(rocket_id)
	var salvage_pct = ResearchManager.get_salvage_refund_multiplier()
	if salvage_pct <= 0.0:
		salvage_pct = RocketSpecs.get_salvage_refund_pct(rocket_id)
	return int(round(float(base_cost) * salvage_pct))


func _build_next_mission_brief() -> Dictionary:
	var current_stage = int(RocketsManager.get_mission_stage())
	var next_stage = current_stage + 1 if current_stage < 4 else 4
	var targets = RocketsManager.get_selectable_targets_for_stage(next_stage)
	var target: Dictionary = {}
	if not targets.is_empty() and typeof(targets[0]) == TYPE_DICTIONARY:
		target = (targets[0] as Dictionary).duplicate(true)
	else:
		target = RocketsManager.get_predefined_mission_target(next_stage)
	var target_id = str(target.get("id", ""))
	var target_label = str(target.get("label", "Earth Launchpad"))
	var contractor = _contractor_name if _contractor_name != "" else "Mission Control"
	if current_stage >= 4:
		var offer = RocketsManager.ensure_trip_contract_offer()
		var selected = RocketsManager.get_trip_selected_contractor()
		if not selected.is_empty():
			contractor = str(selected.get("name", contractor))
		else:
			var contractors: Array = offer.get("contractors", [])
			if not contractors.is_empty() and typeof(contractors[0]) == TYPE_DICTIONARY:
				contractor = str((contractors[0] as Dictionary).get("name", contractor))
	return {
		"stage": next_stage,
		"target_id": target_id,
		"location": target_label,
		"contractor": contractor,
		"title": _next_mission_title(current_stage),
		"objective": _next_mission_objective(current_stage, target_label),
		"note": _next_mission_note(current_stage)
	}


func _next_mission_title(current_stage: int) -> String:
	match current_stage:
		1:
			return "Mission 2 is ready"
		2:
			return "Mission 3 is ready"
		3:
			return "Mission 4 is ready"
		_:
			return "Your next mission is ready"


func _next_mission_objective(current_stage: int, target_label: String) -> String:
	match current_stage:
		1:
			return "Upgrade to Starter Rocket 2 and launch the next asteroid run toward %s." % target_label
		2:
			return "Prepare the first planet-target mission and route toward %s." % target_label
		3:
			return "Build scanner capability and push toward the long-range objective at %s." % target_label
		_:
			return "Open the launchpad, pick a contractor, and line up the next operation."


func _next_mission_note(current_stage: int) -> String:
	match current_stage:
		1:
			return "This should feel like a briefing card, not a system toast."
		2:
			return "Planet targets are now part of the loop; route choice matters more."
		3:
			return "The next handoff moves you into scanner-led mission prep."
		_:
			return "Free Operations is open; use the launchpad to continue the loop."


func _prepare_launchpad_handoff() -> void:
	var target_id = str(_next_mission_brief.get("target_id", ""))
	var location = str(_next_mission_brief.get("location", "the next mission"))
	if target_id != "":
		RocketsManager.select_target(target_id)
	RocketsManager.set_launch_guidance_notice("Next mission briefing loaded: %s." % location)
