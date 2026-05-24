## UILayout.gd
## ════════════════════════════════════════════════════════════════════════════
## Central UI zone registry for Landnám.
##
## RULES — every UI author must follow these:
##
##   1. Every UI element belongs to exactly one zone.
##   2. Zones within the same scene context must NOT overlap.
##   3. No raw pixel magic-numbers in positioning code — derive all
##      coordinates from UILayout.zone() so they stay consistent.
##   4. Call UILayout.place(control, zone_rect) to apply a zone rect to
##      a free-floating Control.  For Controls inside Containers let the
##      Container size them; call place() only on top-level floating nodes.
##   5. Always call _apply_layout() (or equivalent) from the viewport-size-
##      changed signal so positions stay correct on every resize.
##
## ADDING A NEW ZONE:
##   • Add an entry to the Zone enum.
##   • Add a private static func _zone_name() below.
##   • Wire it into zone().
##   • Document which scene/context owns it.
##
## ════════════════════════════════════════════════════════════════════════════

class_name UILayout
extends RefCounted

## Minimum safe distance from any physical screen edge.
const EDGE := 12.0

## ─── Zone identifiers ────────────────────────────────────────────────────────
enum Zone {
	# ── Mining minigame ───────────────────────────────────────────────────────
	MINING_HUD,         ## Full-width top bar: gauges, stats, guide button.
	                    ## Nothing outside this bar may overlap the HUD area.
	MINING_INSTRUCTION, ## Centered text band immediately below the HUD.
	                    ## Used for tutorial guide instructions only.
	MINING_CONTRACT,    ## Centered contract-order panel, below INSTRUCTION.
	                    ## Hidden when no contract is active.
	MINING_ROOMS,       ## Rocket-rooms sidebar: TOP-LEFT, below HUD.
	                    ## Only created at level 5+. Sits on the left so it
	                    ## never conflicts with TUTORIAL_COACH (top-right).
	MINING_HANDBOOK,    ## Controls-guide dropdown panel: top-right, below HUD.
	                    ## Tutorial overlay is suspended during mining so there
	                    ## is no conflict with TUTORIAL_COACH in this context.
	MINING_BOTTOM,      ## Full-width bottom strip: Return / Fire / Inventory.
	MINING_MODAL,       ## Full-screen exclusive modal (Inventory panel, etc.)
	                    ## When open it covers everything; no other zone active.

	# ── Earth scene / global ──────────────────────────────────────────────────
	APP_HEADER,         ## Full-screen flow header lane.
	                    ## Can be narrowed by APP_HEADER_WITH_COACH when the
	                    ## tutorial coach is visible in the top-right sidecar.
	APP_HEADER_WITH_COACH, ## Header lane excluding TUTORIAL_COACH sidecar.
	APP_BODY,           ## Main scroll/content lane between header and footer.
	APP_BODY_WITH_COACH, ## Main content lane excluding TUTORIAL_COACH sidecar.
	APP_FOOTER,         ## Bottom action bar lane for full-screen flows.
	TUTORIAL_COACH,     ## Tutorial overlay panel: TOP-RIGHT corner.
	                    ## Owned exclusively by TutorialCoachOverlay.
	                    ## No other persistent element may occupy this zone.
	EARTH_WIDGET,       ## Small persistent widget for Earth scenes: TOP-LEFT.
	                    ## Used by FrancBalance. Must not overlap TUTORIAL_COACH.
}

## ─── Public API ──────────────────────────────────────────────────────────────

## Return the safe Rect2 for a zone given the current viewport size.
## Always call this inside _apply_layout() / _on_viewport_size_changed().
static func zone(z: Zone, vp: Vector2) -> Rect2:
	match z:
		Zone.MINING_HUD:         return _mining_hud(vp)
		Zone.MINING_INSTRUCTION: return _mining_instruction(vp)
		Zone.MINING_CONTRACT:    return _mining_contract(vp)
		Zone.MINING_ROOMS:       return _mining_rooms(vp)
		Zone.MINING_HANDBOOK:    return _mining_handbook(vp)
		Zone.MINING_BOTTOM:      return _mining_bottom(vp)
		Zone.MINING_MODAL:       return Rect2(Vector2.ZERO, vp)
		Zone.APP_HEADER:         return _app_header(vp)
		Zone.APP_HEADER_WITH_COACH: return _app_header_with_coach(vp)
		Zone.APP_BODY:           return _app_body(vp)
		Zone.APP_BODY_WITH_COACH: return _app_body_with_coach(vp)
		Zone.APP_FOOTER:         return _app_footer(vp)
		Zone.TUTORIAL_COACH:     return _tutorial_coach(vp)
		Zone.EARTH_WIDGET:       return _earth_widget(vp)
		_:
			push_warning("UILayout: unknown zone %d" % z)
			return safe_rect(vp)

## Apply a Rect2 zone to a free-floating Control using anchor=0 + offsets.
## The control must be a child of a full-viewport parent.
## After calling this the control will be exactly inside the zone rect.
static func place(ctrl: Control, r: Rect2) -> void:
	ctrl.set_anchor_and_offset(SIDE_LEFT,   0.0, r.position.x)
	ctrl.set_anchor_and_offset(SIDE_TOP,    0.0, r.position.y)
	ctrl.set_anchor_and_offset(SIDE_RIGHT,  0.0, r.position.x + r.size.x)
	ctrl.set_anchor_and_offset(SIDE_BOTTOM, 0.0, r.position.y + r.size.y)

## Clamp a Rect2 so it can never exit the visible viewport.
## Call this before place() if building dynamic/computed positions.
static func clamp_to_viewport(r: Rect2, vp: Vector2) -> Rect2:
	var w := minf(r.size.x, vp.x - EDGE * 2)
	var h := minf(r.size.y, vp.y - EDGE * 2)
	var x := clampf(r.position.x, EDGE, vp.x - w - EDGE)
	var y := clampf(r.position.y, EDGE, vp.y - h - EDGE)
	return Rect2(x, y, w, h)

## The largest usable rect that is guaranteed to be fully on-screen.
static func safe_rect(vp: Vector2) -> Rect2:
	return Rect2(EDGE, EDGE, vp.x - EDGE * 2, vp.y - EDGE * 2)

## Shared bottom clearance for controls that should never sit flush with the
## viewport edge. Mobile gets a larger lift to stay clear of browser chrome and
## the iOS home indicator; desktop still keeps a small visual gap.
static func bottom_clearance(vp: Vector2) -> float:
	if vp == Vector2.ZERO:
		return EDGE
	var short_side := minf(vp.x, vp.y)
	var aspect := vp.x / maxf(vp.y, 1.0)
	if aspect > 1.85:
		return 96.0
	if short_side <= 900.0:
		return 52.0
	return 28.0

## ─── Mining minigame zones ────────────────────────────────────────────────────

static func _mining_hud(vp: Vector2) -> Rect2:
	# Taller on desktop to give gauges room; shorter on mobile.
	var h := 72.0 if vp.x < 900 else 88.0
	return Rect2(EDGE, EDGE, vp.x - EDGE * 2, h)

static func _mining_instruction(vp: Vector2) -> Rect2:
	var hud := _mining_hud(vp)
	var w   := vp.x * 0.75
	return Rect2((vp.x - w) * 0.5, hud.end.y + 8.0, w, 48.0)

static func _mining_contract(vp: Vector2) -> Rect2:
	var instr := _mining_instruction(vp)
	var w     := clampf(vp.x * 0.52, 300.0, 620.0)
	# Taller to accommodate per-mineral progress bar rows (up to ~4 minerals).
	return Rect2((vp.x - w) * 0.5, instr.end.y + 6.0, w, 130.0)

static func _mining_rooms(vp: Vector2) -> Rect2:
	# TOP-LEFT so it never conflicts with TUTORIAL_COACH or MINING_HANDBOOK.
	var hud := _mining_hud(vp)
	var w   := clampf(vp.x * 0.22, 190.0, 280.0)
	var h   := clampf(vp.y * 0.34,  150.0, 240.0)
	return Rect2(EDGE, hud.end.y + 8.0, w, h)

static func _mining_handbook(vp: Vector2) -> Rect2:
	# TOP-RIGHT dropdown panel.  Tutorial is suspended in mining scenes so
	# this zone does not conflict with TUTORIAL_COACH during gameplay.
	var hud := _mining_hud(vp)
	var w   := clampf(vp.x * 0.30, 280.0, 420.0)
	return Rect2(vp.x - EDGE - w, hud.end.y + 80.0, w, 240.0)

static func _mining_bottom(vp: Vector2) -> Rect2:
	var h := 60.0
	var bottom_gap := bottom_clearance(vp)
	return Rect2(EDGE, vp.y - h - bottom_gap, vp.x - EDGE * 2, h)

## ─── Global / multi-scene zones ──────────────────────────────────────────────

static func _app_header(vp: Vector2) -> Rect2:
	var h := 64.0 if vp.x < 900.0 else 72.0
	return Rect2(0.0, 0.0, vp.x, h)

static func _app_footer(vp: Vector2) -> Rect2:
	var h := 84.0 if vp.x < 900.0 else 88.0
	return Rect2(0.0, maxf(0.0, vp.y - h), vp.x, h)

static func _app_body(vp: Vector2) -> Rect2:
	var header := _app_header(vp)
	var footer := _app_footer(vp)
	return Rect2(0.0, header.end.y, vp.x, maxf(0.0, footer.position.y - header.end.y))

static func _app_header_with_coach(vp: Vector2) -> Rect2:
	return _app_header(vp)

static func _app_body_with_coach(vp: Vector2) -> Rect2:
	return _app_body(vp)

static func _tutorial_coach(vp: Vector2) -> Rect2:
	# Top-right corner widget. Width must accommodate the header row:
	# title label + "Mission N" + restart + collapse buttons (~400 px at 22 px font).
	# Height must fit wrapped message + action hint + progress + CTA row.
	const MARGIN := 24.0
	var w := minf(440.0, maxf(400.0, vp.x * 0.23))
	var h := minf(360.0, maxf(300.0, vp.y * 0.34))
	return Rect2(vp.x - w - MARGIN, MARGIN, w, h)

static func _earth_widget(vp: Vector2) -> Rect2:
	# TOP-LEFT small widget.  Kept away from TUTORIAL_COACH (top-right).
	return Rect2(EDGE, EDGE, 200.0, 50.0)
