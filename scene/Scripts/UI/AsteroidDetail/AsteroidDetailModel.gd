extends RefCounted
class_name AsteroidDetailModel

func normalize_anomaly_id(anomaly: Dictionary, is_planet: bool = false) -> String:
	if is_planet:
		var planet_tic = str(anomaly.get("ticId", ""))
		if planet_tic != "":
			var tic_digits := ""
			for ch in planet_tic:
				if ch >= "0" and ch <= "9":
					tic_digits += ch
			if tic_digits != "":
				return tic_digits
	# Prefer the numeric DB 'id' when available.
	var raw_id = anomaly.get("id", "")
	if raw_id != null and str(raw_id) != "":
		# Convert to int first to avoid .0 in string (e.g. 63769326.0 -> 63769326)
		if typeof(raw_id) == TYPE_FLOAT or typeof(raw_id) == TYPE_INT:
			return str(int(raw_id))
		return str(raw_id)

	var anomaly_id = str(anomaly.get("content", ""))
	# Remove common "TIC " prefix if present
	if anomaly_id.begins_with("TIC "):
		anomaly_id = anomaly_id.substr(4)
	# Strip any non-digit characters, leaving digits only
	var digits := ""
	for ch in anomaly_id:
		if ch >= "0" and ch <= "9":
			digits += ch
	if digits != "":
		return digits
	return anomaly_id

func is_planet(anomaly: Dictionary) -> bool:
	var anomaly_set = str(anomaly.get("anomalySet", "active-asteroids")).to_lower()
	return anomaly_set == "telescope-tess" or anomaly_set == "planets" or anomaly_set == "planet"

func is_candidate(anomaly: Dictionary) -> bool:
	# A classifiable candidate is a TESS planet target that hasn't been confirmed.
	# tess_disposition "PC" (or null/empty before migration backfill) = candidate.
	if not is_planet(anomaly):
		return false
	var disposition = str(anomaly.get("tess_disposition", ""))
	return disposition == "" or disposition == "PC"

func build_title(anomaly: Dictionary, anomaly_id: String, is_planet: bool) -> String:
	var tic_id = anomaly.get("ticId", "")
	if tic_id != "" and tic_id != null:
		return "TIC %s" % tic_id
	if anomaly_id != "":
		var item_type = "Planet" if is_planet else "Asteroid"
		return "%s #%s" % [item_type, anomaly_id]
	var fallback_type = "Planet" if is_planet else "Asteroid"
	return "%s Details" % fallback_type

func build_info_text(anomaly_data: Dictionary) -> String:
	var properties = []

	var anomaly_type = anomaly_data.get("anomalytype", "")
	if anomaly_type != "" and anomaly_type != null:
		properties.append(anomaly_type.capitalize().replace("Telescope", "").strip_edges())

	var radius = anomaly_data.get("radius")
	if radius != null:
		properties.append("Radius: %.2f" % radius)

	var mass = anomaly_data.get("mass")
	if mass != null:
		properties.append("Mass: %.2f" % mass)

	var temp = anomaly_data.get("temperature")
	if temp != null:
		properties.append("Temperature: %.0fK" % temp)

	var classification = anomaly_data.get("classification_status", "")
	if classification != "" and classification != null:
		properties.append("Status: " + classification)

	if properties.size() > 0:
		return "\n".join(properties)
	return "No additional data available"
