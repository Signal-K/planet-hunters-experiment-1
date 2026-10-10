import Testing
import Foundation
@testable import LandnamCore

@Suite struct ConfirmedAndDeedTests {
    @Test func parsesLastConfirmedPayload() throws {
        let a = try LastConfirmed.parse(Data(#"{"lastConfirmedAt":"2026-10-08T10:00:00Z","subjectId":"s1"}"#.utf8))
        #expect(a == LastConfirmed(lastConfirmedAt: "2026-10-08T10:00:00Z", subjectId: "s1"))
        let b = try LastConfirmed.parse(Data(#"{"lastConfirmedAt":null}"#.utf8))
        #expect(b == LastConfirmed())
    }

    @Test func firstSightingIsSilentButFlagsRepick() {
        let (s1, announce1) = ConfirmedDiscovery.apply(GameState(), lastConfirmedAt: "t1")
        #expect(!announce1 && s1.player.pendingRepick && s1.player.lastSeenConfirmedAt == "t1")
        let (s2, announce2) = ConfirmedDiscovery.apply(s1, lastConfirmedAt: "t1")
        #expect(!announce2 && s2 == s1)
        let (s3, announce3) = ConfirmedDiscovery.apply(s1, lastConfirmedAt: "t2")
        #expect(announce3 && s3.player.lastSeenConfirmedAt == "t2")
        #expect(ConfirmedDiscovery.apply(GameState(), lastConfirmedAt: nil).0 == GameState())
    }

    @Test func lastSeenSurvivesSaveRoundTrip() throws {
        var gs = GameState(); gs.player.lastSeenConfirmedAt = "t9"
        let back = try JSONDecoder().decode(GameState.self, from: JSONEncoder().encode(gs))
        #expect(back.player.lastSeenConfirmedAt == "t9")
    }

    @Test func siteDeedIsAQueuedPostOfTheSiteId() {
        #expect(SiteDeed.op(siteId: "ceres") == .http(path: "api/treasury/site-deed", body: ["siteId": .string("ceres")]))
    }

    @Test func siteDeedQueuesOfflineAndStaysUntilReplayed() async {
        let outbox = Outbox(store: MemoryOutboxStore(), execute: { _ in .offline })
        let sync = CloudSync(outbox: outbox)
        await sync.enqueue(SiteDeed.op(siteId: "ceres"))
        #expect(await outbox.pending().count == 1)
    }
}
