extends Control
## FreeOpsUnlockOverlay.gd
## Full-screen "Free Operations" dashboard shown when tutorial completes.
## Light-themed grid layout: sectors, queues, selected asset, partners, fleet.
##
## Emits cta_pressed when START RUN is clicked.

signal cta_pressed

@onready var start_run_btn: Button  = $RootVBox/BottomBar/BottomRow/StartRunButton
@onready var logs_btn: Button       = $RootVBox/BottomBar/BottomRow/LogsButton
@onready var title_label: Label     = $RootVBox/ContentMargin/ContentVBox/TitleRow/TitleLabel
@onready var title_desc: Label      = $RootVBox/ContentMargin/ContentVBox/TitleRow/TitleDesc

func _ready() -> void:
	start_run_btn.pressed.connect(_on_start_run)
	logs_btn.pressed.connect(_on_logs)

func _on_start_run() -> void:
	cta_pressed.emit()
	queue_free()

func _on_logs() -> void:
	pass  # integrate with game log system if needed
