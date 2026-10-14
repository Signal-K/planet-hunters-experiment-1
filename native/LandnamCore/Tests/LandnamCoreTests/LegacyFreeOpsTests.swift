import Testing
import Foundation
@testable import LandnamCore

/// SSL-569: veteran saves (many missions flown, old onboarding) load in Free Ops on native too.
@MainActor @Suite struct LegacyFreeOpsTests {
    let now = 1_791_000_000_000.0

    private func decode(_ player: String) throws -> GameState {
        let json = #"{"screen":"hub","tutorial":true,"doneSteps":["welcome","m1-complete","m3-complete"],"player":"# + player + "}"
        return try JSONDecoder().decode(GameState.self, from: Data(json.utf8))
    }

    private func assertFreeOps(_ s: GameState) {
        #expect(s.player.freeOperations)
        #expect(!s.tutorial)
        let catalog = Instruments.runtime(Catalog(), player: s.player, missionId: nil, targetId: nil)
        #expect(catalog.missions.contains { $0.id == Instruments.transitMissionId })
        let board = MissionBoard.clientBoard(catalog: catalog, player: s.player, now: now)
        #expect(!board.isEmpty)
        #expect(board.allSatisfy { $0.lockedReason?.contains("guided contract") != true && $0.lockedReason != "Completed" })
        #expect(board.contains { $0.unlocked })
    }

    @Test func tenMissionsWithoutFlagIsFreeOps() throws {
        assertFreeOps(try decode(#"{"missionsDone":10,"placed":["launchpad","surface-silo"]}"#))
    }

    @Test func staleFalseFlagAndOpenedFlightPlanHeal() throws {
        assertFreeOps(try decode(#"{"missionsDone":10,"freeOperations":false,"flightPlan":{"completed":{"mining":true},"hidden":false,"replayTry":"scan"}}"#))
    }

    @Test func missingCounterHealsFromMissionLog() throws {
        let log = (0..<6).map { #"{"id":"m\#($0)","title":"Lunar ore haul","completedAt":\#(1_750_000_000_000 + $0)}"# }.joined(separator: ",")
        let s = try decode(#"{"completedMissions":["# + log + "]}")
        #expect(s.player.missionsDone >= 6)
        assertFreeOps(s)
    }

    @Test func freshPlayerStaysInOnboarding() throws {
        #expect(!(try decode(#"{"missionsDone":1}"#)).player.freeOperations)
    }
}
