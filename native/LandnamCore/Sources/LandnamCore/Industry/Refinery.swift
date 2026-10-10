import Foundation

public struct RefineryJob: Codable, Equatable, Sendable {
    public var recipeId: String
    public var startedAt: Double
    public var durationMs: Double?
    public init(recipeId: String, startedAt: Double, durationMs: Double? = nil) {
        self.recipeId = recipeId; self.startedAt = startedAt; self.durationMs = durationMs
    }
}

public struct RefineryRecipe: Equatable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let inputMineral: String
    public let inputAmount: Int
    public let symbol: String
    public let colorHex: String
    public let price: Int
    public let seconds: Int
    public let cost: Int
}

/// Level 1 ore processing (port of `REFINERY_RECIPES` and the refinery half of `EconomySystem.ts`).
public enum Refinery {
    private static func recipe(_ id: String, _ name: String, _ mineral: String, _ amount: Int, _ sym: String, _ hex: String, _ time: Int) -> RefineryRecipe {
        let value = Double(Minerals.byId[mineral]?.price ?? 0) * Double(amount)
        return RefineryRecipe(id: id, name: name, inputMineral: mineral, inputAmount: amount, symbol: sym, colorHex: hex,
                              price: Int((value * Economy.refiningValueMultiplier).rounded()), seconds: time,
                              cost: Int((value * Economy.refiningCostRate).rounded()))
    }

    public static let recipes: [RefineryRecipe] = [
        recipe("refined-gold", "Refined Gold", "gold", 3, "Au+", "#79d1ec", 3600),
        recipe("refined-uranium", "Refined Uranium", "uranium", 3, "U+", "#8fd16a", 3600),
        recipe("refined-cobalt", "Refined Cobalt", "cobalt", 3, "Co+", "#4f9cf7", 3000),
        recipe("refined-copper", "Refined Copper", "copper", 4, "Cu+", "#4bc9c6", 2400),
        recipe("refined-aluminium", "Refined Aluminium", "aluminium", 4, "Al+", "#c7d0dc", 2400),
        recipe("refined-hydrogen", "Refined Hydrogen", "hydrogen", 4, "H+", "#9becff", 1800),
    ]
    public static let byId: [String: RefineryRecipe] = Dictionary(uniqueKeysWithValues: recipes.map { ($0.id, $0) })

    public static func isStaffed(_ p: Player) -> Bool { p.structureCrewAssignments["refinery"] != nil }

    static func day(_ ms: Double) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }

    /// Level 1 takes one shipment per UTC day.
    public static func startedToday(_ p: Player, now: Double) -> Bool {
        p.refineryLastStartedAt.map { day($0) == day(now) } ?? false
    }

    public static func durationMs(_ job: RefineryJob) -> Double {
        job.durationMs ?? Double((byId[job.recipeId]?.seconds ?? 0) * 1000)
    }

    public static func isDone(_ job: RefineryJob, now: Double) -> Bool { now - job.startedAt >= durationMs(job) }

    public static func canStart(_ r: RefineryRecipe, player p: Player, now: Double) -> Bool {
        p.refineryQueue.isEmpty && !startedToday(p, now: now) && (p.stash[r.inputMineral] ?? 0) >= r.inputAmount && p.francs >= r.cost
    }

    public static func applyStart(_ s: GameState, recipeId: String, now: Double) -> GameState {
        guard let r = byId[recipeId], !startedToday(s.player, now: now),
              (s.player.stash[r.inputMineral] ?? 0) >= r.inputAmount, s.player.francs >= r.cost else { return s }
        var n = s
        n.player.stash[r.inputMineral, default: 0] -= r.inputAmount
        n.player.francs -= r.cost
        n.player.refineryQueue.append(RefineryJob(recipeId: r.id, startedAt: now, durationMs: Double(r.seconds) * 1000 * (isStaffed(s.player) ? 0.75 : 1) * BuildingLevels.timeMultiplier(BuildingLevels.level(s.player, "refinery"))))
        n.player.refineryLastStartedAt = now
        return n
    }

    public static func applyCollect(_ s: GameState, recipeId: String, now: Double) -> GameState {
        guard let i = s.player.refineryQueue.firstIndex(where: { $0.recipeId == recipeId }),
              isDone(s.player.refineryQueue[i], now: now) else { return s }
        var n = s
        n.player.refineryQueue.remove(at: i)
        n.player.refinedGoods[recipeId, default: 0] += 1
        return n
    }

    /// Sell finished goods at their recipe output value.
    public static func applySell(_ s: GameState, recipeId: String, amount: Int) -> GameState {
        guard let r = byId[recipeId] else { return s }
        let have = s.player.refinedGoods[recipeId] ?? 0
        let q = min(max(0, amount), have)
        guard q > 0 else { return s }
        var n = s
        n.player.francs += r.price * q
        n.player.refinedGoods[recipeId] = have - q
        return n
    }
}
