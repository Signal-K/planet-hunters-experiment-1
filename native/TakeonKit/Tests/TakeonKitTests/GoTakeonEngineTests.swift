#if canImport(Takeon)
import XCTest
@testable import TakeonKit

/// Runs the Go runtime (gomobile xcframework) against the golden fixtures that
/// the Go side already checks against the TS engine (golden/run.json, golden/module.json).
final class GoTakeonEngineTests: XCTestCase {
    // MARK: fixtures

    private func fixture(_ name: String) throws -> Any {
        let url = try XCTUnwrap(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures"))
        return try JSONSerialization.jsonObject(with: Data(contentsOf: url))
    }

    private func stateDict(_ e: TakeonEngine) throws -> [String: Any] {
        try XCTUnwrap(JSONSerialization.jsonObject(with: e.state()) as? [String: Any])
    }

    private func jsonString(_ v: Any) throws -> String {
        String(decoding: try JSONSerialization.data(withJSONObject: v, options: [.sortedKeys]), as: UTF8.self)
    }

    private func num(_ v: Any?) -> Double { (v as? NSNumber)?.doubleValue ?? .nan }

    // MARK: scripted run vs golden/run.json

    private func checkScriptedRun(body: String) throws {
        let runs = try XCTUnwrap(fixture("run") as? [[String: Any]])
        let run = try XCTUnwrap(runs.first { $0["body"] as? String == body })
        let seed = UInt64(try XCTUnwrap(run["seed"] as? Int))
        let script = try XCTUnwrap(run["script"] as? [[String: Any]])
        let snaps = try XCTUnwrap(run["snapshots"] as? [[String: Any]])
        let results = try XCTUnwrap(run["results"] as? [[Any]])

        let engine = GoTakeonEngine()
        try engine.loadWorld(.init(targetId: body, seed: seed))

        func check(_ tick: Int, _ want: [String: Any]) throws {
            let s = try stateDict(engine)
            let r = try XCTUnwrap(s["rover"] as? [String: Any])
            let ctx = "\(body) tick \(tick)"
            XCTAssertEqual(num(s["time"]), num(want["time"]), accuracy: 1e-9, "\(ctx) time")
            for k in ["battery", "durability", "fuel", "cargoUsed"] {
                XCTAssertEqual(num(r[k]), num(want[k]), accuracy: 1e-9, "\(ctx) \(k)")
            }
            XCTAssertEqual(try jsonString(r["pos"] as Any), try jsonString(want["pos"] as Any), "\(ctx) pos")
            XCTAssertEqual(num(r["facing"]), num(want["facing"]), "\(ctx) facing")
            XCTAssertEqual(try jsonString(r["cargo"] as Any), try jsonString(want["cargo"] as Any), "\(ctx) cargo")
            XCTAssertEqual(try jsonString(s["edits"] as Any), try jsonString(want["edits"] as Any), "\(ctx) edits")
            XCTAssertEqual(s["status"] as? String, want["status"] as? String, "\(ctx) status")
        }

        try check(0, snaps[0])
        var si = 1
        var okResults = [Bool]()
        for tk in 0..<100 {
            for o in script where (o["tick"] as? Int) == tk {
                let accepted: Bool
                if (o["op"] as? String) == "move" {
                    accepted = try engine.order("move", arg: try XCTUnwrap(o["dir"] as? Int))
                } else {
                    accepted = try engine.order("drill", arg: 0)
                }
                okResults.append(accepted)
            }
            _ = engine.step(dt: 0.1)
            XCTAssertNil(engine.lastError)
            if (tk + 1) % 10 == 0 {
                try check(tk + 1, snaps[si])
                si += 1
            }
        }
        XCTAssertEqual(si, snaps.count)
        XCTAssertEqual(okResults, results.map { ($0[1] as? Bool) ?? false }, "\(body) order acceptance")
    }

    func testScriptedRunMoon() throws { try checkScriptedRun(body: "moon") }
    func testScriptedRunMars() throws { try checkScriptedRun(body: "mars") }
    func testScriptedRunIronrock() throws { try checkScriptedRun(body: "ironrock") }
    func testScriptedRunTerra() throws { try checkScriptedRun(body: "terra") }

    // MARK: mission module fixture (golden/module.json)

    func testInitialMissionProgressMatchesModuleFixture() throws {
        let doc = try XCTUnwrap(fixture("module") as? [String: Any])
        let runs = try XCTUnwrap(doc["runs"] as? [[String: Any]])
        let first = try XCTUnwrap((runs[0]["steps"] as? [[String: Any]])?.first)
        let want = try JSONDecoder().decode(
            TakeonMissionProgress.self,
            from: JSONSerialization.data(withJSONObject: try XCTUnwrap(first["progress"]))
        )
        let engine = GoTakeonEngine()
        try engine.loadWorld(.init(targetId: "terra", seed: 2024))
        XCTAssertEqual(try engine.missionProgress(), want)
        XCTAssertEqual(want.missionId, "demo-survey")
        XCTAssertEqual(want.objectives.count, 3)
    }

    func testExploringAdvancesMissionLikeModuleExplore() throws {
        // Fixture step 1 of run 0: exploring a tile adds explore progress; the
        // Go runtime does the same when the rover enters a new tile.
        let engine = GoTakeonEngine()
        try engine.loadWorld(.init(targetId: "moon", seed: 1969))
        let before = try engine.missionProgress()
        for dir in 0..<4 where try engine.order("move", arg: dir) {
            _ = engine.step(dt: 3)
            break
        }
        let after = try engine.missionProgress()
        let e0 = try XCTUnwrap(before.objectives.first { $0.kind == "explore" })
        let e1 = try XCTUnwrap(after.objectives.first { $0.kind == "explore" })
        XCTAssertEqual(e0.current, 1)
        XCTAssertEqual(e1.current, 2)
    }

    // MARK: seed clamp, errors, events

    func testSeedClampsTo32Bits() throws {
        XCTAssertEqual(clampTakeonSeed(1969), 1969)
        XCTAssertEqual(clampTakeonSeed((1 << 32) + 1969), 1969)
        XCTAssertEqual(clampTakeonSeed(UInt64.max), 0xFFFF_FFFF)
        let a = GoTakeonEngine(), b = GoTakeonEngine()
        try a.loadWorld(.init(targetId: "moon", seed: 1969))
        try b.loadWorld(.init(targetId: "moon", seed: (7 << 32) + 1969))
        XCTAssertEqual(try a.snapshot(), try b.snapshot())
    }

    func testUnknownTargetAndNotLoaded() throws {
        let e = GoTakeonEngine()
        XCTAssertThrowsError(try e.loadWorld(.init(targetId: "pluto-x", seed: 1))) {
            XCTAssertEqual($0 as? TakeonEngineError, .unknownTarget("pluto-x"))
        }
        XCTAssertTrue(e.step(dt: 0.1).isEmpty)
        XCTAssertEqual(e.lastError as? TakeonEngineError, .notLoaded)
        XCTAssertThrowsError(try e.snapshot())
        XCTAssertFalse(e.orderMine(x: 1, y: 1))
        XCTAssertFalse(e.bank())
    }

    func testEventMapping() {
        typealias E = TakeonRawEvent
        XCTAssertEqual(GoTakeonEngine.map(E(kind: "depositMined", x: 1, y: 2, detail: "ice", amount: 2.6)),
                       .depositMined(mineralId: "ice", amount: 3))
        XCTAssertEqual(GoTakeonEngine.map(E(kind: "missionComplete", detail: "demo-survey")), .missionObjectiveMet)
        XCTAssertNil(GoTakeonEngine.map(E(kind: "moved", x: 1, y: 1, amount: 0.6)))
    }

    func testStepDecodesRawEventsAndUnsupportedOrderThrows() throws {
        let e = GoTakeonEngine()
        try e.loadWorld(.init(targetId: "mars", seed: 4212))
        XCTAssertTrue(try e.order("move", arg: 0))
        _ = e.step(dt: 2)
        XCTAssertTrue(e.lastRawEvents.contains { $0.kind == "moved" }, "\(e.lastRawEvents)")
        XCTAssertThrowsError(try e.order("build", arg: 0))
        XCTAssertThrowsError(try e.order("nonsense", arg: 0))
    }

    // MARK: seeded drop-off

    func testSeededDropoffDepositsBesideTheCache() throws {
        let e = GoTakeonEngine()
        try e.loadWorld(.init(targetId: "bennu", seed: 4212))
        e.seedCache()
        try e.seedCargo(["iron": 3, "stone": 2])
        var st = try TakeonRenderState.decode(e.state())
        XCTAssertEqual(st.caches, [.init(x: st.rover.pos.x + 1, y: st.rover.pos.y)])
        XCTAssertEqual(st.rover.cargoUsed, 5)
        XCTAssertTrue(st.nearCache)
        XCTAssertEqual(e.deposit(), 5)
        st = try TakeonRenderState.decode(e.state())
        XCTAssertEqual(st.rover.cargoUsed, 0)
        XCTAssertEqual(st.banked, ["iron": 3, "stone": 2])
        XCTAssertEqual(e.deposit(), 0)
    }

    // MARK: snapshot, easy mining, bank

    func testSnapshotRestoreContinuesIdentically() throws {
        let a = GoTakeonEngine(), b = GoTakeonEngine()
        try a.loadWorld(.init(targetId: "ironrock", seed: 5150))
        XCTAssertTrue(try a.order("move", arg: 1))
        _ = a.step(dt: 4)
        let snap = try a.snapshot()
        try b.loadWorld(.init(targetId: "moon", seed: 1))
        try b.restore(snap)
        XCTAssertEqual(try a.state(), try b.state())
        for e in [a, b] {
            XCTAssertTrue(try e.order("move", arg: 2))
            _ = e.step(dt: 5)
        }
        XCTAssertEqual(try a.state(), try b.state())
        XCTAssertEqual(try a.snapshot(), try b.snapshot())
    }

    func testOrderMineCompletesDeterministicallyAndBankRespectsDistance() throws {
        func runMine() throws -> (events: [TakeonRawEvent], state: Data, bank: Bool, near: Bool) {
            let e = GoTakeonEngine()
            try e.loadWorld(.init(targetId: "terra", seed: 4212))
            let initial = try e.snapshot()
            let s0 = try stateDict(e)
            let pos = try XCTUnwrap((s0["rover"] as? [String: Any])?["pos"] as? [String: Any])
            let rx = Int(num(pos["x"])), ry = Int(num(pos["y"]))
            var all = [TakeonRawEvent]()
            search: for d in 2..<8 {
                for dx in -d...d {
                    for dy in -d...d where max(abs(dx), abs(dy)) == d {
                        try e.restore(initial)
                        guard e.orderMine(x: rx + dx, y: ry + dy) else { continue }
                        all = []
                        for _ in 0..<1500 {
                            _ = e.step(dt: 0.1)
                            all += e.lastRawEvents
                            if all.contains(where: { $0.kind == "mineOrder" }) { break }
                        }
                        // Prefer a target that needs driving (so the mission explore hook fires too).
                        if all.contains(where: { $0.kind == "mineOrder" && $0.detail == "done" }),
                           all.contains(where: { $0.kind == "tileExplored" }) { break search }
                    }
                }
            }
            let st = try stateDict(e)
            let r = try XCTUnwrap((st["rover"] as? [String: Any])?["pos"] as? [String: Any])
            let l = try XCTUnwrap(st["landing"] as? [String: Any])
            let near = abs(num(r["x"]) - num(l["x"])) <= 2 && abs(num(r["y"]) - num(l["y"])) <= 2
            let banked = e.bank()
            return (all, try e.state(), banked, near)
        }
        let first = try runMine()
        XCTAssertTrue(first.events.contains { $0.kind == "mineOrder" && $0.detail == "done" }, "\(first.events)")
        XCTAssertTrue(first.events.contains { $0.kind == "tileExplored" })
        XCTAssertEqual(first.bank, first.near)
        let second = try runMine()
        XCTAssertEqual(first.events, second.events)
        XCTAssertEqual(first.state, second.state)
    }

    func testBankAtLandingSiteSucceeds() throws {
        let e = GoTakeonEngine()
        try e.loadWorld(.init(targetId: "terra", seed: 2024))
        XCTAssertTrue(e.bank())
        _ = e.step(dt: 0.1)
        XCTAssertTrue(e.lastRawEvents.isEmpty || e.lastRawEvents.allSatisfy { $0.kind != "blocked" })
    }

    // MARK: actor

    func testActorSerialisesConcurrentAccess() async throws {
        let actor = TakeonEngineActor()
        try await actor.loadWorld(.init(targetId: "moon", seed: 1969))
        let ok = try await actor.order("move", arg: 0)
        XCTAssertTrue(ok)
        await withTaskGroup(of: Void.self) { group in
            for _ in 0..<8 { group.addTask { _ = await actor.step(dt: 0.5) } }
        }
        let reference = GoTakeonEngine()
        try reference.loadWorld(.init(targetId: "moon", seed: 1969))
        _ = try reference.order("move", arg: 0)
        for _ in 0..<8 { _ = reference.step(dt: 0.5) }
        let a = try await actor.snapshot()
        XCTAssertEqual(a, try reference.snapshot())
        let p = try await actor.missionProgress()
        XCTAssertEqual(p, try reference.missionProgress())
    }
}
#endif
