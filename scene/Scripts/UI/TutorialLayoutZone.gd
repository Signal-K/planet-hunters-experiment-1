## TutorialLayoutZone.gd
## Thin wrapper kept for backward compatibility.
## All zone logic now lives in UILayout.gd — see that file for documentation.

extends RefCounted
class_name TutorialLayoutZone

const UILayout = preload("res://Scripts/UI/UILayout.gd")

const RESERVED_MARGIN := Vector2(24.0, 24.0)
const RESERVED_GAP    := 16.0

## The rect reserved for the tutorial coach panel (top-right corner).
static func reserved_rect(viewport_rect: Rect2) -> Rect2:
	return UILayout.zone(UILayout.Zone.TUTORIAL_COACH, viewport_rect.size)

## The rect available for game content (left of the tutorial panel).
static func content_rect(viewport_rect: Rect2) -> Rect2:
	var reserved := reserved_rect(viewport_rect)
	var left   := viewport_rect.position.x + RESERVED_MARGIN.x
	var top    := viewport_rect.position.y + RESERVED_MARGIN.y
	var right  := reserved.position.x - RESERVED_GAP
	var bottom := viewport_rect.end.y - RESERVED_MARGIN.y
	return Rect2(
		Vector2(left, top),
		Vector2(maxf(240.0, right - left), maxf(160.0, bottom - top))
	)
