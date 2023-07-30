extends Node2D

# backing storage for the property to avoid recursive setter calls
var _in_house: bool = false

var in_house: bool:
	set(value):
		_in_house = value
		if door_cell_coord.x >= 0:
			$WallsLayer.set_cell(door_cell_coord, 0, Vector2i.ONE if value else Vector2i(0, 4))

		# Always tween the roof alpha so it fades when entering/exiting, even
		# if the door_cell_coord wasn't detected earlier.
		var tween = create_tween()
		# use `value` (the new state) rather than the property to avoid any
		# potential recursion or timing issues.
		tween.tween_property($RoofLayer, "modulate:a", 0.0 if value else 1.0, 0.5)

var door_cell_coord: Vector2i = Vector2i(-1, -1)

func _ready() -> void:
	for cell in $WallsLayer.get_used_cells():
		$FloorLayer.set_cell(cell, 0, Vector2i.ZERO)
	
	for cell in $WallsLayer.get_used_cells():
		var atlas = $WallsLayer.get_cell_atlas_coords(cell)
		# debug
		#print("cell:", cell, " atlas:", atlas)
		if atlas == Vector2i(0, 4):
			door_cell_coord = cell

	# Ensure the Area2D will detect bodies: if collision_layer is 0, set a sensible default
	if has_node("HouseArea"):
		var area = $HouseArea
		if area.collision_layer == 0:
			area.collision_layer = 1
			print("House: HouseArea.collision_layer was 0, set to 1")
		# connect signals if not already connected
		var enter_cb = Callable(self, "_on_house_area_body_entered")
		var exit_cb = Callable(self, "_on_house_area_body_exited")
		if not area.body_entered.is_connected(enter_cb):
			area.body_entered.connect(enter_cb)
		if not area.body_exited.is_connected(exit_cb):
			area.body_exited.connect(exit_cb)

		# Ensure the roof starts fully opaque
		if has_node("RoofLayer"):
			$RoofLayer.modulate = Color(1, 1, 1, 1)

func _on_house_area_body_entered(body: Node2D) -> void:
	in_house =  true
	
func _on_house_area_body_exited(body: Node2D) -> void:
	in_house = false
