# EarthBaseUtils.gd
# Utility functions for positioning and ground level management
class_name EarthBaseUtils

# Constants for ground levels (copied to avoid dependency issues)
const GROUND_LEVEL: float = 800.0
const SOIL_TOP: float = 750.0
const SOIL_BOTTOM: float = 950.0

# Helper functions for positioning objects
static func snap_to_ground(object: Node2D, offset_y: float = 0.0) -> void:
	"""Snap an object to ground level with optional offset"""
	object.position.y = GROUND_LEVEL + offset_y

static func snap_to_soil_surface(object: Node2D, offset_y: float = 0.0) -> void:
	"""Snap an object to the top of the soil layer"""
	object.position.y = SOIL_TOP + offset_y

static func snap_to_soil_bottom(object: Node2D, offset_y: float = 0.0) -> void:
	"""Snap an object to the bottom of the soil layer (underground)"""
	object.position.y = SOIL_BOTTOM + offset_y

static func get_ground_level() -> float:
	"""Get the main ground level Y coordinate"""
	return GROUND_LEVEL

static func get_soil_bounds() -> Vector2:
	"""Get soil layer bounds as Vector2(top, bottom)"""
	return Vector2(SOIL_TOP, SOIL_BOTTOM)

static func is_in_soil_layer(y_position: float) -> bool:
	"""Check if a Y position is within the soil layer"""
	return y_position >= SOIL_TOP and y_position <= SOIL_BOTTOM