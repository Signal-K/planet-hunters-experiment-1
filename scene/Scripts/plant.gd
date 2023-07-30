extends StaticBody2D

var coord: Vector2i

@export var res: PlantResource

func _ready() -> void:
	$CollisionArea.body_entered.connect(_on_collision_area_body_entered)

func setup(grid_coord: Vector2i, _parent: Node2D, new_res: PlantResource):
	position = grid_coord * Data.TILE_SIZE + Vector2i(8, 5)
	coord = grid_coord
	res = new_res
	$FlashSprite2d.texture = res.texture
	$FlashSprite2d.hframes = res.h_frames
	
func grow(watered: bool):
	if watered and res:
		res.grow($FlashSprite2d)
	elif res:
		res.decay(self)

func _on_collision_area_body_entered(_body: Node2D) -> void:
	if res.get_complete():
		$FlashSprite2d.flash(0.2, 0.4, queue_free)
