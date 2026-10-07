import Testing
import Foundation
@testable import LandnamCore

struct InstrumentTests {
    @Test func aimStepsAndClamps() {
        var v = InstrumentView()
        for _ in 0..<10 { v = Instrument.nudge(v, .east) }
        #expect(v.panX == InstrumentLimits.pan)
        v = Instrument.nudge(v, .reset)
        #expect(v.panX == 0 && v.panY == 0)
        #expect(Instrument.nudge(v, .north).panY == -0.18)
    }

    @Test func commandsWriteTheSameViewAsKnobs() throws {
        let v = InstrumentView()
        #expect(try #require(Instrument.apply(v, "zoom 2.5")).view.zoom == 2.5)
        #expect(try #require(Instrument.apply(v, "ZOOM 9")).view.zoom == 3)
        #expect(try #require(Instrument.apply(v, "focus 80")).view.focus == 0.8)
        #expect(try #require(Instrument.apply(v, "expose 0.1")).view.exposure == 0.6)
        #expect(try #require(Instrument.apply(v, "stretch on")).view.stretch)
        #expect(try #require(Instrument.apply(v, "invert")).view.invert)
        #expect(try #require(Instrument.apply(v, "point 0.5 -0.3")).view.panY == -0.3)
        #expect(try #require(Instrument.apply(v, "point nowhere")).lines == ["> POINT USE N S E W OR RESET"])
        #expect(Instrument.apply(v, "flag likely real") == nil)
    }

    @Test func opticsBlurFollowsFocusDistance() {
        var v = InstrumentView(); v.focus = 1; v.stretch = true
        let o = Instrument.optics(v)
        #expect(o.blur == 4 && o.stretch == InstrumentLimits.stretchScale)
    }

    @Test func saturnDailyPickIsStableAndSkipsNothingWhenEmpty() {
        let a = Saturn.daily(Saturn.fallback, dateKey: "2026-10-07")
        #expect(a.count == 1 && a == Saturn.daily(Saturn.fallback, dateKey: "2026-10-07"))
        #expect(Saturn.daily([], dateKey: "x").isEmpty)
        #expect(Saturn.fallback.count == 20)
        #expect(!Saturn.isPoolId("saturn-104549055") && Saturn.isPoolId("abc123def456ghi"))
    }

    @Test @MainActor func classifyOnceThenLocked() throws {
        let store = GameStore()
        let c = Saturn.fallback[0]
        store.classifySaturn(c.id, verdict: .yes)
        store.classifySaturn(c.id, verdict: .no)
        #expect(store.player.saturnClassifications[c.id]?.verdict == .yes)
        #expect(store.player.researchAnnotations == 1)
        let data = try JSONEncoder().encode(store.state)
        let back = try JSONDecoder().decode(GameState.self, from: data)
        #expect(back.player.saturnClassifications[c.id]?.candidateId == c.id)
    }
}
