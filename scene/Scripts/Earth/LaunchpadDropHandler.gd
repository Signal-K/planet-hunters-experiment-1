extends Node2D

func _ready():
	set_process_unhandled_input(true)

func _can_drop_data(_pos, data):
	return data.has("rocket_id")

func _drop_data(pos, data):
	if data.has("rocket_id"):
		var rocket = Node2D.new()
		rocket.position = to_local(pos)
		rocket.name = data["rocket_id"]
		add_child(rocket)
		print("Rocket dropped and instantiated at ", rocket.position)
