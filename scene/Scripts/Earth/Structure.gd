# Structure.gd
# Base class for all interactive structures on Earth
class_name Structure
extends Node2D

@export var structure_name: String = "Structure"
@export var interactive: bool = true

var is_hovered: bool = false

func _ready() -> void:
	if interactive:
		_setup_interaction()

func _setup_interaction() -> void:
	"""Setup mouse input for this structure"""
	# Get the Area2D child that should be pre-created in the scene
	var area = get_node_or_null("InteractionArea")
	if not area:
		push_warning("InteractionArea not found in scene for: " + structure_name)
		push_warning("Add Area2D node named 'InteractionArea' with CollisionShape2D child to structure scene")
		return
	area.input_pickable = true
	
	# Connect area signals
	if not area.input_event.is_connected(_on_input_event):
		area.input_event.connect(_on_input_event)
	if not area.mouse_entered.is_connected(on_hover_enter):
		area.mouse_entered.connect(on_hover_enter)
	if not area.mouse_exited.is_connected(on_hover_exit):
		area.mouse_exited.connect(on_hover_exit)

func on_interact() -> void:
	"""Called when this structure is clicked/interacted with"""
	print("Interacting with: ", structure_name)

func on_hover_enter() -> void:
	"""Called when mouse enters structure"""
	is_hovered = true
	print("Hovering over: ", structure_name)

func on_hover_exit() -> void:
	"""Called when mouse leaves structure"""
	is_hovered = false
	print("Left: ", structure_name)

func _on_input_event(viewport: Node, event: InputEvent, shape_idx: int) -> void:
	"""Handle mouse input events"""
	print("Structure._on_input_event called for: ", structure_name, " event: ", event)
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			print("Mouse clicked on: ", structure_name)
			on_interact()
