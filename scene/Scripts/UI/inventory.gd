extends PanelContainer

@export var slotScene: PackedScene
@export var seedResource:  SeedResource

@onready var selector_texture = $MarginContainer/SelectorTexture
@onready var grid_container = $MarginContainer/GridContainer

var current_slot_index: int = 0

func _ready():
	if seedResource == null:
		push_error("SeedResource is not assigned to Inventory!")
		return
		
	grid_container.columns = seedResource.get_size()
	add_new_slot(seedResource.get_seed_list())

func _input(event):
	# Handle number key selection (1-8)
	if event is InputEventKey and event.pressed and not event.echo:
		var slot_count = grid_container.get_child_count()
		if event.keycode >= KEY_1 and event.keycode <= KEY_8:
			var slot_num = event.keycode - KEY_1
			if slot_num < slot_count:
				select_slot(slot_num)
		# Handle Q/E keys for navigation (Q = previous, E = next)
		elif event.keycode == KEY_Q:
			select_slot(max(0, current_slot_index - 1))
		elif event.keycode == KEY_E:
			select_slot(min(slot_count - 1, current_slot_index + 1))
	
func add_new_slot(seedArray: Array[SeedData]) -> void:
	for child in seedArray:
		instance_slot(child)
	
	# Select first slot by default (deferred to ensure all connections are ready)
	if grid_container.get_child_count() > 0:
		call_deferred("select_slot", 0)
		
func _on_slot_selected(slot_index: int) -> void:
	select_slot(slot_index)
	
func update_inventory() -> void:
	for child in grid_container.get_children():
		child.update_quantity()

func select_slot(slot_index: int) -> void:
	current_slot_index = slot_index
	var slot = grid_container.get_child(slot_index)
	change_selected_slot(slot.position)
	Global.emit_signal("seed_changed", slot.seedDataResource)
	
func change_selected_slot(slot_pos) -> void:
	var margin_left = $MarginContainer.get_theme_constant("margin_left")
	var margin_top = $MarginContainer.get_theme_constant("margin_top")
	selector_texture.position.x = slot_pos.x + margin_left
	selector_texture.position.y = slot_pos.y + margin_top

func instance_slot(seedData: SeedData) -> void:
	var slot = slotScene.instantiate()
	grid_container.add_child(slot)
	var slot_index = grid_container.get_child_count() - 1
	slot.slot_index = slot_index
	slot.connect("slot_selected", _on_slot_selected)
	slot.setup(seedData)

func is_slot_empty(seedData: SeedData) -> void:
	for child in grid_container.get_children():
		if child.seedDataResource == seedData:
			child.play_slot_item_empty()
