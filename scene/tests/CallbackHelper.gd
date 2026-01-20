extends Node
class_name CallbackHelper

var called: bool = false
var response = null
var error = ""

func on_fetch(r, e) -> void:
    called = true
    response = r
    error = e
