extends RefCounted
class_name TutorialLayoutZone

const RESERVED_SIZE := Vector2(460.0, 280.0)
const RESERVED_MARGIN := Vector2(24.0, 24.0)
const RESERVED_GAP := 16.0

static func reserved_rect(viewport_rect: Rect2) -> Rect2:
	var width: float = minf(RESERVED_SIZE.x, maxf(220.0, viewport_rect.size.x * 0.32))
	var height: float = minf(RESERVED_SIZE.y, maxf(180.0, viewport_rect.size.y * 0.38))
	var size: Vector2 = Vector2(width, height)
	var pos: Vector2 = Vector2(
		viewport_rect.position.x + viewport_rect.size.x - size.x - RESERVED_MARGIN.x,
		viewport_rect.position.y + RESERVED_MARGIN.y
	)
	return Rect2(pos, size)

static func content_rect(viewport_rect: Rect2) -> Rect2:
	var reserved: Rect2 = reserved_rect(viewport_rect)
	var left: float = viewport_rect.position.x + RESERVED_MARGIN.x
	var top: float = viewport_rect.position.y + RESERVED_MARGIN.y
	var right: float = reserved.position.x - RESERVED_GAP
	var bottom: float = viewport_rect.end.y - RESERVED_MARGIN.y
	return Rect2(
		Vector2(left, top),
		Vector2(maxf(240.0, right - left), maxf(160.0, bottom - top))
	)
