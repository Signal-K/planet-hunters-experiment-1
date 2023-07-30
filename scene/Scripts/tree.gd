extends StaticBody2D

const apple_texture = preload("res://assets/Growth/graphics/plants/apple.png")

var health := 3:
	set(value):
		health = value
		if health <= 0:
			$FlashSprite2d.hide()
			$Stump.show()
			var shape  = RectangleShape2D.new()
			shape.size = Vector2(12, 6)
			$CollisionShape2D.shape = shape
			$CollisionShape2D.position.y = 8

func _ready() -> void:
	$FlashSprite2d.frame = [0, 1].pick_random()
	create_apples(randi_range(1, 3))

func hit(tool: Enums.Tool):
	if tool == Enums.Tool.AXE:
		$FlashSprite2d.flash()
		get_apple()
		health -= 1

func create_apples(num: int):
	var apple_markers = $AppleSpawnPositions.get_children().duplicate(true)
	for i in num:
		var pos_marker = apple_markers.pop_at(randi_range(0, apple_markers.size() - 1))
		var sprite = Sprite2D.new()
		sprite.texture = apple_texture
		$Apples.add_child(sprite)
		sprite.position = pos_marker.position

func get_apple():
	if $Apples.get_children():
		$Apples.get_children().pick_random().queue_free()
		
func reset():
	if health > 0:
		# Clear old apples first
		for apple in $Apples.get_children():
			apple.queue_free()
		# Create new apples for the new day
	create_apples(randi_range(1, 3))
