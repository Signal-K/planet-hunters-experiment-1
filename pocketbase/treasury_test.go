package main

import (
	"testing"
	"time"
)

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

func TestAnomalyReservationsAndPayout(t *testing.T) {
	app := newLedgerTestApp(t)
	if err := ensureAnomalies(app); err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	target, err := spawnAnomaly(app, "asteroid", now, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	a, err := reserveAnomaly(app, "a", target.Id, now)
	if err != nil {
		t.Fatal(err)
	}
	again, err := reserveAnomaly(app, "a", target.Id, now)
	if err != nil || again.Id != a.Id {
		t.Fatalf("duplicate claim: %v", err)
	}
	if _, err = reserveAnomaly(app, "b", target.Id, now); err != nil {
		t.Fatal(err)
	}
	if _, err = reserveAnomaly(app, "c", target.Id, now); err == nil {
		t.Fatal("oversold target")
	}
	if _, err = collectAnomaly(app, "b", a.Id, now.Add(time.Hour)); err == nil {
		t.Fatal("collected another pilot's claim")
	}
	if _, err = collectAnomaly(app, "a", a.Id, now); err == nil {
		t.Fatal("collected before arrival")
	}
	if _, err = strikeAnomaly(app, "b", a.Id, now); err == nil {
		t.Fatal("another pilot played claim")
	}
	if _, err = strikeAnomaly(app, "a", a.Id, now); err != nil {
		t.Fatal(err)
	}
	miss, err := strikeAnomaly(app, "a", a.Id, now.Add(200*time.Millisecond))
	if err != nil || miss.GetInt("hits") != 0 {
		t.Fatal("miss counted")
	}
	for _, ms := range []int{900, 2900, 4900} {
		if _, err = strikeAnomaly(app, "a", a.Id, now.Add(time.Duration(ms)*time.Millisecond)); err != nil {
			t.Fatal(err)
		}
	}
	completion := now.Add(2 * time.Hour) // target expired; reserved share still belongs to pilot.
	for i := 0; i < 2; i++ {
		receipt, err := collectAnomaly(app, "a", a.Id, completion)
		if err != nil {
			t.Fatal(err)
		}
		if receipt["units"] != 10 || receipt["mineral"] != "iron" {
			t.Fatalf("receipt: %v", receipt)
		}
	}
	totals, err := miningTreasury(app, passportWeekKey(completion))
	if err != nil || totals["iron"] != 10 {
		t.Fatalf("weekly totals: %v %v", totals, err)
	}
	other, err := miningTreasury(app, passportWeekKey(completion.AddDate(0, 0, 7)))
	if err != nil || other["iron"] != 0 {
		t.Fatal("week leaked")
	}
	log, err := app.FindRecordById("claims", a.Id)
	if err != nil || log.GetString("user") != "a" || log.GetString("anomaly") != target.Id || log.GetInt("completed") != int(completion.UnixMilli()) {
		t.Fatal("missing contribution log")
	}

}
func TestAnomalySpawnAndExpiry(t *testing.T) {
	app := newLedgerTestApp(t)
	if err := ensureAnomalies(app); err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	target, err := spawnAnomaly(app, "comet", now, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if target.GetInt("capacity") < 2 {
		t.Fatal("not shared")
	}
	if _, err = reserveAnomaly(app, "a", target.Id, now.Add(2*time.Second)); err == nil {
		t.Fatal("reserved expired target")
	}
	next, err := spawnAnomaly(app, "asteroid", now.Add(2*time.Second), asteroidWindow)
	if err != nil {
		t.Fatal(err)
	}
	if next.GetInt("slot") != target.GetInt("slot") {
		t.Fatal("expired slot not reused")
	}
}

func TestCometHaulIsHydrogen(t *testing.T) {
	app := newLedgerTestApp(t)
	if err := ensureAnomalies(app); err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	target, err := spawnAnomaly(app, "comet", now, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	claim, err := reserveAnomaly(app, "pilot", target.Id, now)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = strikeAnomaly(app, "pilot", claim.Id, now); err != nil {
		t.Fatal(err)
	}
	for _, ms := range []int{900, 2900, 4900} {
		if _, err = strikeAnomaly(app, "pilot", claim.Id, now.Add(time.Duration(ms)*time.Millisecond)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = collectAnomaly(app, "pilot", claim.Id, now.Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	totals, err := miningTreasury(app, passportWeekKey(now.Add(time.Minute)))
	if err != nil || totals["hydrogen"] != 10 || totals["iron"] != 0 {
		t.Fatalf("wrong gas haul: %v %v", totals, err)
	}
}
