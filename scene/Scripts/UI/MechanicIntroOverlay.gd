extends CanvasLayer
## MechanicIntroOverlay.gd
## Self-building overlay that introduces a new game mechanic to the player.
## Shown exactly once per mechanic via FirstTimeMechanicTracker.
##
## Content dict keys: title, icon, what, how, expect

const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")

@onready var background: ColorRect = $Background
@onready var panel: PanelContainer = $Center/Panel
@onready var icon_label: Label = $Center/Panel/VBox/TitleRow/IconLabel
@onready var title_label: Label = $Center/Panel/VBox/TitleRow/TitleLabel
@onready var separator: HSeparator = $Center/Panel/VBox/Separator
@onready var what_section: VBoxContainer = $Center/Panel/VBox/WhatSection
@onready var what_body: Label = $Center/Panel/VBox/WhatSection/Body
@onready var how_section: VBoxContainer = $Center/Panel/VBox/HowSection
@onready var how_body: Label = $Center/Panel/VBox/HowSection/Body
@onready var expect_section: VBoxContainer = $Center/Panel/VBox/ExpectSection
@onready var expect_body: Label = $Center/Panel/VBox/ExpectSection/Body
@onready var dismiss_button: Button = $Center/Panel/VBox/DismissButton

func _ready() -> void:
	layer = 128  # above HUD, below system alerts
	separator.add_theme_color_override("color", Color(0.3, 0.5, 0.8, 0.4))
	PanelStyle.apply_button(dismiss_button, true)
	dismiss_button.pressed.connect(_on_dismiss)

func show_intro(content: Dictionary) -> void:
	var icon_str := str(content.get("icon", "")).strip_edges()
	icon_label.visible = icon_str != ""
	icon_label.text = icon_str
	title_label.text = str(content.get("title", "New Mechanic"))
	_set_section(what_section, what_body, str(content.get("what", "")))
	_set_section(how_section, how_body, str(content.get("how", "")))
	_set_section(expect_section, expect_body, str(content.get("expect", "")))

func _set_section(section: VBoxContainer, body_label: Label, body: String) -> void:
	var trimmed := body.strip_edges()
	section.visible = trimmed != ""
	body_label.text = trimmed

func _on_dismiss() -> void:
	queue_free()
