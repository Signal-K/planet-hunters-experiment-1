extends RefCounted

static func circular_distance(a: float, b: float, terrain_width: float) -> float:
	var linear = abs(a - b)
	return min(linear, terrain_width - linear)

static func distance_to_region_edges(rocket_x: float, region: Dictionary, terrain_width: float) -> float:
	var region_start = float(region.get("x", 0.0))
	var region_end = region_start + float(region.get("width", 0.0))
	if rocket_x >= region_start and rocket_x <= region_end:
		return 0.0
	return min(
		circular_distance(rocket_x, region_start, terrain_width),
		circular_distance(rocket_x, region_end, terrain_width)
	)

static func find_nearest_region(rocket_x: float, expect_surface: bool, regions: Array, terrain_width: float) -> Dictionary:
	var nearest_region: Dictionary = {}
	var nearest_distance := INF
	for region in regions:
		if not (region is Dictionary):
			continue
		var region_dict := region as Dictionary
		if bool(region_dict.get("collected", false)):
			continue
		if bool(region_dict.get("is_surface", false)) != expect_surface:
			continue
		var distance = distance_to_region_edges(rocket_x, region_dict, terrain_width)
		if distance < nearest_distance:
			nearest_distance = distance
			nearest_region = region_dict
	return nearest_region
