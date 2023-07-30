extends HBoxContainer

var plantItem: PlantData
var seedItem: SeedData

func initialize(plant: PlantData, seedData: SeedData) -> void:
	plantItem = plant
	seedItem = seedData
	update_item_containers()
	
func update_slot() -> void:
	$PlantInfo1.set_label(plantItem.quantity)
	$PlantInfo2.set_label(plantItem.quantity)

func update_item_containers() -> void:
	update_ui($PlantInfo1, plantItem.texture, plantItem.quantity)
	update_ui($PlantInfo2, seedItem.get_texture(), seedItem.get_quantity())
	
func update_ui(node: Node, item_texture, item_quantity) -> void:
	node.set_item_info(item_texture, item_quantity)


func _on_texture_button_button_down():
	if plantItem != null and seedItem != null:
		if plantItem.quantity > 0:
			seedItem.add_quantity(plantItem.quantity)
			plantItem.quantity = 0
			update_item_containers()
		else:
			$PlantInfo1.play_flash_animation()
