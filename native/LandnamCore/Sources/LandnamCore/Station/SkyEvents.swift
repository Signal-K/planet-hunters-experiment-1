import Foundation

/// Sky events, badges and debris showers (mirrors web lib/data/sky-events.ts, SSL-491 / SSL-475).
/// Gold when an activity is done inside the event window, silver any time after, nothing before it opens.
public enum BadgeTier: String, Codable, Sendable { case gold, silver }

public enum SkyActivity: Sendable { case launch, saturnClassification, asteroidClassification, debrisMining }

public struct PlayerBadge: Codable, Equatable, Sendable {
    public var eventId: String
    public var tier: BadgeTier
    public var earnedAt: Double
    public init(eventId: String, tier: BadgeTier, earnedAt: Double) { self.eventId = eventId; self.tier = tier; self.earnedAt = earnedAt }
}

public struct SkyEvent: Equatable, Sendable {
    public let id: String, name: String
    public let startMs: Double, endMs: Double
    public let activities: [SkyActivity]
}

public struct DebrisPreset: Equatable, Sendable {
    public let eventId: String
    public let startMs: Double, endMs: Double, peakMs: Double
    public let peakRatePerMinute: Double, baseRatePerMinute: Double
    public let speedFactor: Double
    public let label: String, resourceId: String, chipLabel: String
}

public enum SkyEvents {
    /// Whole UTC days, ms since epoch.
    static func utc(_ y: Int, _ m: Int, _ d: Int) -> Double {
        var c = DateComponents(); c.year = y; c.month = m; c.day = d
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "UTC")!
        return cal.date(from: c)!.timeIntervalSince1970 * 1000
    }

    public static let all: [SkyEvent] = [
        SkyEvent(id: "rocket-revolution-2026", name: "Rocket Revolution", startMs: utc(2026, 10, 4), endMs: utc(2026, 10, 11), activities: [.launch]),
        SkyEvent(id: "saturn-night-2026", name: "Saturn All Night", startMs: utc(2026, 10, 4), endMs: utc(2026, 10, 11), activities: [.saturnClassification]),
        SkyEvent(id: "draconids-2026", name: "Draconids Dragon Dust", startMs: utc(2026, 10, 6), endMs: utc(2026, 10, 11), activities: [.debrisMining]),
        SkyEvent(id: "orionids-2026", name: "Orionids", startMs: utc(2026, 10, 20), endMs: utc(2026, 11, 8), activities: [.debrisMining]),
        SkyEvent(id: "new-moon-hunt-2026-10", name: "New Moon Asteroid Hunt", startMs: utc(2026, 10, 10), endMs: utc(2026, 10, 11), activities: [.asteroidClassification]),
    ]

    public static func event(_ id: String) -> SkyEvent? { all.first { $0.id == id } }

    public static func badgeTier(_ eventId: String, at ms: Double) -> BadgeTier? {
        guard let e = event(eventId), ms.isFinite, ms >= e.startMs else { return nil }
        return ms < e.endMs ? .gold : .silver
    }

    /// Idempotent grant: never downgrades gold, upgrades silver when gold is earned later.
    public static func grant(_ badges: inout [String: PlayerBadge], eventId: String, at ms: Double) {
        guard let tier = badgeTier(eventId, at: ms) else { return }
        if let existing = badges[eventId], existing.tier == .gold || tier == .silver { return }
        badges[eventId] = PlayerBadge(eventId: eventId, tier: tier, earnedAt: ms)
    }

    /// Every badge the activity earns at `ms`, optionally limited to one event (debris showers share the kind).
    public static func grant(_ badges: inout [String: PlayerBadge], activity: SkyActivity, at ms: Double, only eventId: String? = nil) {
        for e in all where e.activities.contains(activity) && (eventId == nil || e.id == eventId) { grant(&badges, eventId: e.id, at: ms) }
    }

    /// Tier stamped on a Saturn classification.
    public static func saturnTier(at ms: Double) -> BadgeTier? {
        let tiers = all.filter { $0.activities.contains(.saturnClassification) }.map { badgeTier($0.id, at: ms) }
        return tiers.contains(.gold) ? .gold : tiers.contains(.silver) ? .silver : nil
    }

    // MARK: debris showers
    public static let orionids = DebrisPreset(eventId: "orionids-2026", startMs: utc(2026, 10, 20), endMs: utc(2026, 11, 8), peakMs: utc(2026, 10, 22),
                                               peakRatePerMinute: 12, baseRatePerMinute: 4, speedFactor: 1,
                                               label: "Orionid debris", resourceId: "orionid_debris", chipLabel: "Orionids active")
    public static let draconids = DebrisPreset(eventId: "draconids-2026", startMs: utc(2026, 10, 6), endMs: utc(2026, 10, 11), peakMs: utc(2026, 10, 8),
                                                peakRatePerMinute: 2, baseRatePerMinute: 0.5, speedFactor: 0.4,
                                                label: "Dragon dust", resourceId: "draconid_debris", chipLabel: "Draconids active")
    public static let presets = [orionids, draconids]
    public static let debrisResourceIds = presets.map(\.resourceId)

    /// Local night: 22:00 until 06:00 in the given calendar's time zone.
    public static func isLocalNight(_ ms: Double, calendar: Calendar = .current) -> Bool {
        let h = calendar.component(.hour, from: Date(timeIntervalSince1970: ms / 1000))
        return h >= 22 || h < 6
    }

    public static func isActive(_ p: DebrisPreset, at ms: Double, calendar: Calendar = .current) -> Bool {
        ms >= p.startMs && ms < p.endMs && isLocalNight(ms, calendar: calendar)
    }

    public static func activePreset(at ms: Double, calendar: Calendar = .current) -> DebrisPreset? {
        presets.first { isActive($0, at: ms, calendar: calendar) }
    }

    /// Particles per minute: 0 when inactive, otherwise a linear ramp base, peak, base.
    public static func ratePerMinute(_ p: DebrisPreset, at ms: Double, calendar: Calendar = .current) -> Double {
        guard isActive(p, at: ms, calendar: calendar) else { return 0 }
        let half = max(p.peakMs - p.startMs, p.endMs - p.peakMs, 1)
        let closeness = max(0, 1 - abs(ms - p.peakMs) / half)
        return p.baseRatePerMinute + (p.peakRatePerMinute - p.baseRatePerMinute) * closeness
    }

    // MARK: new moon (Meeus ch. 49, same terms as web)
    static let synodic = 29.530588853
    static let dayMs = 86_400_000.0
    static let newMoonReferenceMs = 946_728_840_000.0 + 0   // 2000-01-06 18:14 UTC
    static let meanEpochMs = (2451550.09766 - 2440587.5) * dayMs

    public static func newMoonInstantMs(_ k: Double) -> Double {
        let mean = meanEpochMs + k * synodic * dayMs
        let T = k / 1236.85, rad = Double.pi / 180
        let E = 1 - 0.002516 * T - 0.0000074 * T * T
        let M = (2.5534 + 29.1053567 * k) * rad, Mp = (201.5643 + 385.81693528 * k) * rad, F = (160.7108 + 390.67050284 * k) * rad
        let c = -0.4072 * sin(Mp) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mp) + 0.01039 * sin(2 * F)
            + 0.00739 * E * sin(Mp - M) - 0.00514 * E * sin(Mp + M) + 0.00208 * E * E * sin(2 * M)
            - 0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F)
        return mean + c * dayMs
    }

    /// True when a new moon falls inside the UTC calendar day `yyyy-MM-dd`.
    public static func isNewMoonDay(_ key: String) -> Bool {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = TimeZone(identifier: "UTC"); f.locale = Locale(identifier: "en_US_POSIX")
        guard let d = f.date(from: key) else { return false }
        let start = d.timeIntervalSince1970 * 1000, end = start + dayMs
        let mid = ((start + dayMs / 2 - newMoonReferenceMs) / (synodic * dayMs)).rounded()
        return (Int(mid) - 1...Int(mid) + 1).contains { let t = newMoonInstantMs(Double($0)); return t >= start && t < end }
    }
}
