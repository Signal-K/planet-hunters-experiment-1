package base

import (
	"encoding/json"
	"math"
	"os"
	"testing"
)

type golden struct {
	View  struct{ W, H float64 } `json:"view"`
	Kinds []string               `json:"kinds"`
	Layout
}

func TestMatchesTypeScriptGolden(t *testing.T) {
	siteJSON, err := os.ReadFile("../../layout/base-site.json")
	if err != nil {
		t.Fatal(err)
	}
	m, err := Parse(siteJSON)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile("../testdata/base-layout.golden.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []golden
	if err := json.Unmarshal(raw, &cases); err != nil {
		t.Fatal(err)
	}
	if len(cases) == 0 {
		t.Fatal("empty golden file")
	}
	near := func(a, b float64) bool { return math.Abs(a-b) < 0.0015 }
	for _, c := range cases {
		got := m.Compute(c.Kinds, View{c.View.W, c.View.H})
		if !near(got.Scale, c.Scale) || !near(got.Center, c.Center) || len(got.Rects) != len(c.Rects) {
			t.Fatalf("%v %v: got %+v want %+v", c.View, c.Kinds, got, c.Layout)
		}
		for i, r := range got.Rects {
			w := c.Rects[i]
			if r.Kind != w.Kind || !near(r.CenterX, w.CenterX) || !near(r.Width, w.Width) || !near(r.Height, w.Height) {
				t.Fatalf("%v %v rect %d: got %+v want %+v", c.View, c.Kinds, i, r, w)
			}
		}
	}
}

func BenchmarkCompute(b *testing.B) {
	siteJSON, _ := os.ReadFile("../../layout/base-site.json")
	m, _ := Parse(siteJSON)
	kinds := []string{"launchpad", "hangar", "control-station", "market"}
	for i := 0; i < b.N; i++ {
		m.Compute(kinds, View{390, 844})
	}
}
