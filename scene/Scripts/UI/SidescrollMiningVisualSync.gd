extends RefCounted

static func apply_region_visual_state(region: Dictionary, terrain_loop_container: Node2D) -> void:
	var collected := bool(region.get("collected", false))
	var is_surface := bool(region.get("is_surface", false))
	var primary_poly = region.get("poly", null)
	if primary_poly is Polygon2D:
		_set_region_poly_visual(primary_poly, collected, is_surface)
	var loop_poly := _get_loop_region_poly(region, terrain_loop_container)
	_set_region_poly_visual(loop_poly, collected, is_surface)

static func _region_default_modulate(is_surface: bool) -> Color:
	if is_surface:
		return Color(1, 1, 1, 1)
	return Color(0.7, 0.7, 0.7, 0.8)

static func _set_region_poly_visual(poly: Polygon2D, collected: bool, is_surface: bool) -> void:
	if poly == null:
		return
	poly.visible = true
	if collected:
		poly.modulate = Color(0.4, 0.4, 0.4, 0.5)
	else:
		poly.modulate = _region_default_modulate(is_surface)

static func _get_loop_region_poly(region: Dictionary, terrain_loop_container: Node2D) -> Polygon2D:
	if terrain_loop_container == null or not is_instance_valid(terrain_loop_container):
		return null
	var pool_index := int(region.get("pool_index", -1))
	if pool_index < 0:
		return null
	var loop_pool = terrain_loop_container.get_node_or_null("MineralPool")
	if loop_pool == null:
		return null
	var minerals = loop_pool.get_children()
	if pool_index >= minerals.size():
		return null
	var loop_poly = minerals[pool_index]
	if loop_poly is Polygon2D:
		return loop_poly
	return null
