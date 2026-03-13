extends Node
## Static utility for generating mining terrain and minerals

const TERRAIN_SEGMENT_WIDTH = 20

static func generate_terrain(
	terrain_width: float,
	current_target_id: String,
	screen_height: float,
	generation_signature: Dictionary,
	rocket_level: int,
	terrain_container: Node2D,
	target_theme: String,
	theme_palette_func: Callable,
	target_palette_key: String,
	terrain_pixel_textures: Dictionary,
	build_terrain_pixel_texture_func: Callable,
	target_minerals: Dictionary,
	target_mineable_pct: float,
	guide_active: bool
) -> Dictionary:
	var rng = RandomNumberGenerator.new()
	if current_target_id != "":
		rng.seed = current_target_id.hash()
	else:
		rng.randomize()
	
	var segments = int(terrain_width / TERRAIN_SEGMENT_WIDTH)
	var terrain_points: PackedVector2Array = []
	
	var base_height = screen_height - 250
	var terrain_sig = generation_signature.get("terrain", {})
	if typeof(terrain_sig) != TYPE_DICTIONARY:
		terrain_sig = {}
	base_height += float((terrain_sig as Dictionary).get("height_bias", 0.0))
	var prev_height = base_height
	
	var roughness = float((terrain_sig as Dictionary).get("roughness", 1.0))
	var difficulty_multiplier = (1.0 + (rocket_level * 0.15)) * roughness
	var peak_boost = float((terrain_sig as Dictionary).get("peak_chance_boost", 0.0))
	var valley_boost = float((terrain_sig as Dictionary).get("valley_chance_boost", 0.0))
	
	for i in range(segments + 1):
		var x = i * TERRAIN_SEGMENT_WIDTH
		var height_change = rng.randf_range(-25, 25) * difficulty_multiplier
		var peak_chance = max(0.02, 0.08 + (rocket_level * 0.01) + peak_boost)
		if rng.randf() < peak_chance:
			height_change = rng.randf_range(-100, -60) * difficulty_multiplier
		elif rng.randf() < max(0.01, 0.05 + rocket_level * 0.005 + valley_boost):
			height_change = rng.randf_range(40, 80) * difficulty_multiplier
		
		prev_height = clamp(prev_height + height_change, screen_height - 380, screen_height - 120)
		prev_height = floor(prev_height / 6.0) * 6.0
		terrain_points.append(Vector2(x, prev_height))
	
	var terrain_line = terrain_container.get_node("TerrainLine") as Line2D
	terrain_line.points = terrain_points
	var palette = theme_palette_func.call(target_theme)
	terrain_line.default_color = palette.get("terrain_line", Color(0.95, 0.74, 0.48, 0.95))
	
	var terrain_fill = terrain_container.get_node("TerrainFill") as Polygon2D
	var fill_points = PackedVector2Array()
	fill_points.append_array(terrain_points)
	fill_points.append(Vector2(terrain_width, screen_height))
	fill_points.append(Vector2(0, screen_height))
	terrain_fill.polygon = fill_points
	
	# Apply pixel style
	if not terrain_pixel_textures.has(target_palette_key):
		terrain_pixel_textures[target_palette_key] = build_terrain_pixel_texture_func.call(target_theme)
	terrain_fill.texture = terrain_pixel_textures.get(target_palette_key)
	var uv := PackedVector2Array()
	for p in fill_points:
		uv.append(Vector2(p.x / 28.0, p.y / 20.0))
	terrain_fill.uv = uv
	
	_add_surface_rocks(rng, terrain_container, terrain_width, terrain_points, generation_signature)
	
	var mineral_data = _generate_minerals(
		rng, 
		terrain_container, 
		terrain_width, 
		terrain_points, 
		target_minerals, 
		target_mineable_pct, 
		guide_active, 
		screen_height
	)
	
	return {
		"points": terrain_points,
		"mineral_regions": mineral_data.regions,
		"total_deposit_count": mineral_data.total,
		"surface_deposit_count": mineral_data.surface,
		"subsurface_deposit_count": mineral_data.subsurface
	}

static func _get_terrain_y_at(x: float, terrain_points: PackedVector2Array) -> float:
	var segment = int(x / TERRAIN_SEGMENT_WIDTH)
	if segment >= terrain_points.size() - 1:
		return terrain_points[-1].y
	
	var t = fmod(x, TERRAIN_SEGMENT_WIDTH) / TERRAIN_SEGMENT_WIDTH
	var y1 = terrain_points[segment].y
	var y2 = terrain_points[segment + 1].y
	return lerp(y1, y2, t)

static func _add_surface_rocks(rng: RandomNumberGenerator, terrain_container: Node2D, terrain_width: float, terrain_points: PackedVector2Array, generation_signature: Dictionary):
	var rock_pool = terrain_container.get_node_or_null("RockPool")
	if not rock_pool: return
	
	var rocks = rock_pool.get_children()
	var rock_count = min(50, rocks.size())
	var terrain_sig = generation_signature.get("terrain", {})
	if typeof(terrain_sig) != TYPE_DICTIONARY: terrain_sig = {}
	var sig = terrain_sig as Dictionary
	var cluster_count = clampi(int(sig.get("landmark_cluster_count", 3)), 1, 8)
	var cluster_bias = clampf(float(sig.get("landmark_cluster_bias", 0.5)), 0.0, 1.0)
	var cluster_centers: Array = []
	for _i in range(cluster_count):
		cluster_centers.append(rng.randf_range(160, terrain_width - 160))
	
	for i in range(rock_count):
		var rock = rocks[i]
		if not rock is Polygon2D: continue
		var center = float(cluster_centers[i % cluster_centers.size()])
		var spread = lerpf(220.0, 70.0, cluster_bias)
		var clustered_x = center + rng.randf_range(-spread, spread)
		var x = clampf(lerpf(rng.randf_range(100, terrain_width - 100), clustered_x, cluster_bias), 100.0, terrain_width - 100.0)
		var y = _get_terrain_y_at(x, terrain_points)
		var size = rng.randf_range(10, 25)
		
		var points = PackedVector2Array()
		var num_points = rng.randi_range(4, 6)
		for j in range(num_points):
			var angle = (float(j) / num_points) * TAU + rng.randf_range(-0.3, 0.3)
			var radius = size * rng.randf_range(0.6, 1.2)
			points.append(Vector2(x + cos(angle) * radius, y - abs(sin(angle) * radius) - size * 0.3))
		rock.polygon = points
		rock.visible = true

static func _generate_minerals(
	rng: RandomNumberGenerator, 
	terrain_container: Node2D, 
	terrain_width: float, 
	terrain_points: PackedVector2Array, 
	target_minerals: Dictionary, 
	target_mineable_pct: float, 
	guide_active: bool, 
	screen_height: float
) -> Dictionary:
	var mineral_types = []
	if not target_minerals.is_empty():
		for mineral_name in target_minerals.keys():
			var amount = target_minerals[mineral_name]
			if amount > 0:
				mineral_types.append({
					"name": mineral_name,
					"color": _get_mineral_color(mineral_name),
					"value": amount
				})
	
	if mineral_types.is_empty():
		mineral_types = [
			{"name": "Iron", "color": Color(0.9, 0.4, 0.2), "value": 10},
			{"name": "Nickel", "color": Color(0.7, 0.7, 0.5), "value": 15},
			{"name": "Cobalt", "color": Color(0.3, 0.5, 1.0), "value": 25},
			{"name": "Platinum", "color": Color(1.0, 1.0, 0.8), "value": 50}
		]
	
	var mineral_pool = terrain_container.get_node_or_null("MineralPool")
	if mineral_pool:
		for mineral in mineral_pool.get_children():
			if mineral is Polygon2D:
				mineral.visible = false
	
	var regions = []
	var pool_index = 0
	var total = 0
	var surface = 0
	var subsurface = 0
	
	if guide_active:
		var iron = _create_deposit(600, 100, mineral_types[0], true, screen_height, terrain_points, mineral_pool, pool_index)
		if iron:
			regions.append(iron); pool_index += 1; total += 1; surface += 1
		if mineral_types.size() > 1:
			var nickel = _create_deposit(1000, 100, mineral_types[1], true, screen_height, terrain_points, mineral_pool, pool_index)
			if nickel:
				regions.append(nickel); pool_index += 1; total += 1; surface += 1
		if mineral_types.size() > 2:
			var cobalt = _create_deposit(1400, 100, mineral_types[2], false, screen_height, terrain_points, mineral_pool, pool_index)
			if cobalt:
				regions.append(cobalt); pool_index += 1; total += 1; subsurface += 1
	
	var deposit_count = int(30 + (target_mineable_pct * 20))
	var start_x = 1800 if guide_active else 300
	for i in range(deposit_count):
		var x = rng.randf_range(start_x, terrain_width - 200)
		var width = rng.randf_range(60, 120)
		var mineral = mineral_types[rng.randi() % mineral_types.size()]
		var is_surface = rng.randf() < target_mineable_pct
		var dep = _create_deposit(x, width, mineral, is_surface, screen_height, terrain_points, mineral_pool, pool_index)
		if dep:
			regions.append(dep); pool_index += 1; total += 1
			if is_surface: surface += 1
			else: subsurface += 1
			if pool_index >= mineral_pool.get_child_count(): break
			
	return {"regions": regions, "total": total, "surface": surface, "subsurface": subsurface}

static func _create_deposit(x: float, width: float, mineral: Dictionary, is_surface: bool, screen_height: float, terrain_points: PackedVector2Array, mineral_pool: Node, pool_index: int):
	if not mineral_pool or pool_index >= mineral_pool.get_child_count(): return null
	var poly = mineral_pool.get_child(pool_index) as Polygon2D
	if not poly: return null
	
	var y_at_x = _get_terrain_y_at(x, terrain_points)
	var depth = 0 if is_surface else randf_range(40, 120)
	poly.polygon = PackedVector2Array([
		Vector2(x, y_at_x + depth - 10),
		Vector2(x + width, _get_terrain_y_at(x + width, terrain_points) + depth - 10),
		Vector2(x + width, screen_height),
		Vector2(x, screen_height)
	])
	poly.color = mineral.color
	if not is_surface: poly.modulate = Color(0.7, 0.7, 0.7, 0.8)
	poly.visible = true
	
	return {"x": x, "width": width, "mineral": mineral, "poly": poly, "pool_index": pool_index, "collected": false, "is_surface": is_surface}

static func _get_mineral_color(mineral_name: String) -> Color:
	match mineral_name.to_lower():
		"iron": return Color(0.9, 0.4, 0.2)
		"nickel": return Color(0.7, 0.7, 0.5)
		"cobalt": return Color(0.3, 0.5, 1.0)
		"platinum": return Color(1.0, 1.0, 0.8)
		"gold": return Color(1.0, 0.84, 0.0)
		"silver": return Color(0.75, 0.75, 0.75)
		"copper": return Color(0.72, 0.45, 0.2)
		"titanium": return Color(0.5, 0.5, 0.6)
		_: return Color(0.6, 0.6, 0.6)
