extends Resource

class_name SeedResource

@export var seedList: Array[SeedData]

func get_seed_data(value) -> SeedData:
	for child in seedList:
		var child_name = child.get_seed_name()
		var value_name = value.get_plant_name() if value is PlantData else value
		if child_name == value_name:
			return child
	return null
	
func get_size() -> int:
	return seedList.size()
	
func get_seed_list() -> Array[SeedData]:
	return seedList
