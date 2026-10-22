import Foundation
import Testing
@testable import LandnamCore

@Suite("Local sky-event windows")
struct SkyEventWindowTests {
    @Test func locationsReceiveDifferentBonusWindows() throws {
        let tallinn = SkyEventWindows.localWindow(location: PlayerLocation(city: "Tallinn", latitude: 59.437, timeZone: "Europe/Tallinn"))
        let newYork = SkyEventWindows.localWindow(location: PlayerLocation(city: "New York", latitude: 40.7, timeZone: "America/New_York"))
        let tallinnBest = try #require(tallinn.best)
        let newYorkBest = try #require(newYork.best)
        #expect(tallinnBest.start != newYorkBest.start)
        #expect(SkyEventWindows.isInOrionidsBonusWindow(tallinnBest.start.timeIntervalSince1970 * 1000, location: tallinn.location))
        #expect(!SkyEventWindows.isInOrionidsBonusWindow(tallinnBest.start.timeIntervalSince1970 * 1000, location: newYork.location))
    }

    @Test func locationIsRoundedAndContainsNoLongitude() {
        let location = PlayerLocation(city: "Tallinn", latitude: 59.437, timeZone: "Europe/Tallinn")
        #expect(location.latitude == 59)
        let encoded = String(data: try! JSONEncoder().encode(location), encoding: .utf8)!
        #expect(!encoded.contains("longitude"))
    }
}
