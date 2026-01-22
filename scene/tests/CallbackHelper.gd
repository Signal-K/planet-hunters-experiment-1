extends Object

var called: bool = false
var response_data = []
var error_message = ""

## Callback function that receives Supabase response
## Expected signature: func(data: Array, error: String)
func on_fetch(data: Array, error: String) -> void:
	called = true
	response_data = data
	error_message = error
	
	if error != "":
		print("CallbackHelper: Error received: ", error)
	else:
		print("CallbackHelper: Success - received %d items" % data.size())
		# Log sample asteroid data for verification
		if data.size() > 0 and typeof(data[0]) == TYPE_DICTIONARY:
			var first_item = data[0] as Dictionary
			if first_item.has("id"):
				print("CallbackHelper: First asteroid ID: ", first_item.get("id"))
			if first_item.has("name"):
				print("CallbackHelper: First asteroid name: ", first_item.get("name"))
