extends TileMap

@onready var player = $World/Player
@onready var grid_helper = $World/GridHelper

var currentSeed: SeedData
var plantedFlowers: Dictionary = {}

func _ready():
	# Connect the player's plantSeed signal
	player.plantSeed.connect(_on_player_plant_seed)
	
	Global.seed_changed.connect(_on_seed_changed)

func _physics_process(delta):
	# Get the player's map coordinate
	var playerMapCoord = local_to_map(player.global_position)
	
	# Calculate the tile in front of the player based on their direction
	var playerDir = player.direction
	var targetMapCoord = playerMapCoord
	
	if playerDir != Vector2.ZERO:
		# Convert direction to map offset (normalize and round)
		var dirOffset = Vector2i(round(playerDir.x), round(playerDir.y))
		targetMapCoord = playerMapCoord + dirOffset
	
	# Position the grid helper at the target tile
	grid_helper.global_position = map_to_local(targetMapCoord)

func _on_player_plant_seed():
	# Get the grid helper's current position in map coordinates
	var cellLocalCoord = local_to_map(grid_helper.global_position)
	
	# Check if there's a tile at layer 1 (garden layer) at this coordinate
	var tile: TileData = get_cell_tile_data(1, cellLocalCoord)

	if tile == null or currentSeed == null:
		return
	
	# Check if the tile has the "garden" custom data set to true
	if tile.get_custom_data("garden"):
		if not plantedFlowers.has(cellLocalCoord):
			if currentSeed.seed_left():
				currentSeed.subtract_quantity()
				plant_seed(cellLocalCoord)
			else:
				$HUD.inventory_is_slot_empty(currentSeed)
		elif is_harvestable(cellLocalCoord):
			harvest_plant(cellLocalCoord)
	
func is_harvestable(key) -> bool:
	var data = plantedFlowers.get(key)
	return  data.harvest_ready if data != null else false
		
func harvest_plant(key) -> void:
	var plant: Flower = plantedFlowers.get(key)
	if plant.has_method("harvest"):
		plant.harvest()
		plantedFlowers.erase(key)

func plant_seed(coord) -> void:
	var plant = currentSeed.plantScene.instantiate()
	
	plantedFlowers[coord] = plant
	get_node("World/Flower").add_child(plant)
	
	plant.global_position = map_to_local(coord)

func _on_seed_changed(new_seed) -> void:
	currentSeed = new_seed
