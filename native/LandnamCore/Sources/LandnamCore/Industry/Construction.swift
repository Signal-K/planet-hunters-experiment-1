import Foundation

public struct StructureBlueprint: Equatable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let cost: Int
    public let materials: [String: Int]
    public let unlocksAt: String
    public let summary: String
}

/// Earth Base plots and structures (port of `STRUCTURES`, `structureUnlocked`, `applyPlaceStructure`).
public enum Construction {
    public static let plotCount = 4
    public static let buildMs = 10_000.0

    public static let all: [StructureBlueprint] = [
        StructureBlueprint(id: "launchpad", name: "Launchpad", cost: 0, materials: [:], unlocksAt: "Always", summary: "Rocket assembly and launch operations."),
        StructureBlueprint(id: "surface-silo", name: "Surface Silo", cost: Economy.surfaceSiloPrice, materials: [:], unlocksAt: "Fly both guided missions first",
                           summary: "Small Earth-side mineral storage. Keep ore for construction; overflow sells when a flight returns."),
        StructureBlueprint(id: "market", name: "Exchange", cost: Economy.exchangePrice, materials: [:], unlocksAt: "Opens once the guided missions are flown",
                           summary: "Cargo dock where you sell ore at the spot price."),
        StructureBlueprint(id: "control-station", name: "Control Station", cost: Economy.controlStationPrice, materials: [:], unlocksAt: "Opens once the guided missions are flown",
                           summary: "Runs your satellites and telescopes. Build it before you launch one."),
    ]
    public static let byId: [String: StructureBlueprint] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    /// What the Build screen offers: anything not already built.
    public static func catalog(for p: Player) -> [StructureBlueprint] {
        all.filter { !p.placed.contains($0.id) }
    }

    /// Silo and Exchange appear once one run is flown: before that there is nothing to store or sell (web `FIRST_STORAGE_MISSIONS_DONE`).
    public static let firstStorageMissionsDone = 1

    public static func unlocked(_ b: StructureBlueprint, player p: Player) -> Bool {
        switch b.id {
        case "surface-silo": return p.missionsDone >= firstStorageMissionsDone || p.placed.contains("surface-silo")
        case "market": return p.missionsDone >= firstStorageMissionsDone || p.placed.contains("market")
        case "control-station": return p.missionsDone >= firstStorageMissionsDone || p.placed.contains("control-station")
        case "launchpad": return true
        default: return false
        }
    }

    public static func gaps(_ b: StructureBlueprint, player p: Player) -> [String] {
        var g: [String] = []
        if p.francs < b.cost { g.append("\(Economy.format(francs: b.cost - p.francs)) more") }
        for (m, n) in b.materials.sorted(by: { $0.key < $1.key }) where (p.stash[m] ?? 0) < n { g.append("\(n - (p.stash[m] ?? 0)) more \(m)") }
        return g
    }
    public static func canAfford(_ b: StructureBlueprint, player p: Player) -> Bool { gaps(b, player: p).isEmpty }

    /// Plots in use, with the pre-plot launchpad save pinned to plot 0 as on web.
    public static func occupied(_ p: Player) -> [String: Int] {
        var plots = p.placementPlots
        if p.placed.contains("launchpad") && plots["launchpad"] == nil { plots["launchpad"] = 0 }
        return plots
    }

    public static func applyPlace(_ s: GameState, kind: String, plot: Int, now: Double) -> GameState {
        guard let b = byId[kind], !s.player.placed.contains(kind), (0..<plotCount).contains(plot),
              !occupied(s.player).values.contains(plot),
              unlocked(b, player: s.player), canAfford(b, player: s.player) else { return s }
        var n = s
        for (m, c) in b.materials { n.player.stash[m] = max(0, (n.player.stash[m] ?? 0) - c) }
        n.player.francs -= b.cost
        n.player.placed.append(kind)
        n.player.placementPlots[kind] = plot
        n.player.underConstruction[kind] = now
        if !s.player.freeOperations && Transitions.freeOperationsUnlocked(n.player) {
            // Free Ops opens with the launchpad, but the three training tries are an optional guide that is still running:
            // only a finished training ends the coach and raises the "agency is operating" sheet (web `applyPlaceStructure`).
            n.player.freeOperations = true
            if n.player.flightPlan.isComplete { n.tutorial = false; n.popup = "tutorial-complete" }
        }
        return n
    }

    public static func progress(_ startedAt: Double?, now: Double) -> Double {
        guard let startedAt else { return 1 }
        return min(1, max(0, (now - startedAt) / buildMs))
    }
}
