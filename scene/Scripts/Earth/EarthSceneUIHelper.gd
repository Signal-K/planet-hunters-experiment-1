extends RefCounted
class_name EarthSceneUIHelper

var _owner: Node
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
const Logger = preload("res://Scripts/Utils/Logger.gd")

func setup(owner: Node) -> void:
	_owner = owner

func setup_buttons() -> void:
	"""Setup button connections"""
	var back_btn = _owner.get_node("UILayer/ButtonContainer/BackButton")
	var forward_btn = _owner.get_node("UILayer/ButtonContainer/ForwardButton")
	var menu_btn = _owner.get_node("UILayer/ButtonContainer/MenuButton")
	var market_btn = _owner.get_node("UILayer/ButtonContainer/MarketButton")
	var space_map_btn = _owner.get_node("UILayer/ButtonContainer/SpaceMapButton")
	var new_mission_btn = _owner.get_node("UILayer/ButtonContainer/NewMissionButton")

	PanelStyle.apply_button(back_btn, false)
	PanelStyle.apply_button(forward_btn, false)
	PanelStyle.apply_button(menu_btn, false)
	PanelStyle.apply_button(market_btn, false)
	PanelStyle.apply_button(space_map_btn, false)
	PanelStyle.apply_button(new_mission_btn, true)

	# Connect signals
	back_btn.pressed.connect(Callable(_owner, "_on_back_button_pressed"))
	forward_btn.pressed.connect(Callable(_owner, "_on_forward_button_pressed"))
	menu_btn.pressed.connect(Callable(_owner, "_on_menu_button_pressed"))
	market_btn.pressed.connect(Callable(_owner, "_on_market_button_pressed"))
	space_map_btn.pressed.connect(Callable(_owner, "_on_space_map_button_pressed"))
	new_mission_btn.pressed.connect(Callable(_owner, "_on_new_mission_button_pressed"))

	Logger.d("All button signals connected")
