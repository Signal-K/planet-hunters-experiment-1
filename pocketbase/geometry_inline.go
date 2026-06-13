package main

import "math"

// Inline Go equivalents of the Elixir geometry service's Tier 1 operations,
// used as the baseline for the @task-f9a2b5 benchmark comparison against
// HTTP calls to tools/geometry-service.

// EquatorialToCartesianInline converts equatorial (RA/Dec, degrees) to unit
// Cartesian coordinates.
func EquatorialToCartesianInline(raDeg, decDeg float64) (x, y, z float64) {
	ra := raDeg * math.Pi / 180
	dec := decDeg * math.Pi / 180

	x = math.Cos(dec) * math.Cos(ra)
	y = math.Cos(dec) * math.Sin(ra)
	z = math.Sin(dec)
	return
}

// AngularDistanceInline computes the great-circle angular distance (degrees)
// between two RA/Dec points without calling the geometry service.
func AngularDistanceInline(ra1, dec1, ra2, dec2 float64) float64 {
	x1, y1, z1 := EquatorialToCartesianInline(ra1, dec1)
	x2, y2, z2 := EquatorialToCartesianInline(ra2, dec2)

	dot := x1*x2 + y1*y2 + z1*z2
	if dot > 1.0 {
		dot = 1.0
	} else if dot < -1.0 {
		dot = -1.0
	}

	return math.Acos(dot) * 180 / math.Pi
}

// SectorForInline computes the coarse 8x4 RA/Dec sector index (0..31).
func SectorForInline(raDeg, decDeg float64) int {
	raBucket := int(math.Mod(raDeg, 360.0) / 45.0)
	decBucket := int((decDeg + 90.0) / 45.0)
	return raBucket*4 + decBucket
}
