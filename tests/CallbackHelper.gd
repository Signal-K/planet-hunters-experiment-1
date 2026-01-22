extends RefCounted

var called: bool = false
var error := ""
var response := []

func on_fetch(err := "", resp := []):
    called = true
    error = err
    response = resp
