## Utility class for formatting currency values
class_name CurrencyFormatter
extends RefCounted

## Format a balance value into a readable string
static func format_balance(value: int) -> String:
	var abs_value = abs(value)
	
	if abs_value >= 1000000000000:  # Trillions
		var trillions = value / 1000000000000
		return str(trillions) + "T"
	elif abs_value >= 1000000000:  # Billions
		var billions = value / 1000000000
		return str(billions) + "B"
	elif abs_value >= 1000000:  # Millions
		var millions = value / 1000000
		return str(millions) + "M"
	elif abs_value >= 1000:  # Thousands
		var thousands = value / 1000
		return str(thousands) + "K"
	else:
		return str(value)

## Format with currency symbol
static func format_with_symbol(value: int, symbol: String = "F") -> String:
	return format_balance(value) + " " + symbol