extends Control
class_name LaunchWizardMapStep
## Galaxy-map target picker embedded in the LaunchWizard TARGET step.
## Renders targets as clickable star dots on a dark starfield.

signal target_selected(target: Dictionary)

const MapTargetLabelScene = preload("res://Scenes/UI/Templates/LaunchWizardMapTargetLabel.tscn")
const MapTargetLabelSelectedScene = preload("res://Scenes/UI/Templates/LaunchWizardMapTargetLabelSelected.tscn")
const STAR_COUNT := 180
const _COL_BG := Color(0.028, 0.040, 0.090, 1.0)
const _COL_STAR_FG := Color(0.88, 0.90, 0.96, 0.75)
const _COL_SEL_RIM := Color(0.32, 0.86, 0.74, 1.0)
const _COL_GRID := Color(0.22, 0.54, 0.80, 0.08)

var _targets: Array = []
var _selected_id: String = ""
var _bg_stars: Array[Dictionary] = []
var _last_size: Vector2 = Vector2.ZERO
@onready var _label_layer: Control = $LabelLayer

func setup(targets: Array, selected_id: String = "") -> void:
	_targets = targets
	_selected_id = selected_id
	_rebuild_stars()
	_sync_labels()
	queue_redraw()

func set_selected(target_id: String) -> void:
	_selected_id = target_id
	_sync_labels()
	queue_redraw()

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	clip_contents = true
	_rebuild_stars()
	_sync_labels()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_rebuild_stars()
		_sync_labels()
		queue_redraw()

func _rebuild_stars() -> void:
	if size == _last_size:
		return
	_last_size = size
	_bg_stars.clear()
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = 9173
	for _i: int in range(STAR_COUNT):
		var star: Dictionary = {
			"pos": Vector2(rng.randf_range(0.0, size.x), rng.randf_range(0.0, size.y)),
			"r": rng.randf_range(0.5, 1.6),
			"a": rng.randf_range(0.15, 0.65),
		}
		_bg_stars.append(star)

func _draw() -> void:
	if size.x < 10.0 or size.y < 10.0:
		return

	draw_rect(Rect2(Vector2.ZERO, size), _COL_BG)
	_draw_grid()

	for star: Dictionary in _bg_stars:
		var star_pos: Vector2 = star.get("pos", Vector2.ZERO)
		var star_radius: float = float(star.get("r", 1.0))
		var star_alpha: float = float(star.get("a", 0.5))
		draw_circle(star_pos, star_radius, Color(1.0, 1.0, 1.0, star_alpha))

	for target_any: Variant in _targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		var pos: Vector2 = _pos_for(target)
		var sel: bool = _selected_id == str(target.get("id", ""))
		var col: Color = _star_color(target)
		var rad: float = 7.0 if str(target.get("type", "asteroid")) == "planet" else 5.0

		draw_circle(pos, rad * 2.6, Color(col.r, col.g, col.b, 0.18))

		if sel:
			draw_arc(pos, rad + 8.0, 0.0, TAU, 40, _COL_SEL_RIM, 2.0, true)
			draw_circle(pos, rad + 14.0, Color(_COL_SEL_RIM.r, _COL_SEL_RIM.g, _COL_SEL_RIM.b, 0.12))

		draw_circle(pos, rad, col)

func _gui_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton \
			and (event as InputEventMouseButton).pressed \
			and (event as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT):
		return
	var mpos: Vector2 = (event as InputEventMouseButton).position
	for target_any: Variant in _targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		if _pos_for(target).distance_to(mpos) <= 22.0:
			_selected_id = str(target.get("id", ""))
			queue_redraw()
			target_selected.emit(target)
			return

func _draw_grid() -> void:
	var step := 48.0
	var x := step
	while x < size.x:
		draw_line(Vector2(x, 0.0), Vector2(x, size.y), _COL_GRID, 1.0)
		x += step
	var y := step
	while y < size.y:
		draw_line(Vector2(0.0, y), Vector2(size.x, y), _COL_GRID, 1.0)
		y += step

func _sync_labels() -> void:
	if _label_layer == null:
		return
	for child in _label_layer.get_children():
		child.queue_free()
	for target_any: Variant in _targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		var sel := _selected_id == str(target.get("id", ""))
		var label_scene := MapTargetLabelSelectedScene if sel else MapTargetLabelScene
		var label := label_scene.instantiate() as Label
		if label == null:
			continue
		label.set_meta("ui_template", "LaunchWizardMapTargetLabel")
		label.text = str(target.get("label", target.get("name", "?"))).to_upper()
		label.modulate = Color(1, 1, 1, 1.0 if sel else 0.82)
		var pos := _pos_for(target)
		label.position = Vector2(pos.x - 48.0, pos.y + 10.0)
		_label_layer.add_child(label)

func _pos_for(t: Dictionary) -> Vector2:
	var h: int = abs(str(t.get("id", t.get("label", "x"))).hash())
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = h
	var margin: float = 48.0
	var min_x: float = margin
	var max_x: float = maxf(margin, size.x - margin)
	var min_y: float = margin
	var max_y: float = maxf(margin, size.y - margin)
	return Vector2(
		rng.randf_range(min_x, max_x),
		rng.randf_range(min_y, max_y)
	)

func _star_color(t: Dictionary) -> Color:
	var h: int = abs(str(t.get("id", "x")).hash())
	match h % 6:
		0:
			return Color(0.98, 0.90, 0.60, 1.0)
		1:
			return Color(0.70, 0.85, 1.00, 1.0)
		2:
			return Color(1.00, 0.60, 0.35, 1.0)
		3:
			return Color(0.60, 0.80, 1.00, 1.0)
		4:
			return Color(0.95, 0.55, 0.35, 1.0)
		_:
			return Color(0.78, 0.90, 1.00, 1.0)
