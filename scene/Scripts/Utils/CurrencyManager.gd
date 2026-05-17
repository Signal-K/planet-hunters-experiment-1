## Manager class for handling currency data persistence
class_name CurrencyManager
extends RefCounted

const CURRENCY_FILE_PATH = "user://franc_balance.json"
const DEFAULT_CURRENCY_FILE_PATH = "res://franc_balance.json"
const CURRENCY_KEY = "balance"

var balance: int = 0

## Initialize and load currency data
func _init():
	load_balance()

## Load balance from JSON file
func load_balance() -> void:
	var data = JSONFileManager.load_json(CURRENCY_FILE_PATH)
	if data.is_empty():
		data = JSONFileManager.load_json(DEFAULT_CURRENCY_FILE_PATH)
	if data.has(CURRENCY_KEY):
		balance = int(data[CURRENCY_KEY])
	else:
		balance = 0

## Save current balance to JSON file
func save_balance() -> bool:
	var data = {CURRENCY_KEY: balance}
	return JSONFileManager.save_json(CURRENCY_FILE_PATH, data)

## Modify balance by a delta amount
func modify_balance(delta: int) -> void:
	balance += delta
	save_balance()

## Get current balance
func get_balance() -> int:
	return balance

## Set balance to a specific value
func set_balance(new_balance: int) -> void:
	balance = new_balance
	save_balance()

## Get formatted balance string
func get_formatted_balance() -> String:
	return CurrencyFormatter.format_with_symbol(balance, "F")
