extends PanelContainer

signal slot_selected(slot_index)

@onready var itemInfo = $ItemInfo

var seedDataResource: SeedData
var slot_index: int = 0

func setup(value):
	seedDataResource = value
	seedDataResource.quantity_changed.connect(_on_quantity_changed)
	itemInfo.set_item_info(seedDataResource.get_texture(), seedDataResource.get_quantity())

func _on_texture_button_button_down():
	emit_signal("slot_selected", slot_index)
	
func update_quantity() -> void:
	itemInfo.set_label(seedDataResource.get_quantity())
	
func _on_quantity_changed(new_quantity) -> void:
	itemInfo.set_label(new_quantity)

func play_slot_item_empty() -> void:
	$ItemInfo.play_flash_animation()
