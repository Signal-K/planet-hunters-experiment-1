extends CanvasLayer
## MechanicIntroOverlay.gd
## Full-screen mechanic introduction overlay (light-themed, two-column layout).
## Shown exactly once per mechanic via FirstTimeMechanicTracker.
##
## Content dict keys: title, mechanic_name, icon, overview, steps (Array[String]),
##                    targeting, efficiency, schematic_label, protocol, auth

const DIALOG_LAYER := 128
static var StepRowScene: PackedScene = load("res://Scenes/UI/Templates/MechanicIntroStepRow.tscn") if ResourceLoader.exists("res://Scenes/UI/Templates/MechanicIntroStepRow.tscn") else null

@onready var protocol_label: Label   = $Center/Panel/OuterVBox/HeaderBar/HeaderRow/ProtocolLabel
@onready var coord_label: Label      = $Center/Panel/OuterVBox/HeaderBar/HeaderRow/CoordLabel
@onready var title_label: Label      = $Center/Panel/OuterVBox/Content/ContentVBox/TitleRow/TitleLabel
@onready var mechanic_name: Label    = $Center/Panel/OuterVBox/Content/ContentVBox/TitleRow/MechanicName
@onready var overview_body: Label    = $Center/Panel/OuterVBox/Content/ContentVBox/MainHBox/LeftCol/OverviewBody
@onready var targeting_label: Label  = $Center/Panel/OuterVBox/Content/ContentVBox/MainHBox/LeftCol/StatRow/TargetingCard/StatVBox/StatValue
@onready var efficiency_label: Label = $Center/Panel/OuterVBox/Content/ContentVBox/MainHBox/LeftCol/StatRow/EfficiencyCard/StatVBox/StatValue
@onready var steps_list: VBoxContainer = $Center/Panel/OuterVBox/Content/ContentVBox/MainHBox/LeftCol/StepsList
@onready var schematic_label: Label  = $Center/Panel/OuterVBox/Content/ContentVBox/MainHBox/RightCol/SchematicPanel/SchematicVBox/SchematicTitle
@onready var stability_bar: ProgressBar = $Center/Panel/OuterVBox/Content/ContentVBox/MainHBox/RightCol/SchematicPanel/SchematicVBox/StabilityRow/StabilityBar
@onready var thermal_bar: ProgressBar   = $Center/Panel/OuterVBox/Content/ContentVBox/MainHBox/RightCol/SchematicPanel/SchematicVBox/ThermalRow/ThermalBar
@onready var commence_btn: Button    = $Center/Panel/OuterVBox/ButtonBar/ButtonRow/CommenceButton
@onready var acknowledge_btn: Button = $Center/Panel/OuterVBox/ButtonBar/ButtonRow/AcknowledgeButton
@onready var auth_label: Label       = $Center/Panel/OuterVBox/FooterBar/FooterRow/AuthLabel

func _ready() -> void:
	layer = DIALOG_LAYER
	commence_btn.pressed.connect(_on_commence)
	acknowledge_btn.pressed.connect(_on_dismiss)

## Populate overlay from a content dictionary.
## Minimum keys: title, mechanic_name (the cyan part)
func show_intro(content: Dictionary) -> void:
	var proto := str(content.get("protocol", "MISSION PROTOCOL // INDUSTRIAL_EXP"))
	var auth  := str(content.get("auth", "LINK_STATE: 100%  AUTH: CMD_07"))
	protocol_label.text = "🚀  " + proto
	auth_label.text = auth

	title_label.text = str(content.get("title", "MECHANIC UNLOCKED:"))
	mechanic_name.text = str(content.get("mechanic_name", "NEW FEATURE"))
	overview_body.text = str(content.get("overview", ""))
	targeting_label.text = str(content.get("targeting", "—"))
	efficiency_label.text = str(content.get("efficiency", "—"))
	schematic_label.text = str(content.get("schematic_label", "SCHEMATIC_V1"))

	var stability := float(content.get("stability", 88))
	var thermal   := float(content.get("thermal", 42))
	stability_bar.value = stability
	thermal_bar.value = thermal
	_update_bar_label(stability_bar, stability)
	_update_bar_label(thermal_bar, thermal)

	# Populate steps
	for child in steps_list.get_children():
		child.queue_free()
	var steps: Array = content.get("steps", [])
	for i in steps.size():
		var row: HBoxContainer = StepRowScene.instantiate()
		var num: Label = row.get_node("StepNumber")
		var txt: Label = row.get_node("StepText")
		num.text = "%02d" % (i + 1)
		txt.text = str(steps[i])
		steps_list.add_child(row)

func _update_bar_label(bar: ProgressBar, val: float) -> void:
	var pct_lbl: Label = bar.get_parent().get_node_or_null("PctLabel")
	if pct_lbl:
		pct_lbl.text = "%.0f%%" % val

func _on_commence() -> void:
	queue_free()

func _on_dismiss() -> void:
	queue_free()
