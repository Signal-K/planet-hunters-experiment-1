extends RefCounted
class_name MineralPricing

const JSONFileManager = preload("res://Scripts/Utils/JSONFileManager.gd")

const MineralCatalog = preload("res://Scripts/Utils/MineralCatalog.gd")

## Base prices are authoritative in MineralCatalog.
## This dict provides fast lookup without iterating the catalog.
## Kept in sync with MineralCatalog.MINERALS[*].base_price.
const BASE_PRICES := {
	"Iron": 5900000,
	"Nickel": 6000000,
	"Cobalt": 6100000,
	"Platinum": 6200000,
	"Silicates": 5700000,
	"Titanium": 7200000,
	"Magnesium": 6800000,
	"Palladium": 9500000,
	"Gold": 11000000,
	"Iridium": 18000000,
	"Osmium": 20000000,
	"Rhenium": 24000000,
}

## Each player sale dips the mineral's price by this fraction.
const PRICE_DIP_PER_SALE := 0.02
## Floor: price cannot drop below this fraction of base price.
const MIN_PRICE_MULT := 0.70
## Ceiling: price recovers toward 1.0 but never exceeds it.
const MAX_PRICE_MULT := 1.0
## How much price recovers toward 1.0 per session start (called once on app ready).
const PRICE_RECOVERY_PER_SESSION := 0.05
## Buy price markup over current sell price (minimum 1.25×).
const BUY_MARKUP := 1.25

const _MARKET_STATE_PATH := "user://mineral_market.json"

## Returns the current market multiplier (0.70–1.0) for a mineral.
static func get_price_multiplier(mineral: String) -> float:
	var data = _load_market_state()
	var mults: Dictionary = data.get("multipliers", {})
	return clamp(float(mults.get(mineral, 1.0)), MIN_PRICE_MULT, MAX_PRICE_MULT)

## Returns the current effective market price for a mineral (per kg).
static func get_current_price(mineral: String) -> int:
	var base = int(BASE_PRICES.get(mineral, 5))
	return int(round(float(base) * get_price_multiplier(mineral)))

## Records that the player sold this mineral, dipping its price slightly.
static func record_player_sale(mineral: String) -> void:
	var data = _load_market_state()
	var mults: Dictionary = data.get("multipliers", {}).duplicate(true)
	var current = clamp(float(mults.get(mineral, 1.0)), MIN_PRICE_MULT, MAX_PRICE_MULT)
	mults[mineral] = max(current - PRICE_DIP_PER_SALE, MIN_PRICE_MULT)
	data["multipliers"] = mults
	_save_market_state(data)

static func _load_market_state() -> Dictionary:
	var json = JSONFileManager
	var data = json.load_json(_MARKET_STATE_PATH)
	if typeof(data) != TYPE_DICTIONARY:
		data = {}
	if not data.has("multipliers"):
		data["multipliers"] = {}
	return data

static func _save_market_state(data: Dictionary) -> void:
	var json = JSONFileManager
	json.save_json(_MARKET_STATE_PATH, data)

## Returns the buy price per kg (always ≥ BUY_MARKUP × current sell price).
static func get_buy_price(mineral: String) -> int:
	return int(ceil(float(get_current_price(mineral)) * BUY_MARKUP))

## Returns the percentage delta from base price (negative = depressed, 0 = at base).
## e.g. multiplier 0.82 → -18%
static func get_price_delta_pct(mineral: String) -> int:
	var mult := get_price_multiplier(mineral)
	return int(round((mult - 1.0) * 100.0))

## Called once per session start: nudges all depressed prices toward 1.0 by PRICE_RECOVERY_PER_SESSION.
static func recover_prices_on_session_start() -> void:
	var data := _load_market_state()
	var mults: Dictionary = data.get("multipliers", {}).duplicate(true)
	var changed := false
	for mineral in mults.keys():
		var current: float = clamp(float(mults[mineral]), MIN_PRICE_MULT, MAX_PRICE_MULT)
		if current < MAX_PRICE_MULT:
			mults[mineral] = minf(current + PRICE_RECOVERY_PER_SESSION, MAX_PRICE_MULT)
			changed = true
	if changed:
		data["multipliers"] = mults
		_save_market_state(data)

static func price_for(name: String, amount: int) -> int:
	var unit = int(BASE_PRICES.get(name, 5))
	return unit * amount

static func total_value(minerals: Dictionary, multiplier: float = 1.0, bonus_map: Dictionary = {}) -> int:
	if minerals.is_empty():
		return 0
	var total := 0
	for key in minerals.keys():
		var amount = int(minerals.get(key, 0))
		var base = int(BASE_PRICES.get(key, 5))
		var bonus = float(bonus_map.get(key, 1.0))
		total += int(round(amount * base * bonus * multiplier))
	return total
