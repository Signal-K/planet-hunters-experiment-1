extends Resource

class_name FlowerResource

@export var flowerList: Array[PlantData]

func get_size() -> int:
	return flowerList.size()
	
func get_flower_list() -> Array[PlantData]:
	return flowerList
