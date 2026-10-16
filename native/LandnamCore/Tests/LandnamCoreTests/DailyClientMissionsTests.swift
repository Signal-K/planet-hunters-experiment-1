import Testing
import Foundation
@testable import LandnamCore

/// Fixture `daily-pool.json` was dumped from `generateDailyClientPool` in web/lib/data (2026-10-15).
/// Regenerate it if the web templates, clients, minerals, targets or payout floors change.
@Suite struct DailyClientMissionsTests {
    private struct Case: Decodable {
        struct M: Decodable {
            struct C: Decodable { let kind: String; let materials: [String: Int]; let buildTimeMs: Int }
            let id, title, brief, tag, difficulty: String
            let client: String?
            let seq, cargo, drill, orbit, francs, affinity: Int
            let minerals: [String: Int]
            let construction: C?
        }
        let date: String; let done: Int; let affinity: [String: Int]; let maxTier: Int; let missions: [M]
    }

    private func load() throws -> [Case] {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Fixtures/daily-pool.json")
        return try JSONDecoder().decode([Case].self, from: Data(contentsOf: url))
    }

    @Test func poolMatchesWeb() throws {
        for c in try load() {
            let label = "\(c.date) after \(c.done)"
            #expect(DailyClientMissions.maxTier(missionsDone: c.done) == c.maxTier, "\(label) tier")
            let swift = DailyClientMissions.generate(date: c.date, missionsDone: c.done, clientMissions: c.affinity)
            #expect(swift.map(\.id) == c.missions.map(\.id), "\(label) ids")
            for (s, w) in zip(swift, c.missions) {
                #expect(s.title == w.title && s.brief == w.brief, "\(w.id) copy")
                #expect(s.client == w.client && s.tag == w.tag && s.difficulty == w.difficulty && s.sequence == w.seq, "\(w.id) identity")
                #expect(s.requires.minerals == w.minerals, "\(w.id) minerals")
                #expect(s.requires.cargoMin == w.cargo && s.requires.drillTier == w.drill && s.requires.maxOrbit == w.orbit, "\(w.id) requires")
                #expect(s.payout.francs == w.francs && s.payout.affinity == w.affinity, "\(w.id) payout")
                #expect(s.construction?.structureKind == w.construction?.kind, "\(w.id) structure")
                #expect(s.construction?.requiredMaterials == w.construction?.materials, "\(w.id) materials")
                #expect(s.construction?.buildTimeMs == w.construction?.buildTimeMs, "\(w.id) build time")
            }
        }
    }

    @Test func twoDaysShowDifferentContracts() {
        let a = DailyClientMissions.generate(date: "2026-10-16", missionsDone: 6).map(\.id)
        let b = DailyClientMissions.generate(date: "2026-10-17", missionsDone: 6).map(\.id)
        #expect(a != b)
    }

    @Test func higherTierClientsOpenAsMissionsAreFlown() {
        let early = Set(DailyClientMissions.generate(date: "2026-10-16", missionsDone: 2).compactMap(\.client))
        let late = Set(DailyClientMissions.generate(date: "2026-10-16", missionsDone: 12).compactMap(\.client))
        #expect(late.count > early.count)
        #expect(late.compactMap { Clients.byId[$0]?.unlockTier }.max()! > early.compactMap { Clients.byId[$0]?.unlockTier }.max()!)
    }

    @Test func refreshKeepsTodaysProgressAndResetsOnANewDay() {
        let first = DailyClientMissions.refreshed(nil, missionsDone: 2, clientMissions: [:], today: "2026-10-16")
        var marked = first
        marked.acceptedId = first.missions[0].id
        marked.completedIds = [first.missions[1].id]
        let grown = DailyClientMissions.refreshed(marked, missionsDone: 12, clientMissions: [:], today: "2026-10-16")
        #expect(grown.missions.count > first.missions.count)
        #expect(grown.acceptedId == first.missions[0].id && grown.completedIds == [first.missions[1].id])
        #expect(DailyClientMissions.refreshed(grown, missionsDone: 12, clientMissions: [:], today: "2026-10-16") == grown)
        let next = DailyClientMissions.refreshed(grown, missionsDone: 12, clientMissions: [:], today: "2026-10-17")
        #expect(next.acceptedId == nil && next.completedIds.isEmpty)
    }

    @Test func poolRoundTripsThroughAPlayerSave() throws {
        var p = Player()
        p.dailyClientPool = DailyClientMissions.refreshed(nil, missionsDone: 6, clientMissions: [:], today: "2026-10-16")
        let back = try JSONDecoder().decode(Player.self, from: JSONEncoder().encode(p))
        #expect(back.dailyClientPool == p.dailyClientPool)
    }
}

@MainActor @Suite struct DailyClientBoardTests {
    let noon = 1_791_000_000_000.0   // fixed instant; the pool date comes from the store clock

    private func store(done: Int = 6) -> GameStore {
        var s = GameState()
        s.player.freeOperations = true; s.player.missionsDone = done; s.player.placed = ["launchpad"]
        s.screen = .missions
        let now = noon
        return GameStore(state: s, catalog: Catalog(), saveURL: nil, clock: { now })
    }

    @Test func freeOpsBoardLeadsWithTodaysPoolAndHidesTheFixedClientRuns() throws {
        let store = store()
        let pool = try #require(store.player.dailyClientPool)
        let board = MissionBoard.clientBoard(catalog: store.catalog, player: store.player, now: noon)
        #expect(board.first.map { DailyClientMissions.isPoolId($0.id) } == true)
        #expect(!board.contains { $0.id.hasPrefix("freeops-") && $0.mission.client != nil })
        #expect(board.filter { DailyClientMissions.isPoolId($0.id) }.count > 0 && pool.missions.count > 0)
    }

    @Test func aTomorrowStoreShowsDifferentContracts() {
        let today = store().player.dailyClientPool?.missions.map(\.id)
        var s = GameState(); s.player.freeOperations = true; s.player.missionsDone = 6; s.screen = .missions
        let tomorrow = noon + 24 * 3600 * 1000
        let next = GameStore(state: s, catalog: Catalog(), saveURL: nil, clock: { tomorrow })
        #expect(next.player.dailyClientPool?.missions.map(\.id) != today)
    }

    @Test func acceptingAPoolContractReachesALaunchReviewWithATarget() throws {
        let store = store()
        let pick = try #require(MissionBoard.clientBoard(catalog: store.catalog, player: store.player, now: noon)
            .first { DailyClientMissions.isPoolId($0.id) && $0.unlocked && $0.mission.construction == nil })
        store.pickMission(pick.id)
        #expect(store.state.missionId == pick.id)
        #expect(store.state.targetId != nil, "auto-picked a target, not stranded on the target picker")
        #expect([Screen.rocketBuy, .fab].contains(store.state.screen))
        #expect(store.player.dailyClientPool?.acceptedId == pick.id)
    }

    @Test func aBuildJobNeedsNoStorageKitAndIsOfferedAsClientWork() throws {
        let store = store()
        let board = MissionBoard.clientBoard(catalog: store.catalog, player: store.player, now: noon)
        let builds = board.filter { $0.mission.construction != nil && DailyClientMissions.isPoolId($0.id) }
        #expect(builds.count == 3)
        for b in builds { #expect(b.unlocked && b.feasibleTargets > 0, "\(b.id) \(b.lockedReason ?? "")") }
    }

    @Test func finishingABuildJobPlacesTheClientsStructureAndRetiresTheContract() throws {
        let store = store()
        let job = try #require(store.player.dailyClientPool?.missions.first { $0.construction != nil })
        let plan = try #require(job.construction)
        var s = store.state
        s.screen = .debrief; s.missionId = job.id; s.targetId = "bennu"; s.lastCargo = plan.requiredMaterials
        s.player.stash = plan.requiredMaterials
        let done = Loop.debriefDone(s, payout: job.payout.francs, affinity: job.payout.affinity, consumed: plan.requiredMaterials, catalog: store.catalog, now: noon)
        guard case .array(let items)? = done.player.extras["clientStructures"], case .object(let first)? = items.first else { Issue.record("no structure placed"); return }
        #expect(first["structureKind"] == .string(plan.structureKind))
        #expect(first["targetId"] == .string("bennu"))
        #expect(first["clientId"] == .string(job.client!))
        #expect(done.player.dailyClientPool?.completedIds.contains(job.id) == true)
        let board = MissionBoard.clientBoard(catalog: store.catalog, player: done.player, now: noon)
        #expect(!board.contains { $0.id == job.id })
    }
}
