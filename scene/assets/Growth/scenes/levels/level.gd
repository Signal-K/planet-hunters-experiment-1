extends Node2D

var plant_scene = preload("res://Scenes/Objects/plant.tscn")
var plant_info_scene = preload("res://Scenes/UI/plant_info.tscn")
var used_cells: Array[Vector2i]
var raining: bool = false:
	set(value):
		raining = value
		$Layers/RainFloorParticles.emitting = value
		$Overlay/RainDropsParticles.emitting = value

@export var daytime_color: Gradient
@export var rain_color: Color

@onready var player = $Objects/Player

func _ready() -> void:
	$Timers/DayTimer.timeout.connect(day_restart)
	
	Data.forecast_rain = [true, false].pick_random()

func _on_player_tool_use(tool: Enums.Tool, pos: Vector2) -> void:
	print("Received tool_use signal: ", tool, " at position ", pos)
	# Convert world position to grid coordinates for each layer
	# Layers with offset (GrassLayer, SoilLayer, SoilWaterLayer) at position (186, 342)
	var layer_offset = $Layers/GrassLayer.position
	print("Layer offset: ", layer_offset, " Tile size: ", Data.TILE_SIZE)
	
	# Adjust position by layer offset before converting to grid coordinates
	var adjusted_pos = pos - layer_offset
	var grid_coord: Vector2i = Vector2i(
		floor(adjusted_pos.x / Data.TILE_SIZE),
		floor(adjusted_pos.y / Data.TILE_SIZE)
	)
	
	# WaterLayer has no position offset
	var water_grid_coord: Vector2i = Vector2i(
		floor(pos.x / Data.TILE_SIZE),
		floor(pos.y / Data.TILE_SIZE)
	)
	print("Adjusted position: ", adjusted_pos, " -> grid_coord: ", grid_coord)
	
	var has_soil = grid_coord in $Layers/SoilLayer.get_used_cells()
	
	match tool:
		Enums.Tool.HOE:
			print("HOE tool used at grid_coord: ", grid_coord)
			var grass_cells = $Layers/GrassLayer.get_used_cells()
			var has_grass = grid_coord in grass_cells
			print("Has grass at position: ", has_grass, " grass_cells: ", grass_cells)
			
			if has_grass:
				print("Removing grass and placing soil")
				# Remove grass and place soil at the same coordinate
				$Layers/GrassLayer.erase_cell(grid_coord)
				# Also erase water that might be below
				$Layers/WaterLayer.erase_cell(water_grid_coord)
				$Layers/SoilLayer.set_cell(grid_coord, 0, Vector2i(1, 1))
			
		Enums.Tool.WATER:
			print("WATER tool used, has_soil: ", has_soil, " at grid_coord: ", grid_coord)
			if has_soil:
				print("Watering soil - placing watered soil layer")
				# Remove any layers that might be underneath
				$Layers/GrassLayer.erase_cell(grid_coord)
				$Layers/WaterLayer.erase_cell(water_grid_coord)
				# Place watered soil tile on top of the existing soil
				$Layers/SoilWaterLayer.set_cell(grid_coord, 0, Vector2i(randi_range(0, 2), 0))
		
		Enums.Tool.FISH: 
			if not grid_coord in  $Layers/GrassLayer.get_used_cells():
				pass 
				
		Enums.Tool.SEED:
			if has_soil and grid_coord not in used_cells:
				var plant_res = PlantResource.new()
				plant_res.setup($Objects/Player.current_seed)
				
				var plant = plant_scene.instantiate()
				plant.setup(grid_coord, $Objects, plant_res)
				
				# Calculate the center of the tile
				var tile_center = Vector2(grid_coord) * Data.TILE_SIZE + Vector2(Data.TILE_SIZE / 2.0, Data.TILE_SIZE / 2.0) + layer_offset
				plant.position = tile_center
				$Objects.add_child(plant)
				plant.coord = grid_coord
				used_cells.append(grid_coord)
				
				var plant_info = plant_info_scene.instantiate()
				# Configure the instantiated PlantInfo UI (no setup() on PanelContainer)
				# Use the resource's icon and name (icon_texture is a Texture2D)
				plant_info.get_node("HBoxContainer/IconTexture").texture = plant_res.icon_texture
				plant_info.get_node("HBoxContainer/VBoxContainer/NameLabel").text = plant_res.name
				# Initialize bars (Growth starts at 0, Death at 0)
				plant_info.get_node("HBoxContainer/VBoxContainer/GrowthBar").value = 0
				plant_info.get_node("HBoxContainer/VBoxContainer/DeathBar").value = 0
				$Overlay/CanvasLayer/PlantInfoContainer.add(plant_info)
		
		Enums.Tool.AXE, Enums.Tool.SWORD:
			for object in get_tree().get_nodes_in_group("Objects"):
				if object.position.distance_to(pos) < 20:
					object.hit(tool)

func _process(_delta: float) -> void:
	var daytime_point = 1 - ($Timers/DayTimer.time_left / $Timers/DayTimer.wait_time)
	var color = daytime_color.sample(daytime_point).lerp(rain_color, 0.5 if raining else 0.0)
	$Overlay/DayTimeColour.color = color

func day_restart():
	var tween = create_tween()
	tween.tween_property($Overlay/CanvasLayer/DayTransitionLayer.material, "shader_parameter/progress", 1.0, 1.0)
	tween.tween_interval(0.5)
	tween.tween_callback(level_reset)
	tween.tween_property($Overlay/CanvasLayer/DayTransitionLayer.material, "shader_parameter/progress", 0.0, 1.0)
	
func level_reset():
	var watered_cells = $Layers/SoilWaterLayer.get_used_cells()
	print("Level reset - watered cells: ", watered_cells)
	for plant in get_tree().get_nodes_in_group('Plants'):
		var is_watered = plant.coord in watered_cells
		print("Plant at ", plant.coord, " watered: ", is_watered)
		plant.grow(is_watered)
		
	# Remove watered layers each day
	$Layers/SoilWaterLayer.clear()
	
	$Timers/DayTimer.start()
	for object in get_tree().get_nodes_in_group('Objects'):
		if 'reset' in object:
			object.reset()
			
	raining = Data.forecast_rain
	Data.forecast_rain = [true, false].pick_random()
	
	if raining:
		for cell in $Layers/SoilLayer.get_used_cells():
			$Layers/SoilWaterLayer.set_cell(cell, 0, Vector2i(randi_range(0,2), 0))
