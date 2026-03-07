extends Node
class_name EarthSkyNightFilterEvent

@export var backdrop_paths: Array[NodePath] = []
@export var night_tint: Color = Color(0.04, 0.08, 0.18, 1.0)
@export_range(0.0, 1.0, 0.01) var sky_threshold: float = 0.22
@export_range(0.001, 1.0, 0.001) var sky_softness: float = 0.10
@export_range(0.0, 1.0, 0.01) var sky_vertical_end: float = 0.70
@export_range(0.001, 1.0, 0.001) var sky_vertical_feather: float = 0.15

const SKY_SHADER := preload("res://Shaders/Earth/earth_sky_night_filter.gdshader")

var _materials: Array[ShaderMaterial] = []

func _ready() -> void:
	_apply_materials()

func on_day_night_tick(_cycle_t: float, night_factor: float, _delta: float) -> void:
	for mat in _materials:
		if mat == null:
			continue
		mat.set_shader_parameter("night_factor", night_factor)

func _apply_materials() -> void:
	_materials.clear()
	for sprite in _resolve_backdrops():
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		var material := ShaderMaterial.new()
		material.shader = SKY_SHADER
		material.set_shader_parameter("night_factor", 0.0)
		material.set_shader_parameter("night_tint", night_tint)
		material.set_shader_parameter("sky_threshold", sky_threshold)
		material.set_shader_parameter("sky_softness", sky_softness)
		material.set_shader_parameter("sky_vertical_end", sky_vertical_end)
		material.set_shader_parameter("sky_vertical_feather", sky_vertical_feather)
		sprite.material = material
		_materials.append(material)

func _resolve_backdrops() -> Array[Sprite2D]:
	var out: Array[Sprite2D] = []
	for path in backdrop_paths:
		var node = get_node_or_null(path)
		if node is Sprite2D:
			out.append(node)
	if not out.is_empty():
		return out

	# Fallback for scenes that use common Earth backdrop node names.
	var fallback_names = ["BackgroundSprite", "BackgroundSprite2", "EarthBackdrop"]
	for name in fallback_names:
		var node = get_tree().current_scene.find_child(name, true, false)
		if node is Sprite2D and not out.has(node):
			out.append(node)
	return out
