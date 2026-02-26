extends Control

const NavigationMixin = preload("res://Scripts/Utils/NavigationMixin.gd")

signal mining_completed(minerals: Dictionary, score: int)

const SCROLL_SPEED = 120.0
const TERRAIN_SEGMENT_WIDTH = 20
const ROCKET_Y = 200
const FUEL_DRAIN_RATE = 2.0
const HEAT_GAIN_RATE = 25.0
const HEAT_COOL_RATE = 18.0
const ASTEROID_DURATION = 90.0
const PLANET_DURATION = 180.0
const MAX_DRONES = 3
const DRONE_COOLDOWN = 5.0

enum GuideStep {
	INTRO,
	MINE_SURFACE_IRON,
	MINE_SURFACE_NICKEL,
	EXPLAIN_SUBSURFACE,
	DEPLOY_DRONE,
	COMPLETE
}

var _terrain_points: PackedVector2Array = []
var _mineral_regions: Array = []
var _scroll_offset = 0.0
var _terrain_width = 4000
var _loop_count = 0
var _is_mining = false
var _fuel = 100.0
var _heat = 0.0
var _beam_charges = 100.0
var _max_beam_charges = 100.0
var _score = 0
var _combo = 0
var _collected_minerals = {}
var _frame_index = 0
var _frame_timer = 0.0
var _elapsed_time = 0.0
var _target_duration = ASTEROID_DURATION
var _is_planet = false
var _rocket_name = "StarterRocket1"
var _rocket_level = 1
var _current_target_id = ""

@onready var terrain_container: Node2D = $TerrainContainer
@onready var terrain_fill: Polygon2D = $TerrainContainer/TerrainFill
@onready var terrain_line: Line2D = $TerrainContainer/TerrainLine
@onready var rocket: Sprite2D = $Rocket
@onready var laser: Line2D = $Laser
@onready var fuel_bar: ProgressBar = $UI/TopBar/LeftGauges/FuelPanel/VBox/FuelBar
@onready var heat_bar: ProgressBar = $UI/TopBar/LeftGauges/HeatPanel/VBox/HeatBar
@onready var beam_bar: ProgressBar = $UI/TopBar/LeftGauges/BeamPanel/VBox/BeamBar
@onready var beam_label: Label = $UI/TopBar/LeftGauges/BeamPanel/VBox/Label
@onready var score_label: Label = $UI/TopBar/RightStats/ScorePanel/ScoreLabel
@onready var rocket_label: Label = $UI/TopBar/RightStats/RocketPanel/Label
@onready var fire_button: Button = $UI/FireButton
@onready var instructions: Label = $UI/Instructions
@onready var particles_container: Node2D = $ParticlesContainer
@onready var drone_pool: Node2D = $DronePool
@onready var inventory_panel: PanelContainer = $UI/InventoryPanel
@onready var inventory_label: Label = $UI/InventoryPanel/InventoryLabel
@onready var inventory_button: Button = $UI/InventoryButton
@onready var drone_label: Label = $UI/TopBar/LeftGauges/DronePanel/VBox/DroneLabel
@onready var return_button: Button = $UI/ReturnButton

var _rocket_frames = []
var _guide_step = GuideStep.INTRO
var _guide_active = true
var _guide_paused = false
var _drones_available = MAX_DRONES
var _drone_cooldown_timer = 0.0
var _active_drones = []
var _surface_mined_count = 0
var _scroll_speed_multiplier = 1.0
var _target_minerals: Dictionary = {}
var _target_mineable_pct: float = 0.5

func _ready():
	_load_rocket_frames()
	_setup_rocket()
	_generate_terrain()
	laser.visible = false
	fire_button.pressed.connect(_on_fire_pressed)
	fire_button.button_up.connect(_on_fire_released)
	inventory_button.pressed.connect(_toggle_inventory)
	return_button.pressed.connect(_on_return_pressed)
	
	fire_button.visible = OS.has_feature("mobile")
	inventory_button.visible = OS.has_feature("mobile")
	inventory_panel.visible = false
	_update_drone_display()
	
	if not Engine.is_editor_hint():
		_show_guide_step()

func start_mining(is_planet: bool = false, difficulty: int = 1, target_id: String = "", minerals: Dictionary = {}, mineable_pct: float = 0.5):
	_is_planet = is_planet
	_target_duration = PLANET_DURATION if is_planet else ASTEROID_DURATION
	_elapsed_time = 0.0
	_current_target_id = target_id
	_rocket_level = difficulty
	_target_minerals = minerals
	_target_mineable_pct = mineable_pct
	
	# Regenerate terrain with target seed and difficulty
	_generate_terrain()
	
	# Beam charges based on difficulty level
	_max_beam_charges = 20.0 + (difficulty * 10.0)
	_beam_charges = _max_beam_charges
	
	# Update UI after scene is ready
	call_deferred("_update_rocket_ui")

func _update_rocket_ui():
	if rocket_label:
		rocket_label.text = "Level %d" % _rocket_level
	if beam_bar:
		beam_bar.value = 100.0

func _load_rocket_frames():
	for i in range(1, 9):
		var frame = load("res://assets/Vehicles/StarterRocketStage2Frame%d.png" % i)
		_rocket_frames.append(frame)

func _setup_rocket():
	rocket.texture = _rocket_frames[0]
	rocket.position = Vector2(250, ROCKET_Y)
	rocket.scale = Vector2(0.27, 0.27)  # 80% larger (0.15 * 1.8)
	rocket.rotation = deg_to_rad(90)

func _generate_terrain():
	var rng = RandomNumberGenerator.new()
	var NebulaTheme = preload("res://Resources/NebulaSciTheme.gd")
	
	# Use target ID as seed if available
	if _current_target_id != "":
		rng.seed = _current_target_id.hash()
	else:
		rng.randomize()
	
	var screen_height = get_viewport_rect().size.y
	var segments = int(_terrain_width / TERRAIN_SEGMENT_WIDTH)
	
	_terrain_points.clear()
	
	var base_height = screen_height - 250
	var prev_height = base_height
	
	# Higher difficulty = more varied terrain
	var difficulty_multiplier = 1.0 + (_rocket_level * 0.15)
	
	for i in range(segments + 1):
		var x = i * TERRAIN_SEGMENT_WIDTH
		
		# Random height variation (increases with difficulty)
		var height_change = rng.randf_range(-25, 25) * difficulty_multiplier
		
		# Occasional sharp peaks/valleys (more frequent at higher difficulty)
		var peak_chance = 0.08 + (_rocket_level * 0.01)
		if rng.randf() < peak_chance:
			height_change = rng.randf_range(-100, -60) * difficulty_multiplier  # Sharp peak up
		elif rng.randf() < (0.05 + _rocket_level * 0.005):
			height_change = rng.randf_range(40, 80) * difficulty_multiplier  # Valley down
		
		prev_height = clamp(prev_height + height_change, screen_height - 380, screen_height - 120)
		_terrain_points.append(Vector2(x, prev_height))
	
	terrain_line.points = _terrain_points
	terrain_line.width = 4
	terrain_line.default_color = Color(0.85, 0.55, 0.35, 0.9)  # Orange desert outline
	terrain_line.joint_mode = Line2D.LINE_JOINT_SHARP
	terrain_line.antialiased = true
	
	var fill_points = PackedVector2Array()
	fill_points.append_array(_terrain_points)
	fill_points.append(Vector2(_terrain_width, screen_height))
	fill_points.append(Vector2(0, screen_height))
	terrain_fill.polygon = fill_points
	terrain_fill.color = Color(0.65, 0.35, 0.25, 1.0)  # Orange-brown desert ground
	
	_add_surface_rocks(rng)
	_generate_minerals(rng)

func _add_surface_rocks(rng: RandomNumberGenerator):
	# Use pre-created rock pool from scene instead of runtime creation
	var rock_pool = terrain_container.get_node_or_null("RockPool")
	if not rock_pool:
		push_warning("RockPool not found in scene - rocks will not be generated")
		return
	
	var rocks = rock_pool.get_children()
	var rock_count = min(50, rocks.size())
	
	for i in range(rock_count):
		var rock = rocks[i]
		if not rock is Polygon2D:
			continue
			
		var x = rng.randf_range(100, _terrain_width - 100)
		var y = _get_terrain_y_at(x)
		var size = rng.randf_range(10, 25)
		
		# Generate polygon points
		var points = PackedVector2Array()
		var num_points = rng.randi_range(4, 6)
		
		for j in range(num_points):
			var angle = (float(j) / num_points) * TAU + rng.randf_range(-0.3, 0.3)
			var radius = size * rng.randf_range(0.6, 1.2)
			points.append(Vector2(x + cos(angle) * radius, y - abs(sin(angle) * radius) - size * 0.3))
		
		rock.polygon = points
		rock.visible = true

func _generate_minerals(rng: RandomNumberGenerator):
	# Use target's actual minerals if available
	var mineral_types = []
	if not _target_minerals.is_empty():
		for mineral_name in _target_minerals.keys():
			var amount = _target_minerals[mineral_name]
			if amount > 0:
				mineral_types.append({
					"name": mineral_name,
					"color": _get_mineral_color(mineral_name),
					"value": amount
				})
	
	# Fallback to default minerals if none provided
	if mineral_types.is_empty():
		mineral_types = [
			{"name": "Iron", "color": Color(0.9, 0.4, 0.2), "value": 10},
			{"name": "Nickel", "color": Color(0.7, 0.7, 0.5), "value": 15},
			{"name": "Cobalt", "color": Color(0.3, 0.5, 1.0), "value": 25},
			{"name": "Platinum", "color": Color(1.0, 1.0, 0.8), "value": 50}
		]
	
	var screen_height = get_viewport_rect().size.y
	
	# If guide active, place guaranteed deposits near start
	if _guide_active:
		# Surface deposit 1 (Iron) at 600px
		_create_mineral_deposit(600, 100, mineral_types[0], true, screen_height)
		# Surface deposit 2 (Nickel) at 1000px
		if mineral_types.size() > 1:
			_create_mineral_deposit(1000, 100, mineral_types[1], true, screen_height)
		# Subsurface deposit (Cobalt) at 1400px
		if mineral_types.size() > 2:
			_create_mineral_deposit(1400, 100, mineral_types[2], false, screen_height)
	
	# Generate deposits based on mineable_pct (more mineable = more deposits)
	var deposit_count = int(30 + (_target_mineable_pct * 20))
	var start_x = 1800 if _guide_active else 300
	
	for i in range(deposit_count):
		var x = rng.randf_range(start_x, _terrain_width - 200)
		var width = rng.randf_range(60, 120)
		var mineral = mineral_types[rng.randi() % mineral_types.size()]
		var is_surface = rng.randf() < _target_mineable_pct
		
		_create_mineral_deposit(x, width, mineral, is_surface, screen_height)

func _get_mineral_color(mineral_name: String) -> Color:
	match mineral_name.to_lower():
		"iron": return Color(0.9, 0.4, 0.2)
		"nickel": return Color(0.7, 0.7, 0.5)
		"cobalt": return Color(0.3, 0.5, 1.0)
		"platinum": return Color(1.0, 1.0, 0.8)
		"gold": return Color(1.0, 0.84, 0.0)
		"silver": return Color(0.75, 0.75, 0.75)
		"copper": return Color(0.72, 0.45, 0.2)
		"titanium": return Color(0.5, 0.5, 0.6)
		_: return Color(0.6, 0.6, 0.6)

var _mineral_pool_index = 0

func _create_mineral_deposit(x: float, width: float, mineral: Dictionary, is_surface: bool, screen_height: float):
	# Use pre-created mineral pool from scene instead of runtime creation
	var mineral_pool = terrain_container.get_node_or_null("MineralPool")
	if not mineral_pool:
		push_warning("MineralPool not found in scene - minerals will not be generated")
		return
	
	var minerals = mineral_pool.get_children()
	if _mineral_pool_index >= minerals.size():
		push_warning("Mineral pool exhausted - increase pool size in scene")
		return
	
	var poly = minerals[_mineral_pool_index]
	_mineral_pool_index += 1
	
	if not poly is Polygon2D:
		return
	
	var y_at_x = _get_terrain_y_at(x)
	var depth = 0 if is_surface else randf_range(40, 120)
	
	poly.polygon = PackedVector2Array([
		Vector2(x, y_at_x + depth - 10),
		Vector2(x + width, _get_terrain_y_at(x + width) + depth - 10),
		Vector2(x + width, screen_height),
		Vector2(x, screen_height)
	])
	poly.color = mineral.color
	if not is_surface:
		poly.modulate = Color(0.7, 0.7, 0.7, 0.8)
	poly.visible = true
	
	_mineral_regions.append({
		"x": x,
		"width": width,
		"mineral": mineral,
		"poly": poly,
		"collected": false,
		"is_surface": is_surface
	})

func _get_terrain_y_at(x: float) -> float:
	var segment = int(x / TERRAIN_SEGMENT_WIDTH)
	if segment >= _terrain_points.size() - 1:
		return _terrain_points[-1].y
	
	var t = fmod(x, TERRAIN_SEGMENT_WIDTH) / TERRAIN_SEGMENT_WIDTH
	var y1 = _terrain_points[segment].y
	var y2 = _terrain_points[segment + 1].y
	return lerp(y1, y2, t)

func _process(delta):
	_elapsed_time += delta
	
	# Animate particles from pool
	_animate_particles(delta)
	
	# Check if we should slow down for guide
	if _guide_active:
		_check_guide_slowdown()
	
	# Apply speed multiplier
	_scroll_offset += SCROLL_SPEED * _scroll_speed_multiplier * delta
	
	# Loop terrain seamlessly
	if _scroll_offset >= _terrain_width:
		_scroll_offset = fmod(_scroll_offset, _terrain_width)
		_loop_count += 1
		_reset_minerals()
	
	# Position both terrain instances for seamless loop
	terrain_container.position.x = -_scroll_offset
	
	# Check if we need to show the loop (when near end)
	if _scroll_offset > _terrain_width * 0.5:
		# We're in second half, prepare for loop by resetting visuals
		pass
	
	_frame_timer += delta
	if _frame_timer >= 0.1:
		_frame_timer = 0.0
		_frame_index = (_frame_index + 1) % _rocket_frames.size()
		rocket.texture = _rocket_frames[_frame_index]
	
	_fuel -= FUEL_DRAIN_RATE * delta
	fuel_bar.value = _fuel
	
	beam_bar.value = (_beam_charges / _max_beam_charges) * 100.0
	if beam_label:
		beam_label.text = "BEAM: %d" % int(_beam_charges)
	
	# Check for fuel depletion
	if _fuel <= 0:
		_fuel = 0
		fuel_bar.value = 0
		return_button.text = "FUEL DEPLETED - RETURN"
		return_button.modulate = Color(1, 0.5, 0.5, 1)
	elif _beam_charges <= 0:
		return_button.text = "BEAM DEPLETED - RETURN"
		return_button.modulate = Color(1, 0.7, 0.3, 1)
	
	if _drone_cooldown_timer > 0:
		_drone_cooldown_timer -= delta
		if _drone_cooldown_timer <= 0:
			_update_drone_display()
	
	if _guide_active:
		_update_guide(delta)
	
	if _is_mining and _beam_charges > 0:
		_heat = min(100, _heat + HEAT_GAIN_RATE * delta)
		_fire_laser()
	else:
		_heat = max(0, _heat - HEAT_COOL_RATE * delta)
		laser.visible = false
		if _heat == 0 and _combo > 0:
			_combo = 0
			score_label.text = "Score: %d" % _score
	
	heat_bar.value = _heat
	
	# Allow inventory check anytime
	if Input.is_key_pressed(KEY_E):
		if not inventory_panel.visible:
			inventory_panel.visible = true
			_update_inventory_display()
	else:
		inventory_panel.visible = false
	
	if not _guide_active:
		if Input.is_action_pressed("ui_accept") and not OS.has_feature("mobile"):
			_is_mining = true
		elif Input.is_action_just_released("ui_accept"):
			_is_mining = false
		
		if Input.is_key_pressed(KEY_D) and _drones_available > 0 and _drone_cooldown_timer <= 0:
			_deploy_drone()
	
	if _elapsed_time >= _target_duration:
		_complete_mining()

func _fire_laser():
	laser.visible = true
	var laser_start = rocket.position
	var laser_end = Vector2(rocket.position.x, get_viewport_rect().size.y)
	
	laser.clear_points()
	laser.add_point(laser_start)
	laser.add_point(laser_end)
	laser.width = 6
	laser.default_color = Color(0.2, 0.9, 1.0).lerp(Color(1.0, 0.2, 0.2), _heat / 100.0)
	
	_check_mineral_hit()

func _check_mineral_hit():
	var rocket_x = fmod(rocket.position.x + _scroll_offset, _terrain_width)
	
	for region in _mineral_regions:
		if region.collected:
			continue
		
		if not region.is_surface:  # Skip subsurface deposits
			continue
		
		if rocket_x >= region.x and rocket_x <= region.x + region.width:
			region.collected = true
			region.poly.modulate = Color(0.4, 0.4, 0.4, 0.5)
			
			# Reduce beam charge by 1 per mineral collected
			_beam_charges = max(0, _beam_charges - 1)
			
			if _guide_active:
				_surface_mined_count += 1
			
			_combo += 1
			var points = region.mineral.value * _combo
			_score += points
			
			if not _collected_minerals.has(region.mineral.name):
				_collected_minerals[region.mineral.name] = 0
			_collected_minerals[region.mineral.name] += 1
			
			_spawn_particles(region)
			
			_fuel = min(100, _fuel + 5)
			score_label.text = "Score: %d (x%d COMBO)" % [_score, _combo]
			break

var _particle_pool_index = 0

func _animate_particles(delta: float):
	"""Animate particles in the pool (currently using tweens, so this is a placeholder)"""
	# Particles are animated via tweens in _spawn_particles
	# This function exists to prevent parse errors
	pass

func _spawn_particles(region):
	# Use pre-created particle pool from scene instead of runtime creation
	var particle_pool = particles_container.get_node_or_null("ParticlePool")
	if not particle_pool:
		return
	
	var particles = particle_pool.get_children()
	var particle_count = 8
	var region_center_x = region.x + region.width / 2.0
	var region_y = _get_terrain_y_at(region_center_x)
	
	for i in range(particle_count):
		if _particle_pool_index >= particles.size():
			_particle_pool_index = 0  # Wrap around and reuse
		
		var particle = particles[_particle_pool_index]
		_particle_pool_index += 1
		
		if not particle is ColorRect:
			continue
		
		particle.size = Vector2(4, 4)
		particle.color = region.mineral.color
		
		var start_x = region_center_x + randf_range(-region.width / 2, region.width / 2)
		particle.position = Vector2(start_x - _scroll_offset, region_y)
		particle.visible = true
		
		var tween = create_tween()
		tween.tween_property(particle, "position", rocket.position, 0.3).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tween.tween_callback(func(): particle.visible = false)

func _on_fire_pressed():
	_is_mining = true

func _on_fire_released():
	_is_mining = false

func _toggle_inventory():
	inventory_panel.visible = !inventory_panel.visible
	if inventory_panel.visible:
		_update_inventory_display()

func _update_inventory_display():
	var text = "MINERALS COLLECTED\n\n"
	if _collected_minerals.is_empty():
		text += "Nothing yet...\n"
	else:
		for mineral_name in _collected_minerals:
			text += "%s: %d\n" % [mineral_name, _collected_minerals[mineral_name]]
	text += "\nScore: %d" % _score
	inventory_label.text = text

func _complete_mining():
	mining_completed.emit(_collected_minerals, _score)

func _show_guide_step():
	var tween = create_tween()
	tween.set_parallel(true)
	
	instructions.modulate.a = 0.0
	instructions.scale = Vector2(0.8, 0.8)
	
	match _guide_step:
		GuideStep.INTRO:
			instructions.text = "Welcome! Mine colored minerals as you fly over the asteroid."
			_guide_paused = false  # Keep flying
		GuideStep.MINE_SURFACE_IRON:
			instructions.text = "ORANGE = Iron (10pts). Hold SPACE to mine surface deposits!"
			_guide_paused = false  # Keep flying until near deposit
		GuideStep.MINE_SURFACE_NICKEL:
			instructions.text = "YELLOW = Nickel (15pts). Mine another surface deposit!"
			_guide_paused = false  # Keep flying until near deposit
		GuideStep.EXPLAIN_SUBSURFACE:
			instructions.text = "DARKER deposits are underground. Use drones to reach them!"
			_guide_paused = false  # Keep flying
		GuideStep.DEPLOY_DRONE:
			instructions.text = "Press D to deploy a drone at the next dark deposit!"
			_guide_paused = false  # Keep flying until near subsurface
		GuideStep.COMPLETE:
			instructions.text = "Great! Continue mining. Watch FUEL and HEAT!"
			_guide_paused = false
			_guide_active = false
	
	tween.tween_property(instructions, "modulate:a", 1.0, 0.4).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(instructions, "scale", Vector2(1.0, 1.0), 0.4).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

func _update_guide(delta):
	if Input.is_action_pressed("ui_accept") and not OS.has_feature("mobile"):
		_is_mining = true
	elif Input.is_action_just_released("ui_accept"):
		_is_mining = false
	
	if Input.is_key_pressed(KEY_D) and _drones_available > 0 and _drone_cooldown_timer <= 0:
		if _guide_step == GuideStep.DEPLOY_DRONE:
			_deploy_drone()
			await get_tree().create_timer(2.0).timeout
			_guide_step = GuideStep.COMPLETE
			_show_guide_step()
	
	match _guide_step:
		GuideStep.INTRO:
			await get_tree().create_timer(3.0).timeout
			_guide_step = GuideStep.MINE_SURFACE_IRON
			_show_guide_step()
		GuideStep.MINE_SURFACE_IRON:
			if _surface_mined_count >= 1:
				await get_tree().create_timer(1.0).timeout
				_guide_step = GuideStep.MINE_SURFACE_NICKEL
				_show_guide_step()
		GuideStep.MINE_SURFACE_NICKEL:
			if _surface_mined_count >= 2:
				await get_tree().create_timer(1.0).timeout
				_guide_step = GuideStep.EXPLAIN_SUBSURFACE
				_show_guide_step()
		GuideStep.EXPLAIN_SUBSURFACE:
			await get_tree().create_timer(3.0).timeout
			_guide_step = GuideStep.DEPLOY_DRONE
			_show_guide_step()

func _deploy_drone():
	var drone = _acquire_drone_from_pool()
	if drone == null:
		return

	_drones_available -= 1
	_drone_cooldown_timer = DRONE_COOLDOWN
	_update_drone_display()
	_active_drones.append(drone)

	drone.deploy(rocket.position)
	var exploded_cb = Callable(self, "_on_drone_exploded")
	if not drone.exploded.is_connected(exploded_cb):
		drone.exploded.connect(exploded_cb)
	
	var subsurface_target = _find_subsurface_target()
	if subsurface_target:
		drone.set_target(subsurface_target)

func _acquire_drone_from_pool() -> Node:
	if drone_pool == null:
		push_warning("DronePool not found - cannot deploy drone")
		return null
	var drones = drone_pool.get_children()
	if drones.is_empty():
		push_warning("DronePool is empty - add drone instances in scene")
		return null
	for drone in drones:
		if drone.has_method("is_available_for_deploy") and bool(drone.is_available_for_deploy()):
			return drone
	return null

func _find_subsurface_target():
	var rocket_x = fmod(rocket.position.x + _scroll_offset, _terrain_width)
	var search_range = 400
	
	for region in _mineral_regions:
		if region.collected:
			continue
		
		if region.is_surface:  # Skip surface deposits
			continue
		
		var region_center = region.x + region.width / 2
		var distance = abs(region_center - rocket_x)
		
		if distance < search_range:
			return region
	
	return null

func _on_drone_exploded(pos: Vector2):
	_score += 50

func _check_guide_pause():
	# Renamed to _check_guide_slowdown - see below
	pass

func _check_guide_slowdown():
	var rocket_x = fmod(rocket.position.x + _scroll_offset, _terrain_width)
	var slowdown_range = 120
	
	for region in _mineral_regions:
		if region.collected:
			continue
		
		# Check if rocket is near this deposit
		var distance_to_start = abs(region.x - rocket_x)
		var distance_to_end = abs((region.x + region.width) - rocket_x)
		var min_distance = min(distance_to_start, distance_to_end)
		
		# Also check if we're inside the deposit
		var inside = rocket_x >= region.x and rocket_x <= (region.x + region.width)
		
		if inside or min_distance < slowdown_range:
			# Slow down if this is a relevant deposit for current guide step
			if _guide_step == GuideStep.MINE_SURFACE_IRON and region.is_surface and _surface_mined_count == 0:
				_scroll_speed_multiplier = 0.3
				return
			elif _guide_step == GuideStep.MINE_SURFACE_NICKEL and region.is_surface and _surface_mined_count == 1:
				_scroll_speed_multiplier = 0.3
				return
			elif _guide_step == GuideStep.DEPLOY_DRONE and not region.is_surface:
				_scroll_speed_multiplier = 0.3
				return
	
	# No relevant deposit nearby, normal speed
	_scroll_speed_multiplier = 1.0

func _update_drone_display():
	var cooldown_text = ""
	if _drone_cooldown_timer > 0:
		cooldown_text = " (%.1fs)" % _drone_cooldown_timer
	drone_label.text = "DRONES: %d/%d%s\n[D] to deploy" % [_drones_available, MAX_DRONES, cooldown_text]

func _reset_minerals():
	# Reset collected state and regenerate positions
	_mineral_pool_index = 0
	for region in _mineral_regions:
		region.collected = false
		region.poly.visible = true
		region.poly.modulate = Color(1, 1, 1, 1)

func _on_return_pressed():
	# Complete mining early and return to preview
	_complete_mining()
