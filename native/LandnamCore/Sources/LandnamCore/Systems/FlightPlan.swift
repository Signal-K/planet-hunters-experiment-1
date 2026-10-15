import Foundation

/// Native port of the web training plan (`tutorial.ts` TRAINING_TRIES + `FlightPlanSystem`). Only real game
/// events complete a try: a mining debrief, a TESS classification, a Hangar module fit. Free Ops opens when
/// all three are done.
public enum FlightPlan {
    public static let tryLabels = ["mining": "Mining", "scan": "Scan", "part": "Part"]

    public struct PatchProgress: Equatable, Sendable {
        public let stitched: Int
        public let total: Int
    }

    /// A patch advances with the real screen flow and becomes complete only
    /// when its corresponding game event records the try.
    public static func patchProgress(_ player: Player, screen: Screen, tryId: String) -> PatchProgress {
        let total = tryId == "mining" ? 6 : 2
        if player.flightPlan.completed[tryId] == true { return PatchProgress(stitched: total, total: total) }
        guard player.flightPlan.currentTry == tryId else { return PatchProgress(stitched: 0, total: total) }
        let stitched: Int
        switch tryId {
        case "mining": stitched = max(0, miningPosition(screen).0 - 1)
        case "scan": stitched = screen == .galaxy ? 1 : 0
        case "part": stitched = screen == .hangar ? 1 : 0
        default: stitched = 0
        }
        return PatchProgress(stitched: min(stitched, total), total: total)
    }

    /// What the coach strip shows: kicker ("MINING OPS · STEP 1/6"), the objective and the radio line, plus an
    /// optional button that takes the player to the screen the step needs.
    public struct Coach: Equatable, Sendable {
        public let kicker: String
        public let objective: String
        public let radio: String
        public let go: Go?
        public struct Go: Equatable, Sendable { public let label: String; public let screen: Screen }
    }

    /// Part kinds fitted in the Hangar, in web CUSTOMIZER_BUILD_SEQUENCE order, with the starter module for each.
    public static let moduleKinds = ["engine", "booster", "cockpit", "payload"]
    public static let modules: [String: [(id: String, name: String)]] = [
        "engine": [("ion-thruster-t1", "Ion Thruster T1"), ("pulse-thruster-t1", "Pulse Thruster T1")],
        "booster": [("strap-booster-t1", "Strap Booster Pair"), ("vulcan-booster-t1", "Vulcan Booster Pair")],
        "cockpit": [("cockpit-command-t1", "Command Cockpit T1"), ("guidance-cockpit-t1", "Guidance Cockpit T1")],
        "payload": [("cargo-payload-t1", "Cargo Bay T1"), ("mining-payload-t1", "Mining Payload T1")],
    ]

    /// Screens that belong to a live cargo run; the scan and part lines never show here (web LOOP_SCREENS).
    private static let loopScreens: Set<Screen> = [.fab, .roverSurvey, .targets, .mining, .debrief, .transit, .landing, .delivery, .rocketBuy]

    public static func coach(_ p: Player, screen: Screen, includeHidden: Bool = false) -> Coach? {
        guard (includeHidden || !p.flightPlan.hidden), let current = p.flightPlan.currentTry,
              let index = FlightPlanProgress.tryIds.firstIndex(of: current) else { return nil }
        let position = current == "mining" ? miningPosition(screen) : (index + 1, FlightPlanProgress.tryIds.count)
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
            case .fab, .rocketBuy: return c("Prepare the vehicle and launch", "Check the target, cargo and vehicle, then launch.")
            case .targets: return c("Choose the highlighted target", "The target carries the mineral named by the order.")
            case .roverSurvey: return c("Scout one outcrop, then continue to the ship laser", "The rover logs the surface. The ship laser extracts the order.")
            case .mining: return c("Fire the laser on a seam", "Wait for a coloured seam to pass beneath the fixed laser line.")
            case .debrief: return c("Close the mission debrief", "The first try is recorded when the order is settled.")
            case .transit, .landing: return c("Fly the cargo home", "The order is only paid once the cargo reaches the debrief.")
            case .delivery: return c("Deliver the cargo", "The order is only paid once the cargo reaches the debrief.")
            case .launchpad: return c("Open client contracts", "The first try is a complete mine-and-return run.", go: .init(label: "CONTRACTS", screen: .missions))
            default: return c("Open client contracts", "The first try is a complete mine-and-return run.", go: .init(label: "LAUNCHPAD", screen: .launchpad))
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

    /// Six milestones in the real mining loop: take a client order, prepare,
    /// choose a target, scout, fire the laser, then settle the cargo at home.
    /// The laser is therefore 5/6, not the superseded 2/6 concept placement.
    private static func miningPosition(_ screen: Screen) -> (Int, Int) {
        switch screen {
        case .intro, .build, .hub, .launchpad, .missions: return (1, 6)
        case .rocketBuy, .fab: return (2, 6)
        case .targets: return (3, 6)
        case .roverSurvey: return (4, 6)
        case .mining: return (5, 6)
        case .debrief, .transit, .landing, .delivery: return (6, 6)
        default: return (1, 6)
        }
    }

    private static func coachForLoop(_ p: Player, _ screen: Screen, _ kicker: String) -> Coach? {
        var mining = p
        mining.flightPlan = FlightPlanProgress()
        guard let base = coach(mining, screen: screen) else { return nil }
        return Coach(kicker: kicker, objective: base.objective, radio: base.radio, go: nil)
    }

    /// Fits one module per ship stage. Needs every stage filled and enough francs for the change; completes the part try.
    public static func applyFit(_ s: GameState, installed: [String: String]) -> GameState {
        guard moduleKinds.allSatisfy({ installed[$0] != nil }) else { return s }
        var n = s
        n.player.shipCustomizerParts = installed
        completeTry(&n, "part")
        return n
    }

    /// Marks a try done on a real event and re-derives Free Ops and the tutorial flag.
    public static func completeTry(_ s: inout GameState, _ id: String) {
        let wasFree = s.player.freeOperations
        if s.player.flightPlan.currentTry == id { s.player.flightPlan.complete(id) }
        s.player.freeOperations = Transitions.freeOperationsUnlocked(s.player)
        s.tutorial = !s.player.freeOperations
        if !wasFree && s.player.freeOperations { s.popup = "tutorial-complete" }
    }
}
