#if canImport(Takeon)
import XCTest
@testable import TakeonKit

final class TakeonSceneModelsTests: XCTestCase {
    func testWindowAndRenderStateDecode() throws {
        let e = GoTakeonEngine()
        try e.loadWorld(TakeonWorldSeed(targetId: "moon", seed: 4212))
        let st = try TakeonRenderState.decode(try e.state())
        let w = try e.window(x: st.rover.pos.x - 3, y: st.rover.pos.y - 3, w: 7, h: 7)
        XCTAssertEqual(w.heights.count, 49)
        XCTAssertEqual(w.ore.count, 49)
        XCTAssertGreaterThanOrEqual(w.height(st.rover.pos.x, st.rover.pos.y), 0, "rover stands on solid ground")
        XCTAssertTrue(st.nearBase, "rover lands at the base")
    }

    func testOrderMineDrivesAndMines() throws {
        let e = GoTakeonEngine()
        try e.loadWorld(TakeonWorldSeed(targetId: "moon", seed: 4212))
        let st = try TakeonRenderState.decode(try e.state())
        let (rx, ry) = (st.rover.pos.x, st.rover.pos.y)
        let w = try e.window(x: rx - 6, y: ry - 6, w: 13, h: 13)
        var target: (Int, Int)?
        outer: for d in 2...5 { for dy in -d...d { for dx in -d...d where max(abs(dx), abs(dy)) == d {
            if w.height(rx + dx, ry + dy) >= 1 { target = (rx + dx, ry + dy); break outer }
        } } }
        let t = try XCTUnwrap(target)
        let before = w.height(t.0, t.1)
        XCTAssertTrue(e.orderMine(x: t.0, y: t.1))
        var kinds: [String] = []
        for _ in 0..<600 { _ = e.step(dt: 0.1); kinds += e.lastRawEvents.map(\.kind) }
        let after = try e.window(x: t.0, y: t.1, w: 1, h: 1).height(t.0, t.1)
        print("TARGET", t, before, after, Set(kinds))
        XCTAssertLessThan(after, before, "mining lowered the target column; events: \(Set(kinds))")
    }
}
#endif
