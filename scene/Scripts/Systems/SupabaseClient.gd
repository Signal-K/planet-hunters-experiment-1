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
const AppLogger = preload("res://Scripts/Utils/Logger.gd")

var SUPABASE_URL: String = LOCAL_SUPABASE_URL
var SUPABASE_KEY: String = LOCAL_SUPABASE_KEY
var _web_pending_callbacks: Dictionary = {}
const AUTH_SESSION_PATH: String = "user://supabase_auth_session.json"
const AUTH_SESSION_SKEW_SECONDS: int = 30
var _auth_access_token: String = ""
var _auth_refresh_token: String = ""
var _auth_user_id: String = ""
var _auth_expires_at: int = 0
var _auth_request_in_flight: bool = false
var _auth_pending_callbacks: Array = []

const RUNTIME_CONFIG_PATH: String = "res://supabase.runtime.json"
# Force local mode — enabled while running against the local test Supabase instance.
# Set to false before deploying to production.
const FORCE_LOCAL_MODE: bool = true

static var _instance  # SupabaseClient singleton

static func get_instance():
	if _instance == null:
		_instance = (load("res://Scripts/Systems/SupabaseClient.gd") as GDScript).new()

		# Check for environment variables first (CI/GitHub Actions)
		var env_url = OS.get_environment("SUPABASE_URL").strip_edges()
		var env_key = OS.get_environment("SUPABASE_ANON_KEY").strip_edges()
		if env_key == "":
			env_key = OS.get_environment("SUPABASE_ANON").strip_edges()
		if env_key == "":
			env_key = OS.get_environment("SUPABASE_SERVICE").strip_edges()
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
		_instance._load_auth_session()

		# Always print resolved URL for easier debugging
		print("SupabaseClient: resolved SUPABASE_URL=", _instance.SUPABASE_URL, " key_present=", _instance.SUPABASE_KEY != "")
	return _instance

static func _apply_credentials(instance: Node, url: String, key: String, source: String) -> void:
	instance.SUPABASE_URL = url
	instance.SUPABASE_KEY = key
	AppLogger.d("SupabaseClient: credentials_source=%s url=%s" % [source, instance.SUPABASE_URL])
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

func _resolve_api_base_url() -> String:
	var base_url = str(SUPABASE_URL).strip_edges()
	if base_url == "" or not base_url.begins_with("http"):
		base_url = PROD_SUPABASE_URL
	if base_url.ends_with("/"):
		base_url = base_url.substr(0, base_url.length() - 1)
	return base_url

func get_authenticated_user_id() -> String:
	return _auth_user_id

func has_authenticated_session() -> bool:
	return _has_valid_auth_session()

func ensure_authenticated(callback: Callable) -> void:
	if _has_valid_auth_session():
		if callback.is_valid():
			callback.call(true, "")
		return

	if callback.is_valid():
		_auth_pending_callbacks.append(callback)
	if _auth_request_in_flight:
		return

	_auth_request_in_flight = true
	if OS.has_feature("web"):
		_sign_up_anonymously_web()
	else:
		_sign_up_anonymously_native()

func _has_valid_auth_session() -> bool:
	var now := int(Time.get_unix_time_from_system())
	return _auth_access_token != "" and _auth_user_id != "" and _auth_expires_at > now + AUTH_SESSION_SKEW_SECONDS

func _load_auth_session() -> void:
	if not FileAccess.file_exists(AUTH_SESSION_PATH):
		return
	var file := FileAccess.open(AUTH_SESSION_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed_any = JSON.parse_string(file.get_as_text())
	file.close()
	if typeof(parsed_any) != TYPE_DICTIONARY:
		return
	var parsed: Dictionary = parsed_any
	_auth_access_token = str(parsed.get("access_token", "")).strip_edges()
	_auth_refresh_token = str(parsed.get("refresh_token", "")).strip_edges()
	_auth_user_id = str(parsed.get("user_id", "")).strip_edges()
	_auth_expires_at = int(parsed.get("expires_at", 0))
	if not _has_valid_auth_session():
		_clear_auth_session()

func _persist_auth_session() -> void:
	var file := FileAccess.open(AUTH_SESSION_PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify({
		"access_token": _auth_access_token,
		"refresh_token": _auth_refresh_token,
		"user_id": _auth_user_id,
		"expires_at": _auth_expires_at,
	}))
	file.close()

func _clear_auth_session() -> void:
	_auth_access_token = ""
	_auth_refresh_token = ""
	_auth_user_id = ""
	_auth_expires_at = 0
	if FileAccess.file_exists(AUTH_SESSION_PATH):
		DirAccess.remove_absolute(AUTH_SESSION_PATH)

func _apply_auth_payload(payload: Dictionary) -> bool:
	var access_token := str(payload.get("access_token", "")).strip_edges()
	var refresh_token := str(payload.get("refresh_token", "")).strip_edges()
	var expires_at := int(payload.get("expires_at", 0))
	if expires_at <= 0:
		expires_at = int(Time.get_unix_time_from_system()) + int(payload.get("expires_in", 3600))
	var user_any = payload.get("user", {})
	if typeof(user_any) != TYPE_DICTIONARY:
		return false
	var user: Dictionary = user_any
	var user_id := str(user.get("id", "")).strip_edges()
	if access_token == "" or user_id == "":
		return false
	_auth_access_token = access_token
	_auth_refresh_token = refresh_token
	_auth_user_id = user_id
	_auth_expires_at = expires_at
	_persist_auth_session()
	return true

func _finish_auth_request(ok: bool, error_message: String) -> void:
	_auth_request_in_flight = false
	var callbacks := _auth_pending_callbacks.duplicate()
	_auth_pending_callbacks.clear()
	for cb_any in callbacks:
		if typeof(cb_any) == TYPE_CALLABLE:
			var cb: Callable = cb_any
			if cb.is_valid():
				cb.call(ok, error_message)

func _sign_up_anonymously_native() -> void:
	var http := HTTPRequest.new()
	var scene_tree = Engine.get_main_loop()
	if scene_tree and scene_tree.root:
		scene_tree.root.add_child(http)
	var url := "%s/auth/v1/signup" % _resolve_api_base_url()
	var headers := [
		"apikey: " + SUPABASE_KEY,
		"Content-Type: application/json",
	]
	var body := JSON.stringify({
		"data": {
			"source": "landnam-game",
			"client": "godot",
		}
	})
	http.request_completed.connect(func(result: int, response_code: int, _hdrs: PackedStringArray, body_bytes: PackedByteArray) -> void:
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS:
			_finish_auth_request(false, "auth request failed: result=%d" % result)
			return
		if response_code < 200 or response_code >= 300:
			_finish_auth_request(false, "auth request failed: code=%d" % response_code)
			return
		var parsed_any = JSON.parse_string(body_bytes.get_string_from_utf8())
		if typeof(parsed_any) != TYPE_DICTIONARY:
			_finish_auth_request(false, "auth response parse error")
			return
		var payload: Dictionary = parsed_any
		if not _apply_auth_payload(payload):
			_finish_auth_request(false, "auth payload missing session fields")
			return
		_finish_auth_request(true, "")
	)
	var request_error := http.request(url, headers, HTTPClient.METHOD_POST, body)
	if request_error != OK:
		http.queue_free()
		_finish_auth_request(false, "auth request setup failed: %d" % request_error)

func _sign_up_anonymously_web() -> void:
	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		_finish_auth_request(false, "window unavailable")
		return
	var callback_id = "__ph_auth_%d" % Time.get_ticks_usec()
	var bridge = JavaScriptBridge.create_callback(func(args):
		var payload := ""
		if args.size() > 0:
			payload = str(args[0])
		var w = JavaScriptBridge.get_interface("window")
		if w:
			w.set(callback_id, null)
		if payload.begins_with("__ERR__"):
			_finish_auth_request(false, payload.substr(7))
			return
		var parsed_any = JSON.parse_string(payload)
		if typeof(parsed_any) != TYPE_DICTIONARY:
			_finish_auth_request(false, "auth response parse error")
			return
		var parsed: Dictionary = parsed_any
		if not _apply_auth_payload(parsed):
			_finish_auth_request(false, "auth payload missing session fields")
			return
		_finish_auth_request(true, "")
	)
	window.set(callback_id, bridge)
	var js = "(async function(){try{const r=await fetch(%s,{method:'POST',headers:{'apikey':%s,'Content-Type':'application/json'},body:%s});const t=await r.text();if(!r.ok){window[%s]('__ERR__auth request failed: code='+r.status+' body='+t.slice(0,260));return;}window[%s](t);}catch(e){window[%s]('__ERR__'+(e&&e.message?e.message:String(e)));}})();" % [
		JSON.stringify("%s/auth/v1/signup" % _resolve_api_base_url()),
		JSON.stringify(SUPABASE_KEY),
		JSON.stringify(JSON.stringify({"data": {"source": "landnam-game", "client": "godot"}})),
		JSON.stringify(callback_id),
		JSON.stringify(callback_id),
		JSON.stringify(callback_id),
	]
	JavaScriptBridge.eval(js, true)

func _build_rest_headers(require_auth: bool = false, include_prefer_minimal: bool = false) -> Array:
	var bearer := SUPABASE_KEY
	if require_auth and _auth_access_token != "":
		bearer = _auth_access_token
	var headers := [
		"apikey: " + SUPABASE_KEY,
		"Authorization: Bearer " + bearer,
		"Content-Type: application/json",
	]
	if include_prefer_minimal:
		headers.append("Prefer: return=minimal")
	return headers

## Fetch anomalies from Supabase with a specific anomalySet
## Returns array of anomaly dictionaries via callback
func fetch_anomalies(anomaly_set: String, limit: int, callback: Callable) -> HTTPRequest:
	if OS.has_feature("web"):
		_fetch_anomalies_web(anomaly_set, limit, callback)
		return null

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
	
	var api_base = _resolve_api_base_url()
	var url = "%s/rest/v1/anomalies?anomalySet=eq.%s&order=created_at.desc&limit=%d" % [
		api_base,
		anomaly_set.uri_encode(),
		limit
	]
	
	AppLogger.d("SupabaseClient: Fetching from URL: %s" % [url])
	
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
			
			AppLogger.d("SupabaseClient: HTTP result=%d, status=%d, encoding=%s" % [result, response_code, content_encoding])
			
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
					AppLogger.d("SupabaseClient: Successfully fetched %d anomalies" % response_data.size())
				else:
					error_message = "Failed to parse JSON response"
			
			_invoke_array_callback(callback, response_data, error_message)
			http_request.queue_free()
	)

	# Defer request kickoff so the node is fully in-tree before request().
	_start_fetch_request(http_request, url, headers, callback, 0)
	
	return http_request

func _start_fetch_request(http_request: HTTPRequest, url: String, headers: Array, callback: Callable, attempt: int) -> void:
	if http_request == null or not is_instance_valid(http_request):
		return
	if not http_request.is_inside_tree():
		http_request.call_deferred("_deferred_start_fetch_request", http_request, url, headers, callback, attempt)
		return
	var error = http_request.request(url, headers, HTTPClient.METHOD_GET)
	if error == OK:
		return
	# ERR_UNCONFIGURED can happen when request() is called too early in scene startup.
	# Retry once on the next frame before failing.
	if error == ERR_UNCONFIGURED and attempt < 1:
		var tree = Engine.get_main_loop()
		if tree and tree.has_method("create_timer"):
			tree.create_timer(0.01).timeout.connect(
				func():
					_start_fetch_request(http_request, url, headers, callback, attempt + 1),
				CONNECT_ONE_SHOT
			)
			return
	_invoke_array_callback(callback, [], "Failed to create HTTP request: %d" % error)
	http_request.queue_free()

func _deferred_start_fetch_request(http_request: HTTPRequest, url: String, headers: Array, callback: Callable, attempt: int) -> void:
	_start_fetch_request(http_request, url, headers, callback, attempt)

func _fetch_anomalies_web(anomaly_set: String, limit: int, callback: Callable) -> void:
	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		callback.call([], "Window interface unavailable for web fetch")
		return

	var api_base = _resolve_api_base_url()
	var url = "%s/rest/v1/anomalies?anomalySet=eq.%s&order=created_at.desc&limit=%d" % [
		api_base,
		anomaly_set.uri_encode(),
		limit
	]

	var callback_id = "__ph_supabase_cb_%d" % Time.get_ticks_usec()
	_web_pending_callbacks[callback_id] = callback
	var bridge_callback = JavaScriptBridge.create_callback(Callable(self, "_on_web_fetch_completed").bind(callback_id))
	window.set(callback_id, bridge_callback)

	var url_js = JSON.stringify(url)
	var key_js = JSON.stringify(SUPABASE_KEY)
	var callback_js = JSON.stringify(callback_id)
	var fallback_base_js = JSON.stringify(PROD_SUPABASE_URL)
	var js = "(async function(){const k=%s;const u=%s;const fb=%s;async function rq(x){return fetch(x,{method:'GET',headers:{'apikey':k,'Authorization':'Bearer '+k,'Content-Type':'application/json'}});}try{let r=await rq(u);let t=await r.text();if((!r.ok)&&((r.status===404)||(t.indexOf('NOT_FOUND')!==-1)||(t.indexOf('Code: NOT_FOUND')!==-1))&&u.indexOf('supabase.co')===-1){const uu=(fb.replace(/\\/$/,'')+'/rest/v1/anomalies?anomalySet=eq.%s&order=created_at.desc&limit=%d');r=await rq(uu);t=await r.text();}if(!r.ok){window[%s]('__ERR__API returned status code: '+r.status+' body='+t.slice(0,260));return;}window[%s](t);}catch(e){window[%s]('__ERR__HTTP Request failed in JS fetch: '+(e&&e.message?e.message:String(e)));}})();" % [key_js, url_js, fallback_base_js, anomaly_set.uri_encode(), limit, callback_js, callback_js, callback_js]
	JavaScriptBridge.eval(js, true)

func _on_web_fetch_completed(args, callback_id: String) -> void:
	var callback: Callable = _web_pending_callbacks.get(callback_id, Callable())
	_web_pending_callbacks.erase(callback_id)

	var window = JavaScriptBridge.get_interface("window")
	if window != null:
		window.set(callback_id, null)

	if not callback.is_valid():
		return

	var payload = ""
	if args is Array and args.size() > 0:
		payload = str(args[0])

	if payload.begins_with("__ERR__"):
		_invoke_array_callback(callback, [], payload.substr(7))
		return

	var json = JSON.new()
	var parse_result = json.parse(payload)
	if parse_result != OK:
		_invoke_array_callback(callback, [], "Failed to parse JSON response")
		return

	if typeof(json.data) != TYPE_ARRAY:
		_invoke_array_callback(callback, [], "Unexpected response payload type")
		return

	_invoke_array_callback(callback, json.data, "")

func _invoke_array_callback(callback: Callable, data: Array, error_message: String) -> void:
	if not callback.is_valid():
		return
	callback.call(data, error_message)

## Generic GET from any Supabase REST table.
## query_string: raw PostgREST filter query string e.g. "anomaly=eq.42&limit=20"
## Callback signature: func(data: Array, error: String)
func fetch_table(table: String, query_string: String, callback: Callable) -> void:
	var require_auth := table == "classifications"
	if require_auth and not _has_valid_auth_session():
		ensure_authenticated(func(ok: bool, err: String) -> void:
			if not ok:
				if callback.is_valid():
					callback.call([], "auth error: %s" % err)
				return
			fetch_table(table, query_string, callback)
		)
		return
	var api_base = _resolve_api_base_url()
	var url = "%s/rest/v1/%s?%s" % [api_base, table, query_string]
	var headers = _build_rest_headers(require_auth)
	if OS.has_feature("web"):
		_fetch_table_web(url, headers, callback)
		return
	var http := HTTPRequest.new()
	for prop in http.get_property_list():
		if str(prop.get("name", "")) == "accept_gzip":
			http.set("accept_gzip", false)
			break
	var scene_tree = Engine.get_main_loop()
	if scene_tree and scene_tree.root:
		scene_tree.root.add_child(http)
	http.request_completed.connect(func(result: int, _code: int, _hdrs: PackedStringArray, body: PackedByteArray) -> void:
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS:
			if callback.is_valid():
				callback.call([], "fetch_table network error: result=%d" % result)
			return
		var text := body.get_string_from_utf8()
		var parsed = JSON.parse_string(text)
		if typeof(parsed) == TYPE_ARRAY:
			if callback.is_valid():
				callback.call(parsed, "")
		else:
			if callback.is_valid():
				callback.call([], "fetch_table parse error")
	)
	http.request(url, headers, HTTPClient.METHOD_GET)

func _fetch_table_web(url: String, headers: Array, callback: Callable) -> void:
	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		if callback.is_valid():
			callback.call([], "window unavailable")
		return
	var callback_id = "__ph_ftw_%d" % Time.get_ticks_usec()
	var bridge = JavaScriptBridge.create_callback(func(args):
		var ok = args.size() > 0 and typeof(args[0]) == TYPE_STRING
		var data_str = str(args[0]) if ok else "[]"
		var parsed = JSON.parse_string(data_str)
		var rows: Array = parsed if typeof(parsed) == TYPE_ARRAY else []
		if callback.is_valid():
			callback.call(rows, "" if ok else "web fetch failed")
		var w = JavaScriptBridge.get_interface("window")
		if w:
			w.set(callback_id, null)
	)
	window.set(callback_id, bridge)
	var headers_js := ""
	for h in headers:
		var parts = h.split(": ", true, 1)
		if parts.size() == 2:
			headers_js += '"%s": "%s",' % [parts[0].strip_edges(), parts[1].strip_edges()]
	var js = """
(async function() {
  try {
    var r = await fetch(%s, { headers: { %s } });
    var j = await r.json();
    window[%s](JSON.stringify(j));
  } catch(e) { window[%s]("[]"); }
})();
""" % [JSON.stringify(url), headers_js, JSON.stringify(callback_id), JSON.stringify(callback_id)]
	JavaScriptBridge.eval(js)

func post_json(table: String, row: Dictionary, callback: Callable = Callable()) -> void:
	var require_auth := table == "classifications"
	if require_auth and not _has_valid_auth_session():
		ensure_authenticated(func(ok: bool, err: String) -> void:
			if not ok:
				if callback.is_valid():
					callback.call(false, "auth error: %s" % err)
				return
			post_json(table, row, callback)
		)
		return
	var api_base = _resolve_api_base_url()
	var url = "%s/rest/v1/%s" % [api_base, table]
	var headers = _build_rest_headers(require_auth, true)
	var body = JSON.stringify(row)
	if OS.has_feature("web"):
		_post_json_web(url, headers, body, callback)
		return
	var http = HTTPRequest.new()
	var scene_tree = Engine.get_main_loop()
	if scene_tree and scene_tree.root:
		scene_tree.root.add_child(http)
	http.request_completed.connect(func(result, response_code, _hdrs, _body):
		http.queue_free()
		if not callback.is_valid():
			return
		if result != HTTPRequest.RESULT_SUCCESS or response_code >= 300:
			callback.call(false, "post failed: result=%d code=%d" % [result, response_code])
		else:
			callback.call(true, "")
	)
	http.request(url, headers, HTTPClient.METHOD_POST, body)

func _post_json_web(url: String, headers: Array, body: String, callback: Callable) -> void:
	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		if callback.is_valid():
			callback.call(false, "window unavailable")
		return
	var callback_id = "__ph_post_%d" % Time.get_ticks_usec()
	var bridge = JavaScriptBridge.create_callback(func(args):
		var ok = args.size() > 0 and str(args[0]) == "ok"
		if callback.is_valid():
			callback.call(ok, "" if ok else "post failed")
		var w = JavaScriptBridge.get_interface("window")
		if w:
			w.set(callback_id, null)
	)
	window.set(callback_id, bridge)
	var headers_js := ""
	for h in headers:
		var parts = h.split(": ", true, 1)
		if parts.size() == 2:
			headers_js += "'%s':'%s'," % [parts[0].replace("'", "\\'"), parts[1].replace("'", "\\'")]
	var url_js = JSON.stringify(url)
	var body_js = JSON.stringify(body)
	var cb_js = JSON.stringify(callback_id)
	var js = "(async function(){try{const r=await fetch(%s,{method:'POST',headers:{%s},body:%s});window[%s](r.ok||r.status===201?'ok':'err_'+r.status);}catch(e){window[%s]('err');}})();" % [url_js, headers_js, body_js, cb_js, cb_js]
	JavaScriptBridge.eval(js, true)
