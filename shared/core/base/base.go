// Package base is the shared Earth Base layout. It is a straight port of web/lib/scene/base-site.ts
// (kitScale, homeCenter, displaySite) so web and iOS can draw the same rectangles from one source.
// SSL-642 spike: the golden file in ../testdata is produced by the TypeScript and must match exactly.
package base

import (
	"encoding/json"
	"math"
)

const webSiteCompression = 0.84

type Site struct {
	ID    string  `json:"id"`
	X     float64 `json:"x"`
	Half  float64 `json:"half"`
	Plot  *int    `json:"plot"`
	Label string  `json:"label"`
}

type Sprite struct {
	Site   string   `json:"site"`
	Body   *float64 `json:"body"`
	Left   *float64 `json:"left"`
	Width  *float64 `json:"width"`
	Height *float64 `json:"height"`
}

type siteFile struct {
	Strip struct {
		Width float64 `json:"width"`
	} `json:"strip"`
	KitScale struct {
		Phone          float64 `json:"phone"`
		Large          float64 `json:"large"`
		LargeMinHeight float64 `json:"largeMinHeight"`
		PortraitFit    float64 `json:"portraitFit"`
		PortraitMin    float64 `json:"portraitMin"`
	} `json:"kitScale"`
	Structures map[string]Sprite `json:"structures"`
	Sites      []Site            `json:"sites"`
}

// Map is a parsed base-site.json.
type Map struct{ f siteFile }

func Parse(data []byte) (*Map, error) {
	var f siteFile
	if err := json.Unmarshal(data, &f); err != nil {
		return nil, err
	}
	return &Map{f}, nil
}

type View struct{ W, H float64 }

type Rect struct {
	Kind    string  `json:"kind"`
	CenterX float64 `json:"centerX"`
	Width   float64 `json:"width"`
	Height  float64 `json:"height"`
}

type Layout struct {
	Scale  float64 `json:"scale"`
	Center float64 `json:"center"`
	Rects  []Rect  `json:"rects"`
}

func round(n float64, places float64) float64 {
	p := math.Pow(10, places)
	return math.Floor(n*p+0.5) / p
}

// KitScale is points per kit unit: portrait fits the hangar and pad across the width, landscape is 2 or 3.
func (m *Map) KitScale(v View) float64 {
	k := m.f.KitScale
	if v.H > v.W*1.15 {
		return round(math.Min(k.Phone, math.Max(k.PortraitMin, v.W/k.PortraitFit)), 2)
	}
	if v.H < k.LargeMinHeight {
		return k.Phone
	}
	return k.Large
}

func (m *Map) sprite(kind string) (Sprite, bool) {
	if kind == "garage" {
		kind = "hangar"
	}
	s, ok := m.f.Structures[kind]
	return s, ok
}

func (m *Map) siteByID(id string) (Site, bool) {
	for _, s := range m.f.Sites {
		if s.ID == id {
			return s, true
		}
	}
	return Site{}, false
}

func (m *Map) homeSite(kind string) (Site, bool) {
	sp, ok := m.sprite(kind)
	if !ok {
		return Site{}, false
	}
	return m.siteByID(sp.Site)
}

func (m *Map) displaySite(s Site) Site {
	s.X = m.f.Strip.Width/2 + (s.X-m.f.Strip.Width/2)*webSiteCompression
	return s
}

func (m *Map) homeCenter(kinds []string, viewUnits float64) float64 {
	var sites []Site
	for _, k := range kinds {
		if s, ok := m.homeSite(k); ok && s.ID != "shaft" {
			sites = append(sites, m.displaySite(s))
		}
	}
	padSite, _ := m.siteByID("pad")
	pad := m.displaySite(padSite)
	if len(sites) == 0 {
		return pad.X
	}
	l, r := math.Inf(1), math.Inf(-1)
	for _, s := range sites {
		l = math.Min(l, s.X-s.Half)
		r = math.Max(r, s.X+s.Half)
	}
	if r-l <= viewUnits {
		return (l + r) / 2
	}
	mid := (l + r) / 2
	return math.Min(math.Max(mid, pad.X+pad.Half-viewUnits/2), pad.X-pad.Half+viewUnits/2)
}

func spriteCenterOffset(s Sprite) float64 {
	if s.Body == nil || s.Left == nil || s.Width == nil {
		return 0
	}
	return *s.Left + *s.Width/2 - *s.Body/2
}

// Compute returns the scale, camera centre and one screen rectangle per drawn structure.
func (m *Map) Compute(kinds []string, v View) Layout {
	scale := m.KitScale(v)
	center := m.homeCenter(kinds, v.W/scale)
	out := Layout{Scale: scale, Center: round(center, 3), Rects: []Rect{}}
	for _, k := range kinds {
		site, ok := m.homeSite(k)
		sp, ok2 := m.sprite(k)
		if !ok || !ok2 || sp.Width == nil || sp.Height == nil {
			continue
		}
		x := m.displaySite(site).X + spriteCenterOffset(sp)
		out.Rects = append(out.Rects, Rect{
			Kind:    k,
			CenterX: round((x-center)*scale+v.W/2, 3),
			Width:   round(*sp.Width*scale, 3),
			Height:  round(*sp.Height*scale, 3),
		})
	}
	return out
}
