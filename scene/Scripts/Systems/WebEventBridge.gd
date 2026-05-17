class_name WebEventBridge
extends RefCounted

## Lightweight bridge for sending gameplay events from Godot Web runtime
## to the parent web shell.

static func emit(event_name: String, payload: Dictionary = {}) -> void:
	if event_name.strip_edges() == "":
		return
	if not OS.has_feature("web"):
		return

	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		return

	var body := {
		"source": "landnam",
		"event": event_name,
		"timestamp": Time.get_unix_time_from_system(),
		"payload": payload
	}
	var body_js = JSON.stringify(body)
	var js = "(function(){try{window.parent.postMessage(%s, window.location.origin);}catch(_e){}})();" % [body_js]
	JavaScriptBridge.eval(js, true)
