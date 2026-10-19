import XCTest
@testable import LandnamCore

/// SSL-578: Orionids peak-night boost and share copy, matching web sky-events.ts.
final class OrionidsPeakTests: XCTestCase {
    private func local(_ m: Int, _ d: Int, _ h: Int) -> Double {
        Calendar.current.date(from: DateComponents(year: 2026, month: m, day: d, hour: h))!.timeIntervalSince1970 * 1000
    }

    func testPeakNightDoublesRate() {
        XCTAssertTrue(SkyEvents.isOrionidsPeakNight(local(10, 22, 3)))
        XCTAssertFalse(SkyEvents.isOrionidsPeakNight(local(10, 22, 23)))
        let peak = SkyEvents.ratePerMinute(SkyEvents.orionids, at: local(10, 21, 23))
        XCTAssertGreaterThan(peak, SkyEvents.orionids.peakRatePerMinute)
        XCTAssertLessThanOrEqual(SkyEvents.ratePerMinute(SkyEvents.orionids, at: local(10, 22, 23)), SkyEvents.orionids.peakRatePerMinute)
    }

    func testShareTextNamesTier() {
        XCTAssertTrue(SkyEvents.orionidsShareText(.gold).contains("gold Orionids 2026 badge"))
    }
}
