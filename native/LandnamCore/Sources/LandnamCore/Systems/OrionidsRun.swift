import Foundation

/// Orionid fragment ledger on the player (web `orionidsFragments`, SSL-578).
public struct OrionidsFragments: Codable, Equatable, Sendable {
    public var caught: Int = 0
    public var redeemed: Int = 0
    public init(caught: Int = 0, redeemed: Int = 0) {
        self.caught = max(0, caught)
        self.redeemed = min(self.caught, max(0, redeemed))
    }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        func whole(_ key: String) -> Int {
            if let v = try? c.decodeIfPresent(Double.self, forKey: AnyKey(key)), v.isFinite, v > 0 { return Int(v) }
            return 0
        }
        self.init(caught: whole("caught"), redeemed: whole("redeemed"))
    }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        try c.encode(caught, forKey: AnyKey("caught"))
        try c.encode(redeemed, forKey: AnyKey("redeemed"))
    }
}

/// Orionids shower run (web `lib/orionids/shower-run.ts` and `launch-catch.ts`). The run's 20 fragments are counted
/// from the moment the run is accepted, not from the lifetime ledger, and a filled run pays once.
public enum OrionidsRun {
    public static let missionId = "self-directed-orionids-night-run"
    /// Fragments that fall and bank on landing, per minute (web `ORIONIDS_RUN_FRAGMENTS_PER_MINUTE`). A player weaving under
    /// them fills the order in about a minute; parking in one spot catches roughly a quarter.
    public static let fragmentsPerMinute = 24.0
    /// Ground under the ship, either side, where a landing fragment banks (web `CATCH_RADIUS`).
    public static let catchRadius = 100.0
    public static func fragmentRate(at ms: Double, location: PlayerLocation?) -> Double {
        fragmentsPerMinute * (SkyEventWindows.isInOrionidsBonusWindow(ms, location: location) ? SkyEvents.orionidsPeakMultiplier : 1)
    }
    public static let surfaceResearchMissionId = "self-directed-orionids-surface-research"
    public static let fragmentGoal = 20
    /// Fragments one launch catches outside peak night.
    public static let launchCatchBase = 2

    /// Fragments an ascent catches at `ms`: nothing outside the window, doubled on peak night.
    public static func fragmentsCaughtOnLaunch(at ms: Double, calendar: Calendar = .current) -> Int {
        guard SkyEvents.isOrionidsWindow(ms) else { return 0 }
        return SkyEvents.isOrionidsPeakNight(ms, calendar: calendar) ? launchCatchBase * Int(SkyEvents.orionidsPeakMultiplier) : launchCatchBase
    }

    /// Add catches to the ledger; `toStash` also puts them in the hold-at-home pile (the launch catch does).
    public static func addCaught(_ p: inout Player, _ amount: Int, toStash: Bool) {
        guard amount > 0 else { return }
        p.orionidsFragments = OrionidsFragments(caught: p.orionidsFragments.caught + amount, redeemed: p.orionidsFragments.redeemed)
        if toStash { p.stash["orionid_debris", default: 0] += amount }
    }

    /// A catch on the day stamps the research calendar as a community event (web `addStamp(..., 'event')`).
    public static func stampCatch(_ p: inout Player, at ms: Double) { ResearchStampRules.add(&p, .event, at: ms) }

    public static func applyLaunchCatch(_ p: inout Player, at ms: Double) {
        let caught = fragmentsCaughtOnLaunch(at: ms)
        addCaught(&p, caught, toStash: true)
        if caught > 0 { stampCatch(&p, at: ms) }
    }

    private static func baseline(_ p: Player) -> Int { max(0, p.orionidsRunBaseline ?? 0) }

    /// Catches landed since this run was accepted.
    public static func catches(_ p: Player) -> Int { max(0, p.orionidsFragments.caught - baseline(p)) }
    public static func filled(_ p: Player) -> Bool { catches(p) >= fragmentGoal }

    /// Mark the ledger count at accept, so the order starts at zero.
    public static func start(_ p: inout Player) { p.orionidsRunBaseline = p.orionidsFragments.caught }

    /// The francs the run pays on return, through the same onboarding floor the debrief shows.
    public static func payout(missionsDone: Int) -> Int {
        MissionGenerator.calibrateOnboardingPayout(raw: mission().payout.francs, missionsDone: missionsDone)
    }

    /// Credit the payout once and reset the count, so a second collect finds the order empty.
    public static func settle(_ p: inout Player, missionsDone: Int) {
        guard filled(p) else { return }
        start(&p)
        p.francs += payout(missionsDone: missionsDone)
    }

    /// The haul without the fragments: a filled run keeps them as fragments, not as a sale.
    public static func withoutFragments(_ cargo: Cargo) -> Cargo {
        var rest = cargo
        rest["orionid_debris"] = nil
        return rest
    }

    /// Web `orionidsNightRun()`: the board entry for the shower run.
    public static func mission() -> Mission {
        let price = Double(Minerals.byId["orionid_debris"]?.price ?? 0)
        return Mission(
            id: missionId, title: "Orionids shower run",
            brief: "No client. Fly into the Orionids pattern, catch \(fragmentGoal) fragments, and mine any minerals you want along the way. Peak night pays double.",
            client: nil, tag: "FREE OPS", difficulty: "L1", locked: false, sequence: MissionGenerator.freeOpsMissionSequence,
            unlockAt: "Reach Free Operations", targetId: "orionids-shower-field",
            requires: MissionRequirements(minerals: [:], cargoMin: 0, drillTier: 1, maxOrbit: 2),
            payout: MissionPayout(francs: MissionGenerator.normalizePayout(raw: price * Double(fragmentGoal), sequence: MissionGenerator.freeOpsMissionSequence), affinity: 0))
    }

    /// The second event tier changes activity from mining to a rover observation.
    public static func surfaceResearchMission() -> Mission {
        Mission(id: surfaceResearchMissionId, title: "Orionids surface observation",
                brief: "Drive the rover over the meteor, scan a rock formation, and log it for the community research record.",
                client: nil, tag: "EVENT RESEARCH", difficulty: "L1", locked: false,
                sequence: MissionGenerator.freeOpsMissionSequence,
                unlockAt: "Complete the Orionids debris capture", targetId: "eros",
                requires: MissionRequirements(minerals: [:], cargoMin: 0, drillTier: 1, maxOrbit: 5),
                payout: MissionPayout(francs: 0, affinity: 0), construction: nil,
                payload: MissionPayload(type: .rover, name: "Orionids field rover", cargoCost: 0, instrumentId: nil),
                programReward: nil, onWorldVehicle: MissionGenerator.starterRoverVehicle)
    }
}
