extends RefCounted
class_name NumberFormat

static func commas(value: String) -> String:
	var out := ""
	var count := 0
	for i in range(value.length() - 1, -1, -1):
		out = value[i] + out
		count += 1
		if count % 3 == 0 and i > 0:
			out = "," + out
	return out
