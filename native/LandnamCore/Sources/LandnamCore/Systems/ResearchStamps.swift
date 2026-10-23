import Foundation

/// What earned a research stamp (web `lib/research/stamps.ts`, SSL-663). Citizen science is an instrument feed, so
/// every kind is an instrument or survey result, never a mission type. Order is the canonical order on a day.
public enum StampKind: String, CaseIterable, Codable, Sendable {
    case classification, survey, discoveryMission = "discovery-mission", event
}

/// UTC day (`YYYY-MM-DD`) to the research tasks done that day. Decoding drops bad days and kinds like web `sanitizeStamps`.
public struct ResearchStamps: Codable, Equatable, Sendable {
    public var days: [String: [StampKind]] = [:]
    public init(_ days: [String: [StampKind]] = [:]) { self.days = days }

    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        guard let raw = try? c.decode([String: JSONValue].self) else { return }
        for (day, value) in raw where ResearchStampRules.isDayKey(day) {
            guard case .array(let items) = value else { continue }
            let named = Set(items.compactMap { item -> String? in if case .string(let s) = item { return s } else { return nil } })
            let kinds = StampKind.allCases.filter { named.contains($0.rawValue) }
            if !kinds.isEmpty { days[day] = kinds }
        }
    }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(days.mapValues { $0.map(\.rawValue) })
    }
}

public struct CalendarCell: Equatable, Sendable {
    public let day: Int
    public let key: String
    public let kinds: [StampKind]
    public let today: Bool
    public let future: Bool
}

public enum ResearchStampRules {
    /// Mirrors pocketbase/research.go and web `COMMUNITY_GOAL`: every player's stamps this UTC month add to one bar.
    public static let communityGoal = 1000
    public static let communityWeeklyRevenuePct = 3
    static let dayMs: Double = 86_400_000

    private static let utc: Calendar = { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }()

    static func isDayKey(_ s: String) -> Bool {
        let p = s.split(separator: "-", omittingEmptySubsequences: false)
        return p.count == 3 && p[0].count == 4 && p[1].count == 2 && p[2].count == 2 && p.allSatisfy { $0.allSatisfy(\.isNumber) }
    }

    /// UTC day for `ms` since 1970, the same clock the instrument daily downlink uses.
    public static func dayKey(_ ms: Double) -> String {
        let d = utc.dateComponents([.year, .month, .day], from: Date(timeIntervalSince1970: ms / 1000))
        return String(format: "%04d-%02d-%02d", d.year!, d.month!, d.day!)
    }

    /// Stamp the day `ms` for this kind. No change when it is already stamped.
    public static func add(_ p: inout Player, _ kind: StampKind, at ms: Double) {
        let day = dayKey(ms)
        let have = p.researchStamps.days[day] ?? []
        guard !have.contains(kind) else { return }
        p.researchStamps.days[day] = StampKind.allCases.filter { $0 == kind || have.contains($0) }
    }

    /// Union per day, so two devices that stamped different tasks keep both.
    public static func merge(_ a: ResearchStamps, _ b: ResearchStamps) -> ResearchStamps {
        var out = a
        for (day, kinds) in b.days {
            let have = out.days[day] ?? []
            out.days[day] = StampKind.allCases.filter { have.contains($0) || kinds.contains($0) }
        }
        return out
    }

    /// Soft streak: consecutive stamped days ending today, or yesterday when today is still open.
    public static func streak(_ s: ResearchStamps, now ms: Double) -> Int {
        var t = ms
        if s.days[dayKey(t)] == nil { t -= dayMs }
        var n = 0
        while s.days[dayKey(t)] != nil { n += 1; t -= dayMs }
        return n
    }

    /// One UTC month as weeks starting Monday; `nil` pads before the 1st and after the last day.
    public static func monthGrid(year: Int, month: Int, stamps: ResearchStamps, now ms: Double) -> [[CalendarCell?]] {
        let first = utc.date(from: DateComponents(year: year, month: month, day: 1))!
        let length = utc.range(of: .day, in: .month, for: first)!.count
        let lead = (utc.component(.weekday, from: first) + 5) % 7   // Sunday is 1
        let todayKey = dayKey(ms)
        var cells: [CalendarCell?] = Array(repeating: nil, count: lead)
        for day in 1...length {
            let key = String(format: "%04d-%02d-%02d", year, month, day)
            cells.append(CalendarCell(day: day, key: key, kinds: stamps.days[key] ?? [], today: key == todayKey, future: key > todayKey))
        }
        while cells.count % 7 != 0 { cells.append(nil) }
        return stride(from: 0, to: cells.count, by: 7).map { Array(cells[$0..<$0 + 7]) }
    }

    public static func stampsIn(_ s: ResearchStamps, year: Int, month: Int) -> Int {
        let prefix = String(format: "%04d-%02d-", year, month)
        return s.days.reduce(0) { $0 + ($1.key.hasPrefix(prefix) ? $1.value.count : 0) }
    }

    public struct CommunityBar: Equatable, Sendable {
        public let total: Int, goal: Int, fill: Double, reached: Bool, bonusPct: Int, bonusUntil: Double?
    }
    /// SSL-673: `server.others` leaves out this player, so own stamps not yet synced count once.
    public static func communityBar(own: Int, server: CommunityResearch? = nil) -> CommunityBar {
        let goal = server?.goal ?? communityGoal
        let total = (server?.others ?? 0) + own
        return CommunityBar(total: total, goal: goal, fill: min(1, Double(total) / Double(goal)), reached: server?.reachedAt != nil,
                            bonusPct: server?.bonusPct ?? communityWeeklyRevenuePct, bonusUntil: server?.bonusUntil)
    }

    /// Exchange sales (ore and finished goods) pay this much more while the bonus week is open (web `RESEARCH_BONUS_RATE`).
    public static var bonusRate: Double { Double(communityWeeklyRevenuePct) / 100 }

    /// Web saves the window as `player.researchBonusUntil`; native keeps it in `extras` so it round-trips.
    public static func bonusUntil(_ p: Player) -> Double? {
        if case let .number(v)? = p.extras["researchBonusUntil"], v.isFinite { return v }
        return nil
    }
    public static func bonusActive(_ p: Player, now: Double) -> Bool { bonusUntil(p).map { now < $0 } ?? false }
    /// Keep the latest window the server reported. Returns false when nothing changes.
    @discardableResult
    public static func noteBonus(_ p: inout Player, until: Double?) -> Bool {
        guard let until, until.isFinite, until > (bonusUntil(p) ?? 0) else { return false }
        p.extras["researchBonusUntil"] = .number(until)
        return true
    }

    /// Today's research tasks, one per stamp kind a player can earn now. Same copy as web `DAILY_TASKS`.
    public static let dailyTasks: [(kind: StampKind, label: String)] = [
        (.classification, "Classify one item from your instruments"),
        (.survey, "Finish a survey scan"),
        (.event, "Catch debris during a sky event"),
    ]
    /// SSL-674: a survey flight to a world the player discovered (web `isDiscoveryMission`).
    public static func isDiscoveryMission(_ id: String) -> Bool { id.hasPrefix("exo-survey-") }
    /// Shown only once a discovery has opened a survey flight, so a new player never sees a task they cannot do.
    public static let discoveryTask: (kind: StampKind, label: String) = (.discoveryMission, "Fly a survey to a world you discovered")
    public static func tasks(hasDiscovery: Bool) -> [(kind: StampKind, label: String)] { hasDiscovery ? dailyTasks + [discoveryTask] : dailyTasks }
    public static let title = "Daily research"
    public static let blurb = "Do one research task a day to earn a stamp. Every stamp fills the community bar, and a full bar pays everyone +3% on Exchange sales for a week. Miss a day and nothing is lost."
}

/// `GET /api/community/research` (pocketbase/research.go).
public struct CommunityResearch: Codable, Equatable, Sendable {
    public var month: String
    public var others: Int
    public var goal: Int
    public var bonusPct: Int
    public var reachedAt: Double?
    public var bonusUntil: Double?

    public init(month: String, others: Int, goal: Int, bonusPct: Int, reachedAt: Double?, bonusUntil: Double?) {
        self.month = month; self.others = others; self.goal = goal; self.bonusPct = bonusPct; self.reachedAt = reachedAt; self.bonusUntil = bonusUntil
    }
}

public struct CommunityResearchAPI: Sendable {
    public var baseURL: URL
    public var token: String
    public var session: URLSession

    public init(baseURL: URL, token: String, session: URLSession = .shared) {
        self.baseURL = baseURL; self.token = token; self.session = session
    }

    /// Nil when offline or the server refuses: the bar then shows the player's own stamps.
    public func fetch() async -> CommunityResearch? {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/community/research"))
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (data, response) = try? await session.data(for: request),
              let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { return nil }
        return try? JSONDecoder().decode(CommunityResearch.self, from: data)
    }
}
