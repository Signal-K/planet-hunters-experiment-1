import Foundation

public struct PlayerLocation: Codable, Equatable, Sendable {
    public var city: String?
    public var latitude: Double
    public var timeZone: String
    public init(city: String? = nil, latitude: Double, timeZone: String) {
        self.city = city?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.latitude = max(-90, min(90, latitude.rounded()))
        self.timeZone = TimeZone(identifier: timeZone) == nil ? "UTC" : timeZone
    }
}

public struct SkyEventEphemeris: Equatable, Sendable {
    public var radiantRightAscensionDeg: Double
    public var radiantDeclinationDeg: Double
    public var peakUtc: Date
}

public struct ViewingWindow: Equatable, Sendable {
    public var start: Date
    public var end: Date
}

public struct LocalSkyEventWindow: Equatable, Sendable {
    public var location: PlayerLocation
    public var viewing: ViewingWindow?
    public var moonFree: ViewingWindow?
    public var best: ViewingWindow? { moonFree ?? viewing }
}

public enum SkyEventWindows {
    public static let orionids = SkyEventEphemeris(
        radiantRightAscensionDeg: 95,
        radiantDeclinationDeg: 16,
        peakUtc: ISO8601DateFormatter().date(from: "2026-10-22T00:00:00Z")!
    )
    public static let cities = [
        PlayerLocation(city: "Tallinn", latitude: 59, timeZone: "Europe/Tallinn"),
        PlayerLocation(city: "London", latitude: 52, timeZone: "Europe/London"),
        PlayerLocation(city: "New York", latitude: 41, timeZone: "America/New_York"),
        PlayerLocation(city: "Tokyo", latitude: 36, timeZone: "Asia/Tokyo"),
        PlayerLocation(city: "Sydney", latitude: -34, timeZone: "Australia/Sydney"),
    ]

    public static func deviceLocation() -> PlayerLocation {
        PlayerLocation(latitude: 0, timeZone: TimeZone.current.identifier)
    }

    public static func localWindow(_ event: SkyEventEphemeris = orionids, location stored: PlayerLocation?) -> LocalSkyEventWindow {
        let location = stored ?? deviceLocation()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: location.timeZone) ?? .gmt
        let peak = calendar.dateComponents([.year, .month, .day, .hour], from: event.peakUtc)
        let endDay = (peak.day ?? 1) + ((peak.hour ?? 0) >= 12 ? 1 : 0)
        let noon = DateComponents(year: peak.year, month: peak.month, day: endDay, hour: 12)
        let end = calendar.date(from: noon)!
        let start = calendar.date(byAdding: .day, value: -1, to: end)!
        let viewing = longest(scan(start: start, end: end) { date in
            let jd = date.timeIntervalSince1970 / 86_400 + 2_440_587.5
            return sunAltitude(jd, location.latitude) <= -18 && fixedAltitude(jd, location.latitude, event.radiantRightAscensionDeg, event.radiantDeclinationDeg) > 0
        })
        let moonFree = longest(scan(start: start, end: end) { date in
            let jd = date.timeIntervalSince1970 / 86_400 + 2_440_587.5
            return sunAltitude(jd, location.latitude) <= -18 && fixedAltitude(jd, location.latitude, event.radiantRightAscensionDeg, event.radiantDeclinationDeg) > 0 && moonAltitude(jd, location.latitude) < 0
        })
        return LocalSkyEventWindow(location: location, viewing: viewing, moonFree: moonFree)
    }

    public static func isInOrionidsBonusWindow(_ ms: Double, location: PlayerLocation?) -> Bool {
        guard let window = localWindow(location: location).best else { return false }
        let date = Date(timeIntervalSince1970: ms / 1000)
        return date >= window.start && date < window.end
    }

    public static func label(_ window: ViewingWindow?, timeZone: String) -> String {
        guard let window else { return "No dark viewing window" }
        let formatter = DateFormatter(); formatter.dateFormat = "HH:mm"; formatter.timeZone = TimeZone(identifier: timeZone); formatter.locale = Locale(identifier: "en_US_POSIX")
        return "\(formatter.string(from: window.start))–\(formatter.string(from: window.end))"
    }

    private static func scan(start: Date, end: Date, predicate: (Date) -> Bool) -> [ViewingWindow] {
        var result: [ViewingWindow] = [], open: Date?
        var date = start
        while date <= end {
            if predicate(date) { if open == nil { open = date } }
            else if let began = open { result.append(ViewingWindow(start: began, end: date)); open = nil }
            date = date.addingTimeInterval(300)
        }
        if let began = open { result.append(ViewingWindow(start: began, end: end)) }
        return result
    }

    private static func longest(_ windows: [ViewingWindow]) -> ViewingWindow? { windows.max { $0.end.timeIntervalSince($0.start) < $1.end.timeIntervalSince($1.start) } }
    private static let rad = Double.pi / 180
    private static func norm(_ value: Double) -> Double { let n = value.truncatingRemainder(dividingBy: 360); return n < 0 ? n + 360 : n }
    private static func sidereal(_ jd: Double) -> Double { norm(280.46061837 + 360.98564736629 * (jd - 2451545)) }
    private static func altitude(_ lat: Double, _ dec: Double, _ hourAngle: Double) -> Double { asin(sin(lat * rad) * sin(dec * rad) + cos(lat * rad) * cos(dec * rad) * cos(hourAngle * rad)) / rad }
    private static func fixedAltitude(_ jd: Double, _ lat: Double, _ ra: Double, _ dec: Double) -> Double { altitude(lat, dec, norm(sidereal(jd) - ra + 180) - 180) }
    private static func sunAltitude(_ jd: Double, _ lat: Double) -> Double {
        let n = jd - 2451545
        let longitude = norm(280.46 + 0.9856474 * n + 1.915 * sin((357.528 + 0.9856003 * n) * rad))
        let obliquity = (23.439 - 0.0000004 * n) * rad
        let ra = norm(atan2(cos(obliquity) * sin(longitude * rad), cos(longitude * rad)) / rad)
        let dec = asin(sin(obliquity) * sin(longitude * rad)) / rad
        return fixedAltitude(jd, lat, ra, dec)
    }
    private static func moonAltitude(_ jd: Double, _ lat: Double) -> Double {
        let d = jd - 2451543.5, node = norm(125.1228 - 0.0529538083 * d) * rad, i = 5.1454 * rad
        let peri = norm(318.0634 + 0.1643573223 * d) * rad, e = 0.0549, mean = norm(115.3654 + 13.0649929509 * d) * rad
        let E = mean + e * sin(mean) * (1 + e * cos(mean)), x = cos(E) - e, y = sqrt(1 - e * e) * sin(E)
        let distance = sqrt(x * x + y * y), anomaly = atan2(y, x)
        let xe = distance * (cos(node) * cos(anomaly + peri) - sin(node) * sin(anomaly + peri) * cos(i))
        let ye = distance * (sin(node) * cos(anomaly + peri) + cos(node) * sin(anomaly + peri) * cos(i))
        let ze = distance * sin(anomaly + peri) * sin(i), lon = atan2(ye, xe), moonLat = atan2(ze, sqrt(xe * xe + ye * ye))
        let obliquity = (23.4393 - 3.563e-7 * d) * rad
        let eqX = cos(lon) * cos(moonLat), eqY = sin(lon) * cos(moonLat) * cos(obliquity) - sin(moonLat) * sin(obliquity)
        let eqZ = sin(lon) * cos(moonLat) * sin(obliquity) + sin(moonLat) * cos(obliquity)
        return fixedAltitude(jd, lat, norm(atan2(eqY, eqX) / rad), asin(eqZ) / rad)
    }
}
