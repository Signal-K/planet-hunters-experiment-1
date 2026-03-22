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

## Compact suffix notation: 1.2K, 3.4M, 5.6B.
## Used for prices and large integers where space is limited.
static func compact(value: int) -> String:
	if value >= 1000000000:
		return "%.1fB" % (float(value) / 1000000000.0)
	if value >= 1000000:
		return "%.1fM" % (float(value) / 1000000.0)
	if value >= 1000:
		return "%.1fK" % (float(value) / 1000.0)
	return str(value)
