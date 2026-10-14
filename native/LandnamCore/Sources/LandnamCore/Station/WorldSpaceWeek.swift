import Foundation

/// World Space Week flags (mirrors web lib/wsw.ts, SSL-491). The week is the four sky events that
/// open 4-10 Oct 2026; Orionids is a separate October event and is not part of it. Each event has
/// one category, taken from the activity that earns its badge.
public enum WorldSpaceWeek {
    public static let eventIds = ["rocket-revolution-2026", "saturn-night-2026", "draconids-2026", "new-moon-hunt-2026-10"]
    public static let rangeLabel = "4-10 OCT"

    static let startMs = SkyEvents.utc(2026, 10, 4)
    static let endMs = SkyEvents.utc(2026, 10, 11)

    public static func isWeekEvent(_ eventId: String) -> Bool { eventIds.contains(eventId) }
    public static func isLive(_ ms: Double) -> Bool { ms.isFinite && ms >= startMs && ms < endMs }

    public enum ChipState: String, Sendable { case goldEarned, silverEarned, goldOpen, silverOpen }

    public struct Chip: Equatable, Identifiable, Sendable {
        public var id: String { eventId }
        public let eventId: String
        /// Event name, e.g. "Rocket Revolution".
        public let name: String
        /// World Space Week category, e.g. "Launch".
        public let category: String
        public let state: ChipState
        /// Short text for the chip, e.g. "Launch Gold open".
        public let label: String
    }

    static func category(_ activity: SkyActivity) -> String {
        switch activity {
        case .launch: "Launch"
        case .saturnClassification: "Saturn"
        case .debrisMining: "Meteor"
        case .asteroidClassification: "New Moon"
        }
    }

    static func stateText(_ s: ChipState) -> String {
        switch s {
        case .goldEarned: "Gold earned"
        case .silverEarned: "Silver earned"
        case .goldOpen: "Gold open"
        case .silverOpen: "Silver open"
        }
    }

    /// The earned tier, else the tier an activity would earn now. Nil before the event opens.
    public static func chip(_ eventId: String, badges: [String: PlayerBadge], now: Double) -> Chip? {
        guard isWeekEvent(eventId), let event = SkyEvents.event(eventId) else { return nil }
        let state: ChipState
        if let earned = badges[eventId] {
            state = earned.tier == .gold ? .goldEarned : .silverEarned
        } else {
            guard let tier = SkyEvents.badgeTier(eventId, at: now) else { return nil }
            state = tier == .gold ? .goldOpen : .silverOpen
        }
        let cat = category(event.activities.first ?? .launch)
        return Chip(eventId: eventId, name: event.name, category: cat, state: state, label: "\(cat) \(stateText(state))")
    }

    /// Every mission launches a rocket, so all carry the Launch category. Mining adds the meteor
    /// category (Draconids debris); an instrument launch adds the category of the data it serves.
    public static func eventIds(for mission: Mission) -> [String] {
        var ids = ["rocket-revolution-2026"]
        switch mission.payload?.instrumentId {
        case "saturn-imager": ids.append("saturn-night-2026")
        case "deep-space-telescope": ids.append("new-moon-hunt-2026-10")
        default: if mission.payload == nil && mission.construction == nil { ids.append("draconids-2026") }
        }
        return ids
    }

    public static func chips(for mission: Mission, badges: [String: PlayerBadge], now: Double) -> [Chip] {
        eventIds(for: mission).compactMap { chip($0, badges: badges, now: now) }
    }

    /// Events a piece of Control Station equipment serves.
    public static func eventIds(forEquipment id: String) -> [String] {
        switch id {
        case "saturn-imager": ["saturn-night-2026"]
        case "deep-space-telescope": ["new-moon-hunt-2026-10"]
        default: []
        }
    }

    public struct Banner: Equatable, Sendable {
        public let live: Bool
        public let title: String
        public let detail: String
        public let earned: Int
        public let total: Int
    }

    public static func banner(badges: [String: PlayerBadge], now: Double) -> Banner {
        let live = isLive(now)
        return Banner(live: live,
                      title: live ? "World Space Week \(rangeLabel)" : "World Space Week ended",
                      detail: live ? "Gold badges while it runs. Silver after." : "Silver badges are still open.",
                      earned: eventIds.filter { badges[$0] != nil }.count, total: eventIds.count)
    }
}
