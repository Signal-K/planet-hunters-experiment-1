extends RefCounted
class_name MineralPricing

const BASE_PRICES := {
	"Iron": 5900000,
	"Nickel": 6000000,
	"Cobalt": 6100000,
	"Platinum": 6200000,
	"Silicates": 5700000
}

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
