extends Control

@onready var balance_button: Button = $Container/BalanceButton
@onready var debug_popup: AcceptDialog = $DebugPopup

var balance: int = 10000000000  # Default 10B
var app_controller: Node = null

func _ready() -> void:
	print("FrancBalance: _ready called")
	
	# Find AppController in the scene tree
	_find_app_controller()
	
	# Load balance from AppController if available, otherwise use default
	_load_balance()
	print("FrancBalance: Balance loaded = ", balance)
	
	# Setup UI
	_setup_ui_connections()
	_update_display()
	print("FrancBalance: Setup complete")

func _find_app_controller() -> void:
	"""Find the AppController node in the scene tree"""
	var root = get_tree().root
	app_controller = root.find_child("AppController", true, false)
	if app_controller:
		print("FrancBalance: Found AppController")
		# Connect to balance update signal if it exists
		if app_controller.has_signal("franc_balance_updated"):
			app_controller.franc_balance_updated.connect(_on_balance_updated_from_controller)
	else:
		print("FrancBalance: AppController not found in scene tree")

func _load_balance() -> void:
	"""Load balance from AppController or use default"""
	if app_controller and app_controller.has_method("get_franc_balance"):
		balance = app_controller.get_franc_balance()
		print("FrancBalance: Loaded balance from AppController: ", balance)
	else:
		print("FrancBalance: AppController not available, using default")

func _on_balance_updated_from_controller(new_balance: int) -> void:
	"""Handle balance updates from AppController (e.g., from React Native)"""
	balance = new_balance
	_update_display()
	print("FrancBalance: Balance updated from controller: ", balance)

func _setup_ui_connections() -> void:
	"""Setup all UI button connections"""
	if balance_button:
		balance_button.pressed.connect(_on_balance_pressed)
		print("FrancBalance: Balance button connected")
	else:
		print("FrancBalance: ERROR - balance_button not found!")
	
	# Connect debug popup buttons (now inside VBox/ButtonRow)
	var add_btn = debug_popup.get_node_or_null("VBox/ButtonRow/AddButton")
	var sub_btn = debug_popup.get_node_or_null("VBox/ButtonRow/SubButton")
	
	if add_btn:
		add_btn.pressed.connect(func(): _modify_balance(1000000000))
		print("FrancBalance: Add button connected")
	if sub_btn:
		sub_btn.pressed.connect(func(): _modify_balance(-1000000000))
		print("FrancBalance: Sub button connected")

func _update_display() -> void:
	"""Update the balance display"""
	if balance_button:
		balance_button.text = _format_balance(balance) + " F"
		balance_button.tooltip_text = "Francs (F) — the in-game currency.\nEarned by selling mission cargo.\nSpend on rockets, drones, and upgrades."

func _format_balance(value: int) -> String:
	"""Format balance with K/M/B/T suffixes"""
	var abs_value = abs(value)
	
	if abs_value >= 1000000000000:
		return str(value / 1000000000000) + "T"
	elif abs_value >= 1000000000:
		return str(value / 1000000000) + "B"
	elif abs_value >= 1000000:
		return str(value / 1000000) + "M"
	elif abs_value >= 1000:
		return str(value / 1000) + "K"
	else:
		return str(value)

func _on_balance_pressed() -> void:
	"""Handle balance button press - open debug popup"""
	print("FrancBalance: Balance button pressed!")
	debug_popup.popup_centered()

func _modify_balance(delta: int) -> void:
	"""Modify balance by delta amount"""
	balance += delta
	_update_display()
	# Update AppController if available so it syncs to React Native
	if app_controller and app_controller.has_method("set_franc_balance_from_react"):
		app_controller.set_franc_balance_from_react(balance)
	print("FrancBalance: Modified by ", delta, ", new balance = ", balance)

## Public methods for external access

func get_balance() -> int:
	"""Get current balance value"""
	return balance

func set_balance(new_balance: int) -> void:
	"""Set balance to specific value"""
	balance = new_balance
	_update_display()
	# Update AppController if available so it syncs to React Native
	if app_controller and app_controller.has_method("set_franc_balance_from_react"):
		app_controller.set_franc_balance_from_react(balance)

func add_balance(amount: int) -> void:
	"""Add amount to current balance"""
	_modify_balance(amount)

func subtract_balance(amount: int) -> bool:
	"""Subtract amount from current balance, return false if insufficient funds"""
	if balance >= amount:
		_modify_balance(-amount)
		return true
	return false
