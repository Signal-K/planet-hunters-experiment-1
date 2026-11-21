import Foundation

/// A persistent next action on the Base, using the board's normal eligibility.
public struct BaseNextFlight: Equatable, Sendable {
    public let title: String
    public let detail: String
    public let cta: String
    public let screen: Screen
    public var missionId: String? = nil
    public var targetId: String? = nil

    public static func current(_ s: GameState, catalog: Catalog, now: Double) -> BaseNextFlight {
        let p = s.player
        if let active = p.activeMission {
            let mission = catalog.mission(s.missionId)
            let target = catalog.target(s.targetId)
            let goal = mission.flatMap { m in target.map { objective(m, $0, cargo: p.missionPhase == .mining ? p.miningCargoInProgress ?? [:] : nil) } }
            return BaseNextFlight(title: mission?.title ?? active.label,
                detail: p.returningToEarth ? "Bring your cargo home and settle this flight." : goal ?? "Your flight is waiting where you left it.",
                cta: p.missionPhase == .debrief ? "Settle flight" : p.missionPhase == .mining ? "Resume mining" : "Resume flight", screen: SkyCraft.current(for: p, now: now)?.opens ?? .transit)
        }
        if !p.placed.contains("launchpad") {
            return BaseNextFlight(title: "Your first launchpad", detail: "Place the pad to start flying.", cta: "Build launchpad", screen: .build)
        }
        if let mission = catalog.mission(s.missionId), let target = catalog.target(s.targetId) {
            return BaseNextFlight(title: mission.title, detail: objective(mission, target), cta: "Continue setup", screen: .fab)
        }
        if p.pendingLaunch || p.stagedRockets.contains(where: { $0.id == p.selectedStagedRocketId }) {
            return BaseNextFlight(title: "Your prepared rocket", detail: "Check the rocket before choosing another job.", cta: "Open launchpad", screen: .launchpad)
        }
        let entries = MissionBoard.clientBoard(catalog: catalog, player: p, now: now)
            .filter { e in
                let m = e.mission
                return e.unlocked && e.feasibleTargets > 0 && m.client != nil && m.deliveryTargetId == nil
                    && m.payload == nil && m.construction == nil && m.requires.minerals.values.contains { $0 > 0 }
            }
            .sorted { $0.mission.requires.minerals.values.reduce(0, +) < $1.mission.requires.minerals.values.reduce(0, +) }
        if let mission = entries.first?.mission {
            let targets = Targets.feasible(for: mission, targets: catalog.targets, parts: catalog.parts, missionsDone: p.missionsDone,
                launchpadUpgraded: p.launchpadUpgraded, launchpadLevel: BuildingLevels.level(p, "launchpad"))
            if let target = targets.first(where: { $0.id == mission.targetId }) ?? targets.first(where: { $0.recommended == true }) ?? targets.first {
                return BaseNextFlight(title: mission.title, detail: objective(mission, target), cta: "Prepare flight", screen: .missions,
                    missionId: mission.id, targetId: target.id)
            }
        }
        return BaseNextFlight(title: "Choose your next flight", detail: "Contracts, surveys and your own mining runs.", cta: "Open missions", screen: .missions)
    }

    private static func objective(_ mission: Mission, _ target: Target, cargo: Cargo? = nil) -> String {
        let ore = mission.requires.minerals.filter { $0.value > 0 }.sorted { $0.key < $1.key }
            .map { ore in cargo.map { "\($0[ore.key] ?? 0)/\(ore.value) \(ore.key)" } ?? "\(ore.value) \(ore.key)" }.joined(separator: " + ")
        return "\(target.name) · \(ore.isEmpty ? "loadout selected" : ore)"
    }

    /// Recheck the action at tap time, then use the normal setup and target validation.
    public static func open(_ s: GameState, catalog: Catalog, now: Double) -> GameState {
        guard s.screen == .hub else { return s }
        let action = current(s, catalog: catalog, now: now)
        var n = s
        n.screen = action.screen
        guard let id = action.missionId, let target = action.targetId else { return n }
        n = Loop.pickMission(n, id: id, catalog: catalog)
        guard n.missionId == id else { return s }
        return Loop.pickTarget(n, id: target, catalog: catalog)
    }
}
