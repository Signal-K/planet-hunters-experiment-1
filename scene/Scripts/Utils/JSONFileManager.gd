## Utility class for handling JSON file operations
class_name JSONFileManager
extends RefCounted

## Load data from a JSON file
static func load_json(file_path: String) -> Dictionary:
	var result = {}
	
	if not FileAccess.file_exists(file_path):
		print("JSONFileManager: File does not exist: ", file_path)
		return result
	
	var file = FileAccess.open(file_path, FileAccess.READ)
	if not file:
		print("JSONFileManager: Failed to open file: ", file_path)
		return result
	
	var contents = file.get_as_text()
	file.close()
	
	var parsed_data = JSON.parse_string(contents)
	if typeof(parsed_data) == TYPE_DICTIONARY:
		result = parsed_data
	else:
		print("JSONFileManager: Invalid JSON data in file: ", file_path)
	
	return result

## Save data to a JSON file
static func save_json(file_path: String, data: Dictionary) -> bool:
	var json_string = JSON.stringify(data)
	
	var file = FileAccess.open(file_path, FileAccess.WRITE)
	if not file:
		print("JSONFileManager: Failed to open file for writing: ", file_path)
		return false
	
	file.store_string(json_string)
	file.close()
	print("JSONFileManager: Successfully saved data to: ", file_path)
	return true