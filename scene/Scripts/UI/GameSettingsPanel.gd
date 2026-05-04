extends Control
class_name GameSettingsPanel

## Settings panel — self-managed CanvasLayer at tree.root layer 200.
## Call GameSettingsPanel.open(any_node_in_tree) to show.

const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")

signal close_requested

const _LAYER_NAME := "GameSettingsPanelLayer"
const _LAYER_Z    := 200

const _C_BG     := Color(0.04, 0.05, 0.09, 0.92)
const _C_CARD   := Color(0.07, 0.09, 0.13, 0.97)
const _C_BORDER := Color(0.11, 0.30, 0.50, 0.80)
const _C_TEXT   := Color(0.79, 0.85, 0.93, 1.0)
const _C_MUTED  := Color(0.50, 0.58, 0.68, 1.0)
const _C_ACCENT := Color(0.29, 0.82, 1.00, 1.0)
const _C_WARN   := Color(0.91, 0.70, 0.19, 1.0)

var _closing := false

# ── Public API ────────────────────────────────────────────────────────────────

static func open(owner: Node) -> void:
	var tree := owner.get_tree() if owner else null
	if tree == null or tree.root == null:
		return
	if tree.root.get_node_or_null(_LAYER_NAME) != null:
		return
	var layer := CanvasLayer.new()
	layer.name = _LAYER_NAME
	layer.layer = _LAYER_Z
	layer.follow_viewport_enabled = true
	tree.root.add_child(layer)
	var script := load("res://Scripts/UI/GameSettingsPanel.gd") as GDScript
	var panel := script.new() as Control
	layer.add_child(panel)

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_ui()

# ── UI construction ───────────────────────────────────────────────────────────

func _build_ui() -> void:
	var vp_w := get_viewport().get_visible_rect().size.x if get_viewport() else 480.0
	var card_w := clampf(vp_w - 48.0, 300.0, 480.0)

	# Backdrop — blocks all clicks, tap outside card to close
	var backdrop := ColorRect.new()
	backdrop.color = _C_BG
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.gui_input.connect(func(ev: InputEvent):
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			_request_close()
	)
	add_child(backdrop)

	# CenterContainer fills the panel and centers the card
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_PASS
	add_child(center)

	# Card
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(card_w, 0)
	var cs := StyleBoxFlat.new()
	cs.bg_color = _C_CARD
	cs.border_color = _C_BORDER
	cs.set_border_width_all(1)
	cs.set_corner_radius_all(12)
	cs.content_margin_left = 24; cs.content_margin_right = 24
	cs.content_margin_top = 20; cs.content_margin_bottom = 20
	card.add_theme_stylebox_override("panel", cs)
	center.add_child(card)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	card.add_child(vbox)

	# ── Header ──
	var header := HBoxContainer.new()
	vbox.add_child(header)

	var title := Label.new()
	title.text = "SETTINGS"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_color_override("font_color", _C_ACCENT)
	title.add_theme_font_size_override("font_size", 18)
	header.add_child(title)

	var x_btn := _make_btn("✕", _C_MUTED, false)
	x_btn.custom_minimum_size = Vector2(44, 44)
	x_btn.pressed.connect(_request_close)
	header.add_child(x_btn)

	vbox.add_child(_sep())

	# ── Action buttons ──
	var practice_btn := _make_btn("Practice Mining", _C_ACCENT, true)
	practice_btn.pressed.connect(func():
		AppControllerHelper.open_mining_practice_panel("settings_panel")
		_request_close()
	)
	vbox.add_child(practice_btn)

	var replay_btn := _make_btn("Replay Mission Guide", _C_TEXT, false)
	replay_btn.pressed.connect(func():
		var app := AppControllerHelper.get_instance()
		if app and app.has_method("replay_tutorial_for_current_mission"):
			app.replay_tutorial_for_current_mission()
		_request_close()
	)
	vbox.add_child(replay_btn)

	var app_check := AppControllerHelper.get_instance()
	if app_check != null and app_check.has_method("skip_tutorial"):
		var skip_btn := _make_btn("Skip Tutorial", _C_TEXT, false)
		skip_btn.pressed.connect(func():
			var app2 := AppControllerHelper.get_instance()
			if app2 and app2.has_method("skip_tutorial"):
				app2.skip_tutorial()
			_request_close()
		)
		vbox.add_child(skip_btn)

	var dlg_enabled := AppControllerHelper.is_citizen_science_dialogue_enabled(true)
	var dlg_btn := _make_btn("Dialogue: %s" % ("On" if dlg_enabled else "Off"), _C_TEXT, false)
	dlg_btn.pressed.connect(func():
		var app3 := AppControllerHelper.get_instance()
		if app3 and app3.has_method("is_citizen_science_dialogue_enabled") \
				and app3.has_method("set_citizen_science_dialogue_enabled"):
			var next := not bool(app3.is_citizen_science_dialogue_enabled())
			app3.set_citizen_science_dialogue_enabled(next)
			dlg_btn.text = "Dialogue: %s" % ("On" if next else "Off")
	)
	vbox.add_child(dlg_btn)

	vbox.add_child(_sep())

	var reset_btn := _make_btn("Reset All Progress", _C_WARN, false)
	reset_btn.pressed.connect(func():
		var app4 := AppControllerHelper.get_instance()
		if app4 and app4.has_method("_on_reset_all"):
			app4._on_reset_all()
		_request_close()
	)
	vbox.add_child(reset_btn)

	vbox.add_child(_sep())

	var close_btn := _make_btn("Close", _C_ACCENT, false)
	close_btn.pressed.connect(_request_close)
	vbox.add_child(close_btn)

# ── Close ─────────────────────────────────────────────────────────────────────

func _request_close() -> void:
	if _closing:
		return
	_closing = true
	close_requested.emit()
	var layer := get_parent()
	if is_instance_valid(layer):
		layer.queue_free()
	else:
		queue_free()

# ── Helpers ───────────────────────────────────────────────────────────────────

func _sep() -> HSeparator:
	var s := HSeparator.new()
	s.add_theme_color_override("separator", Color(_C_BORDER.r, _C_BORDER.g, _C_BORDER.b, 0.45))
	return s

func _make_btn(label: String, col: Color, is_primary: bool) -> Button:
	var btn := Button.new()
	btn.text = label
	btn.custom_minimum_size = Vector2(0, 54)
	btn.focus_mode = Control.FOCUS_NONE
	var sn := StyleBoxFlat.new()
	sn.bg_color = Color(col.r, col.g, col.b, 0.14) if is_primary else Color(0, 0, 0, 0)
	sn.border_color = Color(col.r, col.g, col.b, 0.50)
	sn.set_border_width_all(1)
	sn.set_corner_radius_all(8)
	sn.content_margin_left = 16; sn.content_margin_right = 16
	sn.content_margin_top = 10; sn.content_margin_bottom = 10
	var sh := sn.duplicate() as StyleBoxFlat
	sh.bg_color = Color(col.r, col.g, col.b, 0.26)
	sh.border_color = col
	var sp := sh.duplicate() as StyleBoxFlat
	sp.bg_color = Color(col.r, col.g, col.b, 0.38)
	btn.add_theme_stylebox_override("normal", sn)
	btn.add_theme_stylebox_override("hover",  sh)
	btn.add_theme_stylebox_override("pressed", sp)
	btn.add_theme_color_override("font_color",       col)
	btn.add_theme_color_override("font_hover_color", col)
	btn.add_theme_font_size_override("font_size", 16)
	return btn
