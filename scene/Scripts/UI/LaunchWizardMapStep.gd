extends Control
class_name LaunchWizardMapStep
## Orbital mini-map embedded in the LaunchWizard TARGET step.
## Draws targets as interactive dots on concentric orbit rings.

signal target_selected(target: Dictionary)

const TargetLabelScene = preload("res://Scenes/UI/Templates/LaunchWizardMapTargetLabel.tscn")

const _COL_BG    := Color(0.028, 0.047, 0.118, 1.0)
const _COL_ORBIT := Color(0.275, 0.420, 0.651, 0.35)
const _COL_SUN   := Color(1.000, 0.918, 0.580, 1.0)
const _COL_AST   := Color(0.780, 0.710, 0.570, 1.0)
const _COL_PLN   := Color(0.380, 0.630, 0.870, 1.0)
const _COL_SEL   := Color(0.320, 0.860, 0.740, 1.0)

var _targets:     Array  = []
var _selected_id: String = ""
var _labels:      Array  = []

@onready var _label_layer: Control = $LabelLayer

func setup(targets: Array, selected_id: String = "") -> void:
	_targets     = targets
	_selected_id = selected_id
	_sync_labels()
	queue_redraw()

func set_selected(target_id: String) -> void:
	_selected_id = target_id
	_sync_labels()
	queue_redraw()

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	clip_contents = true

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_sync_labels()
		queue_redraw()

func _draw() -> void:
	if size.x < 10 or size.y < 10:
		return
	var ctr := _center()

	draw_rect(Rect2(Vector2.ZERO, size), _COL_BG)

	# Deterministic star field
	var rng := RandomNumberGenerator.new()
	rng.seed = 7331
	for i in 90:
		draw_circle(
			Vector2(rng.randf_range(4, size.x - 4), rng.randf_range(4, size.y - 4)),
			rng.randf_range(0.5, 1.8),
			Color(1, 1, 1, rng.randf_range(0.15, 0.60)))

	_draw_star_system_markers()

	# Orbit rings (one per distinct radius band)
	var seen: Array[float] = []
	for t in _targets:
		var r := _orbit_r(t, ctr)
		var dup := false
		for s in seen:
			if absf(s - r) < 6.0:
				dup = true
				break
		if not dup:
			seen.append(r)
			draw_arc(ctr, r, 0.0, TAU, maxi(int(r * 1.4), 32), _COL_ORBIT, 1.2, true)

	# Sun glow + core
	draw_circle(ctr, 22, Color(1.0, 0.92, 0.58, 0.12))
	draw_circle(ctr, 10, _COL_SUN)

	# Target dots
	for t in _targets:
		var pos := _pos(t, ctr)
		var col := _COL_PLN if t.get("type", "asteroid") == "planet" else _COL_AST
		var sel := _selected_id == str(t.get("id", ""))
		var rad := 9   if t.get("type", "asteroid") == "planet" else 6
		if sel:
			draw_circle(pos, rad + 10, Color(col.r, col.g, col.b, 0.18))
			draw_arc(pos, rad + 8, 0.0, TAU, 32, _COL_SEL, 2.0, true)
		draw_circle(pos, rad, col)

func _gui_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton
			and (event as InputEventMouseButton).pressed
			and (event as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT):
		return
	var ctr  := _center()
	var mpos := (event as InputEventMouseButton).position
	for t in _targets:
		if _pos(t, ctr).distance_to(mpos) <= 20.0:
			_selected_id = str(t.get("id", ""))
			_sync_labels()
			queue_redraw()
			target_selected.emit(t)
			return

# Helpers

func _center() -> Vector2:
	return Vector2(size.x * 0.5, size.y * 0.56)

func _orbit_r(t: Dictionary, ctr: Vector2) -> float:
	var dist  := float(t.get("distance_au", 12.0))
	var max_r := minf(ctr.x * 0.86, ctr.y * 0.92)
	var min_r := max_r * 0.16
	if t.get("type", "asteroid") == "planet":
		return lerpf(max_r * 0.62, max_r, clampf((dist - 90.0) / 260.0, 0.0, 1.0))
	return lerpf(min_r, max_r * 0.50, clampf((dist - 2.0) / 22.0, 0.0, 1.0))

func _pos(t: Dictionary, ctr: Vector2) -> Vector2:
	var r   := _orbit_r(t, ctr)
	var h: int = abs(str(t.get("id", t.get("label", "x"))).hash())
	var ang := float(h % 1000) / 1000.0 * TAU
	return ctr + Vector2(cos(ang) * r, sin(ang) * r * 0.52)  # slightly elliptical

func _draw_star_system_markers() -> void:
	var systems := _star_systems()
	if systems.size() <= 1:
		return
	var start_x := 28.0
	var y := 30.0
	for i in range(systems.size()):
		var x := start_x + float(i) * 46.0
		var pos := Vector2(x, y)
		draw_circle(pos, 12.0, Color(1.0, 0.92, 0.58, 0.12))
		draw_circle(pos, 5.0, _COL_SUN)
		draw_circle(pos + Vector2(8.0, 2.0), 2.2, Color(0.78, 0.88, 1.0, 0.85))

func _star_systems() -> Array:
	var seen := {}
	var out := []
	for target_any in _targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		var system_id := str(target.get("star_system_id", target.get("parent_star", ""))).strip_edges()
		if system_id == "" or seen.has(system_id):
			continue
		seen[system_id] = true
		out.append(system_id)
	return out

func _sync_labels() -> void:
	for n in _labels:
		if is_instance_valid(n):
			n.queue_free()
	_labels.clear()
	var draw_size := size
	if draw_size.x < 10.0 or draw_size.y < 10.0:
		draw_size = Vector2(maxf(draw_size.x, 96.0), maxf(draw_size.y, 96.0))
	var ctr := Vector2(draw_size.x * 0.5, draw_size.y * 0.56)
	for t in _targets:
		var pos := _pos(t, ctr)
		var sel := _selected_id == str(t.get("id", ""))
		var lbl: Label = TargetLabelScene.instantiate()
		lbl.set_meta("ui_template", "LaunchWizardMapTargetLabel")
		lbl.text = str(t.get("label", t.get("name", "?")))
		lbl.add_theme_color_override("font_color",
				Color(1.0, 1.0, 1.0, 1.0) if sel else Color(0.9, 0.95, 1.0, 0.70))
		lbl.position = pos + Vector2(-32.0, -26.0)
		if _label_layer:
			_label_layer.add_child(lbl)
		else:
			add_child(lbl)
		_labels.append(lbl)
