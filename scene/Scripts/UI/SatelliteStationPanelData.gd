extends RefCounted
class_name SatelliteStationPanelData

## Helpers for normalizing anomaly IDs and migrating old annotation files
func normalize_anomaly_id(anomaly: Dictionary, fallback_index: int) -> String:
	# Prefer numeric DB 'id' when available
	var raw_id = anomaly.get("id", "")
	if raw_id != null and str(raw_id) != "":
		# Convert to int first to avoid .0 in string (e.g. 63769326.0 -> 63769326)
		var id_int = int(raw_id)
		return str(id_int)

	# Fallback to 'content' and strip 'TIC ' prefix and non-digits
	var s = str(anomaly.get("content", ""))
	if s.begins_with("TIC "):
		s = s.substr(4)
	var digits := ""
	for ch in s:
		if ch >= "0" and ch <= "9":
			digits += ch
	if digits != "":
		return digits

	# Final fallback: use provided index or id field
	if anomaly.has("id"):
		return str(anomaly.get("id"))
	return str(fallback_index)

func migrate_annotations_on_disk() -> void:
	# Rename annotation files in user://annotations to numeric-only keys when possible.
	var dir = DirAccess.open("user://annotations")
	if dir == null:
		return

	# Collect file list first (DirAccess iteration stateful)
	var files := []
	var fname = dir.get_next()
	while fname != "":
		files.append(fname)
		fname = dir.get_next()

	for f in files:
		var base = f
		var ext = ""
		if base.ends_with("-annotated.png"):
			ext = "-annotated.png"
			base = base.substr(0, base.length() - ext.length())
		elif base.ends_with(".json"):
			ext = ".json"
			base = base.substr(0, base.length() - ext.length())
		else:
			continue

		# extract digits
		var digits := ""
		for ch in base:
			if ch >= "0" and ch <= "9":
				digits += ch
		if digits == "" or digits == base:
			continue

		var old_path = "%s/%s" % ["user://annotations", f]
		var new_name = "%s%s" % [digits, ext]
		var new_path = "%s/%s" % ["user://annotations", new_name]
		# Avoid overwriting existing normalized files
		if FileAccess.file_exists(new_path):
			print("migrate_annotations_on_disk: target exists, skipping:", new_path)
			continue

		print("migrate_annotations_on_disk: renaming", old_path, "->", new_path)
		var d = DirAccess.open("user://annotations")
		if d != null:
			var rename_err = d.rename(f, new_name)
			if rename_err != OK:
				print("migrate_annotations_on_disk: rename failed for", f, "err=", rename_err)

func load_local_annotations() -> Array:
	"""Scan user://annotations for saved annotated PNGs and return array of anomaly-like dictionaries."""
	var results := []
	var annotations_dir = "user://annotations"
	var dir = DirAccess.open(annotations_dir)
	if dir == null:
		return results

	var fname = dir.get_next()
	while fname != "":
		# We look for files like <id>-annotated.png
		if fname.ends_with("-annotated.png"):
			var idx = fname.rfind("-annotated.png")
			var key = fname
			if idx >= 0:
				key = fname.substr(0, idx)
			var entry := {}
			entry["content"] = key
			entry["local_thumbnail"] = "%s/%s" % [annotations_dir, fname]
			results.append(entry)
		fname = dir.get_next()

	return results
