extends RefCounted
class_name MineralHoldings
## Mineral Holdings — stores minerals the player chose to hold for later sale at the market.
## Separate from MiningInventory (which tracks per-target extraction state).

const MineralPricing = preload("res://Scripts/Utils/MineralPricing.gd")

const _HOLDINGS_PATH := "user://mineral_holdings.json"

## Add minerals to the player's held stock.
## minerals: {mineral_name: kg_amount}
static func add(minerals: Dictionary) -> void:
	if minerals.is_empty():
		return
	var data := _load()
	for mineral in minerals.keys():
		var amount := int(minerals[mineral])
		if amount <= 0:
			continue
		data[str(mineral)] = int(data.get(str(mineral), 0)) + amount
	_save(data)

## Returns all held minerals: {mineral_name: kg_amount}
static func get_all() -> Dictionary:
	return _load()

## Returns true if the player holds any minerals.
static func is_empty() -> bool:
	var data := _load()
	for key in data.keys():
		if int(data[key]) > 0:
			return false
	return true

## Sell a specific mineral from holdings. Returns Francs received.
## Records the market sale (price dips).
static func sell(mineral: String, kg: int) -> int:
	var data := _load()
	var held := int(data.get(mineral, 0))
	if held <= 0 or kg <= 0:
		return 0
	var sell_kg := min(kg, held)
	var price_per_kg := MineralPricing.get_current_price(mineral)
	var francs := price_per_kg * sell_kg
	MineralPricing.record_player_sale(mineral)
	data[mineral] = held - sell_kg
	if int(data[mineral]) <= 0:
		data.erase(mineral)
	_save(data)
	return francs

## Sell all held minerals. Returns total Francs received.
static func sell_all() -> int:
	var data := _load()
	var total := 0
	for mineral in data.keys():
		var kg := int(data[mineral])
		if kg <= 0:
			continue
		total += MineralPricing.get_current_price(mineral) * kg
		MineralPricing.record_player_sale(str(mineral))
	_save({})
	return total

## Returns the current market value of all held minerals.
static func total_value() -> int:
	var data := _load()
	var total := 0
	for mineral in data.keys():
		var kg := int(data[mineral])
		if kg <= 0:
			continue
		total += MineralPricing.get_current_price(str(mineral)) * kg
	return total

## Clear all holdings (e.g. on full reset).
static func reset() -> void:
	_save({})

static func _load() -> Dictionary:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	var raw = json.load_json(_HOLDINGS_PATH)
	if typeof(raw) != TYPE_DICTIONARY:
		return {}
	var out := {}
	for key in raw.keys():
		var v := int(raw[key])
		if v > 0:
			out[str(key)] = v
	return out

static func _save(data: Dictionary) -> void:
	var json = preload("res://Scripts/Utils/JSONFileManager.gd")
	json.save_json(_HOLDINGS_PATH, data)
