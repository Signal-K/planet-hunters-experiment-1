extends RefCounted
class_name MiningTargetTheme

# Functionset for target-aware mining visuals.
# Future extension points:
# - orbital_period_days
# - parent_star_class
# - parent_star_temp_k
# - atmosphere/composition tags

static func resolve_theme(session_context: Dictionary, is_planet: bool) -> String:
	var target_type = str(session_context.get("target_type", "")).to_lower()
	if target_type == "":
		target_type = str(session_context.get("mode", "")).to_lower()
	if is_planet or target_type in ["planet", "tess", "world"]:
		return "planet"
	if target_type in ["asteroid", "mission", "practice"]:
		return "asteroid"
	if target_type != "":
		return "other"
	return "asteroid"

static func build_palette(theme_name: String, target_id: String, session_context: Dictionary = {}) -> Dictionary:
	var base := _base_palette(theme_name).duplicate(true)
	var orbital_days := float(session_context.get("orbital_period_days", 0.0))
	var star_class := str(session_context.get("parent_star_class", "")).to_upper()
	var star_temp_k := float(session_context.get("parent_star_temp_k", 0.0))
	var variation_seed := "%s|%s|%s|%s|%s" % [theme_name, target_id, str(orbital_days), star_class, str(star_temp_k)]
	var v := _hash01(variation_seed)
	var v_alt := _hash01("%s|alt" % variation_seed)
	var sat_shift := lerpf(-0.03, 0.03, v)
	var val_shift := lerpf(-0.07, 0.07, v_alt)
	var star_bias := clampf((star_temp_k - 5200.0) / 4200.0, -1.0, 1.0)
	var warm_shift := lerpf(-0.04, 0.04, (star_bias + 1.0) * 0.5)
	base["terrain_a"] = _shift_color(base["terrain_a"], sat_shift, val_shift + warm_shift * 0.3)
	base["terrain_b"] = _shift_color(base["terrain_b"], sat_shift, val_shift)
	base["terrain_shade"] = _shift_color(base["terrain_shade"], sat_shift * 0.8, val_shift - 0.02)
	base["terrain_highlight"] = _shift_color(base["terrain_highlight"], sat_shift * 0.9, val_shift + 0.04)
	base["terrain_line"] = _shift_color(base["terrain_line"], sat_shift * 0.6, val_shift + 0.03)
	base["bg_tint"] = _shift_color(base["bg_tint"], sat_shift * 0.7, warm_shift * 0.4)
	base["palette_key"] = "%s:%d" % [theme_name, int(round(v * 1000.0))]
	return base

static func _base_palette(theme_name: String) -> Dictionary:
	match theme_name:
		"planet":
			return {
				"terrain_a": Color8(116, 154, 185, 255),
				"terrain_b": Color8(140, 178, 206, 255),
				"terrain_shade": Color8(86, 120, 147, 255),
				"terrain_highlight": Color8(182, 214, 235, 255),
				"terrain_line": Color(0.84, 0.95, 1.0, 0.95),
				"base_bg": Color(0.03, 0.09, 0.19, 1.0),
				"bg_tint": Color(0.50, 0.72, 1.0, 1.0),
				"bg_tint_strength": 0.18
			}
		"other":
			return {
				"terrain_a": Color8(127, 118, 150, 255),
				"terrain_b": Color8(146, 138, 170, 255),
				"terrain_shade": Color8(95, 90, 124, 255),
				"terrain_highlight": Color8(188, 178, 214, 255),
				"terrain_line": Color(0.83, 0.79, 0.95, 0.95),
				"base_bg": Color(0.07, 0.05, 0.12, 1.0),
				"bg_tint": Color(0.72, 0.64, 0.88, 1.0),
				"bg_tint_strength": 0.12
			}
		_:
			return {
				"terrain_a": Color8(163, 96, 66, 255),
				"terrain_b": Color8(182, 114, 76, 255),
				"terrain_shade": Color8(131, 77, 56, 255),
				"terrain_highlight": Color8(222, 151, 90, 255),
				"terrain_line": Color(0.95, 0.74, 0.48, 0.95),
				"base_bg": Color(0.06, 0.04, 0.08, 1.0),
				"bg_tint": Color(1.0, 0.78, 0.62, 1.0),
				"bg_tint_strength": 0.06
			}

static func _hash01(value: String) -> float:
	var h: int = absi(value.hash())
	return fmod(float(h), 10000.0) / 10000.0

static func _shift_color(color: Color, sat_delta: float, val_delta: float) -> Color:
	var h := color.h
	var s := clampf(color.s + sat_delta, 0.0, 1.0)
	var v := clampf(color.v + val_delta, 0.0, 1.0)
	return Color.from_hsv(h, s, v, color.a)
