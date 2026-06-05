extends Control
class_name MarketPanel
## Dynamic Mineral Market — available in Free Operations mode.
## Shows current mineral prices, the player's held stock, and allows selling.

signal panel_closed

const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")
const MineralHoldings = preload("res://Scripts/Utils/MineralHoldings.gd")
const AppControllerHelper = preload("res://Scripts/Utils/AppControllerHelper.gd")
const NumberFormat = preload("res://Scripts/Utils/NumberFormat.gd")
const PanelStyle = preload("res://Scripts/UI/PanelStyle.gd")
static var MarketHoldingRowScene: PackedScene = load("res://Scenes/UI/Templates/MarketHoldingRow.tscn") if ResourceLoader.exists("res://Scenes/UI/Templates/MarketHoldingRow.tscn") else null
static var MarketPriceRowScene: PackedScene = load("res://Scenes/UI/Templates/MarketPriceRow.tscn") if ResourceLoader.exists("res://Scenes/UI/Templates/MarketPriceRow.tscn") else null

const PANEL_BG    := Color(0.03, 0.05, 0.09, 0.98)
const CYAN        := PanelStyle.ACCENT
const TEXT_COLOR  := PanelStyle.TEXT_ON_DARK
const TEXT_MUTED  := PanelStyle.MUTED_ON_DARK
const GREEN       := Color(0.30, 1.0, 0.45, 1.0)
const RED         := Color(1.0, 0.35, 0.35, 1.0)
const AMBER       := PanelStyle.ACCENT_WARM

@onready var _holdings_list: VBoxContainer = $OuterMargin/PanelVBox/Scroll/Content/HoldingsList
@onready var _empty_holdings_label: Label = $OuterMargin/PanelVBox/Scroll/Content/HoldingsList/EmptyHoldingsLabel
@onready var _portfolio_value_row: HBoxContainer = $OuterMargin/PanelVBox/Scroll/Content/PortfolioValueRow
@onready var _portfolio_value_label: Label = $OuterMargin/PanelVBox/Scroll/Content/PortfolioValueRow/PortfolioValueLabel
@onready var _prices_list: VBoxContainer = $OuterMargin/PanelVBox/Scroll/Content/PricesList
@onready var _sell_all_btn: Button = $OuterMargin/PanelVBox/SellAllButton
@onready var _close_btn: Button = $OuterMargin/PanelVBox/HeaderRow/CloseButton

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_close_btn.pressed.connect(_on_close)
	_sell_all_btn.pressed.connect(_on_sell_all)
	_refresh()

func _refresh() -> void:
	_clear_dynamic_children(_holdings_list)
	_clear_children(_prices_list)

	var holdings := MineralHoldings.get_all()
	var has_holdings := not holdings.is_empty()

	_empty_holdings_label.visible = not has_holdings
	_portfolio_value_row.visible = has_holdings

	if has_holdings:
		var total_val := MineralHoldings.total_value()
		_portfolio_value_label.text = "F %s" % NumberFormat.compact(total_val)
		for mineral in holdings.keys():
			var kg := int(holdings[mineral])
			if kg <= 0:
				continue
			_holdings_list.add_child(_build_holding_row(str(mineral), kg))

	_sell_all_btn.disabled = not has_holdings

	for mineral in MineralPricing.BASE_PRICES.keys():
		_prices_list.add_child(_build_price_row(str(mineral)))

func _build_holding_row(mineral: String, kg: int) -> HBoxContainer:
	var row := MarketHoldingRowScene.instantiate() as HBoxContainer

	var name_lbl := row.get_node("NameLabel") as Label
	name_lbl.text = mineral

	var amt_lbl := row.get_node("AmountLabel") as Label
	amt_lbl.text = "%d kg" % kg

	var price := MineralPricing.get_current_price(mineral)
	var val_lbl := row.get_node("ValueLabel") as Label
	val_lbl.text = "F %s" % NumberFormat.compact(price * kg)

	var sell_btn := row.get_node("SellButton") as Button
	sell_btn.pressed.connect(_on_sell_mineral.bind(mineral, sell_btn))

	return row

func _build_price_row(mineral: String) -> HBoxContainer:
	var row := MarketPriceRowScene.instantiate() as HBoxContainer

	var name_lbl := row.get_node("NameLabel") as Label
	name_lbl.text = mineral

	var price := MineralPricing.get_current_price(mineral)
	var price_lbl := row.get_node("PriceLabel") as Label
	price_lbl.text = "F %s/kg" % NumberFormat.compact(price)

	var delta := MineralPricing.get_price_delta_pct(mineral)
	var delta_lbl := row.get_node("DeltaLabel") as Label
	if delta < 0:
		delta_lbl.text = "%d%%" % delta
		delta_lbl.add_theme_color_override("font_color", RED)
	elif delta > 0:
		delta_lbl.text = "+%d%%" % delta
		delta_lbl.add_theme_color_override("font_color", GREEN)
	else:
		delta_lbl.text = "—"
		delta_lbl.add_theme_color_override("font_color", TEXT_MUTED)

	return row

func _on_sell_mineral(mineral: String, btn: Button) -> void:
	var holdings := MineralHoldings.get_all()
	var kg := int(holdings.get(mineral, 0))
	if kg <= 0:
		return
	var francs := MineralHoldings.sell(mineral, kg)
	var app := AppControllerHelper.get_instance()
	if app and app.has_method("add_franc_balance"):
		app.add_franc_balance(francs, "market_sale")
	btn.text = "Sold ✓"
	btn.disabled = true
	_refresh()

func _on_sell_all() -> void:
	var francs := MineralHoldings.sell_all()
	var app := AppControllerHelper.get_instance()
	if app and app.has_method("add_franc_balance"):
		app.add_franc_balance(francs, "market_sale_all")
	_refresh()

func _on_close() -> void:
	panel_closed.emit()
	queue_free()

func _clear_dynamic_children(node: Node) -> void:
	for child in node.get_children():
		if child == _empty_holdings_label:
			continue
		child.queue_free()

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()
