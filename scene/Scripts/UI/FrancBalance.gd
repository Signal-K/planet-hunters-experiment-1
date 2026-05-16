extends Control

const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")

@onready var balance_button: Button = $Container/BalanceButton
@onready var debug_popup: AcceptDialog = $DebugPopup
@onready var loan_label: Label = $Container/LoanLabel

var balance: int = 0
var loan_balance: int = 0
var _app: Node = null

func _ready() -> void:
	_app = AppControllerHelper.get_instance()
	if _app:
		if _app.has_signal("franc_balance_updated"):
			_app.franc_balance_updated.connect(_on_balance_updated_from_controller)
		if _app.has_signal("loan_updated"):
			_app.loan_updated.connect(_on_loan_updated)
		if _app.has_method("get_loan_balance"):
			loan_balance = _app.get_loan_balance()
		if _app.has_method("get_franc_balance"):
			balance = _app.get_franc_balance()

	if balance_button:
		balance_button.pressed.connect(_on_balance_pressed)
	else:
		push_error("FrancBalance: balance_button node not found")

	var add_btn := debug_popup.get_node_or_null("VBox/ButtonRow/AddButton") as Button
	var sub_btn := debug_popup.get_node_or_null("VBox/ButtonRow/SubButton") as Button
	if add_btn:
		add_btn.pressed.connect(func(): _modify_balance(1000000000))
	if sub_btn:
		sub_btn.pressed.connect(func(): _modify_balance(-1000000000))

	_update_display()

func _on_balance_updated_from_controller(new_balance: int) -> void:
	balance = new_balance
	_update_display()

func _on_loan_updated(new_loan: int) -> void:
	loan_balance = new_loan
	_update_loan_label()

func _update_display() -> void:
	if balance_button:
		balance_button.text = _format_balance(balance) + " F"
		balance_button.tooltip_text = "Francs (F) — in-game currency. Earned from missions, spent on rockets and structures."
	_update_loan_label()

func _update_loan_label() -> void:
	if loan_label == null:
		return
	if loan_balance <= 0:
		loan_label.visible = false
		return
	loan_label.text = "Loan: %s F owed" % _format_balance(loan_balance)
	loan_label.visible = true

func _format_balance(value: int) -> String:
	var abs_value: int = abs(value)
	if abs_value >= 1_000_000_000_000:
		return str(value / 1_000_000_000_000) + "T"
	if abs_value >= 1_000_000_000:
		return str(value / 1_000_000_000) + "B"
	if abs_value >= 1_000_000:
		return str(value / 1_000_000) + "M"
	if abs_value >= 1_000:
		return str(value / 1_000) + "K"
	return str(value)

func _on_balance_pressed() -> void:
	debug_popup.popup_centered()

func _modify_balance(delta: int) -> void:
	balance += delta
	_update_display()
	if _app and _app.has_method("set_franc_balance_from_react"):
		_app.set_franc_balance_from_react(balance)

func get_balance() -> int:
	return balance

func set_balance(new_balance: int) -> void:
	balance = new_balance
	_update_display()
	if _app and _app.has_method("set_franc_balance_from_react"):
		_app.set_franc_balance_from_react(balance)

func add_balance(amount: int) -> void:
	_modify_balance(amount)

func subtract_balance(amount: int) -> bool:
	if balance >= amount:
		_modify_balance(-amount)
		return true
	return false
