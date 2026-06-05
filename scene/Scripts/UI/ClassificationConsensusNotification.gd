extends "res://Scripts/UI/BaseDialogLayer.gd"
## ClassificationConsensusNotification.gd
## Dark sci-fi modal: shows batch classification consensus results.
##
## Call show_results(entries, exp_gained, rank) after instantiating.
## entries: Array of ClassificationConsensus dicts (anomaly_id, consensus_verdict, …)

const ClassificationConsensus = preload("res://Scripts/Utils/ClassificationConsensus.gd")

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
static var TargetCardScene: PackedScene = load("res://Scenes/UI/Templates/TargetClassificationCard.tscn") if ResourceLoader.exists("res://Scenes/UI/Templates/TargetClassificationCard.tscn") else null

@onready var sync_label: Label          = $Center/Panel/VBox/StatusBar/Row/SyncLabel
@onready var batch_label: Label         = $Center/Panel/VBox/Content/VBox/BatchLabel
@onready var targets_row: HBoxContainer = $Center/Panel/VBox/Content/VBox/TargetsRow
@onready var exp_label: Label           = $Center/Panel/VBox/Content/VBox/BottomRow/ExpCol/ExpVBox/ValueRow/ExpLabel
@onready var rank_label: Label          = $Center/Panel/VBox/Content/VBox/BottomRow/ExpCol/ExpVBox/ValueRow/RankLabel
@onready var exp_col: PanelContainer    = $Center/Panel/VBox/Content/VBox/BottomRow/ExpCol
@onready var acknowledge_btn: Button    = $Center/Panel/VBox/Content/VBox/BottomRow/AcknowledgeButton
@onready var close_btn: Button          = $Center/Panel/VBox/Content/VBox/TitleRow/CloseButton

func _on_dialog_ready() -> void:
	PanelStyle.apply_outline_button(close_btn)
	close_btn.pressed.connect(close)
	PanelStyle.apply_outline_button(acknowledge_btn, PanelStyle.ACCENT, PanelStyle.ACCENT)
	acknowledge_btn.pressed.connect(_on_acknowledge)

## Populate and display classification results.
## entries: Array[Dictionary] — each has anomaly_id, consensus_verdict, player_verdict
## exp_gained: XP to display; 0 hides the exp row
## rank: rank string e.g. "Expert_IV"
func show_results(entries: Array, exp_gained: int = 0, rank: String = "") -> void:
	for child in targets_row.get_children():
		child.queue_free()

	var count := entries.size()
	batch_label.text = "— BATCH UPDATE: %d TARGET%s PROCESSED" % [count, "S" if count != 1 else ""]

	for entry in entries:
		var card: PanelContainer = TargetCardScene.instantiate()
		targets_row.add_child(card)
		_populate_card(card, entry)

	exp_col.visible = exp_gained > 0 or rank != ""
	if exp_gained > 0:
		exp_label.text = "+%s" % _fmt(exp_gained)
	if rank != "":
		rank_label.text = rank

func _populate_card(card: PanelContainer, entry: Dictionary) -> void:
	var id_lbl: Label    = card.get_node_or_null("VBox/HeaderRow/TargetIdLabel")
	var verdict: Label   = card.get_node_or_null("VBox/VerdictLabel")
	var badge: Control   = card.get_node_or_null("VBox/ActiveMissionBadge")

	var anomaly_id := str(entry.get("anomaly_id", "TIC-????"))
	var cv         := str(entry.get("consensus_verdict", ""))
	var is_active  := bool(entry.get("active_mission", false))

	if id_lbl:
		id_lbl.text = anomaly_id.to_upper()

	if verdict:
		match cv:
			"planet":
				verdict.text = "Agreement"
				verdict.add_theme_color_override("font_color", Color(0.086, 0.639, 0.290, 1.0))
			"not_planet":
				verdict.text = "Disagreement"
				verdict.add_theme_color_override("font_color", Color(0.863, 0.149, 0.149, 1.0))
			_:
				verdict.text = "Pending"
				verdict.add_theme_color_override("font_color", Color(0.392, 0.455, 0.545, 1.0))

	if badge:
		badge.visible = is_active

func _on_acknowledge() -> void:
	var ClassificationConsensus = ClassificationConsensus
	ClassificationConsensus.mark_all_notified()
	close()

static func _fmt(n: int) -> String:
	if n >= 1000:
		return "%d,%03d" % [n / 1000, n % 1000]
	return str(n)