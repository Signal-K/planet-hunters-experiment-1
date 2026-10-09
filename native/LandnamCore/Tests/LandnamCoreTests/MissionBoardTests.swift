import Testing
import Foundation
@testable import LandnamCore

@MainActor @Suite struct MissionBoardTests {
    let catalog = Catalog()
    let now = 1_791_000_000_000.0

    private func freeOpsPlayer() -> Player {
        var p = Player(); p.freeOperations = true; p.missionsDone = 3; return p
    }

    @Test func catalogCarriesEveryAuthoredWebMission() {
        let ids = Set(catalog.missions.map(\.id))
        for id in ["program-build-mars-mining-settlement", "program-build-remote-silo", "program-build-refinery", "story-astronaut-academy",
                   "lnm_m3_relay_bennu_vesta", "lnm_m3_relay_itokawa_eros", "lnm_relay_psyche_ceres",
                   "freeops-self-directed-mining", "freeops-crewed-prospecting"] {
            #expect(ids.contains(id), "missing \(id)")
        }
    }

    @Test func guidedPathOffersFirstContractsThenTheTwoTransportClients() {
        var p = Player()
        let first = MissionBoard.clientBoard(catalog: catalog, player: p, now: now)
        #expect(!first.isEmpty && first.count <= 2)
        #expect(first.allSatisfy { $0.mission.sequence == 1 })
        p.missionsDone = 1
        let second = MissionBoard.clientBoard(catalog: catalog, player: p, now: now)
        #expect(Set(second.map(\.id)) == ["lnm_m3_relay_bennu_vesta", "lnm_m3_relay_itokawa_eros"])
        #expect(second.allSatisfy { $0.mission.deliveryTargetId != nil })
    }

    @Test func freeOpsBoardListsClientWorkAndProgrammeHoldsOwnWork() {
        let p = freeOpsPlayer()
        let board = MissionBoard.clientBoard(catalog: catalog, player: p, now: now)
        #expect(board.contains { $0.id == "lnm_relay_psyche_ceres" })
        #expect(board.contains { $0.id == "freeops-crewed-prospecting" })
        #expect(board.allSatisfy { !$0.mission.isOwnProgram })
        let programme = MissionBoard.programBoard(catalog: catalog, player: p, now: now)
        #expect(programme.contains { $0.id == "freeops-self-directed-mining" })
        #expect(programme.contains { $0.id == "program-build-remote-silo" })
        #expect(MissionBoard.programBoard(catalog: catalog, player: Player(), now: now).isEmpty)
    }

    @Test func crewedProspectingNeedsAcademyAndAQualifiedAstronaut() {
        var p = freeOpsPlayer()
        let m = catalog.mission("freeops-crewed-prospecting")!
        #expect(MissionBoard.gate(m, player: p, now: now) == "Build the Astronaut Academy first")
        p.placed = ["astronaut-academy"]
        #expect(MissionBoard.gate(m, player: p, now: now)?.contains("Hire and train") == true)
        p.crew = [Academy.createMember(id: "c1", crewClass: .astronaut, selfTrained: true, now: now)]
        p.crew[0].specialisations = [CrewSpecialisation(branch: "mining", tier: 1)]
        #expect(MissionBoard.gate(m, player: p, now: now) == nil)
    }

    @Test func refineryBuildWaitsForSettlementAndSilo() {
        var p = freeOpsPlayer()
        let refinery = catalog.mission("program-build-refinery")!
        p.stash = ["aluminium": 50, "copper": 50]
        #expect(MissionBoard.gate(refinery, player: p, now: now)?.contains("settlement") == true)
        for kind in ["mining-settlement", "mineral-silo"] {
            p.extras["clientStructures"] = .array(((p.extras["clientStructures"].flatMap { v -> [JSONValue]? in if case .array(let a) = v { return a } else { return nil } }) ?? []) + [
                .object(["targetId": .string("mars"), "structureKind": .string(kind), "clientId": .string("mission-control"), "state": .string("operational")])])
        }
        #expect(MissionBoard.gate(refinery, player: p, now: now) == nil)
    }

    @Test func buildMissionRefusedWithoutKitThenDeliversAndConsumesIt() {
        var s = GameState(); s.screen = .launchpad; s.player.freeOperations = true; s.player.missionsDone = 3
        let silo = catalog.mission("program-build-remote-silo")!
        #expect(Loop.pickMission(s, id: silo.id, catalog: catalog) == s, "no kit, no flight")
        s.player.stash = ["aluminium": 20, "iron": 12, "copper": 6]
        let picked = Loop.pickMission(s, id: silo.id, catalog: catalog)
        #expect(picked != s)
        let done = ConstructionMissions.applyDelivery(s, plan: silo.construction!, targetId: "vesta", now: now)
        #expect(done.player.stash["aluminium"] == 2 && done.player.stash["iron"] == nil)
        #expect(ConstructionMissions.records(done.player) == [.init(targetId: "vesta", structureKind: "mineral-silo", state: "under-construction")])
        #expect(!ConstructionMissions.delivered(done.player, kind: "mineral-silo", now: now))
        #expect(ConstructionMissions.delivered(done.player, kind: "mineral-silo", now: now + 46 * 60_000))
    }

    @Test func archiveCoversEveryMissionRocketStructureInstrumentAndSpaceWeekEvent() {
        let entries = Archive.entries(catalog: catalog, player: freeOpsPlayer(), now: now)
        let ids = Set(entries.map(\.id))
        for m in catalog.missions { #expect(ids.contains("mission:\(m.id)")) }
        for r in Rockets.models { #expect(ids.contains("rocket:\(r.id)")) }
        for e in SkyEvents.all { #expect(ids.contains("event:\(e.id)")) }
        for b in Construction.all { #expect(ids.contains("structure:\(b.id)")) }
        #expect(entries.filter { $0.category == .spaceWeek }.count == 5)
        #expect(entries.allSatisfy { !$0.steps.isEmpty })
    }

    @Test func archiveShowsWhatUnlocksAProspectorAndSpaceWeekWindows() {
        var p = Player()
        let prospector = Archive.entries(catalog: catalog, player: p, now: now).first { $0.id == "rocket:prospector" }!
        #expect(prospector.status == .locked)
        #expect(prospector.requirements.contains { $0.label == "Experience" && !$0.met })
        p.missionsDone = 1; p.francs = 20_000_000
        let again = Archive.entries(catalog: catalog, player: p, now: now).first { $0.id == "rocket:prospector" }!
        #expect(again.status == .available && again.requirements.allSatisfy(\.met))
        let oct7 = SkyEvents.utc(2026, 10, 7) + 3_600_000
        let rr = Archive.entries(catalog: catalog, player: p, now: oct7).first { $0.id == "event:rocket-revolution-2026" }!
        #expect(rr.status == .live)
        let saturn = Archive.entries(catalog: catalog, player: p, now: oct7).first { $0.id == "event:saturn-night-2026" }!
        #expect(saturn.requirements.contains { $0.label == "Saturn Imager" && !$0.met })
    }
}

@MainActor @Suite struct ArchivePathwayTests {
    @Test func pathwayWalksFromFirstContractToOffworldBuildsAndTracksProgress() {
        let catalog = Catalog(); let now = 1_791_000_000_000.0
        var p = Player()
        var entries = Archive.entries(catalog: catalog, player: p, now: now)
        var path = Archive.pathway(player: p, entries: entries)
        #expect(path.map(\.title).first == "First contract" && path.map(\.title).last == "Off-world builds")
        #expect(path.first { !$0.done }?.title == "First contract")
        // Every node that points at an entry points at one that exists.
        for n in path { if let id = n.entryId { #expect(entries.contains { $0.id == id }, "\(id)") } }
        p.missionsDone = 2; p.placed = ["launchpad", "surface-silo"]; p.freeOperations = true
        entries = Archive.entries(catalog: catalog, player: p, now: now)
        path = Archive.pathway(player: p, entries: entries)
        #expect(path.prefix(4).allSatisfy { $0.done })
        #expect(path.first { !$0.done }?.title == "Prospector rocket" || path.first { !$0.done }?.title == "Your own instrument")
    }
}
