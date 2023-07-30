extends Control

const TOOL_TEXTURES = {
	Enums.Tool.AXE: preload("res://assets/Growth/graphics/icons/axe.png"),
	Enums.Tool.HOE: preload("res://assets/Growth/graphics/icons/hoe.png"),
	Enums.Tool.WATER: preload("res://assets/Growth/graphics/icons/water.png"),
	Enums.Tool.SWORD: preload("res://assets/Growth/graphics/icons/sword.png"),
	Enums.Tool.FISH: preload("res://assets/Growth/graphics/icons/fish.png"),
	Enums.Tool.SEED: preload("res://assets/Growth/graphics/icons/wheat.png"),
}

const SEED_TEXTURES = {
	Enums.Seed.CORN: preload("res://assets/Growth/graphics/icons/corn.png"),
	Enums.Seed.PUMPKIN: preload("res://assets/Growth/graphics/icons/pumpkin.png"),
	Enums.Seed.TOMATO: preload("res://assets/Growth/graphics/icons/tomato.png"),
	Enums.Seed.WHEAT: preload("res://assets/Growth/graphics/icons/wheat.png")
}

var tool_texture_scene = preload("res://Scenes/UI/tool_ui_texture.tscn")

func _ready() -> void:
	for container in [$ToolContainer, $SeedContainer]:
		container.hide()
	
	texture_setup(Enums.Tool.values(), TOOL_TEXTURES, $ToolContainer)
	texture_setup(Enums.Seed.values(), SEED_TEXTURES, $SeedContainer)

	$HideTimer.wait_time = 1.0
	$HideTimer.timeout.connect(_on_hide_timer_timeout)
	
func texture_setup(enum_list: Array, textures: Dictionary, container: HBoxContainer):
	for enum_id in enum_list:
		var tool_texture = tool_texture_scene.instantiate()
		tool_texture.setup(enum_id, textures[enum_id])
		container.add_child(tool_texture)

func reveal(tool: bool):
	$HideTimer.start()
	var current_container = $ToolContainer if tool else $SeedContainer
	var target = get_parent().current_tool if tool else get_parent().current_seed
	
	for container in [$ToolContainer, $SeedContainer]:
		container.hide()
		
	current_container.show()
	
	for texture in current_container.get_children():
		texture.highlight(target == texture.tool_enum)

func _on_hide_timer_timeout() -> void:
	for container in [$ToolContainer, $SeedContainer]:
		container.hide()
