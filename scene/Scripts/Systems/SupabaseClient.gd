class_name SupabaseClient
extends Node

## Supabase REST API client for Godot
## Usage: SupabaseClient.get_instance().fetch_anomalies("active-asteroids", 5, callback)

# Local/dev values (editor-only unless FORCE_LOCAL_MODE is enabled)
const LOCAL_SUPABASE_URL: String = "http://127.0.0.1:54321"
const LOCAL_SUPABASE_KEY: String = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

# Production fallback values for bundled/exported runtime.
# Runtime config and env vars still take precedence when available.
const PROD_SUPABASE_URL: String = "https://hlufptwhzkpkkjztimzo.supabase.co"
const PROD_SUPABASE_KEY: String = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWZwdHdoemtwa2tqenRpbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYyOTk3NTUsImV4cCI6MjAzMTg3NTc1NX0.v_NDVWjIU_lJQSPbJ_Y6GkW3axrQWKXfXVsBEAbFv_I"

var SUPABASE_URL: String = LOCAL_SUPABASE_URL
var SUPABASE_KEY: String = LOCAL_SUPABASE_KEY

const RUNTIME_CONFIG_PATH: String = "res://supabase.runtime.json"
# Force local mode - set this to true if you want to always use local development server
# This can be useful for testing mobile builds against local development
const FORCE_LOCAL_MODE: bool = false

static var _instance: SupabaseClient

static func get_instance() -> SupabaseClient:
	if _instance == null:
		_instance = SupabaseClient.new()

		# Check for environment variables first (CI/GitHub Actions)
		var env_url = OS.get_environment("SUPABASE_URL").strip_edges()
		var env_key = OS.get_environment("SUPABASE_ANON_KEY").strip_edges()
		var runtime_credentials = _load_runtime_credentials()
		var runtime_url = str(runtime_credentials.get("url", "")).strip_edges()
		var runtime_key = str(runtime_credentials.get("key", "")).strip_edges()
		var in_editor_runtime = _is_running_from_editor()

		if FORCE_LOCAL_MODE:
			_apply_credentials(_instance, LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY, "forced-local")
		elif env_url != "" and env_key != "":
			_apply_credentials(_instance, env_url, env_key, "env")
		elif runtime_url != "" and runtime_key != "":
			_apply_credentials(_instance, runtime_url, runtime_key, "runtime-config")
		elif in_editor_runtime:
			# Editor runtime defaults to local dev endpoint.
			_apply_credentials(_instance, LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY, "editor-local")
		else:
			# Exported/bundled runtime must never silently use localhost.
			_apply_credentials(_instance, PROD_SUPABASE_URL, PROD_SUPABASE_KEY, "production-fallback")

		# Always print resolved URL for easier debugging
		print("SupabaseClient: resolved SUPABASE_URL=", _instance.SUPABASE_URL, " key_present=", _instance.SUPABASE_KEY != "")
	return _instance

static func _apply_credentials(instance: SupabaseClient, url: String, key: String, source: String) -> void:
	instance.SUPABASE_URL = url
	instance.SUPABASE_KEY = key
	preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: credentials_source=%s url=%s" % [source, instance.SUPABASE_URL])
	print("SupabaseClient: credentials_source=", source, " url=", instance.SUPABASE_URL)

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

## Fetch anomalies from Supabase with a specific anomalySet
## Returns array of anomaly dictionaries via callback
func fetch_anomalies(anomaly_set: String, limit: int, callback: Callable) -> HTTPRequest:
	var http_request = HTTPRequest.new()
	# Godot web builds can fail with RESULT_BODY_DECOMPRESS_FAILED on compressed responses.
	# Force identity encoding when supported by runtime to keep prod fetches stable.
	for prop in http_request.get_property_list():
		if str(prop.get("name", "")) == "accept_gzip":
			http_request.set("accept_gzip", false)
			break
	
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
		"Accept-Encoding: identity",
		"Content-Type: application/json"
	]
	
	http_request.request_completed.connect(
		func(result: int, response_code: int, response_headers: PackedStringArray, body: PackedByteArray):
			var response_data = []
			var error_message = ""
			var content_encoding := ""
			for h in response_headers:
				if h.to_lower().begins_with("content-encoding:"):
					content_encoding = h
					break
			
			preload("res://Scripts/Utils/Logger.gd").d("SupabaseClient: HTTP result=%d, status=%d, encoding=%s" % [result, response_code, content_encoding])
			
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
