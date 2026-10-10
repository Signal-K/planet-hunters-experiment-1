import Testing
@testable import TakeonKit

@Suite struct TakeonKitTests {
    @Test func nullEngineIsInert() throws {
        let e = NullTakeonEngine()
        try e.loadWorld(.init(targetId: "mercury", seed: 1))
        #expect(e.step(dt: 0.1).isEmpty)
    }
}
