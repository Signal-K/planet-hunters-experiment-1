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

	if typeof(contents) != TYPE_STRING or contents.strip_edges() == "":
		# Empty file — treat as empty state rather than failing JSON parse
		print("JSONFileManager: Empty JSON file, returning empty object: ", file_path)
		return result
	
	var parsed = JSON.parse_string(contents)

	# JSON.parse_string returns a parse-result dictionary in Godot 4.
	if typeof(parsed) == TYPE_DICTIONARY:
		var err = parsed.get("error", 0)
		if err != 0:
			var err_line = parsed.get("error_line", 0)
			var err_str = parsed.get("error_string", "Unknown parse error")
			print("JSONFileManager: Parse JSON failed for %s. Error at line %d: %s" % [file_path, err_line, err_str])
			return result
		# Prefer the 'result' field when present (newer API)
		if parsed.has("result"):
			result = parsed.get("result", {})
		else:
			# If parser returned a raw dictionary, use it
			result = parsed
	else:
		# Unexpected parse return type
		print("JSONFileManager: Unexpected JSON.parse_string() return type for file: ", file_path)
		var backup_result = _load_backup_json(file_path)
		if not backup_result.is_empty():
			return backup_result
		return result
	
	return result

static func _load_backup_json(file_path: String) -> Dictionary:
	var backup_path = _backup_path(file_path)
	if not FileAccess.file_exists(backup_path):
		return {}
	print("JSONFileManager: Falling back to backup JSON file: ", backup_path)
	var backup = load_json(backup_path)
	if not backup.is_empty():
		_write_text_file(file_path, _read_text_file(backup_path))
	return backup

static func _backup_path(file_path: String) -> String:
	return "%s.bak" % file_path

static func _temp_path(file_path: String) -> String:
	return "%s.tmp" % file_path

static func _write_text_file(file_path: String, contents: String) -> bool:
	var file = FileAccess.open(file_path, FileAccess.WRITE)
	if not file:
		print("JSONFileManager: Failed to open file for writing: ", file_path)
		return false
	file.store_string(contents)
	file.close()
	return true

static func _read_text_file(file_path: String) -> String:
	if not FileAccess.file_exists(file_path):
		return ""
	var file = FileAccess.open(file_path, FileAccess.READ)
	if not file:
		return ""
	var text = file.get_as_text()
	file.close()
	return text

# Helper functions for pretty-printing JSON
static func _escape_string(s: String) -> String:
	var out = s.replace("\\", "\\\\")
	out = out.replace("\"", "\\\"")
	out = out.replace("\n", "\\n")
	out = out.replace("\r", "\\r")
	out = out.replace("\t", "\\t")
	return out

static func _indent(level: int) -> String:
	var res = ""
	for i in range(level):
		res += "  "
	return res

static func _to_pretty(value, level: int = 0) -> String:
	var t = typeof(value)
	if t == TYPE_DICTIONARY:
		var s = "{\n"
		var keys = value.keys()
		for k in keys:
			var v = value.get(k)
			s += _indent(level + 1) + '"' + str(k) + '": ' + _to_pretty(v, level + 1) + ",\n"
		if s.ends_with(",\n"):
			s = s.substr(0, s.length() - 2) + "\n"
		s += _indent(level) + "}"
		return s
	elif t == TYPE_ARRAY:
		var s = "[\n"
		for i in range(value.size()):
			s += _indent(level + 1) + _to_pretty(value[i], level + 1) + ",\n"
		if s.ends_with(",\n"):
			s = s.substr(0, s.length() - 2) + "\n"
		s += _indent(level) + "]"
		return s
	elif t == TYPE_STRING:
		return '"' + _escape_string(str(value)) + '"'
	elif t == TYPE_FLOAT or t == TYPE_INT:
		return str(value)
	elif t == TYPE_BOOL:
		return "true" if value else "false"
	else:
		return "null"

## Save data to a JSON file
static func save_json(file_path: String, data: Dictionary) -> bool:
	# Pretty-print JSON with indentation and line breaks for readability
	var json_string = _to_pretty(data, 0) + "\n"
	var backup_path = _backup_path(file_path)
	var prior_contents = _read_text_file(file_path)
	if prior_contents != "":
		_write_text_file(backup_path, prior_contents)
	if not _write_text_file(file_path, json_string):
		if prior_contents != "":
			_write_text_file(file_path, prior_contents)
		print("JSONFileManager: Failed to save JSON file directly: ", file_path)
		return false
	print("JSONFileManager: Successfully saved data to: ", file_path)
	return true
