extends VBoxContainer

@export var seedExtractorScene: PackedScene
@export var flowerResource: FlowerResource
@export var seedResource: SeedResource

func _ready():
	assert(flowerResource.get_size() == seedResource.get_size())
	add_conversion_containers()
	
func add_conversion_containers():
	for child in flowerResource.get_flower_list():
		var seed = seedResource.get_seed_data(child)
		if seed == null:
			return
			
		instance_conversion_scene(child, seed)
		
func instance_conversion_scene(value1, value2) -> void:
	var scene = seedExtractorScene.instantiate()
	add_child(scene)
	scene.initialize(value1, value2)
	
func update_plant_seed_quantity() -> void:
	for child in get_children():
		child.update_slot()
