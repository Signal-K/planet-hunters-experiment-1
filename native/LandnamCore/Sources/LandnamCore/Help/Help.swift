import Foundation

/// One card in the help sheet. Body text renders at 14pt or larger.
public struct HelpCard: Equatable, Sendable {
    public let title: String
    public let body: String
    public init(title: String, body: String) { self.title = title; self.body = body }
}

/// One step of the optional "Show me" run. Targets are `coachTarget` ids.
public struct HelpCoachStep: Equatable, Sendable {
    public let id: String
    public let targets: [String]
    public let anchor: String
    public let hint: String
    /// The step also ends when the screen reports this action id.
    public let completeOn: String?
    public init(id: String, targets: [String], anchor: String, hint: String, completeOn: String? = nil) {
        self.id = id; self.targets = targets; self.anchor = anchor; self.hint = hint; self.completeOn = completeOn
    }
}

public struct HelpTopic: Equatable, Sendable {
    public let id: String
    public let title: String
    public let cards: [HelpCard]
    public let coach: [HelpCoachStep]
    public init(id: String, title: String, cards: [HelpCard], coach: [HelpCoachStep] = []) {
        self.id = id; self.title = title; self.cards = cards; self.coach = coach
    }
}

/// Help content keyed by screen (mirrors web lib/help/topics.ts). A screen with
/// no entry shows no "?". Nothing opens unprompted.
public enum Help {
    public static let minCards = 2
    public static let maxCards = 4

    private static let launch = HelpTopic(id: "launch", title: "Launch review", cards: [
        HelpCard(title: "Map and destination", body: "The map shows where each body sits. Lit bodies are in reach of this rocket. Tap one to pick it, or use the arrows. Check the minerals and the distance before you commit."),
        HelpCard(title: "Rocket and cargo", body: "Each rocket class has its own cargo space and range. Pick one that carries the cargo this run needs and reaches the body. A contract shows its payout, so compare it with what the rocket costs."),
        HelpCard(title: "Fit checks", body: "Clearance reads ALL PARAMETERS PASS when the rocket, fuel and cargo fit the trip. If it says BUILD HOLD, the line under it names what is missing. Change the rocket or the target to clear it."),
        HelpCard(title: "What Launch commits", body: "Prepare rolls the rocket from the Workshop to the pad and spends its build cost. LAUNCH then starts the flight. A Free Ops haul and a client contract both leave from here."),
    ])

    public static let topics: [Screen: HelpTopic] = [
        .missions: HelpTopic(id: "contracts", title: "Contracts", cards: [
            HelpCard(title: "Client or your own work", body: "This board is client work. A contract pays a set amount and may be locked until you meet its requirement. Skip it and fly your own mission from the pad."),
            HelpCard(title: "Payout and bonus", body: "The payout is paid on delivery. A client bonus is extra, and only if the card lists one and you meet its terms. Misses cost the bonus, not the base payout."),
            HelpCard(title: "Prepare, then launch", body: "Accept and prepare opens the launch review. The rocket stands in the Workshop, then rolls to the pad when you confirm."),
        ]),
        .targets: launch, .rocketBuy: launch, .fab: launch,
        .hangar: HelpTopic(id: "hangar", title: "Hangar", cards: [
            HelpCard(title: "Parts and builds", body: "Pick a part to see what it changes. Stat changes show next to the part. Build cost is the francs it takes to fit it."),
            HelpCard(title: "Staged vehicles", body: "Assemble a staged vehicle here, then transfer it to the pad. Parts you have not unlocked stay greyed."),
        ]),
        .debrief: HelpTopic(id: "debrief", title: "After the haul", cards: [
            HelpCard(title: "The haul is home", body: "Debrief pays the run and puts ore in your stash, or sells it if that was the plan."),
            HelpCard(title: "Next is the ground", body: "Collect, then you are back on the ground. Spend the francs and ore on a build, or launch again. A new contract is optional."),
        ]),
        .mining: HelpTopic(id: "mining", title: "Mining operations", cards: [
            HelpCard(title: "Hit the requested ore", body: "Wait for a coloured seam to pass under the ship, then fire the laser. The first seams contain the mineral this run asked for."),
            HelpCard(title: "Charges and cargo stay", body: "Shots spend laser charges. Leaving or reloading keeps the cargo and remaining charges. Recharge spends francs."),
            HelpCard(title: "Bring the haul home", body: "Return when you are ready on a Free Ops haul. A client order waits until the requested ore is in the hold."),
        ], coach: [
            HelpCoachStep(id: "fire", targets: ["mining-fire-laser"], anchor: "mining-fire-laser", hint: "Wait for a coloured seam to pass the fixed laser line, then fire.", completeOn: "fire"),
        ]),
        .instrumentHub: HelpTopic(id: "control-station", title: "Control Station", cards: [
            HelpCard(title: "Where things are", body: "The map shows each telescope and satellite you operate. A number means that equipment has items ready to classify."),
            HelpCard(title: "Open a project", body: "Filter by place, then open a row that has a count. That opens the review for those items."),
        ]),
        .galaxy: HelpTopic(id: "tess", title: "Reading the light curve", cards: [
            HelpCard(title: "Find the dip", body: "A planet passing in front of its star makes the light dip for a short while, then recover. Drag across the dip on the chart to mark it."),
            HelpCard(title: "Confirm Transit", body: "Use Confirm Transit when the marked dip looks like a real, repeating drop with a clean shape."),
            HelpCard(title: "Mark Noise or Skip", body: "Use Mark Noise when the marked dip is just jitter or a glitch. Use Skip when you cannot tell. Skip needs no mark."),
        ], coach: [
            HelpCoachStep(id: "mark", targets: ["tess-chart"], anchor: "tess-chart", hint: "Drag across the dip in the light curve to mark it.", completeOn: "mark"),
            HelpCoachStep(id: "verdict", targets: ["tess-verdicts"], anchor: "tess-verdicts", hint: "Confirm Transit if it is a real dip, Mark Noise if it is not, Skip if unsure."),
        ]),
    ]

    public static func topic(for screen: Screen) -> HelpTopic? { topics[screen] }
}

/// Pure sequencing for the "Show me" run (mirrors web lib/help/coach.ts).
public struct CoachRun: Equatable, Sendable {
    public var steps: [HelpCoachStep]
    /// Index of the step on screen, or nil when the run is not active.
    public var index: Int?

    public init(topic: HelpTopic?) { steps = topic?.coach ?? []; index = nil }

    public var current: HelpCoachStep? { index.flatMap { steps.indices.contains($0) ? steps[$0] : nil } }
    public var isActive: Bool { current != nil }

    public mutating func start() { if !steps.isEmpty { index = 0 } }
    public mutating func stop() { index = nil }

    /// Moves to the next step, or ends the run after the last one.
    public mutating func advance() {
        guard let i = index else { return }
        index = i + 1 >= steps.count ? nil : i + 1
    }

    /// Only the step that names this action advances; early or repeated actions never skip a step.
    public mutating func complete(action: String) {
        if current?.completeOn == action { advance() }
    }
}
