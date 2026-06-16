package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"
)

// BenchmarkAngularDistanceInline benchmarks the inline Go implementation of
// the angular-distance Tier 1 operation (@task-f9a2b5 baseline).
func BenchmarkAngularDistanceInline(b *testing.B) {
	for i := 0; i < b.N; i++ {
		AngularDistanceInline(10.5, -3.2, 20.1, 4.8)
	}
}

// BenchmarkAngularDistanceService benchmarks the Elixir geometry service's
// /angular-distance endpoint over HTTP. Requires the service from
// tools/geometry-service to be running and reachable at
// GEOMETRY_SERVICE_URL (default http://localhost:4002); skipped otherwise.
func BenchmarkAngularDistanceService(b *testing.B) {
	url := os.Getenv("GEOMETRY_SERVICE_URL")
	if url == "" {
		url = "http://localhost:4002"
	}

	client := &http.Client{Timeout: 5 * time.Second}
	if _, err := client.Get(url + "/health"); err != nil {
		b.Skipf("geometry service not reachable at %s: %v", url, err)
	}

	payload, _ := json.Marshal(map[string]any{
		"a": []float64{10.5, -3.2},
		"b": []float64{20.1, 4.8},
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		resp, err := client.Post(url+"/angular-distance", "application/json", bytes.NewReader(payload))
		if err != nil {
			b.Fatal(err)
		}
		resp.Body.Close()
	}
}

// BenchmarkCoordinateConversionInline benchmarks the inline Go implementation
// of the coordinate-conversion Tier 1 operation (@task-f9a2b5).
func BenchmarkCoordinateConversionInline(b *testing.B) {
	for i := 0; i < b.N; i++ {
		EquatorialToCartesianInline(10.5, -3.2)
	}
}

// BenchmarkCoordinateConversionService benchmarks the Elixir geometry
// service's /coordinate-conversion endpoint. Skipped if service is not
// reachable (see BenchmarkAngularDistanceService for setup).
func BenchmarkCoordinateConversionService(b *testing.B) {
	url := os.Getenv("GEOMETRY_SERVICE_URL")
	if url == "" {
		url = "http://localhost:4002"
	}

	client := &http.Client{Timeout: 5 * time.Second}
	if _, err := client.Get(url + "/health"); err != nil {
		b.Skipf("geometry service not reachable at %s: %v", url, err)
	}

	payload, _ := json.Marshal(map[string]any{"ra_deg": 10.5, "dec_deg": -3.2})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		resp, err := client.Post(url+"/coordinate-conversion", "application/json", bytes.NewReader(payload))
		if err != nil {
			b.Fatal(err)
		}
		resp.Body.Close()
	}
}

// BenchmarkSectorLookupInline benchmarks the inline Go implementation of the
// sector-lookup Tier 1 operation (@task-f9a2b5).
func BenchmarkSectorLookupInline(b *testing.B) {
	for i := 0; i < b.N; i++ {
		SectorForInline(10.5, -3.2)
	}
}

// BenchmarkSectorLookupService benchmarks the Elixir geometry service's
// /sector-lookup endpoint. Skipped if service is not reachable.
func BenchmarkSectorLookupService(b *testing.B) {
	url := os.Getenv("GEOMETRY_SERVICE_URL")
	if url == "" {
		url = "http://localhost:4002"
	}

	client := &http.Client{Timeout: 5 * time.Second}
	if _, err := client.Get(url + "/health"); err != nil {
		b.Skipf("geometry service not reachable at %s: %v", url, err)
	}

	payload, _ := json.Marshal(map[string]any{"ra_deg": 10.5, "dec_deg": -3.2})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		resp, err := client.Post(url+"/sector-lookup", "application/json", bytes.NewReader(payload))
		if err != nil {
			b.Fatal(err)
		}
		resp.Body.Close()
	}
}

func ExampleAngularDistanceInline() {
	d := AngularDistanceInline(0, 0, 90, 0)
	fmt.Printf("%.1f\n", d)
	// Output: 90.0
}
