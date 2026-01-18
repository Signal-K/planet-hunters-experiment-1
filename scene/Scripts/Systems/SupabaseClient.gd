class_name SupabaseClient
extends Node

## Supabase REST API client for Godot
## Usage: SupabaseClient.get_instance().fetch_anomalies("active-asteroids", 5, callback)

# Default local/dev values
var SUPABASE_URL: String = "http://127.0.0.1:54321"
var SUPABASE_KEY: String = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

# Production values (used when running exported/built project)
const PROD_SUPABASE_URL: String = "https://hlufptwhzkpkkjztimzo.supabase.co"
const PROD_SUPABASE_KEY: String = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWZwdHdoemtwa2tqenRpbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYyOTk3NTUsImV4cCI6MjAzMTg3NTc1NX0.v_NDVWjIU_lJQSPbJ_Y6GkW3axrQWKXfXVsBEAbFv_I"
# Force local mode - set this to true if you want to always use local development server
# This can be useful for testing mobile builds against local development
const FORCE_LOCAL_MODE: bool = false
static var _instance: SupabaseClient

static func get_instance() -> SupabaseClient:
	if _instance == null:
		_instance = SupabaseClient.new()
		# Use production values when running on mobile devices or exported builds
		# This covers both React Native/Expo and exported Godot builds
		if not FORCE_LOCAL_MODE and _should_use_production():
			_instance.SUPABASE_URL = PROD_SUPABASE_URL
			_instance.SUPABASE_KEY = PROD_SUPABASE_KEY
			print("SupabaseClient: Using PRODUCTION credentials for mobile/exported build")
		else:
			print("SupabaseClient: Using LOCAL development credentials")
			if FORCE_LOCAL_MODE:
				print("SupabaseClient: FORCE_LOCAL_MODE is enabled")
	return _instance

## Determine if we should use production Supabase credentials
static func _should_use_production() -> bool:
	# Use production if running on mobile platforms (iOS/Android)
	if OS.has_feature("mobile"):
		return true
	
	# Use production if running in exported/built version (not in editor)
	if not Engine.is_editor_hint() and not OS.is_debug_build():
		return true
	
	# Use production if running through React Native/Expo
	# (These usually don't have access to localhost)
	if OS.get_name() == "iOS" or OS.get_name() == "Android":
		return true
	
	return false

## Fetch anomalies from Supabase with a specific anomalySet
## Returns array of anomaly dictionaries via callback
func fetch_anomalies(anomaly_set: String, limit: int, callback: Callable) -> HTTPRequest:
	var http_request = HTTPRequest.new()
	
	# Need to add to scene tree for HTTPRequest to work
	var scene_tree = Engine.get_main_loop()
	if scene_tree and scene_tree.root:
		scene_tree.root.add_child(http_request)
	
	var url = "%s/rest/v1/anomalies?anomalySet=eq.%s&order=created_at.desc&limit=%d" % [
		SUPABASE_URL,
		anomaly_set.uri_encode(),
		limit
	]
	
	print("SupabaseClient: Fetching from URL: ", url)
	
	var headers = [
		"apikey: " + SUPABASE_KEY,
		"Authorization: Bearer " + SUPABASE_KEY,
		"Content-Type: application/json"
	]
	
	http_request.request_completed.connect(
		func(result: int, response_code: int, response_headers: PackedStringArray, body: PackedByteArray):
			var response_data = []
			var error_message = ""
			
			print("SupabaseClient: HTTP result=%d, status=%d" % [result, response_code])
			
			if result != HTTPRequest.RESULT_SUCCESS:
				error_message = "HTTP Request failed with result: %d" % result
			elif response_code == 401:
				error_message = "Authentication failed (401) - Check API key"
			elif response_code != 200:
				error_message = "API returned status code: %d" % response_code
			else:
				var json = JSON.new()
				var parse_result = json.parse(body.get_string_from_utf8())
				if parse_result == OK:
					response_data = json.data
					print("SupabaseClient: Successfully fetched %d anomalies" % response_data.size())
				else:
					error_message = "Failed to parse JSON response"
			
			callback.call(response_data, error_message)
			http_request.queue_free()
	)
	
	var error = http_request.request(url, headers, HTTPClient.METHOD_GET)
	if error != OK:
		callback.call([], "Failed to create HTTP request: %d" % error)
		http_request.queue_free()
	
	return http_request
