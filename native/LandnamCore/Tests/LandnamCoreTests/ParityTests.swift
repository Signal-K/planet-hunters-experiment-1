import Testing
import Foundation
@testable import LandnamCore

/// Fixture was dumped from the TypeScript generator in web/lib/data (2026-10-05).
/// Regenerate it if the web mission templates, payout floors or targets change.
@Suite struct ParityTests {
    private struct Dump: Decodable {
        struct M: Decodable { let id, title: String; let client: String?; let seq, cargo, drill, orbit, francs, affinity: Int; let minerals: [String: Int] }
        struct T: Decodable { let id: String; let orbit: Int; let minerals: [String] }
        let missions: [M]; let targets: [T]; let floors: [Int]
    }

    private func load() throws -> Dump {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Fixtures/web-board.json")
        return try JSONDecoder().decode(Dump.self, from: Data(contentsOf: url))
    }

    @Test func boardMatchesWeb() throws {
        let web = try load()
        let swift = MissionGenerator.fullBoard()
        #expect(swift.map(\.id) == web.missions.map(\.id))
        for (s, w) in zip(swift, web.missions) {
            #expect(s.title == w.title, "\(w.id) title")
            #expect(s.client == w.client, "\(w.id) client")
            #expect(s.sequence == w.seq, "\(w.id) seq")
            #expect(s.requires.minerals == w.minerals, "\(w.id) minerals")
            #expect(s.requires.cargoMin == w.cargo && s.requires.drillTier == w.drill && s.requires.maxOrbit == w.orbit, "\(w.id) requires")
            #expect(s.payout.francs == w.francs && s.payout.affinity == w.affinity, "\(w.id) payout")
        }
    }

    @Test func targetsAndFloorsMatchWeb() throws {
        let web = try load()
        #expect(Targets.all.map(\.id) == web.targets.map(\.id))
        for (s, w) in zip(Targets.all, web.targets) {
            #expect(s.orbit == w.orbit && s.minerals.sorted() == w.minerals, "\(w.id)")
        }
        #expect([1, 2, 3, 4, 5, 9].map { MissionGenerator.payoutFloor(sequence: $0) } == web.floors)
    }
}
