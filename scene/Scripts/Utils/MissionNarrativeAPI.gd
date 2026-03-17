extends RefCounted
## MissionNarrativeAPI.gd
## Calls the local web server's /api/generate-mission endpoint to generate
## AI-written mission narrative text (title, description, contractor quote).
##
## Usage:
##   MissionNarrativeAPI.generate(params, callable(result: Dictionary))
##
## Result dict keys: "title", "description", "contractor_quote"
## A fallback result is always returned even on failure.

const SERVER_BASE := "http://127.0.0.1:4173"
const ENDPOINT := "/api/generate-mission"

## Static in-memory cache so results persist across panel rebuilds.
static var _cache: Dictionary = {}

## history: contractor_id → Array[String] of last-5 contractor_quotes (mirrors server)
static var _history: Dictionary = {}

static func _make_cache_key(p: Dictionary) -> String:
	return "%s|%s|%s|%s|%s|%s" % [
		str(p.get("contractor_id", "")),
		str(p.get("mission_type", "")),
		str(p.get("mineral", "")),
		str(p.get("quantity", "")),
		str(p.get("target_label", "")),
		str(p.get("payout_tier", ""))
	]

## Generate mission narrative. Callback receives a Dictionary with
## keys: title, description, contractor_quote.
## If a cached result exists the callback fires synchronously (next frame via
## call_deferred), otherwise an HTTPRequest is made and the callback fires
## when the server responds.
static func generate(params: Dictionary, callback: Callable) -> void:
	var key := _make_cache_key(params)
	if _cache.has(key):
		callback.call_deferred(_cache[key])
		return
	_fire_request(params, key, callback)

static func _fallback(params: Dictionary) -> Dictionary:
	var mineral := str(params.get("mineral", "minerals"))
	var target := str(params.get("target_label", "the target"))
	var qty := int(params.get("quantity", 100))
	return {
		"title": "Extraction — %s" % target,
		"description": "Retrieve %d kg of %s from %s. Standard extraction protocols apply." % [qty, mineral, target],
		"contractor_quote": "We're counting on you to deliver. Good luck out there.",
	}

static func _fire_request(params: Dictionary, key: String, callback: Callable) -> void:
	var body_bytes := JSON.stringify(params).to_utf8_buffer()

	var http := HTTPRequest.new()
	# Attach to the scene tree root so it can process
	var tree = Engine.get_main_loop() as SceneTree
	if tree == null or tree.root == null:
		callback.call_deferred(_fallback(params))
		return
	tree.root.add_child(http)

	var headers := [
		"Content-Type: application/json",
		"Content-Length: %d" % body_bytes.size(),
	]

	http.request_completed.connect(
		func(result: int, _code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
			http.queue_free()
			if result != HTTPRequest.RESULT_SUCCESS:
				callback.call(_fallback(params))
				return
			var text := body.get_string_from_utf8()
			var json_result = JSON.parse_string(text)
			if typeof(json_result) != TYPE_DICTIONARY:
				callback.call(_fallback(params))
				return
			var narrative: Dictionary = json_result
			# Cache result
			_cache[key] = narrative
			# Track variety history (mirror server-side)
			var cid := str(params.get("contractor_id", ""))
			if cid != "":
				var hist: Array = _history.get(cid, [])
				hist.append(str(narrative.get("contractor_quote", "")))
				if hist.size() > 5:
					hist = hist.slice(hist.size() - 5)
				_history[cid] = hist
			callback.call(narrative)
	)

	var err := http.request(
		SERVER_BASE + ENDPOINT,
		headers,
		HTTPClient.METHOD_POST,
		body_bytes.get_string_from_utf8()
	)
	if err != OK:
		http.queue_free()
		callback.call(_fallback(params))
