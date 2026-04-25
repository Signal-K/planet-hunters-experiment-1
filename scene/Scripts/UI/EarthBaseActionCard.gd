extends PanelContainer
class_name EarthBaseActionCard

@export_multiline var card_title: String = ""
@export_multiline var card_subtitle: String = ""
@export_multiline var card_hint: String = ""
@export_multiline var card_cta: String = ""

@onready var _title_label: Label = $Body/Title
@onready var _subtitle_label: Label = $Body/Subtitle
@onready var _hint_label: Label = $Body/Hint
@onready var _cta_button: Button = $Body/CTAButton

func _ready() -> void:
	apply_content()

func apply_content() -> void:
	if _title_label != null:
		_title_label.text = card_title
		_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if _subtitle_label != null:
		_subtitle_label.text = card_subtitle
		_subtitle_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if _hint_label != null:
		_hint_label.text = card_hint
		_hint_label.visible = card_hint != ""
		_hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if _cta_button != null:
		_cta_button.text = card_cta

func set_content(title_text: String, subtitle_text: String, hint_text: String, cta_text: String) -> void:
	card_title = title_text
	card_subtitle = subtitle_text
	card_hint = hint_text
	card_cta = cta_text
	apply_content()

func get_cta_button() -> Button:
	return _cta_button
