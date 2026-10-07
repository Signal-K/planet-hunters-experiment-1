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
        StructureBlueprint(id: "surface-silo", name: "Surface Silo", cost: Economy.surfaceSiloPrice, materials: [:], unlocksAt: "Complete the guided missions",
                           summary: "Small Earth-side mineral storage. Hold ore for a better market window or for refinery input."),
        StructureBlueprint(id: "refinery", name: "Refinery", cost: Economy.refineryPrice, materials: ["aluminium": 20, "copper": 10],
                           unlocksAt: "Surface Silo + Free Operations", summary: "Level 1 ore processing. Refines one shipment of raw minerals into higher-value goods per day."),
        StructureBlueprint(id: "astronaut-academy", name: "Astronaut Academy", cost: Economy.academyPrice, materials: ["aluminium": 24, "silicon": 12, "copper": 8],
                           unlocksAt: "Research after reaching client level 2 with two clients", summary: "Trains named astronauts, manages the roster, and coordinates Base staffing."),
    ]
    public static let byId: [String: StructureBlueprint] = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })

    /// What the Build screen offers: web hides the Academy here (it is placed after research) and anything already built.
    public static func catalog(for p: Player) -> [StructureBlueprint] {
        all.filter { $0.id != "astronaut-academy" && !p.placed.contains($0.id) }
    }

    public static func unlocked(_ b: StructureBlueprint, player p: Player) -> Bool {
        switch b.id {
        case "surface-silo": return p.freeOperations || p.missionsDone >= 2 || p.placed.contains("surface-silo")
        case "astronaut-academy": return p.academyResearched || p.placed.contains("astronaut-academy")
        case "launchpad": return true
        case "refinery": return p.placed.contains("refinery") || (p.freeOperations && p.placed.contains("surface-silo"))
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
              !(kind == "astronaut-academy" && !s.player.academyResearched),
              unlocked(b, player: s.player), canAfford(b, player: s.player) else { return s }
        var n = s
        for (m, c) in b.materials { n.player.stash[m] = max(0, (n.player.stash[m] ?? 0) - c) }
        n.player.francs -= b.cost
        n.player.placed.append(kind)
        n.player.placementPlots[kind] = plot
        n.player.underConstruction[kind] = now
        if kind == "refinery" { n.player.refineryBuilt = true }
        if kind == "astronaut-academy" { n.player.academyFunded = true; n.player.crewUpkeepSettledDate = Academy.dateKey(now) }
        if !s.player.freeOperations && Transitions.freeOperationsUnlocked(n.player) {
            n.player.freeOperations = true; n.tutorial = false; n.popup = "tutorial-complete"
        }
        return n
    }

    public static func progress(_ startedAt: Double?, now: Double) -> Double {
        guard let startedAt else { return 1 }
        return min(1, max(0, (now - startedAt) / buildMs))
    }
}
