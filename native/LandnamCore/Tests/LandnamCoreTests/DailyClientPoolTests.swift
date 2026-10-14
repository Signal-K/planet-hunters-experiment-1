import Testing
@testable import LandnamCore

@Suite struct DailyClientPoolTests {
    @Test func stableWithinDayAndRotatesAcrossDays() {
        let a = DailyClientPool.generate(date: "2026-10-14", missionsDone: 2)
        #expect(a == DailyClientPool.generate(date: "2026-10-14", missionsDone: 2))
        #expect(a.map(\.title) != DailyClientPool.generate(date: "2026-10-15", missionsDone: 2).map(\.title))
    }

    @Test func affinityOpensAllTwelveClients() {
        #expect(Clients.all.count == 12)
        #expect(Set(DailyClientPool.generate(date: "2026-10-14", missionsDone: 2).compactMap(\.client)).count == 3)
        let late = DailyClientPool.generate(date: "2026-10-14", missionsDone: 2, clientMissions: ["helios-propulsion-depot": 12])
        #expect(Set(late.compactMap(\.client)).count == 12)
    }

    @Test func idsMatchWebHash() {
        // Same DJB2 as web daily-client-missions.ts, so dcp- ids and picks agree across platforms.
        #expect(DailyClientPool.djb2("a") == 177604)
    }

    @Test func emitsAllThreeConstructJobs() {
        var kinds = Set<String>()
        for day in 1...14 {
            for m in DailyClientPool.generate(date: String(format: "2026-10-%02d", day), missionsDone: 12) {
                guard let plan = m.construction else { continue }
                kinds.insert(plan.structureKind)
                #expect(m.client != nil)
                #expect(m.requires.minerals == plan.requiredMaterials)
            }
        }
        #expect(kinds == ["fuel-depot", "battery-station", "fabrication-pad"])
    }

    @Test func boardUsesDailyPoolAndCatalogResolvesIt() {
        var p = Player()
        p.freeOperations = true
        p.missionsDone = 2
        let entries = MissionBoard.clientBoard(catalog: Catalog(), player: p, now: 1_792_000_000_000)
        let ids = entries.map(\.mission.id)
        #expect(ids.contains { $0.hasPrefix("dcp-") })
        #expect(!ids.contains { MissionBoard.staticFreeOpsIds.contains($0) })
        if let id = ids.first(where: { $0.hasPrefix("dcp-") }) { #expect(Catalog().mission(id)?.id == id) }
    }
}
