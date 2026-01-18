# DebugVisualizer.gd
# Creates debug visual guides for development
class_name DebugVisualizer
extends Node

# Constants for ground levels (copied to avoid dependency issues)
const GROUND_LEVEL: float = 800.0
const SOIL_TOP: float = 750.0
const SOIL_BOTTOM: float = 950.0

static func create_ground_guides(parent_node: Node2D) -> void:
	"""Create visual guide lines for development"""
	var line_color = Color.RED
	var line_width = 2.0
	
	# Create guide lines
	var ground_line = Line2D.new()
	ground_line.add_point(Vector2(0, GROUND_LEVEL))
	ground_line.add_point(Vector2(1920, GROUND_LEVEL))
	ground_line.default_color = line_color
	ground_line.width = line_width
	ground_line.z_index = 100
	parent_node.add_child(ground_line)
	
	var soil_top_line = Line2D.new()
	soil_top_line.add_point(Vector2(0, SOIL_TOP))
	soil_top_line.add_point(Vector2(1920, SOIL_TOP))
	soil_top_line.default_color = Color.GREEN
	soil_top_line.width = line_width
	soil_top_line.z_index = 100
	parent_node.add_child(soil_top_line)
	
	var soil_bottom_line = Line2D.new()
	soil_bottom_line.add_point(Vector2(0, SOIL_BOTTOM))
	soil_bottom_line.add_point(Vector2(1920, SOIL_BOTTOM))
	soil_bottom_line.default_color = Color.BLUE
	soil_bottom_line.width = line_width
	soil_bottom_line.z_index = 100
	parent_node.add_child(soil_bottom_line)