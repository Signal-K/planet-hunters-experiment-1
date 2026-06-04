extends RefCounted
class_name TimeHelper

## Returns the current Unix epoch time as a float (seconds since 1970-01-01 UTC).
static func get_unix_epoch_seconds() -> float:
	return Time.get_unix_time_from_system()

## Returns the current Unix epoch time as an integer.
static func get_unix_epoch_seconds_int() -> int:
	return int(Time.get_unix_time_from_system())

## Returns a human-readable ISO-8601 datetime string for the given Unix timestamp.
static func format_unix(unix_time: int) -> String:
	var d := Time.get_datetime_dict_from_unix_time(unix_time)
	return "%04d-%02d-%02d %02d:%02d:%02d" % [
		d.year, d.month, d.day,
		d.hour, d.minute, d.second
	]
