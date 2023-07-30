extends CanvasLayer

@onready var flower_shop = $FlowerShop
@onready var inventory = $Inventory

@onready var screenSize = get_viewport().get_visible_rect().size

var inventory_hidden: bool = false

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("toggleInventory") and not flower_shop.visible: 
		inventory_hidden = not inventory_hidden
		toggle_inventory_ui()
		
func toggle_inventory_ui() -> void:
	create_tween().set_ease(Tween.EASE_IN_OUT).tween_property(
		inventory, "position:y",
		screenSize.y + inventory.size.y if inventory_hidden else screenSize.y - inventory.size.y,
		0.5)

func setup_inventory() -> void:
	inventory.initialize()

func inventory_is_slot_empty(seed) -> void:
	inventory.is_slot_empty(seed)

func update_ui(value) -> void:
	flower_shop.visible = value
	inventory.visible = not value

func _on_texture_button_button_down():
	if not flower_shop.visible:
		Global.update_station.emit()
		flower_shop.get_node("Background/MarginContainer/ScrollContainer/StationContainer").update_plant_seed_quantity()
		flower_shop.scale = Vector2.ZERO
		var tween = create_tween().set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BOUNCE)
		tween.tween_callback(update_ui.bind(true))
		tween.tween_property(flower_shop, "scale", Vector2(1, 1), 0.25)
	else:
		inventory.update_inventory()
		var tween = create_tween().set_ease(Tween.EASE_OUT)
		tween.tween_property(flower_shop, "scale", Vector2.ZERO, 0.25)
		tween.tween_callback(update_ui.bind(false))
		inventory_hidden = false
		toggle_inventory_ui()
