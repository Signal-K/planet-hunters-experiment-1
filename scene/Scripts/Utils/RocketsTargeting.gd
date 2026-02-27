extends RefCounted
class_name RocketsTargeting

static func normalize_target_type(value: String) -> String:
    var t = value.strip_edges().to_lower()
    if t == "planets":
        return "planet"
    if t == "asteroids":
        return "asteroid"
    if t == "planet" or t == "asteroid":
        return t
    return "asteroid"

static func select_visible_targets(
    source: Array,
    targeted_ids: Dictionary,
    desired_type: String,
    visible_count: int,
    fallback: Dictionary = {}
) -> Array:
    var out := []
    for target in source:
        if typeof(target) != TYPE_DICTIONARY:
            continue
        var target_type = normalize_target_type(str(target.get("type", "asteroid")))
        if target_type != desired_type:
            continue
        var target_id = str(target.get("id", ""))
        if target_id == "" or targeted_ids.has(target_id):
            continue
        out.append(target)
        if out.size() >= visible_count:
            break
    if out.is_empty() and not fallback.is_empty():
        out.append(fallback)
    return out
