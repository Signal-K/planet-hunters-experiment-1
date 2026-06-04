extends SceneTree
## Capture review screenshots of the three redesigned scenes.
## Run: DISPLAY=:99 godot --path scene --script tests/run_scene_screenshots.gd

const OUT_DIR := "user://scene_screenshots"
const RocketsManager  := preload("res://Scripts/Utils/RocketsManager.gd")
const AppControllerPersistence := preload("res://Scripts/Systems/AppControllerPersistence.gd")

func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(OUT_DIR)
	_reset_state()
	call_deferred("_run")

func _reset_state() -> void:
	AppControllerPersistence.new().reset_all()

func _run() -> void:
	await _capture_freeops_overlay()
	await _capture_tutorial_overlay()
	await _capture_debrief()
	print("Done. Screenshots saved to: ", OUT_DIR)
	quit()

# ── FreeOpsUnlockOverlay ──────────────────────────────────────────────────────

func _capture_freeops_overlay() -> void:
	print("Capturing FreeOpsUnlockOverlay...")
	var node: Node = load("res://Scenes/UI/FreeOpsUnlockOverlay.tscn").instantiate()
	root.add_child(node)
	await process_frame
	await process_frame
	_save("FreeOpsUnlockOverlay")
	node.queue_free()
	await process_frame

# ── TutorialCoachOverlay ──────────────────────────────────────────────────────
# Needs a dark backdrop (it's a CanvasLayer, renders over nothing standalone).
# Seed a tutorial step so PointBar shows, and also force CoachCard visible.

func _capture_tutorial_overlay() -> void:
	print("Capturing TutorialCoachOverlay (PointBar)...")
	var bg := ColorRect.new()
	bg.color = Color(0.047, 0.071, 0.122, 1.0)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var bgLayer := CanvasLayer.new()
	bgLayer.layer = 0
	bgLayer.add_child(bg)
	root.add_child(bgLayer)

	var overlay: Node = load("res://Scenes/UI/TutorialCoachOverlay.tscn").instantiate()
	root.add_child(overlay)
	await process_frame
	await process_frame

	# Force PointBar visible with step data via the overlay's public API
	var point_card = overlay.get_node_or_null("Root/PointBar")
	var pb_title   = overlay.get_node_or_null("Root/PointBar/PBMargin/PBRow/PBText/PBTitle")
	var pb_action  = overlay.get_node_or_null("Root/PointBar/PBMargin/PBRow/PBText/PBAction")
	var pb_dots    = overlay.get_node_or_null("Root/PointBar/PBMargin/PBRow/PBText/PBDots")
	if point_card and pb_title and pb_action:
		overlay.visible = true
		point_card.visible = true
		pb_title.text  = "Choose a destination"
		pb_action.text = "→ Tap an asteroid on the map, then tap Proceed"
		pb_action.visible = true
		if pb_dots:
			# Build 9 dots, step 2 active
			for ch in pb_dots.get_children():
				ch.queue_free()
			await process_frame
			for i in range(9):
				var dot := Panel.new()
				var s := StyleBoxFlat.new()
				s.set_corner_radius_all(999)
				if i < 2:
					dot.custom_minimum_size = Vector2(6, 6)
					s.bg_color = Color(0.224, 0.827, 0.416, 1.0)
				elif i == 2:
					dot.custom_minimum_size = Vector2(16, 6)
					s.bg_color = Color(0.961, 0.651, 0.137, 1.0)
				else:
					dot.custom_minimum_size = Vector2(6, 6)
					s.bg_color = Color(0.529, 0.812, 0.980, 0.25)
				dot.add_theme_stylebox_override("panel", s)
				dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
				pb_dots.add_child(dot)

	await process_frame
	await process_frame
	_save("TutorialCoachOverlay_PointBar")

	# Now show the CoachCard (INFO mode)
	if point_card:
		point_card.visible = false
	var coach_card  = overlay.get_node_or_null("Root/CoachCard")
	var cc_title    = overlay.get_node_or_null("Root/CoachCard/CCMargin/CCVBox/CCTitle")
	var cc_body     = overlay.get_node_or_null("Root/CoachCard/CCMargin/CCVBox/CCBody")
	var cc_coach    = overlay.get_node_or_null("Root/CoachCard/CCMargin/CCVBox/CCHeader/CCHeaderText/CCCoachLabel")
	var cc_cta      = overlay.get_node_or_null("Root/CoachCard/CCMargin/CCVBox/CCButtonRow/CCCta")
	var dimmer      = overlay.get_node_or_null("Root/Dimmer")
	if coach_card and cc_title and cc_body:
		coach_card.visible = true
		if dimmer:
			dimmer.visible = true
		if cc_coach:
			cc_coach.text = "MISSION COACH"
		cc_title.text = "Mission complete"
		cc_body.text  = "Your rocket is back. Open the Debrief to sell cargo and collect payment."
		if cc_cta:
			cc_cta.text = "Open Debrief"

	await process_frame
	await process_frame
	_save("TutorialCoachOverlay_CoachCard")

	overlay.queue_free()
	bgLayer.queue_free()
	await process_frame

# ── MissionDebriefV2 ──────────────────────────────────────────────────────────
# Seed a complete returned mission so the full debrief UI renders.

func _capture_debrief() -> void:
	print("Capturing MissionDebriefV2...")
	# Seed a rocket
	var rockets_state := RocketsManager.load_state()
	rockets_state["rockets"] = {
		"rocket_preview_1": {
			"id": "rocket_preview_1",
			"name": "Horizon I",
			"fuel": 1.0,
			"wear_points": 0,
			"active": true,
			"customization": {}
		}
	}
	RocketsManager.save_state(rockets_state)

	# Seed a returned mission with cargo
	RocketsManager.set_returned_mission(
		"rocket_preview_1",
		"2000480_juno",
		"3 Juno",
		"asteroid",
		"contract",
		{
			"mining_run_collected": {"iron": 340, "nickel": 210, "cobalt": 55},
			"trip_contractor_id": "contractor_a",
			"starter_contract_context": {
				"active": true,
				"id": "contractor_a",
				"name": "Arcturus Mining Co.",
				"requested_minerals": {"iron": 300, "nickel": 200}
			}
		}
	)

	await process_frame

	var node: Node = load("res://Scenes/Earth/mission_debrief_v2.tscn").instantiate()
	root.add_child(node)
	# Wait for _ready + deferred calls to complete
	await process_frame
	await process_frame
	await process_frame
	_save("MissionDebriefV2")
	node.queue_free()
	RocketsManager.clear_returned_mission()
	await process_frame

# ── Helpers ───────────────────────────────────────────────────────────────────

func _save(label: String) -> void:
	var img := root.get_viewport().get_texture().get_image()
	if img == null:
		print("  ERROR: no image for ", label)
		return
	var path := "%s/%s.png" % [OUT_DIR, label]
	if img.save_png(path) == OK:
		print("  Saved: ", path)
	else:
		print("  SAVE FAILED: ", path)
