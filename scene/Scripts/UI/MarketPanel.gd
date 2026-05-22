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

const PANEL_BG    := Color(0.03, 0.05, 0.09, 0.98)
const CYAN        := PanelStyle.ACCENT
const TEXT_COLOR  := PanelStyle.TEXT_ON_DARK
const TEXT_MUTED  := PanelStyle.MUTED_ON_DARK
const GREEN       := Color(0.30, 1.0, 0.45, 1.0)
const RED         := Color(1.0, 0.35, 0.35, 1.0)
const AMBER       := PanelStyle.ACCENT_WARM

var _scroll: ScrollContainer
var _content: VBoxContainer
var _sell_all_btn: Button

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build_ui()

func _build_ui() -> void:
	# Full-screen backdrop
	var bg := ColorRect.new()
	bg.color = PANEL_BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	# Outer margin container
	var outer := MarginContainer.new()
	outer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		outer.add_theme_constant_override("margin_" + side, 16)
	add_child(outer)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	outer.add_child(vbox)

	# Header row
	var header_row := HBoxContainer.new()
	header_row.add_theme_constant_override("separation", 8)
	vbox.add_child(header_row)

	var title := Label.new()
	title.text = "MINERAL MARKET"
	title.add_theme_font_size_override("font_size", 20)
	title.add_theme_color_override("font_color", CYAN)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header_row.add_child(title)

	var close_btn := Button.new()
	close_btn.text = "✕ Close"
	close_btn.add_theme_color_override("font_color", TEXT_MUTED)
	close_btn.pressed.connect(_on_close)
	header_row.add_child(close_btn)

	# Subheader
	var sub := Label.new()
	sub.text = "Prices fluctuate with every sale. Hold minerals to sell when prices recover."
	sub.add_theme_font_size_override("font_size", 12)
	sub.add_theme_color_override("font_color", TEXT_MUTED)
	sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(sub)

	# Scroll area for holdings + prices
	_scroll = ScrollContainer.new()
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(_scroll)

	_content = VBoxContainer.new()
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_theme_constant_override("separation", 8)
	_scroll.add_child(_content)

	# Sell All button at bottom
	_sell_all_btn = Button.new()
	_sell_all_btn.text = "Sell All Holdings"
	_sell_all_btn.add_theme_color_override("font_color", AMBER)
	_sell_all_btn.pressed.connect(_on_sell_all)
	vbox.add_child(_sell_all_btn)

	_refresh()

func _refresh() -> void:
	_clear_children(_content)

	var holdings := MineralHoldings.get_all()
	var has_holdings := not holdings.is_empty()

	# Holdings section
	var holdings_header := _section_label("YOUR HOLDINGS")
	_content.add_child(holdings_header)

	if not has_holdings:
		var empty := Label.new()
		empty.text = "No minerals held. Complete Free Operations missions and choose 'Hold for Market' at debrief."
		empty.add_theme_font_size_override("font_size", 13)
		empty.add_theme_color_override("font_color", TEXT_MUTED)
		empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_content.add_child(empty)
	else:
		var total_val := MineralHoldings.total_value()
		for mineral in holdings.keys():
			var kg := int(holdings[mineral])
			if kg <= 0:
				continue
			_content.add_child(_build_holding_row(str(mineral), kg))

		var total_row := HBoxContainer.new()
		var total_lbl := Label.new()
		total_lbl.text = "Portfolio value"
		total_lbl.add_theme_font_size_override("font_size", 13)
		total_lbl.add_theme_color_override("font_color", TEXT_MUTED)
		total_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var total_val_lbl := Label.new()
		total_val_lbl.text = "₣ %s" % NumberFormat.compact(total_val)
		total_val_lbl.add_theme_font_size_override("font_size", 13)
		total_val_lbl.add_theme_color_override("font_color", GREEN)
		total_row.add_child(total_lbl)
		total_row.add_child(total_val_lbl)
		_content.add_child(total_row)

	_sell_all_btn.disabled = not has_holdings

	# Separator
	var sep := HSeparator.new()
	_content.add_child(sep)

	# Market prices section
	var prices_header := _section_label("CURRENT MARKET PRICES")
	_content.add_child(prices_header)

	for mineral in MineralPricing.BASE_PRICES.keys():
		_content.add_child(_build_price_row(str(mineral)))

	# Buy prices note
	var buy_note := Label.new()
	buy_note.text = "Buy orders: coming soon — minimum 1.25× current sell price"
	buy_note.add_theme_font_size_override("font_size", 11)
	buy_note.add_theme_color_override("font_color", TEXT_MUTED)
	buy_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_content.add_child(buy_note)

func _build_holding_row(mineral: String, kg: int) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)

	var name_lbl := Label.new()
	name_lbl.text = mineral
	name_lbl.add_theme_font_size_override("font_size", 14)
	name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
	name_lbl.custom_minimum_size.x = 100
	row.add_child(name_lbl)

	var amt_lbl := Label.new()
	amt_lbl.text = "%d kg" % kg
	amt_lbl.add_theme_font_size_override("font_size", 13)
	amt_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	amt_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(amt_lbl)

	var price := MineralPricing.get_current_price(mineral)
	var val_lbl := Label.new()
	val_lbl.text = "₣ %s" % NumberFormat.compact(price * kg)
	val_lbl.add_theme_font_size_override("font_size", 13)
	val_lbl.add_theme_color_override("font_color", TEXT_COLOR)
	val_lbl.custom_minimum_size.x = 90
	row.add_child(val_lbl)

	var sell_btn := Button.new()
	sell_btn.text = "Sell"
	sell_btn.add_theme_color_override("font_color", CYAN)
	sell_btn.pressed.connect(_on_sell_mineral.bind(mineral, sell_btn))
	row.add_child(sell_btn)

	return row

func _build_price_row(mineral: String) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)

	var name_lbl := Label.new()
	name_lbl.text = mineral
	name_lbl.add_theme_font_size_override("font_size", 13)
	name_lbl.add_theme_color_override("font_color", TEXT_COLOR)
	name_lbl.custom_minimum_size.x = 100
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_lbl)

	var price := MineralPricing.get_current_price(mineral)
	var price_lbl := Label.new()
	price_lbl.text = "₣ %s/kg" % NumberFormat.compact(price)
	price_lbl.add_theme_font_size_override("font_size", 13)
	price_lbl.add_theme_color_override("font_color", TEXT_COLOR)
	price_lbl.custom_minimum_size.x = 100
	row.add_child(price_lbl)

	var delta := MineralPricing.get_price_delta_pct(mineral)
	var delta_lbl := Label.new()
	delta_lbl.custom_minimum_size.x = 48
	if delta < 0:
		delta_lbl.text = "%d%%" % delta
		delta_lbl.add_theme_color_override("font_color", RED)
	elif delta > 0:
		delta_lbl.text = "+%d%%" % delta
		delta_lbl.add_theme_color_override("font_color", GREEN)
	else:
		delta_lbl.text = "—"
		delta_lbl.add_theme_color_override("font_color", TEXT_MUTED)
	delta_lbl.add_theme_font_size_override("font_size", 12)
	row.add_child(delta_lbl)

	return row

func _section_label(text: String) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 11)
	lbl.add_theme_color_override("font_color", CYAN)
	return lbl

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

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()
