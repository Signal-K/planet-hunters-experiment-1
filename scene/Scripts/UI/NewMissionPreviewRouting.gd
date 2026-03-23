extends RefCounted
class_name NewMissionPreviewRouting

const OUTBOUND_PREVIEW_SCENE_PATH := "res://Scenes/Transitions/rocket_transit.tscn"
const ARRIVED_PREVIEW_SCENE_PATH := "res://Scenes/UI/AsteroidPreview/asteroid_preview.tscn"
const RETURN_PREVIEW_SCENE_PATH := "res://Scenes/Transitions/rocket_return.tscn"
const RETURNED_DIRECT_SCENE_PATH := "res://Scenes/Earth/mission_debrief_v2.tscn"

static func resolve_scene_path(status: String, has_arrived: bool) -> String:
	if status == "returningHome":
		return RETURN_PREVIEW_SCENE_PATH
	if status == "returned":
		return RETURNED_DIRECT_SCENE_PATH
	if has_arrived:
		return ARRIVED_PREVIEW_SCENE_PATH
	return OUTBOUND_PREVIEW_SCENE_PATH
