extends Control
## Mobile-first launch wizard — Contractor → Target → Rocket → Confirm
## Full-width step-by-step flow; all UI built in code (no sub-scenes needed).

const RocketSpecs        = preload("res://Scripts/Utils/RocketSpecs.gd")
const RocketsManager     = preload("res://Scripts/Utils/RocketsManager.gd")

enum Step { CONTRACTOR = 0, TARGET = 1, ROCKET = 2, CONFIRM = 3 }

# ── Palette ───────────────────────────────────────────────────────────────────
const C_PRIMARY      := Color(0.000, 0.424, 0.361, 1.0)
const C_PRIMARY_DIM  := Color(0.000, 0.314, 0.271, 1.0)
const C_PAGE_BG      := Color(0.949, 0.965, 0.961, 1.0)
const C_SURF_LOW     := Color(0.941, 0.957, 0.953, 1.0)
const C_SURF_LOWEST  := Color(1.000, 1.000, 1.000, 1.0)
const C_ON_SURF      := Color(0.176, 0.204, 0.200, 1.0)
const C_ON_SURF_VAR  := Color(0.349, 0.376, 0.376, 1.0)
const C_ICE_BLUE     := Color(0.820, 0.918, 0.929, 1.0)
const C_ICE_BLUE_DIM := Color(0.690, 0.820, 0.835, 1.0)
const C_ICE_SEL_BG   := Color(0.820, 0.918, 0.929, 0.35)
const C_SHADOW       := Color(0.000, 0.424, 0.361, 0.08)
const C_WHITE        := Color(1.000, 1.000, 1.000, 1.0)
const C_OK           := Color(0.129, 0.588, 0.486, 1.0)
const C_WARN         := Color(0.851, 0.467, 0.024, 1.0)

# ── State ─────────────────────────────────────────────────────────────────────
var _step: Step = Step.CONTRACTOR
var _selected_contractor: Dictionary = {}
var _selected_target:     Dictionary = {}
var _selected_rocket:     String     = ""
var _is_free_ops:         bool       = false
var _contractors:         Array      = []
var _targets:             Array      = []
var _rockets:             Array      = []

signal back_pressed
signal launched(rocket_id: String, target_id: String)

# ── Node refs (built in code) ─────────────────────────────────────────────────
var _header_title: Label
var _step_dots:    Array  = []
var _card_list:    VBoxContainer
var _scroll:       ScrollContainer
var _next_btn:     Button
var _cancel_btn:   Button

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	_build_ui()
	_show_step(Step.CONTRACTOR)

# ── UI construction ───────────────────────────────────────────────────────────

func _build_ui() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var bg := ColorRect.new()
	bg.color = C_PAGE_BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var scaffold := VBoxContainer.new()
	scaffold.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scaffold.add_theme_constant_override("separation", 0)
	add_child(scaffold)

	scaffold.add_child(_build_header())

	_scroll = ScrollContainer.new()
	_scroll.size_flags_vertical = SIZE_EXPAND_FILL
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scaffold.add_child(_scroll)

	var scroll_margin := MarginContainer.new()
	scroll_margin.size_flags_horizontal = SIZE_EXPAND_FILL
	scroll_margin.add_theme_constant_override("margin_left", 20)
	scroll_margin.add_theme_constant_override("margin_right", 20)
	scroll_margin.add_theme_constant_override("margin_top", 20)
	scroll_margin.add_theme_constant_override("margin_bottom", 20)
	_scroll.add_child(scroll_margin)

	_card_list = VBoxContainer.new()
	_card_list.size_flags_horizontal = SIZE_EXPAND_FILL
	_card_list.add_theme_constant_override("separation", 12)
	scroll_margin.add_child(_card_list)

	scaffold.add_child(_build_footer())

func _build_header() -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, 72)
	c.size_flags_horizontal = SIZE_EXPAND_FILL

	var bg := ColorRect.new()
	bg.color = C_PRIMARY
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	c.add_child(bg)

	var hbox := HBoxContainer.new()
	hbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hbox.add_theme_constant_override("separation", 8)
	hbox.offset_left   = 16.0
	hbox.offset_right  = -16.0
	c.add_child(hbox)

	var back_btn := Button.new()
	back_btn.custom_minimum_size = Vector2(44, 44)
	back_btn.text = "‹"
	back_btn.flat = true
	back_btn.add_theme_color_override("font_color", C_WHITE)
	back_btn.add_theme_font_size_override("font_size", 32)
	back_btn.pressed.connect(_on_back)
	hbox.add_child(back_btn)

	_header_title = Label.new()
	_header_title.size_flags_horizontal = SIZE_EXPAND_FILL
	_header_title.add_theme_color_override("font_color", C_WHITE)
	_header_title.add_theme_font_size_override("font_size", 20)
	_header_title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(_header_title)

	var dot_box := HBoxContainer.new()
	dot_box.add_theme_constant_override("separation", 7)
	dot_box.alignment = BoxContainer.ALIGNMENT_CENTER
	hbox.add_child(dot_box)

	_step_dots.clear()
	for _i in 4:
		var d := ColorRect.new()
		d.custom_minimum_size = Vector2(8, 8)
		d.color = Color(1, 1, 1, 0.3)
		dot_box.add_child(d)
		_step_dots.append(d)

	return c

func _build_footer() -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, 88)
	c.size_flags_horizontal = SIZE_EXPAND_FILL

	var bg := ColorRect.new()
	bg.color = C_SURF_LOW
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	c.add_child(bg)

	var hbox := HBoxContainer.new()
	hbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hbox.add_theme_constant_override("separation", 12)
	hbox.offset_left   = 20.0
	hbox.offset_right  = -20.0
	hbox.offset_top    = 16.0
	hbox.offset_bottom = -16.0
	c.add_child(hbox)

	_cancel_btn = Button.new()
	_cancel_btn.custom_minimum_size = Vector2(110, 56)
	_cancel_btn.text = "Cancel"
	_cancel_btn.add_theme_color_override("font_color", C_ON_SURF_VAR)
	_cancel_btn.add_theme_font_size_override("font_size", 16)
	_cancel_btn.add_theme_stylebox_override("normal",  _box(C_SURF_LOWEST, 12))
	_cancel_btn.add_theme_stylebox_override("hover",   _box(C_ICE_BLUE, 12))
	_cancel_btn.add_theme_stylebox_override("pressed", _box(C_ICE_BLUE_DIM, 12))
	_cancel_btn.add_theme_stylebox_override("focus",   _box(C_SURF_LOWEST, 12))
	_cancel_btn.pressed.connect(_on_cancel)
	hbox.add_child(_cancel_btn)

	_next_btn = Button.new()
	_next_btn.size_flags_horizontal = SIZE_EXPAND_FILL
	_next_btn.custom_minimum_size = Vector2(0, 56)
	_next_btn.text = "Next →"
	_next_btn.add_theme_color_override("font_color", C_WHITE)
	_next_btn.add_theme_font_size_override("font_size", 17)
	_next_btn.add_theme_stylebox_override("normal",   _box(C_PRIMARY, 12))
	_next_btn.add_theme_stylebox_override("hover",    _box(C_PRIMARY_DIM, 12))
	_next_btn.add_theme_stylebox_override("pressed",  _box(C_PRIMARY_DIM, 12))
	_next_btn.add_theme_stylebox_override("focus",    _box(C_PRIMARY, 12))
	_next_btn.add_theme_stylebox_override("disabled", _box(Color(0.6, 0.6, 0.6, 1.0), 12))
	_next_btn.pressed.connect(_on_next)
	hbox.add_child(_next_btn)

	return c

# ── Step management ───────────────────────────────────────────────────────────

func _show_step(s: Step) -> void:
	_step = s
	_update_header()
	_update_dots()
	_rebuild_cards()
	_update_footer()
	if _scroll:
		_scroll.scroll_vertical = 0

func _update_header() -> void:
	const TITLES := ["Select Contractor", "Select Target", "Select Rocket", "Confirm Launch"]
	_header_title.text = TITLES[_step]

func _update_dots() -> void:
	for i in _step_dots.size():
		_step_dots[i].color = C_WHITE if i == int(_step) else Color(1, 1, 1, 0.3)

func _update_footer() -> void:
	match _step:
		Step.CONTRACTOR:
			_cancel_btn.text = "Cancel"
			_next_btn.text   = "Next →"
			_next_btn.disabled = _selected_contractor.is_empty()
		Step.TARGET:
			_cancel_btn.text = "← Back"
			_next_btn.text   = "Next →"
			_next_btn.disabled = _selected_target.is_empty()
		Step.ROCKET:
			_cancel_btn.text = "← Back"
			_next_btn.text   = "Next →"
			_next_btn.disabled = _selected_rocket.is_empty()
		Step.CONFIRM:
			_cancel_btn.text = "← Back"
			_next_btn.text   = "Launch Mission"
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
	var stage := RocketsManager.get_mission_stage()

	_add_section_label("Mission %d" % stage, "Who are you working for?")

	if _is_free_ops:
		RocketsManager.ensure_trip_contract_offer()
		_contractors = RocketsManager.get_trip_contractors()
	else:
		RocketsManager.ensure_starter_contract_offer()
		_contractors = RocketsManager.get_starter_contractors()

	if _contractors.is_empty():
		_add_empty_msg("No contractors available right now.")
		return

	for c in _contractors:
		_add_contractor_card(c)

func _add_contractor_card(c: Dictionary) -> void:
	var c_id:     String = c.get("id", "")
	var c_name:   String = c.get("name", "Unknown")
	var c_order:  String = str(c.get("order", c.get("role", "")))
	var c_detail: String = str(c.get("summary", c.get("description", "")))
	var selected: bool   = c_id == str(_selected_contractor.get("id", ""))

	var card := _make_card(selected)
	_card_list.add_child(card)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	card.add_child(vbox)

	var name_lbl := _label(c_name, C_ON_SURF, 18)
	vbox.add_child(name_lbl)

	if c_order:
		vbox.add_child(_label(c_order, C_ON_SURF_VAR, 14))
	if c_detail:
		var d := _label(c_detail, C_ON_SURF_VAR, 13)
		d.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(d)

	var btn_row := HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_END
	vbox.add_child(btn_row)

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

# ── Step: Target ──────────────────────────────────────────────────────────────

func _build_target_step() -> void:
	var stage := RocketsManager.get_mission_stage()
	_add_section_label("Select Target", "Where is your rocket going?")

	_targets = RocketsManager.get_selectable_targets_for_stage(stage)
	if _targets.is_empty():
		_targets = RocketsManager.get_selectable_targets_for_stage()

	if _targets.is_empty():
		_add_empty_msg("No targets available. Complete a scan mission first.")
		return

	for t in _targets:
		_add_target_card(t)

func _add_target_card(t: Dictionary) -> void:
	var t_id:     String = t.get("id", "")
	var t_label:  String = str(t.get("label", t.get("name", "Unknown")))
	var t_type:   String = t.get("type", "asteroid")
	var selected: bool   = t_id == str(_selected_target.get("id", ""))
	var reward_r: float  = RocketsManager.get_target_reward_ratio(t_id) if t_id else 1.0

	var card := _make_card(selected)
	_card_list.add_child(card)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	card.add_child(vbox)

	vbox.add_child(_label(t_label, C_ON_SURF, 18))

	var meta_row := HBoxContainer.new()
	meta_row.add_theme_constant_override("separation", 16)
	vbox.add_child(meta_row)
	meta_row.add_child(_label(t_type.capitalize(), C_ON_SURF_VAR, 14))
	meta_row.add_child(_label("Yield  %d%%" % int(reward_r * 100), C_OK, 14))

	var btn_row := HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_END
	vbox.add_child(btn_row)

	var btn := _action_btn("Selected ✓" if selected else "Select", selected)
	btn.pressed.connect(func():
		_selected_target = t
		RocketsManager.select_target(t_id)
		_rebuild_cards()
		_update_footer()
	)
	btn_row.add_child(btn)

# ── Step: Rocket ──────────────────────────────────────────────────────────────

func _build_rocket_step() -> void:
	_add_section_label("Select Rocket", "Which vehicle will you launch?")

	_rockets = RocketsManager.get_unlocked()
	if _rockets.is_empty():
		_add_empty_msg("No rockets unlocked yet.")
		return

	for r in _rockets:
		_add_rocket_card(r)

func _add_rocket_card(rtype: String) -> void:
	var selected := rtype == _selected_rocket
	var r_name   := RocketSpecs.get_display_name(rtype)
	var cost     := RocketSpecs.get_cost(rtype)
	var speed    := RocketSpecs.get_speed_multiplier(rtype)
	var cargo    := RocketSpecs.get_cargo_multiplier(rtype)
	var mining   := RocketSpecs.get_mining_multiplier(rtype)

	var card := _make_card(selected)
	_card_list.add_child(card)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	card.add_child(vbox)

	vbox.add_child(_label(r_name, C_ON_SURF, 18))

	var cost_b := cost / 1_000_000_000
	vbox.add_child(_label("Cost: %dB F" % cost_b, C_ON_SURF_VAR, 14))

	# Stat chips row
	var stats_row := HBoxContainer.new()
	stats_row.add_theme_constant_override("separation", 20)
	vbox.add_child(stats_row)
	for pair in [["Speed", "%.1fx" % speed], ["Cargo", "%.1fx" % cargo], ["Mining", "%.1fx" % mining]]:
		var chip := _stat_chip(pair[0], pair[1])
		stats_row.add_child(chip)

	var btn_row := HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_END
	vbox.add_child(btn_row)

	var btn := _action_btn("Selected ✓" if selected else "Select", selected)
	btn.pressed.connect(func():
		_selected_rocket = rtype
		_rebuild_cards()
		_update_footer()
	)
	btn_row.add_child(btn)

# ── Step: Confirm ─────────────────────────────────────────────────────────────

func _build_confirm_step() -> void:
	_add_section_label("Ready to Launch", "Review your mission before launch.")

	var card := _make_card(false)
	_card_list.add_child(card)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 16)
	card.add_child(vbox)

	var rows: Array[Array] = [
		["Contractor", str(_selected_contractor.get("name", "—"))],
		["Target",     str(_selected_target.get("label", _selected_target.get("name", "—")))],
		["Rocket",     RocketSpecs.get_display_name(_selected_rocket) if _selected_rocket else "—"],
		["Cost",       "%dB F" % (RocketSpecs.get_cost(_selected_rocket) / 1_000_000_000) if _selected_rocket else "—"],
	]

	for row: Array in rows:
		var hbox := HBoxContainer.new()
		vbox.add_child(hbox)

		var key_lbl := _label(str(row[0]), C_ON_SURF_VAR, 15)
		key_lbl.custom_minimum_size = Vector2(120, 0)
		hbox.add_child(key_lbl)

		var val_lbl := _label(str(row[1]), C_ON_SURF, 15)
		val_lbl.size_flags_horizontal = SIZE_EXPAND_FILL
		hbox.add_child(val_lbl)

	# Divider
	var sep := ColorRect.new()
	sep.custom_minimum_size = Vector2(0, 1)
	sep.color = C_SURF_LOW
	vbox.add_child(sep)

	# Duration estimate
	if _selected_rocket:
		var dur_sec := RocketSpecs.get_mission_seconds(_selected_rocket)
		var dur_min := dur_sec / 60
		vbox.add_child(_label("Est. travel time: ~%d min" % dur_min, C_ON_SURF_VAR, 14))

	# Launch note
	var note := _label("Once launched, the rocket will depart immediately.", C_PRIMARY, 13)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(note)

# ── Launch execution ──────────────────────────────────────────────────────────

func _execute_launch() -> void:
	if _selected_rocket.is_empty() or _selected_target.is_empty():
		push_error("LaunchWizard: missing rocket or target selection")
		return

	var target_id: String = _selected_target.get("id", "")
	var rocket_id: String = RocketsManager.add_placed(_selected_rocket, Vector2.ZERO)
	if rocket_id.is_empty():
		push_error("LaunchWizard: add_placed failed for type " + _selected_rocket)
		return

	var launch_time := int(Time.get_unix_time_from_system())
	if not RocketsManager.add_mission(rocket_id, target_id, launch_time):
		push_error("LaunchWizard: add_mission failed")
		return

	launched.emit(rocket_id, target_id)

# ── Widget helpers ────────────────────────────────────────────────────────────

func _make_card(selected: bool) -> PanelContainer:
	var p := PanelContainer.new()
	p.size_flags_horizontal = SIZE_EXPAND_FILL

	var s := StyleBoxFlat.new()
	s.bg_color            = C_ICE_SEL_BG if selected else C_SURF_LOWEST
	s.corner_radius_top_left     = 12
	s.corner_radius_top_right    = 12
	s.corner_radius_bottom_left  = 12
	s.corner_radius_bottom_right = 12
	s.shadow_color  = C_SHADOW
	s.shadow_size   = 6
	s.shadow_offset = Vector2(0, 2)
	s.content_margin_left   = 16
	s.content_margin_right  = 16
	s.content_margin_top    = 14
	s.content_margin_bottom = 14
	if selected:
		s.border_width_left   = 2
		s.border_width_right  = 2
		s.border_width_top    = 2
		s.border_width_bottom = 2
		s.border_color = C_PRIMARY
	p.add_theme_stylebox_override("panel", s)
	return p

func _box(color: Color, radius: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = color
	s.corner_radius_top_left     = radius
	s.corner_radius_top_right    = radius
	s.corner_radius_bottom_left  = radius
	s.corner_radius_bottom_right = radius
	s.content_margin_left   = 16
	s.content_margin_right  = 16
	s.content_margin_top    = 8
	s.content_margin_bottom = 8
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
	var bg  := C_ICE_BLUE if is_selected else C_PRIMARY
	var fg  := C_PRIMARY  if is_selected else C_WHITE
	btn.add_theme_color_override("font_color", fg)
	btn.add_theme_font_size_override("font_size", 15)
	btn.add_theme_stylebox_override("normal",  _box(bg, 8))
	btn.add_theme_stylebox_override("hover",   _box(C_PRIMARY_DIM, 8))
	btn.add_theme_stylebox_override("pressed", _box(C_PRIMARY_DIM, 8))
	btn.add_theme_stylebox_override("focus",   _box(bg, 8))
	return btn

func _stat_chip(key: String, val: String) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	v.add_child(_label(key, C_ON_SURF_VAR, 12))
	v.add_child(_label(val, C_ON_SURF,     16))
	return v

func _add_section_label(title: String, subtitle: String) -> void:
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 2)
	vbox.add_child(_label(title,    C_PRIMARY,     22))
	vbox.add_child(_label(subtitle, C_ON_SURF_VAR, 14))
	_card_list.add_child(vbox)

func _add_empty_msg(text: String) -> void:
	var lbl := _label(text, C_ON_SURF_VAR, 16)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_card_list.add_child(lbl)
