class_name PocketBaseClient
extends Node

## PocketBase client for Landnam's Godot runtime.
## Auth is owned by the shared backend; game state is saved through the
## Landnam backend after that shared token has been verified server-side.

const AppLogger = preload("res://Scripts/Utils/Logger.gd")

const LOCAL_SHARED_URL := "http://127.0.0.1:8090"
const LOCAL_LANDNAM_URL := "http://127.0.0.1:8091"
const AUTH_SESSION_PATH := "user://pocketbase_auth_session.json"
const RUNTIME_CONFIG_PATH := "res://pocketbase.runtime.json"

var shared_url: String = LOCAL_SHARED_URL
var landnam_url: String = LOCAL_LANDNAM_URL
var _auth_token: String = ""
var _auth_user_id: String = ""
var _auth_email: String = ""
var _web_callbacks: Dictionary = {}

static var _instance: PocketBaseClient = null

static func get_instance() -> PocketBaseClient:
	if _instance == null:
		_instance = (load("res://Scripts/Systems/PocketBaseClient.gd") as GDScript).new()
		_instance._configure()
		_instance._load_auth_session()
	return _instance

func _configure() -> void:
	var runtime := _load_runtime_config()
	shared_url = _first_non_empty([
		OS.get_environment("SHARED_PB_URL"),
		OS.get_environment("POCKETBASE_SHARED_URL"),
		str(runtime.get("sharedUrl", "")),
		LOCAL_SHARED_URL,
	])
	landnam_url = _first_non_empty([
		OS.get_environment("LANDNAM_PB_URL"),
		OS.get_environment("POCKETBASE_LANDNAM_URL"),
		str(runtime.get("landnamUrl", "")),
		LOCAL_LANDNAM_URL,
	])
	shared_url = _trim_trailing_slash(shared_url)
	landnam_url = _trim_trailing_slash(landnam_url)
	AppLogger.d("[PocketBaseClient] shared=%s landnam=%s" % [shared_url, landnam_url])

static func _load_runtime_config() -> Dictionary:
	if not FileAccess.file_exists(RUNTIME_CONFIG_PATH):
		return {}
	var file := FileAccess.open(RUNTIME_CONFIG_PATH, FileAccess.READ)
	if file == null:
		return {}
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	if typeof(parsed) != TYPE_DICTIONARY:
		return {}
	return parsed

static func _first_non_empty(values: Array) -> String:
	for value in values:
		var text := str(value).strip_edges()
		if text != "":
			return text
	return ""

static func _trim_trailing_slash(value: String) -> String:
	var next := value.strip_edges()
	while next.ends_with("/"):
		next = next.substr(0, next.length() - 1)
	return next

func get_authenticated_user_id() -> String:
	return _auth_user_id

func has_authenticated_session() -> bool:
	return _auth_token != "" and _auth_user_id != ""

func set_auth_session(token: String, user_id: String, email: String = "") -> bool:
	var next_token := token.strip_edges()
	var next_user_id := user_id.strip_edges()
	if next_token == "" or next_user_id == "":
		return false
	_auth_token = next_token
	_auth_user_id = next_user_id
	_auth_email = email.strip_edges()
	_persist_auth_session()
	return true

func clear_auth_session() -> void:
	_auth_token = ""
	_auth_user_id = ""
	_auth_email = ""
	if FileAccess.file_exists(AUTH_SESSION_PATH):
		DirAccess.remove_absolute(AUTH_SESSION_PATH)

func sign_in_with_password(email: String, password: String, callback: Callable = Callable()) -> void:
	_request_json(
		"%s/api/collections/users/auth-with-password" % shared_url,
		"POST",
		{"identity": email, "password": password},
		false,
		func(payload: Variant, error: String) -> void:
			var ok := error == "" and typeof(payload) == TYPE_DICTIONARY and _apply_auth_payload(payload)
			if callback.is_valid():
				callback.call(ok, "" if ok else _error_or_default(error, "PocketBase login failed"))
	)

func sign_up(email: String, password: String, callback: Callable = Callable()) -> void:
	_request_json(
		"%s/api/collections/users/records" % shared_url,
		"POST",
		{"email": email, "password": password, "passwordConfirm": password},
		false,
		func(_payload: Variant, error: String) -> void:
			if error != "":
				if callback.is_valid():
					callback.call(false, error)
				return
			sign_in_with_password(email, password, callback)
	)

func auth_refresh(callback: Callable = Callable()) -> void:
	if not has_authenticated_session():
		if callback.is_valid():
			callback.call(false, "No PocketBase session")
		return
	_request_json(
		"%s/api/collections/users/auth-refresh" % shared_url,
		"POST",
		{},
		true,
		func(payload: Variant, error: String) -> void:
			var ok := error == "" and typeof(payload) == TYPE_DICTIONARY and _apply_auth_payload(payload)
			if callback.is_valid():
				callback.call(ok, "" if ok else _error_or_default(error, "PocketBase auth refresh failed"))
	)

func save_game_state(game_state: Dictionary, callback: Callable = Callable()) -> void:
	if not has_authenticated_session():
		if callback.is_valid():
			callback.call(false, "Sign in required")
		return
	_request_json(
		"%s/api/landnam/state" % landnam_url,
		"POST",
		{
			"save_version": 1,
			"game_state": game_state,
			"client_updated_at": Time.get_datetime_string_from_system(true),
		},
		true,
		func(payload: Variant, error: String) -> void:
			if callback.is_valid():
				callback.call(error == "", error, payload)
	)

func load_game_state(callback: Callable = Callable()) -> void:
	if not has_authenticated_session():
		if callback.is_valid():
			callback.call({}, "Sign in required")
		return
	_request_json(
		"%s/api/landnam/state" % landnam_url,
		"GET",
		{},
		true,
		func(payload: Variant, error: String) -> void:
			var game_state := {}
			if error == "" and typeof(payload) == TYPE_DICTIONARY:
				var payload_dict: Dictionary = payload
				var state_record = payload_dict.get("state", {})
				if typeof(state_record) == TYPE_DICTIONARY:
					var state_record_dict: Dictionary = state_record
					var raw_state = state_record_dict.get("game_state", {})
					if typeof(raw_state) == TYPE_DICTIONARY:
						game_state = raw_state
			if callback.is_valid():
				callback.call(game_state, error)
	)

func _apply_auth_payload(payload: Dictionary) -> bool:
	var token := str(payload.get("token", "")).strip_edges()
	var record = payload.get("record", {})
	if typeof(record) != TYPE_DICTIONARY:
		return false
	var record_dict: Dictionary = record
	var user_id := str(record_dict.get("id", "")).strip_edges()
	var email := str(record_dict.get("email", "")).strip_edges()
	return set_auth_session(token, user_id, email)

func _persist_auth_session() -> void:
	var file := FileAccess.open(AUTH_SESSION_PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify({
		"token": _auth_token,
		"user_id": _auth_user_id,
		"email": _auth_email,
	}))
	file.close()

func _load_auth_session() -> void:
	if not FileAccess.file_exists(AUTH_SESSION_PATH):
		return
	var file := FileAccess.open(AUTH_SESSION_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	var data: Dictionary = parsed
	set_auth_session(str(data.get("token", "")), str(data.get("user_id", "")), str(data.get("email", "")))

func _request_json(url: String, method: String, body: Dictionary, include_auth: bool, callback: Callable) -> void:
	if OS.has_feature("web"):
		_request_json_web(url, method, body, include_auth, callback)
	else:
		_request_json_native(url, method, body, include_auth, callback)

func _request_json_native(url: String, method: String, body: Dictionary, include_auth: bool, callback: Callable) -> void:
	var http := HTTPRequest.new()
	var loop = Engine.get_main_loop()
	if loop and loop.root:
		loop.root.add_child(http)
	var headers := PackedStringArray(["Content-Type: application/json"])
	if include_auth:
		headers.append("Authorization: Bearer " + _auth_token)
	var request_body := "" if method == "GET" else JSON.stringify(body)
	http.request_completed.connect(func(result: int, response_code: int, _headers: PackedStringArray, body_bytes: PackedByteArray) -> void:
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS:
			callback.call({}, "HTTP request failed: result=%d" % result)
			return
		var text := body_bytes.get_string_from_utf8()
		var parsed = JSON.parse_string(text) if text != "" else {}
		if response_code < 200 or response_code >= 300:
			var message := _extract_error(parsed, "PocketBase request failed: code=%d" % response_code)
			callback.call(parsed, message)
			return
		callback.call(parsed, "")
	)
	var err := http.request(url, headers, HTTPClient.METHOD_GET if method == "GET" else HTTPClient.METHOD_POST, request_body)
	if err != OK:
		http.queue_free()
		callback.call({}, "HTTP request setup failed: %d" % err)

func _request_json_web(url: String, method: String, body: Dictionary, include_auth: bool, callback: Callable) -> void:
	var callback_name := "__landnam_pb_cb_%d" % Time.get_ticks_usec()
	var callback_ref = JavaScriptBridge.create_callback(func(args: Array) -> void:
		_web_callbacks.erase(callback_name)
		JavaScriptBridge.eval("try{delete window.%s;}catch(_e){}" % callback_name, true)
		var raw := str(args[0]) if args.size() > 0 else ""
		if raw.begins_with("__ERR__"):
			callback.call({}, raw.substr(7))
			return
		var parsed = JSON.parse_string(raw)
		callback.call(parsed if parsed != null else {}, "")
	)
	_web_callbacks[callback_name] = callback_ref
	JavaScriptBridge.get_interface("window").set(callback_name, callback_ref)
	var headers := {"Content-Type": "application/json"}
	if include_auth:
		headers["Authorization"] = "Bearer " + _auth_token
	var options := {
		"method": method,
		"headers": headers,
	}
	if method != "GET":
		options["body"] = JSON.stringify(body)
	var js := "(async function(){try{const r=await fetch(%s,%s);const t=await r.text();if(!r.ok){window[%s]('__ERR__'+(t||('PocketBase status '+r.status)));return;}window[%s](t||'{}');}catch(e){window[%s]('__ERR__'+(e&&e.message?e.message:String(e)));}})();" % [
		JSON.stringify(url),
		JSON.stringify(options),
		JSON.stringify(callback_name),
		JSON.stringify(callback_name),
		JSON.stringify(callback_name),
	]
	JavaScriptBridge.eval(js, true)

static func _extract_error(payload: Variant, fallback: String) -> String:
	if typeof(payload) == TYPE_DICTIONARY:
		var data: Dictionary = payload
		var message := str(data.get("message", data.get("error", ""))).strip_edges()
		if message != "":
			return message
	return fallback

static func _error_or_default(error: String, fallback: String) -> String:
	return fallback if error.strip_edges() == "" else error
