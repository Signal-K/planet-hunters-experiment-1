extends RefCounted
class_name LaunchpadAnomalyFetcher
const AppLogger = preload("res://Scripts/Utils/Logger.gd")

var _launchpad: Node
var _on_populate_targets: Callable
var _anomalies: Array = []
var _anomalies_ready: bool = false
var _panel_data = preload("res://Scripts/UI/SatelliteStationPanelData.gd").new()

func setup(launchpad: Node, on_populate_targets: Callable) -> void:
	_launchpad = launchpad
	_on_populate_targets = on_populate_targets

func fetch_for_selector() -> void:
	AppLogger.d("Launchpad: STARTING anomaly fetch from Supabase...")
	var supabase = preload("res://Scripts/Systems/SupabaseClient.gd").get_instance()
	if supabase:
		AppLogger.d("Launchpad: SupabaseClient instance obtained, URL=%s" % supabase.SUPABASE_URL)
		var anomaly_set = "active-asteroids"
		var max_anomalies = 20
		AppLogger.d("Launchpad: calling fetch_anomalies with set=%s, limit=%d" % [anomaly_set, max_anomalies])
		supabase.fetch_anomalies(anomaly_set, max_anomalies, Callable(self, "_on_anomalies_fetched"))
		AppLogger.d("Launchpad: fetch_anomalies call initiated (async)")
	else:
		AppLogger.w("Launchpad: ERROR - SupabaseClient instance not available")

func _on_anomalies_fetched(anomalies: Array, error_message = "") -> void:
	AppLogger.d("Launchpad: _on_anomalies_fetched CALLED - anomalies count=%d, error='%s'" % [anomalies.size(), error_message])
	if error_message != "":
		AppLogger.w("Launchpad: ERROR fetching anomalies from Supabase: %s" % error_message)
		_anomalies = []
		_anomalies_ready = false
	else:
		AppLogger.d("Launchpad: SUCCESS - fetched %d anomalies from Supabase" % anomalies.size())
		if anomalies.size() > 0:
			AppLogger.d("  First anomaly: %s" % str(anomalies[0]))
		_anomalies = anomalies
		_anomalies_ready = true
		_persist_detected_targets(anomalies)
	# NOW populate targets after fetch completes
	AppLogger.d("Launchpad: calling _populate_targets after fetch callback")
	if _on_populate_targets.is_valid():
		_on_populate_targets.call()

func _persist_detected_targets(anomalies: Array) -> void:
	var rm = preload("res://Scripts/Utils/RocketsManager.gd")
	if not rm:
		return
	var targets := []
	for i in range(anomalies.size()):
		var anomaly = anomalies[i]
		var target_id = _panel_data.normalize_anomaly_id(anomaly, i + 1)
		var target_label = "TIC %s" % str(anomaly.get("ticId")) if anomaly.has("ticId") and anomaly.get("ticId") != null and str(anomaly.get("ticId")) != "" else str(anomaly.get("content", target_id))
		var disposition = str(anomaly.get("tess_disposition", ""))
		var tess_year = str(anomaly.get("tess_year", ""))
		var tess_sector = str(anomaly.get("tess_sector", ""))
		var science_source: String
		var science_blurb: String
		if disposition in ["KP", "CP"]:
			science_source = "Confirmed Planet"
			science_blurb = "Confirmed exoplanet via NASA TESS"
		elif disposition == "PC":
			science_source = "TESS Planet Candidate"
			science_blurb = "Planet candidate detected by NASA TESS"
		elif anomaly.has("ticId") and str(anomaly.get("ticId", "")) != "":
			science_source = "TESS Target"
			science_blurb = "TESS photometric target"
		else:
			science_source = "Active Asteroid"
			science_blurb = "Catalogued by Active Asteroids Programme"
		if tess_year != "" and tess_year != "0":
			science_blurb += " in %s" % tess_year
		if tess_sector != "" and tess_sector != "0":
			science_blurb += " (Sector %s)" % tess_sector
		targets.append({
			"id": target_id,
			"label": target_label,
			"type": "asteroid",
			"science_source": science_source,
			"science_blurb": science_blurb
		})
	if targets.is_empty():
		return
	rm.set_detected_targets(targets)
