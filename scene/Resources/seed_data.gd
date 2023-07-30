extends Resource

class_name SeedData

signal quantity_changed(new_quantity)

@export var plantDataResource: PlantData
@export var plantScene: PackedScene

func seed_left() -> bool:
	return plantDataResource.quantity > 0
	
func add_quantity(value: int) -> void:
	if value > 0: plantDataResource.quantity += value
	
func subtract_quantity() -> void:
	if seed_left(): plantDataResource.quantity -= 1
	quantity_changed.emit(plantDataResource.quantity)
	
func get_texture() -> Texture:
	return plantDataResource.texture
	
func get_quantity() -> int:
	return plantDataResource.quantity
	
func get_seed_name() -> String:
	return plantDataResource.get_plant_name()
