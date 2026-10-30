import Foundation

/// What earned a research stamp (web `lib/research/stamps.ts`, SSL-663). Citizen science is an instrument feed, so
/// every kind is an instrument or survey result, never a mission type. Order is the canonical order on a day.
public enum StampKind: String, CaseIterable, Codable, Sendable {
    case classification, survey, discoveryMission = "discovery-mission", event
    case exchangeSale = "exchange-sale", contractRun = "contract-run", priceAlert = "price-alert"
}

public struct ResearchPathChoice: Codable, Equatable, Sendable {
    public var week: String
    public var path: ResearchPathID
    public var claimedSteps: [Int]?
    public init(week: String, path: ResearchPathID, claimedSteps: [Int]? = nil) {
        self.week = week; self.path = path; self.claimedSteps = claimedSteps
    }
}

/// An event or weekly path's permanent fragment record. The source remains after the player converts its fragments to Research Ink.
public struct ResearchFragmentHistoryEntry: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public var title: String
    public var fragmentsEarned: Int
    public var badgeId: String?

    public init(id: String, title: String, fragmentsEarned: Int = 0, badgeId: String? = nil) {
        self.id = id
        self.title = title
        self.fragmentsEarned = max(0, fragmentsEarned)
        self.badgeId = badgeId
    }
}

/// Conversion rules for the future fragment store. Research Ink is only collected at present, never spent.
public enum ResearchFragments {
    public static let conversionRate = 10

    @discardableResult public static func convertAvailable(_ player: inout Player) -> Int {
        let converted = max(0, player.researchFragments) / conversionRate
        guard converted > 0 else { return 0 }
        player.researchFragments -= converted * conversionRate
        player.researchUniversalFragments += converted
        return converted
    }

    public static func record(_ player: inout Player, id: String, title: String, fragments: Int, badgeId: String? = nil) {
        guard fragments > 0 else { return }
        if let index = player.researchFragmentHistory.firstIndex(where: { $0.id == id }) {
            player.researchFragmentHistory[index].fragmentsEarned += fragments
            if player.researchFragmentHistory[index].badgeId == nil { player.researchFragmentHistory[index].badgeId = badgeId }
        } else {
            player.researchFragmentHistory.append(.init(id: id, title: title, fragmentsEarned: fragments, badgeId: badgeId))
        }
    }

    public static func mergeHistory(_ local: [ResearchFragmentHistoryEntry], _ remote: [ResearchFragmentHistoryEntry]) -> [ResearchFragmentHistoryEntry] {
        var merged = Dictionary(uniqueKeysWithValues: remote.map { ($0.id, $0) })
        for entry in local {
            guard let theirs = merged[entry.id] else { merged[entry.id] = entry; continue }
            merged[entry.id] = .init(id: entry.id, title: theirs.title, fragmentsEarned: max(entry.fragmentsEarned, theirs.fragmentsEarned), badgeId: theirs.badgeId ?? entry.badgeId)
        }
        return merged.values.sorted { $0.id > $1.id }
    }
}

public enum ResearchPathID: String, Codable, CaseIterable, Sendable { case explorer, trader }

public struct ResearchPathStep: Equatable, Identifiable, Sendable {
    public let id: String
    public let kind: StampKind
    public let days: Int
    public let icon: String
    public let title: String
    public let brief: String
    public let why: String
}

public enum ResearchPathRules {
    public static let dayMs = 86_400_000.0
    public static func weekKey(_ ms: Double) -> String {
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(identifier: "UTC")!
        let date = Date(timeIntervalSince1970: ms / 1000)
        let weekday = calendar.component(.weekday, from: date)
        let offset = (weekday + 5) % 7
        return ResearchStampRules.dayKey(ms - Double(offset) * dayMs)
    }
    public static func pathThisWeek(_ choice: ResearchPathChoice?, now: Double) -> ResearchPathID? {
        guard let choice, choice.week == weekKey(now) else { return nil }
        return choice.path
    }
    public static func steps(_ path: ResearchPathID) -> [ResearchPathStep] {
        switch path {
        case .explorer:
            return [
                .init(id: "classify", kind: .classification, days: 1, icon: "waveform.path.ecg", title: "Classify a signal", brief: "Open your instruments and say what a telescope found.", why: "Your answer joins everyone else's, so we learn what is really out there."),
                .init(id: "scan", kind: .survey, days: 1, icon: "viewfinder", title: "Finish a survey scan", brief: "Start a scan from the control station and see it through.", why: "Scans show how worlds behave, so they get more believable."),
                .init(id: "watch", kind: .classification, days: 3, icon: "waveform.path.ecg", title: "Keep watching: 3 days", brief: "Classify a signal on three different days this week.", why: "Signals repeat. Coming back is how a discovery gets confirmed."),
                .init(id: "scan-again", kind: .survey, days: 3, icon: "viewfinder", title: "Scan on 3 days", brief: "Finish a survey scan on three different days this week.", why: "More scans reveal more of the picture."),
                .init(id: "breakthrough", kind: .classification, days: 0, icon: "star", title: "Breakthrough", brief: "Stamp research on five different days this week.", why: "Steady research turns scattered reports into a result."),
            ]
        case .trader:
            return [
                .init(id: "sale", kind: .exchangeSale, days: 1, icon: "chart.line.uptrend.xyaxis", title: "Make an Exchange sale", brief: "Sell an eligible mineral or refined good at the Exchange.", why: "Real prices tell the community which resources are moving."),
                .init(id: "contract", kind: .contractRun, days: 1, icon: "shippingbox", title: "Complete a contract run", brief: "Take a client contract and bring the run home.", why: "Contracts show where supply is needed, not only what is available."),
                .init(id: "alert", kind: .priceAlert, days: 1, icon: "bell", title: "Set a price alert", brief: "Open Exchange alerts and set one useful target.", why: "Alerts turn a changing market into a signal you can act on."),
                .init(id: "sales", kind: .exchangeSale, days: 3, icon: "chart.line.uptrend.xyaxis", title: "Trade on 3 days", brief: "Make Exchange sales on three different days this week.", why: "Steady trades reveal a better pattern than one lucky sale."),
                .init(id: "breakthrough", kind: .contractRun, days: 0, icon: "star", title: "Breakthrough", brief: "Complete the Trader chain to finish the path.", why: "Contracts, prices and decisions now form one market picture."),
            ]
        }
    }
    public static func progress(_ step: ResearchPathStep, stamps: ResearchStamps, week: String, now: Double) -> (have: Int, need: Int) {
        let end = ResearchStampRules.dayKey(now)
        let days = stamps.days.keys.filter { $0 >= week && $0 <= end }
        if step.days == 0 { return (min(5, days.filter { !(stamps.days[$0] ?? []).isEmpty }.count), 5) }
        return (min(step.days, days.filter { stamps.days[$0]?.contains(step.kind) == true }.count), step.days)
    }
    public static func rewardStep(_ step: ResearchPathStep) -> Int? {
        if step.id == "breakthrough" { return 5 }
        if step.id == "scan" || step.id == "contract" { return 2 }
        if step.id == "sales" || step.id == "scan-again" || step.id == "world" { return 4 }
        return nil
    }
    @discardableResult public static func claim(_ p: inout Player, step: ResearchPathStep, progress: (have: Int, need: Int), now: Double) -> Bool {
        guard let marker = rewardStep(step), progress.have >= progress.need, let choice = p.researchPath else { return false }
        var claimed = choice.claimedSteps ?? []
        guard !claimed.contains(marker) else { return false }
        claimed.append(marker); claimed.sort()
        p.researchPath = ResearchPathChoice(week: choice.week, path: choice.path, claimedSteps: claimed)
        let fragments = marker == 2 ? 5 : marker == 4 ? 10 : 25
        p.researchFragments += fragments
        let badgeId = marker == 5 ? "community-research-\(choice.week)" : nil
        ResearchFragments.record(&p, id: "community-research-\(choice.week)", title: "\(choice.path.rawValue.capitalized) week of \(choice.week)", fragments: fragments, badgeId: badgeId)
        if marker == 5 {
            let id = badgeId!
            if p.badges[id] == nil { p.badges[id] = PlayerBadge(eventId: id, tier: .gold, earnedAt: now) }
        }
        return true
    }
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

    public struct MonthSummary: Equatable, Sendable, Identifiable {
        public let key: String
        public let label: String
        public let stamps: Int
        public var id: String { key }
    }

    /// Historic citizen-science records remain contributions, but never become retroactive path progress or rewards.
    public static func historicalContributionMonths(_ stamps: ResearchStamps, submittedAt: [Double], now: Double) -> [String: Int] {
        let launch = 1_791_158_400_000.0 // 2026-10-01 UTC
        var result: [String: Int] = [:]
        for value in submittedAt where value.isFinite && value < launch && value <= now {
            let key = String(dayKey(value).prefix(7))
            result[key, default: 0] += 1
        }
        for (day, kinds) in stamps.days where day < "2026-10-01" && kinds.contains(.classification) {
            let key = String(day.prefix(7))
            result[key] = max(result[key] ?? 0, kinds.count)
        }
        return result
    }

    /// Recent personal contribution totals, newest month first.
    public static func monthHistory(_ stamps: ResearchStamps, now: Double, count: Int = 6, historicalContributions: [String: Int] = [:]) -> [MonthSummary] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let date = Date(timeIntervalSince1970: now / 1000)
        let current = calendar.dateComponents([.year, .month], from: date)
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMMM yyyy"
        return (0..<count).compactMap { offset in
            guard let monthDate = calendar.date(from: DateComponents(year: current.year, month: current.month)) .flatMap({ calendar.date(byAdding: .month, value: -offset, to: $0) }) else { return nil }
            let parts = calendar.dateComponents([.year, .month], from: monthDate)
            guard let year = parts.year, let month = parts.month else { return nil }
            let key = String(format: "%04d-%02d", year, month)
            return MonthSummary(key: key, label: formatter.string(from: monthDate), stamps: stampsIn(stamps, year: year, month: month) + (historicalContributions[key] ?? 0))
        }
    }

    public struct CommunityBar: Equatable, Sendable { public let total: Int, goal: Int, fill: Double, reached: Bool }
    /// SSL-673: `server.others` leaves out this player, so own stamps not yet synced count once.
    public static func communityBar(own: Int, server: CommunityResearch? = nil) -> CommunityBar {
        let goal = server?.goal ?? communityGoal
        let total = (server?.others ?? 0) + own
        return CommunityBar(total: total, goal: goal, fill: min(1, Double(total) / Double(goal)), reached: server?.reachedAt != nil)
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
    public static let blurb = "Do one research task a day to earn a stamp. Every stamp fills the community bar and keeps your research record growing. Miss a day and nothing is lost."
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
