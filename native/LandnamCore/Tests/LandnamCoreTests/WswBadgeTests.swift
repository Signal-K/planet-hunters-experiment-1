import Testing
import Foundation
@testable import LandnamCore

@Suite struct WswBadgeTests {
    func ms(_ iso: String) -> Double { ISO8601DateFormatter().date(from: iso)!.timeIntervalSince1970 * 1000 }

    @Test func everyTypeHasOneBadgeOnARealSkyEvent() {
        #expect(WswBadges.all.count == WswMissionType.allCases.count)
        #expect(Set(WswBadges.all.map(\.badgeId)).count == WswBadges.all.count)
        for b in WswBadges.all { #expect(SkyEvents.event(b.eventId) != nil) }
        #expect(WswBadges.badge(for: .constructionLaunch).eventId == "rocket-revolution-2026")
        #expect(WswBadges.badge(for: .citizenScience).eventId == "saturn-night-2026")
        #expect(WswBadges.badge(for: .miningFreeOps).eventId == "draconids-2026")
    }

    @Test func goldDuringWswSilverAfterNothingBeforeNeverDowngrades() {
        var b: [String: PlayerBadge] = [:]
        WswBadges.grant(&b, .roverSurfaceOps, at: ms("2026-10-03T23:59:59Z"))
        #expect(b.isEmpty)
        WswBadges.grant(&b, .roverSurfaceOps, at: ms("2026-10-09T12:00:00Z"))
        WswBadges.grant(&b, .roverSurfaceOps, at: ms("2026-10-20T12:00:00Z"))
        #expect(b["wsw-2026-rover-surface-ops"]?.tier == .gold)
        WswBadges.grant(&b, .citizenScience, at: ms("2026-10-20T12:00:00Z"))
        #expect(b["wsw-2026-citizen-science"]?.tier == .silver)
    }

    @Test func classifiesMissions() {
        #expect(WswBadges.type(for: nil, freeOperations: false) == .onboardingRelay)
        #expect(WswBadges.type(for: nil, freeOperations: true) == .miningFreeOps)
    }

    @Test @MainActor func todayLaunchAndDraconidsBadgesAreGoldAndClassificationAwardsCitizenScience() {
        final class Tick: @unchecked Sendable { var v = 0.0 }
        let t = Tick(); t.v = ms("2026-10-09T12:00:00Z")
        let store = GameStore(clock: { t.v })
        store.debrisMined("draconid_debris")
        #expect(store.player.badges["draconids-2026"]?.tier == .gold)
        store.classifyAsteroid("a1", verdict: .likelyReal)
        #expect(store.player.badges["wsw-2026-citizen-science"]?.tier == .gold)
        var b: [String: PlayerBadge] = [:]
        SkyEvents.grant(&b, activity: .launch, at: t.v)
        #expect(b["rocket-revolution-2026"]?.tier == .gold)
    }

    @Test func completingAMissionDuringWswAwardsItsTypeBadge() {
        let catalog = Catalog()
        guard let mission = catalog.missions.first else { Issue.record("no missions"); return }
        var s = GameState(); s.screen = .debrief; s.missionId = mission.id; s.targetId = "moon"; s.lastCargo = [:]
        let done = Loop.debriefDone(s, payout: 0, affinity: 0, catalog: catalog, now: ms("2026-10-09T12:00:00Z"))
        let expected = WswBadges.badge(for: WswBadges.type(for: mission, freeOperations: false))
        #expect(done.player.badges[expected.badgeId]?.tier == .gold)
        let early = Loop.debriefDone(s, payout: 0, affinity: 0, catalog: catalog, now: ms("2026-10-01T12:00:00Z"))
        #expect(early.player.badges[expected.badgeId] == nil)
    }
}
