extends RefCounted
class_name LaunchpadAnomalyFetcher

var _launchpad: Node
var _on_populate_targets: Callable
var _anomalies: Array = []
var _anomalies_ready: bool = false
var _panel_data = preload("res://Scripts/UI/SatelliteStationPanelData.gd").new()

func setup(launchpad: Node, on_populate_targets: Callable) -> void:
	_launchpad = launchpad
	_on_populate_targets = on_populate_targets

func fetch_for_selector() -> void:
	print("Launchpad: STARTING anomaly fetch from Supabase...")
	var supabase = preload("res://Scripts/Systems/SupabaseClient.gd").get_instance()
	if supabase:
		print("Launchpad: SupabaseClient instance obtained, URL=", supabase.SUPABASE_URL)
		var anomaly_set = "active-asteroids"
		var max_anomalies = 20
		print("Launchpad: calling fetch_anomalies with set=%s, limit=%d" % [anomaly_set, max_anomalies])
		supabase.fetch_anomalies(anomaly_set, max_anomalies, Callable(self, "_on_anomalies_fetched"))
		print("Launchpad: fetch_anomalies call initiated (async)")
	else:
		print("Launchpad: ERROR - SupabaseClient instance not available")

func _on_anomalies_fetched(anomalies: Array, error_message = "") -> void:
	print("Launchpad: _on_anomalies_fetched CALLED - anomalies count=%d, error='%s'" % [anomalies.size(), error_message])
	if error_message != "":
		print("Launchpad: ERROR fetching anomalies from Supabase: %s" % error_message)
		_anomalies = []
		_anomalies_ready = false
	else:
		print("Launchpad: SUCCESS - fetched %d anomalies from Supabase" % anomalies.size())
		if anomalies.size() > 0:
			print("  First anomaly: %s" % str(anomalies[0]))
		_anomalies = anomalies
		_anomalies_ready = true
		_persist_detected_targets(anomalies)
	# NOW populate targets after fetch completes
	print("Launchpad: calling _populate_targets after fetch callback")
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
		targets.append({
			"id": target_id,
			"label": target_label,
			"type": "asteroid"
		})
	if targets.is_empty():
		return
	rm.set_detected_targets(targets)
