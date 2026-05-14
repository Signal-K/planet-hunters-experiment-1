class_name FabricationBay
extends PanelContainer

@onready var module_rail: HBoxContainer       = $VBox/ModuleCanvas/ModuleRail
@onready var assembly_state_label: Label      = $VBox/Footer/FooterMargin/Row/ProgressFlow/AssemblyStep/AssemblyStateLabel
@onready var rocket_chooser: OptionButton     = $VBox/Footer/FooterMargin/Row/ProgressFlow/AssemblyStep/RocketChooser
@onready var modules_value: Label             = $VBox/Footer/FooterMargin/Row/RightGroup/StatsBox/ModulesCol/ModulesValue
@onready var range_value: Label               = $VBox/Footer/FooterMargin/Row/RightGroup/StatsBox/RangeCol/RangeValue

const C_CYAN  := Color(0.247, 0.663, 1.000, 1.0)
const C_AMBER := Color(0.961, 0.651, 0.137, 1.0)
const C_GREEN := Color(0.224, 0.827, 0.416, 1.0)

func clear_modules() -> void:
	for c in module_rail.get_children():
		c.queue_free()

func set_assembly_state(done: bool) -> void:
	assembly_state_label.text = "ASSEMBLY COMPLETE" if done else "ASSEMBLY PENDING"
	assembly_state_label.add_theme_color_override("font_color", C_CYAN if done else C_AMBER)

func set_stats(module_count: int, total_slots: int, range_str: String) -> void:
	modules_value.text = "%d / %d" % [module_count, total_slots]
	modules_value.add_theme_color_override("font_color", C_GREEN if module_count >= total_slots else C_AMBER)
	range_value.text = range_str
