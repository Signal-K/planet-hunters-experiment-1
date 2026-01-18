extends Node
class_name EarthBaseGround

const GROUND_LEVEL: float = 800.0
const SOIL_TOP: float = 750.0
const SOIL_BOTTOM: float = 950.0
const SKY_LEVEL: float = 400.0
const UI_LEVEL: float = 1000.0

func snap_to_ground(object: Node2D, offset_y: float = 0.0) -> void:
	object.position.y = GROUND_LEVEL + offset_y

func snap_to_soil_surface(object: Node2D, offset_y: float = 0.0) -> void:
	object.position.y = SOIL_TOP + offset_y

func snap_to_soil_bottom(object: Node2D, offset_y: float = 0.0) -> void:
	object.position.y = SOIL_BOTTOM + offset_y

func get_ground_level() -> float:
	return GROUND_LEVEL

func get_soil_bounds() -> Vector2:
	return Vector2(SOIL_TOP, SOIL_BOTTOM)

func is_in_soil_layer(y_position: float) -> bool:
	return y_position >= SOIL_TOP and y_position <= SOIL_BOTTOM

func create_ground_guides(parent_node: Node) -> void:
	if parent_node == null:
		return
	var line_color = Color.RED
	var line_width = 2.0

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
