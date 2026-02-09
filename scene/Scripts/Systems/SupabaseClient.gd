class_name SupabaseClient
extends Node

## Supabase REST API client for Godot
## Usage: SupabaseClient.get_instance().fetch_anomalies("active-asteroids", 5, callback)

# Default local/dev values
var SUPABASE_URL: String = "http://127.0.0.1:54321"
var SUPABASE_KEY: String = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

const RUNTIME_CONFIG_PATH: String = "res://supabase.runtime.json"
# Force local mode - set this to true if you want to always use local development server
# This can be useful for testing mobile builds against local development
const FORCE_LOCAL_MODE: bool = false

static var _instance: SupabaseClient

static func get_instance() -> SupabaseClient:
	if _instance == null:
		_instance = SupabaseClient.new()

		# Check for environment variables first (CI/GitHub Actions)
		var env_url = OS.get_environment("SUPABASE_URL")
		var env_key = OS.get_environment("SUPABASE_ANON_KEY")
		var runtime_credentials = _load_runtime_credentials()
		var runtime_url = str(runtime_credentials.get("url", ""))
		var runtime_key = str(runtime_credentials.get("key", ""))
		var in_editor_runtime = _is_running_from_editor()

		if FORCE_LOCAL_MODE:
			# Explicit override for local mode.
			preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: Using LOCAL development credentials (FORCE_LOCAL_MODE enabled)")
			print("SupabaseClient: FORCE_LOCAL_MODE -> ", _instance.SUPABASE_URL)
		elif in_editor_runtime:
			# When running from the Godot editor (Play/F5), always use local credentials.
			preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: Using LOCAL development credentials (editor runtime)")
			print("SupabaseClient: Editor runtime detected; using LOCAL credentials -> ", _instance.SUPABASE_URL)
		elif env_url != "" and env_key != "":
			# Use environment variables (GitHub secrets in CI)
			_instance.SUPABASE_URL = env_url
			_instance.SUPABASE_KEY = env_key
			preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: Using ENVIRONMENT credentials")
			print("SupabaseClient: Using ENVIRONMENT credentials -> ", _instance.SUPABASE_URL)
		elif runtime_url != "" and runtime_key != "":
			# Use runtime config generated during secure CI export.
			_instance.SUPABASE_URL = runtime_url
			_instance.SUPABASE_KEY = runtime_key
			preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: Using runtime config credentials")
			print("SupabaseClient: Using runtime config credentials -> ", _instance.SUPABASE_URL)
		elif _should_use_production():
			preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: Production mode requested, but no runtime config found")
			print("SupabaseClient: Production mode requested, but runtime config is missing")
		else:
			preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: Using LOCAL development credentials")
			print("SupabaseClient: Using LOCAL development credentials -> ", _instance.SUPABASE_URL)

	# Always print resolved URL for easier debugging
	print("SupabaseClient: resolved SUPABASE_URL=", _instance.SUPABASE_URL, " key_present=", _instance.SUPABASE_KEY != "")
	return _instance

static func _load_runtime_credentials() -> Dictionary:
	if not FileAccess.file_exists(RUNTIME_CONFIG_PATH):
		return {}

	var file = FileAccess.open(RUNTIME_CONFIG_PATH, FileAccess.READ)
	if file == null:
		return {}

	var content = file.get_as_text()
	file.close()

	var json = JSON.new()
	if json.parse(content) != OK:
		return {}

	if typeof(json.data) != TYPE_DICTIONARY:
		return {}

	var parsed: Dictionary = json.data
	var cfg_url = str(parsed.get("supabaseUrl", "")).strip_edges()
	var cfg_key = str(parsed.get("supabaseAnonKey", "")).strip_edges()
	if cfg_url == "" or cfg_key == "":
		return {}

	return {
		"url": cfg_url,
		"key": cfg_key
	}

static func _is_running_from_editor() -> bool:
	# True during Play/F5 from editor; false in exported/mobile runtime.
	return OS.has_feature("editor")

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
	
	preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: Fetching from URL: %s" % [url])
	
	var headers = [
		"apikey: " + SUPABASE_KEY,
		"Authorization: Bearer " + SUPABASE_KEY,
		"Content-Type: application/json"
	]
	
	http_request.request_completed.connect(
		func(result: int, response_code: int, response_headers: PackedStringArray, body: PackedByteArray):
			var response_data = []
			var error_message = ""
			
			preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: HTTP result=%d, status=%d" % [result, response_code])
			
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
					preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: Successfully fetched %d anomalies" % response_data.size())
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
