// Package mobile is the gomobile surface of the shared core: strings in, JSON out, as Takeon does.
package mobile

import (
	"encoding/json"
	"strings"

	"landnam/core/base"
)

// BaseLayout returns the Base structure rectangles as JSON for a view and a comma separated list of built kinds.
func BaseLayout(siteJSON string, w, h float64, kindsCSV string) (string, error) {
	m, err := base.Parse([]byte(siteJSON))
	if err != nil {
		return "", err
	}
	var kinds []string
	if kindsCSV != "" {
		kinds = strings.Split(kindsCSV, ",")
	}
	out, err := json.Marshal(m.Compute(kinds, base.View{W: w, H: h}))
	return string(out), err
}
