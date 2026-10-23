import Testing
import Foundation
@testable import LandnamCore

/// SSL-574: the native delivery scene runs the same 8 s unload clock as web and hands over to the flight home.
@Suite struct DeliveryTests {
    private func arrived(at now: Double) -> GameState {
        let m = Catalog().mission("lnm_m3_relay_bennu_vesta")!
        var gs = GameState()
        gs.missionId = m.id; gs.targetId = m.targetId; gs.deliveryTargetId = m.deliveryTargetId
        gs.lastCargo = m.requires.minerals.merging(["ice": 2]) { a, _ in a }
        gs.player.headingToDelivery = true
        gs.screen = .transit
        return Transitions.applyDeliveryArrived(gs, now: now)
    }

    @Test func theUnloadRunsOnThePersistedClock() {
        let gs = arrived(at: 1_000)
        #expect(gs.screen == .delivery)
        #expect(Delivery.progress(gs.player, now: 1_000) == 0)
        #expect(Delivery.progress(gs.player, now: 5_000) == 0.5)
        #expect(Delivery.remainingMs(gs.player, now: 5_000) == 4_000)
        #expect(Delivery.progress(gs.player, now: 20_000) == 1)
    }

    @Test func anUnloadWithNoClockIsDueInsteadOfStalling() {
        var p = Player(); p.deliveryUnloadStartedAt = nil
        #expect(Delivery.progress(p, now: 5_000) == 1 && Delivery.remainingMs(p, now: 5_000) == 0)
    }

    @Test func theManifestShowsOnlyOrderedMinerals() {
        let gs = arrived(at: 0)
        let m = Catalog().mission(gs.missionId)
        let rows = Delivery.orderedCargo(gs.lastCargo ?? [:], mission: m)
        #expect(Set(rows.map(\.id)) == Set(m!.requires.minerals.filter { $0.value > 0 }.keys))
        #expect(Delivery.transportFee(m) == m!.payout.francs - Int((Double(m!.payout.francs) * 0.5).rounded()))
    }

    @Test func finishingTheUnloadStartsTheFlightHome() {
        let gs = arrived(at: 0)
        let n = Loop.deliveryUnloadComplete(gs, catalog: Catalog(), now: 9_000)
        #expect(n.screen == .transit && n.player.returningToEarth && n.player.deliveryUnloadStartedAt == nil)
        #expect(n.deliveredCargo == gs.lastCargo)
    }

    @Test func onlyTheTransportLessonUsesTheRoverDropoff() {
        var p = Player(); p.missionsDone = Transitions.transportLessonMissionsDone
        #expect(Dropoff.applies(p))
        p.missionsDone += 1
        #expect(!Dropoff.applies(p))
    }

    @Test func theRoverMustParkAtTheDepotBeforeDumping() {
        var d = Dropoff()
        #expect(!d.dump(cargoUnits: 6) && d.refusal == .notParked)
        #expect(Dropoff.message(for: .notParked) == "PARK BESIDE THE DEPOT CACHE")
        for _ in 0..<7 { d.drive(by: Dropoff.step) }
        #expect(d.parked)
        #expect(!d.dump(cargoUnits: 0) && d.refusal == .noCargo)
        #expect(d.dump(cargoUnits: 6) && d.stage == .dumped && d.refusal == nil)
        // Emptied: the rover no longer drives until it is sent home.
        d.drive(to: 0.2)
        #expect(d.rover >= Dropoff.parkedFrom)
        d.returnRover()
        #expect(d.stage == .returned && d.rover == 0)
    }

    @Test func returningNeedsTheCargoDumpedFirst() {
        var d = Dropoff()
        d.returnRover()
        #expect(d.stage == .driving)
        d.drive(to: 5)
        #expect(d.rover == 1)
    }
}
