extends CanvasLayer
const DS = preload("res://Scripts/UI/DS.gd")
## MiningAcademyDialog.gd
## Post-mission academy debrief dialog (light-themed two-column panel).
##
## Call show_results(data) after instantiating, then add_child to tree.
## data keys: accuracy (float 0-100), resources (String), last_score (int),
##            pilot_rank (String), debrief (String), uptime (String)

signal dialog_closed

const DIALOG_LAYER := 85

@onready var academy_name_label: Label  = $Center/Panel/OuterVBox/Content/ContentHBox/LeftCol/AcademyCard/CardBody/InfoVBox/AcademyNameLabel
@onready var pilot_rank_label: Label    = $Center/Panel/OuterVBox/Content/ContentHBox/LeftCol/AcademyCard/CardBody/InfoVBox/PilotRankLabel
@onready var debrief_label: Label       = $Center/Panel/OuterVBox/Content/ContentHBox/LeftCol/AcademyCard/CardBody/InfoVBox/DebriefLabel
@onready var accuracy_value: Label      = $Center/Panel/OuterVBox/Content/ContentHBox/RightCol/StatsCard/StatsVBox/AccuracyValue
@onready var resources_value: Label     = $Center/Panel/OuterVBox/Content/ContentHBox/RightCol/StatsCard/StatsVBox/StatsRow/ResourcesVBox/ResourcesRow/ResourcesValue
@onready var score_value: Label         = $Center/Panel/OuterVBox/Content/ContentHBox/RightCol/StatsCard/StatsVBox/StatsRow/ScoreVBox/ScoreValue
@onready var back_button: Button        = $Center/Panel/OuterVBox/Content/ContentHBox/RightCol/BackButton
@onready var uptime_label: Label        = $Center/Panel/OuterVBox/FooterMargin/Footer/FooterRow/UptimeLabel

func _ready() -> void:
	layer = DIALOG_LAYER
	back_button.pressed.connect(close)
	_stamp_fonts(self)

func _stamp_fonts(node: Node) -> void:
	var disp := DS.font_display()
	if disp == null:
		return
	var vp_w := get_viewport().get_visible_rect().size.x
	var scale := clampf(vp_w / 480.0, 1.0, 2.5)
	for child in node.get_children():
		if child is Label:
			var lbl := child as Label
			lbl.add_theme_font_override("font", disp)
			var sz: int = lbl.theme_override_font_sizes.get("font_size", 0)
			if sz > 0 and sz < 20:
				lbl.add_theme_font_size_override("font_size", int(sz * scale))
		elif child is Button:
			(child as Button).add_theme_font_override("font", disp)
		if child.get_child_count() > 0:
			_stamp_fonts(child)

func show_results(data: Dictionary) -> void:
	var accuracy := float(data.get("accuracy", 94.2))
	var resources := str(data.get("resources", "0"))
	var last_score := int(data.get("last_score", 0))
	var rank := str(data.get("pilot_rank", "SENIOR PROSPECTOR"))
	var debrief := str(data.get("debrief", "Post-mission debrief complete. Neural link stability nominal at 98.4%."))
	var uptime := str(data.get("uptime", "00:00:00"))

	accuracy_value.text = "%.1f%%" % accuracy
	resources_value.text = resources
	score_value.text = "%s" % _fmt(last_score) if last_score > 0 else "—"
	pilot_rank_label.text = "● PILOT RANK: %s" % rank.to_upper()
	debrief_label.text = debrief
	uptime_label.text = "UPTIME: %s" % uptime

func close() -> void:
	dialog_closed.emit()
	queue_free()

static func _fmt(n: int) -> String:
	if n >= 1000:
		return "%d,%03d" % [n / 1000, n % 1000]
	return str(n)
