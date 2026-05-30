extends Control
class_name LaunchWizardMapStep
## Orbital-ring target picker embedded in the LaunchWizard TARGET step.
## In portrait, renders concentric AU-distance rings with targets placed by
## orbit. In landscape, falls back to the random scatter layout.
## Targets must have a "distance_au" key for orbital placement; without it
## the old hash-scatter is used.

signal target_selected(target: Dictionary)

const MapTargetLabelScene         = preload("res://Scenes/UI/Templates/LaunchWizardMapTargetLabel.tscn")
const MapTargetLabelSelectedScene = preload("res://Scenes/UI/Templates/LaunchWizardMapTargetLabelSelected.tscn")
const STAR_COUNT := 180
const _MAX_AU    := 30.0   ## AU range shown; targets beyond this are clamped to the outer ring.

# ── Palette ───────────────────────────────────────────────────────────────────
const _COL_BG        := Color(0.028, 0.040, 0.090, 1.0)
const _COL_SEL_RIM   := Color(0.32, 0.86, 0.74, 1.0)
const _COL_RING      := Color(0.247, 0.663, 1.000, 0.13)  # ghosted cyan orbital ring
const _COL_RING_TICK := Color(0.247, 0.663, 1.000, 0.32)  # scale-tick dot
const _COL_SUN       := Color(1.000, 0.820, 0.400, 1.0)   # amber sol centre

var _targets: Array = []
var _selected_id: String = ""
var _bg_stars: Array[Dictionary] = []
var _last_size: Vector2 = Vector2.ZERO

@onready var _label_layer: Control = $LabelLayer

# ── Public API ────────────────────────────────────────────────────────────────

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

# ── Lifecycle ─────────────────────────────────────────────────────────────────

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

# ── Background stars ──────────────────────────────────────────────────────────

func _rebuild_stars() -> void:
	if size == _last_size:
		return
	_last_size = size
	_bg_stars.clear()
	var rng := RandomNumberGenerator.new()
	rng.seed = 9173
	for _i: int in range(STAR_COUNT):
		_bg_stars.append({
			"pos": Vector2(rng.randf_range(0.0, size.x), rng.randf_range(0.0, size.y)),
			"r":   rng.randf_range(0.5, 1.6),
			"a":   rng.randf_range(0.15, 0.65),
		})

# ── Drawing ───────────────────────────────────────────────────────────────────

func _draw() -> void:
	if size.x < 10.0 or size.y < 10.0:
		return

	draw_rect(Rect2(Vector2.ZERO, size), _COL_BG)
	_draw_orbital_rings()

	for star: Dictionary in _bg_stars:
		draw_circle(
			star.get("pos", Vector2.ZERO) as Vector2,
			float(star.get("r", 1.0)),
			Color(1.0, 1.0, 1.0, float(star.get("a", 0.5)))
		)

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

## Concentric orbital rings for the inner solar system.
## Rings at 3 AU (inner belt), 12 AU (mid belt), 24 AU (outer belt).
func _draw_orbital_rings() -> void:
	var center := _map_center()
	var max_r  := _map_radius()

	# Sol at map centre — amber glow
	draw_circle(center, 14.0, Color(_COL_SUN.r, _COL_SUN.g, _COL_SUN.b, 0.18))
	draw_circle(center, 5.5,  _COL_SUN)

	# Orbital rings — inner / mid / outer asteroid belts
	for au_val: float in [3.0, 12.0, 24.0]:
		var r := au_val / _MAX_AU * max_r
		draw_arc(center, r, 0.0, TAU, 96, _COL_RING, 1.0, true)
		# Scale-tick at top of ring
		var tick := center + Vector2(0.0, -r)
		draw_circle(tick, 2.0, _COL_RING_TICK)

# ── Input ─────────────────────────────────────────────────────────────────────

func _gui_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton
			and (event as InputEventMouseButton).pressed
			and (event as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT):
		return
	var mpos: Vector2 = (event as InputEventMouseButton).position
	for target_any: Variant in _targets:
		if typeof(target_any) != TYPE_DICTIONARY:
			continue
		var target: Dictionary = target_any
		if _pos_for(target).distance_to(mpos) <= 24.0:
			_selected_id = str(target.get("id", ""))
			queue_redraw()
			target_selected.emit(target)
			return

# ── Labels ────────────────────────────────────────────────────────────────────

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
		label.text    = str(target.get("label", target.get("name", "?"))).to_upper()
		label.modulate = Color(1, 1, 1, 1.0 if sel else 0.82)
		var pos := _pos_for(target)
		label.position = Vector2(pos.x - 48.0, pos.y + 10.0)
		_label_layer.add_child(label)

# ── Layout helpers ────────────────────────────────────────────────────────────

## Orbital map centre — shifted slightly up so target labels have space below.
func _map_center() -> Vector2:
	return Vector2(size.x * 0.5, size.y * 0.43)

## Max ring radius — constrained so the outermost ring fits inside the panel.
func _map_radius() -> float:
	return minf(size.x * 0.43, size.y * 0.40)

## Returns the screen position for a target.
## Uses "distance_au" for orbital ring placement when available, otherwise
## falls back to the legacy hash-scatter layout.
func _pos_for(t: Dictionary) -> Vector2:
	var au := float(t.get("distance_au", 0.0))
	var center := _map_center()
	var max_r  := _map_radius()

	if au > 0.0:
		# Orbital layout: radius from AU, angle from target ID hash
		var r := clampf(au / _MAX_AU, 0.04, 0.97) * max_r
		var h: int = abs(str(t.get("id", t.get("label", "x"))).hash())
		var angle := float(h % 1000) / 1000.0 * TAU
		return Vector2(center.x + r * cos(angle), center.y + r * sin(angle))

	# Fallback scatter (no AU data)
	var h: int = abs(str(t.get("id", t.get("label", "x"))).hash())
	var rng := RandomNumberGenerator.new()
	rng.seed = h
	var margin := 48.0
	return Vector2(
		rng.randf_range(margin, maxf(margin, size.x - margin)),
		rng.randf_range(margin, maxf(margin, size.y - margin))
	)

func _star_color(t: Dictionary) -> Color:
	var h: int = abs(str(t.get("id", "x")).hash())
	match h % 6:
		0: return Color(0.98, 0.90, 0.60, 1.0)
		1: return Color(0.70, 0.85, 1.00, 1.0)
		2: return Color(1.00, 0.60, 0.35, 1.0)
		3: return Color(0.60, 0.80, 1.00, 1.0)
		4: return Color(0.95, 0.55, 0.35, 1.0)
		_: return Color(0.78, 0.90, 1.00, 1.0)
