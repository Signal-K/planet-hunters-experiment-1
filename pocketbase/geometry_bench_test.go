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

func ExampleAngularDistanceInline() {
	d := AngularDistanceInline(0, 0, 90, 0)
	fmt.Printf("%.1f\n", d)
	// Output: 90.0
}
