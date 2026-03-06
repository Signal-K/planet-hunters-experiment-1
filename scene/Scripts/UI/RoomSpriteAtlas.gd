extends RefCounted
class_name RoomSpriteAtlas

const SHEET_PATH := "res://assets/Rooms/room_modules_sheet.png"
const GRID_COLUMNS := 4
const GRID_ROWS := 6
const MIN_COMPONENT_AREA := 5000
const GROUP_Y_TOLERANCE := 28.0

const ROOM_TO_CELL := {
	"basic_thruster_t1": Vector2i(0, 0),
	"fusion_drive_t2": Vector2i(1, 0),
	"ion_drive_t3": Vector2i(2, 0),
	"small_reactor_t1": Vector2i(3, 0),
	"fusion_reactor_t2": Vector2i(0, 1),
	"power_capacitor_t2": Vector2i(1, 1),
	"small_tank_t1": Vector2i(2, 1),
	"large_tank_t2": Vector2i(3, 1),
	"cargo_bay_t1": Vector2i(0, 2),
	"resource_vault_t2": Vector2i(1, 2),
	"mining_drill_t1": Vector2i(2, 2),
	"subsurface_probe_t2": Vector2i(3, 2),
	"drone_bay_t2": Vector2i(0, 3),
	"basic_nav_t1": Vector2i(1, 3),
	"scanner_array_t2": Vector2i(2, 3),
	"spectral_analyser_t3": Vector2i(3, 3),
	"basic_hull_t1": Vector2i(0, 4),
	"reinforced_hull_t2": Vector2i(1, 4),
	"sample_lab_t2": Vector2i(2, 4),
	"telescope_t2": Vector2i(3, 4),
	"comms_relay_t1": Vector2i(0, 5),
	"broadcast_array_t2": Vector2i(1, 5)
}

const ROOM_RENDER_ORDER := [
	"basic_thruster_t1",
	"fusion_drive_t2",
	"ion_drive_t3",
	"small_reactor_t1",
	"fusion_reactor_t2",
	"power_capacitor_t2",
	"small_tank_t1",
	"large_tank_t2",
	"cargo_bay_t1",
	"resource_vault_t2",
	"mining_drill_t1",
	"subsurface_probe_t2",
	"drone_bay_t2",
	"basic_nav_t1",
	"scanner_array_t2",
	"spectral_analyser_t3",
	"basic_hull_t1",
	"reinforced_hull_t2",
	"sample_lab_t2",
	"telescope_t2",
	"comms_relay_t1",
	"broadcast_array_t2"
]

static var _atlas_cache: Dictionary = {}
static var _auto_rects_by_room: Dictionary = {}
static var _detection_attempted := false

static func has_sheet() -> bool:
	return ResourceLoader.exists(SHEET_PATH)

static func texture_for_room(room_id: String) -> Texture2D:
	if not has_sheet():
		return null
	if _atlas_cache.has(room_id):
		return _atlas_cache[room_id]
	var auto_region = _region_for_room(room_id)
	if auto_region.size != Vector2.ZERO:
		var auto_tex = _atlas_texture_for_rect(auto_region)
		if auto_tex != null:
			_atlas_cache[room_id] = auto_tex
			return auto_tex
	if not ROOM_TO_CELL.has(room_id):
		return null
	var sheet = load(SHEET_PATH)
	if sheet == null or not (sheet is Texture2D):
		return null
	var base_tex: Texture2D = sheet
	var cell: Vector2i = ROOM_TO_CELL[room_id]
	var cell_w = int(base_tex.get_width() / GRID_COLUMNS)
	var cell_h = int(base_tex.get_height() / GRID_ROWS)
	if cell_w <= 0 or cell_h <= 0:
		return null
	var grid_tex = _atlas_texture_for_rect(Rect2(cell.x * cell_w, cell.y * cell_h, cell_w, cell_h))
	if grid_tex != null:
		_atlas_cache[room_id] = grid_tex
	return grid_tex

static func get_debug_regions() -> Array:
	if not _detection_attempted:
		_detect_regions()
	var out: Array = []
	for i in range(ROOM_RENDER_ORDER.size()):
		var room_id = ROOM_RENDER_ORDER[i]
		if not _auto_rects_by_room.has(room_id):
			continue
		out.append({
			"index": i,
			"room_id": room_id,
			"rect": _auto_rects_by_room[room_id]
		})
	return out

static func _region_for_room(room_id: String) -> Rect2:
	if not _detection_attempted:
		_detect_regions()
	if _auto_rects_by_room.has(room_id):
		return _auto_rects_by_room[room_id]
	return Rect2()

static func _detect_regions() -> void:
	_detection_attempted = true
	_auto_rects_by_room = {}
	var tex = load(SHEET_PATH)
	if tex == null or not (tex is Texture2D):
		return
	var base_tex: Texture2D = tex
	var image := base_tex.get_image()
	if image == null:
		return
	if image.is_compressed():
		image.decompress()
	var width := image.get_width()
	var height := image.get_height()
	if width <= 0 or height <= 0:
		return
	var visited := PackedByteArray()
	visited.resize(width * height)
	var components: Array = []
	for y in range(height):
		for x in range(width):
			var idx := y * width + x
			if visited[idx] == 1:
				continue
			visited[idx] = 1
			if not _is_module_pixel(image.get_pixel(x, y)):
				continue
			var stack: Array[Vector2i] = [Vector2i(x, y)]
			var min_x := x
			var min_y := y
			var max_x := x
			var max_y := y
			var area := 0
			while not stack.is_empty():
				var p: Vector2i = stack.pop_back()
				area += 1
				min_x = mini(min_x, p.x)
				min_y = mini(min_y, p.y)
				max_x = maxi(max_x, p.x)
				max_y = maxi(max_y, p.y)
				for n in _neighbors4(p):
					if n.x < 0 or n.y < 0 or n.x >= width or n.y >= height:
						continue
					var n_idx := n.y * width + n.x
					if visited[n_idx] == 1:
						continue
					visited[n_idx] = 1
					if _is_module_pixel(image.get_pixel(n.x, n.y)):
						stack.append(n)
			if area >= MIN_COMPONENT_AREA:
				components.append({
					"rect": Rect2(min_x, min_y, (max_x - min_x) + 1, (max_y - min_y) + 1),
					"area": area
				})
	if components.is_empty():
		return
	components.sort_custom(func(a, b): return int(a["area"]) > int(b["area"]))
	var major: Array = []
	for comp in components:
		major.append(comp["rect"])
	if major.size() > ROOM_RENDER_ORDER.size():
		major = major.slice(0, ROOM_RENDER_ORDER.size())
	var sorted_rects = _sort_rects_reading_order(major)
	var assign_count = mini(sorted_rects.size(), ROOM_RENDER_ORDER.size())
	for i in range(assign_count):
		_auto_rects_by_room[ROOM_RENDER_ORDER[i]] = sorted_rects[i]

static func _sort_rects_reading_order(rects: Array) -> Array:
	var rows: Array = []
	for rect in rects:
		var placed := false
		var center_y = rect.position.y + rect.size.y * 0.5
		for row in rows:
			if absf(center_y - row["center_y"]) <= GROUP_Y_TOLERANCE:
				row["rects"].append(rect)
				row["center_y"] = (row["center_y"] + center_y) * 0.5
				placed = true
				break
		if not placed:
			rows.append({"center_y": center_y, "rects": [rect]})
	rows.sort_custom(func(a, b): return float(a["center_y"]) < float(b["center_y"]))
	var out: Array = []
	for row in rows:
		var row_rects: Array = row["rects"]
		row_rects.sort_custom(func(a, b): return float(a.position.x) < float(b.position.x))
		out.append_array(row_rects)
	return out

static func _atlas_texture_for_rect(rect: Rect2) -> Texture2D:
	var tex = load(SHEET_PATH)
	if tex == null or not (tex is Texture2D):
		return null
	var base_tex: Texture2D = tex
	var atlas := AtlasTexture.new()
	atlas.atlas = base_tex
	atlas.region = rect
	return atlas

static func _neighbors4(p: Vector2i) -> Array[Vector2i]:
	return [
		Vector2i(p.x - 1, p.y),
		Vector2i(p.x + 1, p.y),
		Vector2i(p.x, p.y - 1),
		Vector2i(p.x, p.y + 1)
	]

static func _is_module_pixel(c: Color) -> bool:
	var luminance := (c.r * 0.2126) + (c.g * 0.7152) + (c.b * 0.0722)
	if c.a < 0.1:
		return false
	# Room frames and interiors are much brighter than near-black starfield background.
	return luminance > 0.13
