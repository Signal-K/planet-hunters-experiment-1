package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// geometryServiceURL points at the Elixir geometry "math co-processor"
// spike (tools/geometry-service). Defaults to the local Docker port.
func geometryServiceURL() string {
	if url := os.Getenv("GEOMETRY_SERVICE_URL"); url != "" {
		return url
	}
	return "http://localhost:4002"
}

var geometryHTTPClient = &http.Client{Timeout: 5 * time.Second}

// AngularDistance calls the Elixir geometry service's Tier 1
// /angular-distance endpoint and returns the great-circle distance in
// degrees between two RA/Dec points.
func AngularDistance(ra1, dec1, ra2, dec2 float64) (float64, error) {
	payload := map[string]any{
		"a": []float64{ra1, dec1},
		"b": []float64{ra2, dec2},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return 0, err
	}

	resp, err := geometryHTTPClient.Post(geometryServiceURL()+"/angular-distance", "application/json", bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("geometry service returned status %d", resp.StatusCode)
	}

	var result struct {
		DistanceDeg float64 `json:"distance_deg"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, err
	}

	return result.DistanceDeg, nil
}
