extends RefCounted
## PushNotificationHelper.gd
## Schedules push notifications via the shell postMessage bridge.
## Works in web export only — silently no-ops in native/headless.
##
## Usage:
##   PushNotificationHelper.schedule_rocket_arrival("mission_abc", 3600)
##   PushNotificationHelper.schedule_construction_complete("cargo_bay", 7200)
##   PushNotificationHelper.schedule_contractor_cooldown_end("aria", 86400)


static func _post_schedule(tag: String, delay_secs: float, title: String, body: String) -> void:
	if not OS.has_feature("web"):
		return
	var payload := {
		"tag": tag,
		"delay_ms": int(delay_secs * 1000),
		"title": title,
		"body": body,
		"url": "/",
	}
	JavaScriptBridge.eval(
		"window.parent && window.parent.postMessage({source:'landnam',event:'schedule_push',payload:%s}, '*')" \
		% JSON.stringify(payload)
	)


static func schedule_rocket_arrival(mission_id: String, duration_secs: float) -> void:
	_post_schedule(
		"rocket_arrival_%s" % mission_id,
		duration_secs,
		"Rocket arrived!",
		"Your rocket has reached its destination. Time to collect the haul."
	)


static func schedule_construction_complete(room_id: String, duration_secs: float) -> void:
	_post_schedule(
		"construction_%s" % room_id,
		duration_secs,
		"Construction complete",
		"Your base upgrade is ready. Check in to activate it."
	)


static func schedule_contractor_cooldown_end(contractor_id: String, duration_secs: float) -> void:
	_post_schedule(
		"cooldown_%s" % contractor_id,
		duration_secs,
		"Contractor ready",
		"A contractor is ready to take your next mission. Don't keep them waiting."
	)
