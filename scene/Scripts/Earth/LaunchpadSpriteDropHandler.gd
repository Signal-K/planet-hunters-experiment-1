extends Sprite2D

func _can_drop_data(_pos, data):
	return data.has("rocket_id")

func _drop_data(pos, data):
	if data.has("rocket_id"):
		var rocket = Node2D.new()
		rocket.position = to_local(pos)
		rocket.name = data["rocket_id"]
		get_parent().add_child(rocket)
		rocket.add_to_group("rocket")
		print("Rocket dropped and instantiated at ", rocket.position)
