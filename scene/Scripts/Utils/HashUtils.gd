extends RefCounted
class_name HashUtils

static func simple_hash(value: String) -> int:
	var hash := 0
	for i in range(value.length()):
		hash = int((hash * 31 + value.unicode_at(i)) & 0x7fffffff)
	return max(hash, 1)
