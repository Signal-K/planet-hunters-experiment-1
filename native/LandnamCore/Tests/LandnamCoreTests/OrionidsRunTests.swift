import Foundation
import Testing
@testable import LandnamCore

@Suite struct OrionidsRunTests {
    private func ms(_ day: Int, _ hour: Int) -> Double {
        (Calendar.current.date(from: DateComponents(year: 2026, month: 10, day: day, hour: hour))!.timeIntervalSince1970) * 1000
    }

    @Test func launchCatchIsTwoInTheWindowDoubleOnPeakNightAndNothingOutside() {
        #expect(OrionidsRun.fragmentsCaughtOnLaunch(at: ms(25, 12)) == 2)
        #expect(OrionidsRun.fragmentsCaughtOnLaunch(at: ms(21, 22)) == 4)
        #expect(OrionidsRun.fragmentsCaughtOnLaunch(at: ms(15, 12)) == 0)
    }

    @Test func theRunCountsFromAcceptNotFromTheLifetimeLedger() {
        var p = Player()
        OrionidsRun.addCaught(&p, 25, toStash: false)
        #expect(OrionidsRun.filled(p), "no baseline falls back to the ledger, as web does")
        OrionidsRun.start(&p)
        #expect(OrionidsRun.catches(p) == 0)
        #expect(!OrionidsRun.filled(p))
        OrionidsRun.addCaught(&p, 20, toStash: false)
        #expect(OrionidsRun.filled(p))
    }

    @Test func settlingPaysOnceAndResetsTheCount() {
        var p = Player(); p.francs = 100
        OrionidsRun.start(&p)
        OrionidsRun.addCaught(&p, 20, toStash: false)
        OrionidsRun.settle(&p, missionsDone: 5)
        let paid = p.francs - 100
        #expect(paid == OrionidsRun.payout(missionsDone: 5))
        #expect(paid > 0)
        OrionidsRun.settle(&p, missionsDone: 5)
        #expect(p.francs - 100 == paid, "a second collect finds the order empty")
    }

    @Test func aFilledRunKeepsItsFragmentsOutOfTheSale() {
        #expect(OrionidsRun.withoutFragments(["iron": 3, "orionid_debris": 20]) == ["iron": 3])
    }

    @Test func theDebriefPaysAFilledRunAndKeepsItsFragments() {
        #expect(OrionidsRun.mission().requires.minerals["orionid_debris"] == 20)
        var d = GameState()
        d.player.freeOperations = true
        d.player.missionsDone = 5
        OrionidsRun.addCaught(&d.player, 25, toStash: false)
        OrionidsRun.start(&d.player)
        OrionidsRun.addCaught(&d.player, 20, toStash: false)
        d.screen = .debrief; d.missionId = OrionidsRun.missionId; d.targetId = "eros"
        d.lastCargo = ["orionid_debris": 20]
        let before = d.player.francs
        let done = Loop.debriefDone(d, payout: 0, affinity: 0, catalog: Catalog(), now: ms(25, 12))
        #expect(done.player.francs - before >= OrionidsRun.payout(missionsDone: 5))
        #expect(OrionidsRun.catches(done.player) == 0)
        #expect(done.player.stash["orionid_debris"] == nil, "fragments are not sold or stored as haul")
    }

    @Test func theLedgerRoundTripsThroughTheSave() throws {
        var p = Player()
        p.orionidsFragments = OrionidsFragments(caught: 7, redeemed: 2)
        p.orionidsRunBaseline = 3
        let data = try JSONEncoder().encode(p)
        let back = try JSONDecoder().decode(Player.self, from: data)
        #expect(back.orionidsFragments == p.orionidsFragments)
        #expect(back.orionidsRunBaseline == 3)
        let webNull = Data(#"{"orionidsFragments":null,"orionidsRunBaseline":null}"#.utf8)
        let fresh = try JSONDecoder().decode(Player.self, from: webNull)
        #expect(fresh.orionidsFragments == OrionidsFragments())
        #expect(fresh.orionidsRunBaseline == nil)
    }
}
