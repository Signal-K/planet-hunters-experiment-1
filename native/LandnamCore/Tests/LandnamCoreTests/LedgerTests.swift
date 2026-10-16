import Testing
import Foundation
@testable import LandnamCore

/// Same vectors as web lib/sync/ledger.test.ts: two devices play offline from one save, then sync in either order.
@Suite struct LedgerTests {
    func shared() -> GameState {
        var s = GameState()
        s.player.francs = 1000; s.player.missionsDone = 3; s.player.stash = ["nickel": 2]; s.player.placed = ["launchpad"]; s.updatedAt = 1
        return Ledger.stamp(s, device: "seed")
    }
    func a(_ s: GameState) -> GameState {
        var n = s; n.player.francs += 500; n.player.missionsDone += 1; n.player.stash["nickel", default: 0] += 3; n.player.placed.append("surface-silo"); n.updatedAt = 10
        return Ledger.stamp(n, device: "A")
    }
    func b(_ s: GameState) -> GameState {
        var n = s; n.player.francs -= 200; n.player.missionsDone += 1; n.player.stash["nickel", default: 0] += 2; n.player.stash["cobalt"] = 1; n.player.placed.append("astronaut-academy"); n.updatedAt = 20
        return Ledger.stamp(n, device: "B")
    }
    func converged(_ s: GameState) {
        #expect(s.player.francs == 1300)
        #expect(s.player.missionsDone == 5)
        #expect(s.player.stash == ["nickel": 7, "cobalt": 1])
        #expect(Set(s.player.placed) == ["launchpad", "surface-silo", "astronaut-academy"])
    }

    @Test func bothOfflineDevicesCountInEitherOrder() {
        let base = shared(), da = a(base), db = b(base)
        let s1 = CloudMerge.merge(local: db, remote: da); converged(s1); converged(CloudMerge.merge(local: da, remote: s1))
        let s2 = CloudMerge.merge(local: da, remote: db); converged(s2); converged(CloudMerge.merge(local: db, remote: s2))
        converged(CloudMerge.merge(local: s1, remote: s2))
        converged(CloudMerge.merge(local: CloudMerge.merge(local: s2, remote: s2), remote: s1))
    }

    @Test func stampIsIdempotentAndPlayContinuesAfterMerge() {
        let m = CloudMerge.merge(local: a(shared()), remote: b(shared()))
        #expect(Ledger.stamp(m, device: "A") == m)
        var more = m; more.player.francs += 1
        more = Ledger.stamp(more, device: "A")
        #expect(CloudMerge.merge(local: m, remote: more).player.francs == 1301)
    }

    @Test func emptyOrStaleSaveNeverOverwritesRicher() {
        let rich = a(shared())
        let empty = Ledger.stamp(GameState(), device: "fresh")
        #expect(CloudMerge.merge(local: empty, remote: rich).player.francs == 1500)
        #expect(CloudMerge.merge(local: rich, remote: empty).player.francs == 1500)
        #expect(CloudMerge.merge(local: shared(), remote: rich).player.francs == 1500)
        #expect(CloudMerge.merge(local: rich, remote: shared()).player.stash["nickel"] == 5)
    }

    @Test func webLedgerRoundTripsThroughNativeSave() throws {
        let json = #"{"player":{"francs":1300,"missionsDone":5},"syncLedger":{"v":1,"base":{"francs":1000,"missionsDone":3},"devices":{"web-x":{"seq":2,"plus":{"francs":300,"missionsDone":2},"minus":{}}},"version":4}}"#
        let s = try JSONDecoder().decode(GameState.self, from: Data(json.utf8))
        #expect(Ledger.version(s) == 4)
        #expect(Ledger.values(Ledger.get(s)!)["francs"] == 1300)
        #expect(Ledger.stamp(s, device: "ios-y") == s)
    }

    @Test func noOpMergeDoesNotLoop() {
        let s = shared()
        var t = Ledger.withVersion(s, 9); t.updatedAt = 99
        #expect(PocketBaseExecutor.sameContent(s, t))
        var u = t; u.player.francs += 1
        #expect(!PocketBaseExecutor.sameContent(s, u))
    }
}
