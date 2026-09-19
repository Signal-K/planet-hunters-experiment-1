package main

import "testing"

func TestSiteDeedPricesMatchPublishedOffers(t *testing.T) {
	want := map[string]int{
		"moon-south-pole": 4_000_000,
		"mars-arcadia":    5_500_000,
		"europa-chaos":    7_500_000,
	}
	if len(siteDeedPrices) != len(want) {
		t.Fatalf("site deed catalogue has %d entries; want %d", len(siteDeedPrices), len(want))
	}
	for siteID, price := range want {
		if got := siteDeedPrices[siteID]; got != price {
			t.Errorf("%s price = %d; want %d", siteID, got, price)
		}
	}
}
