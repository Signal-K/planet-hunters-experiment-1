extends Resource

class_name PlantData

@export var plantNameResource: PlantName
@export var texture: Texture:
	get:
		return texture
	set(value):
		texture = value
@export var quantity: int:
	get:
		return quantity
	set(value):
		quantity = value
		
func get_plant_name() -> String:
	return plantNameResource.plantName
