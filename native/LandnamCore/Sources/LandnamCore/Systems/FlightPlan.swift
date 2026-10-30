import Foundation

/// Native port of the web training plan (`tutorial.ts` TRAINING_TRIES + `FlightPlanSystem`). Only real game
/// events complete a try: a mining debrief, a TESS classification, a Hangar module fit. Free Ops opens when
/// all three are done.
public enum FlightPlan {
    public static let tryLabels = ["mining": "Mining", "scan": "Scan", "part": "Part"]
    /// Finished training tries can be replayed as paid practice operations.
    /// The reward settles on the actual mission/classification/fit completion,
    /// never when the player opens the replay from Settings.
    public static let replayFrancs = 120
    public static let replayResearchXP = 10
    public static let replayIron = 2

    public struct PatchProgress: Equatable, Sendable {
        public let stitched: Int
        public let total: Int
    }

    /// A patch advances with the real screen flow and becomes complete only
    /// when its corresponding game event records the try.
    public static func patchProgress(_ player: Player, screen: Screen, tryId: String) -> PatchProgress {
        let total = tryId == "mining" ? 5 : 2
        if player.flightPlan.completed[tryId] == true { return PatchProgress(stitched: total, total: total) }
        guard player.flightPlan.currentTry == tryId else { return PatchProgress(stitched: 0, total: total) }
        let stitched: Int
        switch tryId {
        case "mining": stitched = max(0, miningPosition(player, screen).0 - 1)
        case "scan": stitched = screen == .galaxy ? 1 : 0
        case "part": stitched = screen == .hangar ? 1 : 0
        default: stitched = 0
        }
        return PatchProgress(stitched: min(stitched, total), total: total)
    }

    /// What the coach strip shows: kicker ("MINING OPS · STEP 1/5"), the objective and the radio line, plus an
    /// optional button that takes the player to the screen the step needs.
    public struct Coach: Equatable, Sendable {
        public let kicker: String
        public let objective: String
        public let radio: String
        public let go: Go?
        public struct Go: Equatable, Sendable { public let label: String; public let screen: Screen }
    }

    /// The starter hull's rooms (web CUSTOMIZER_BUILD_SEQUENCE); larger hulls add more, see `ShipCustomizer.sequence`.
    public static let moduleKinds = ["engine", "booster", "cockpit", "payload"]

    /// Screens that belong to a live cargo run; the scan and part lines never show here (web LOOP_SCREENS).
    private static let loopScreens: Set<Screen> = [.fab, .roverSurvey, .targets, .mining, .debrief, .transit, .landing, .delivery, .rocketBuy]

    /// Whether the coach line is about what the player is doing right now (web `trainingStepOnPath`).
    /// The "go back to X" line only applies on the base, where the entry lives; on any other screen
    /// the player is doing something else and the strip folds into the "?" chip.
    public static func onPath(_ p: Player, screen: Screen) -> Bool {
        guard let current = p.flightPlan.currentTry else { return false }
        if screen == .hub { return true }
        switch current {
        case "mining":
            if !p.placed.contains("launchpad") { return screen == .intro || screen == .build }
            return loopScreens.contains(screen) || screen == .missions || screen == .launchpad
        case "scan": return loopScreens.contains(screen) || screen == .galaxy
        default: return loopScreens.contains(screen) || screen == .hangar
        }
    }

    public static func coach(_ p: Player, screen: Screen, includeHidden: Bool = false) -> Coach? {
        guard (includeHidden || !p.flightPlan.hidden), let current = p.flightPlan.currentTry,
              let index = FlightPlanProgress.tryIds.firstIndex(of: current) else { return nil }
        let position = current == "mining" ? miningPosition(p, screen) : (index + 1, FlightPlanProgress.tryIds.count)
        let kicker = "\((tryLabels[current] ?? current).uppercased()) OPS · STEP \(position.0)/\(position.1)"
        func c(_ objective: String, _ radio: String, go: Coach.Go? = nil) -> Coach { Coach(kicker: kicker, objective: objective, radio: radio, go: go) }
        switch current {
        case "mining":
            if screen == .intro && !p.placed.contains("launchpad") {
                return c("Choose where to build", "Pick a landscape for your base, then establish it. The launchpad comes next.")
            }
            if !p.placed.contains("launchpad") {
                return c("Place the launchpad", "Your first structure. All missions launch from here.",
                         go: screen == .build ? nil : .init(label: "OPEN BUILD", screen: .build))
            }
            switch screen {
            case .missions: return c("Accept a mining contract", "A client order funds this first field run.")
            // Target choice and the rover survey are not first-run stops (SSL-675).
            case .fab, .rocketBuy, .targets, .roverSurvey: return c("Prepare the vehicle and launch", "Check the target, cargo and vehicle, then launch.")
            case .mining: return c("Fire the laser on a seam", "Wait for a coloured seam to pass beneath the fixed laser line.")
            case .debrief: return c("Close the mission debrief", "The first try is recorded when the order is settled.")
            // Flight and landing are one zero-tap sequence with no coach step (SSL-675).
            case .transit, .landing, .delivery: return nil
            case .launchpad: return c("Open client contracts", "The first try is a complete mine-and-return run.", go: .init(label: "CONTRACTS", screen: .missions))
            default: return c("Tap the tower to open client contracts", "Client contracts open from the tower.", go: .init(label: "BASE", screen: .hub))
            }
        case "scan":
            if loopScreens.contains(screen) { return coachForLoop(p, screen, kicker) }
            return screen == .galaxy
                ? c("Classify the transit candidate", "Review the light curve and submit a science verdict.")
                : c("Open the Galaxy map", "Transit candidates are classified from the Galaxy map.", go: .init(label: "GALAXY", screen: .galaxy))
        default:
            if loopScreens.contains(screen) { return coachForLoop(p, screen, kicker) }
            return screen == .hangar
                ? c("Fit a module in each ship stage", "Choose a module for engine, booster, cockpit and payload, then confirm.")
                : c("Open the Hangar from Base", "The Hangar is where ship modules are fitted.", go: .init(label: "HANGAR", screen: .hangar))
        }
    }

    /// Five stops on the first-run spine: place the pad, take a contract, launch,
    /// mine, debrief. Flight and landing carry no coach step.
    private static func miningPosition(_ p: Player, _ screen: Screen) -> (Int, Int) {
        if !p.placed.contains("launchpad") { return (1, 5) }
        switch screen {
        case .intro, .build: return (1, 5)
        case .rocketBuy, .fab, .targets, .roverSurvey: return (3, 5)
        case .mining: return (4, 5)
        case .debrief: return (5, 5)
        default: return (2, 5)
        }
    }

    private static func coachForLoop(_ p: Player, _ screen: Screen, _ kicker: String) -> Coach? {
        var mining = p
        mining.flightPlan = FlightPlanProgress()
        guard let base = coach(mining, screen: screen) else { return nil }
        return Coach(kicker: kicker, objective: base.objective, radio: base.radio, go: nil)
    }

    /// Fits one part per room of the hull's sequence. Needs every room filled and enough francs for the net change
    /// (web `applyConfirmShipCustomizerBuild`); completes the part try.
    public static func applyFit(_ s: GameState, installed: [String: String]) -> GameState {
        guard ShipCustomizer.sequence(for: s.player).allSatisfy({ installed[$0] != nil }) else { return s }
        let cost = ShipCustomizer.netCost(installed, previous: s.player.shipCustomizerParts)
        guard cost <= s.player.francs else { return s }
        var n = s
        n.player.francs -= cost
        n.player.shipCustomizerParts = installed
        completeTry(&n, "part")
        return n
    }

    /// Marks a try done on a real event and re-derives Free Ops and the tutorial flag.
    public static func completeTry(_ s: inout GameState, _ id: String) {
        let wasFree = s.player.freeOperations
        let paidReplay = s.player.flightPlan.replayTry == id && s.player.flightPlan.completed[id] == true
        if s.player.flightPlan.currentTry == id {
            if paidReplay {
                s.player.francs += replayFrancs
                s.player.researchXP += replayResearchXP
                s.player.stash["iron", default: 0] += replayIron
            }
            s.player.flightPlan.complete(id)
        }
        s.player.freeOperations = Transitions.freeOperationsUnlocked(s.player)
        s.tutorial = !s.player.freeOperations
        if !wasFree && s.player.freeOperations { s.popup = "tutorial-complete" }
    }
}
