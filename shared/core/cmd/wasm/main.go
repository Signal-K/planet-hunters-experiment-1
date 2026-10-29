//go:build js && wasm

// Command wasm exposes the shared Base layout to the browser: landnamBaseLayout(siteJSON, w, h, kindsCSV) -> JSON.
package main

import (
	"encoding/json"
	"strings"
	"syscall/js"

	"landnam/core/base"
)

func main() {
	js.Global().Set("landnamBaseLayout", js.FuncOf(func(_ js.Value, args []js.Value) any {
		m, err := base.Parse([]byte(args[0].String()))
		if err != nil {
			return err.Error()
		}
		var kinds []string
		if s := args[3].String(); s != "" {
			kinds = strings.Split(s, ",")
		}
		out, _ := json.Marshal(m.Compute(kinds, base.View{W: args[1].Float(), H: args[2].Float()}))
		return string(out)
	}))
	select {}
}
