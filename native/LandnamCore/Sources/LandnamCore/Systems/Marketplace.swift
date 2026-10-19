import Foundation

/// A sell alert: fires once the spot price is at or above `target` (web `PriceAlert`).
public struct PriceAlert: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var mineralId: String
    public var target: Int
    public var firedAt: Double?
    public init(id: String, mineralId: String, target: Int, firedAt: Double? = nil) {
        self.id = id; self.mineralId = mineralId; self.target = target; self.firedAt = firedAt
    }
}

public struct SpotQuote: Equatable, Sendable, Identifiable {
    public let id: String
    public let name: String
    public let spot: Int
    public let ask: Int
    public let held: Int
}

/// Marketplace panel rules (port of `MarketplaceSystem.ts`): spot board, buying and sell alerts.
/// Selling lives in `Market`. Buying and alerts need the Exchange built.
public enum Marketplace {
    public static let buyMarkup = 1.25
    public static let maxPriceAlerts = 8

    public static func exchangeBuilt(_ p: Player) -> Bool { p.placed.contains("market") }

    public static func spot(_ id: String, player: Player, now: Double) -> Int {
        Market.unitPrice(id, player: player, clientId: player.lastClient, now: now).price
    }

    public static func buyUnitPrice(_ id: String, player: Player, now: Double) -> Int {
        let spot = spot(id, player: player, now: now)
        guard spot > 0 else { return 0 }
        return max(spot + 1, Int((Double(spot) * buyMarkup).rounded()))
    }

    /// Every mineral with a market price, cheapest first.
    public static func board(_ p: Player, now: Double) -> [SpotQuote] {
        Minerals.byId.keys.compactMap { id -> SpotQuote? in
            guard let meta = Minerals.byId[id] else { return nil }
            let s = spot(id, player: p, now: now)
            guard s > 0 else { return nil }
            return SpotQuote(id: id, name: meta.name, spot: s, ask: buyUnitPrice(id, player: p, now: now), held: p.stash[id] ?? 0)
        }
        .sorted { $0.spot != $1.spot ? $0.spot < $1.spot : $0.name < $1.name }
    }

    /// Why the player cannot buy `amount`, or nil when they can.
    public static func buyBlocker(_ p: Player, _ id: String, amount: Int = 1, now: Double) -> String? {
        guard Minerals.byId[id] != nil else { return "Not on the market" }
        guard exchangeBuilt(p) else { return "Build the Exchange to buy" }
        let capacity = Market.storageCapacity(p)
        if capacity - Market.storedUnits(p.stash) < amount { return capacity <= 0 ? "Build a silo to store ore" : "Silo is full" }
        if p.francs < buyUnitPrice(id, player: p, now: now) * amount { return "Not enough francs" }
        return nil
    }

    public static func applyBuy(_ s: GameState, mineralId: String, amount: Int, now: Double) -> GameState {
        guard amount > 0, buyBlocker(s.player, mineralId, amount: amount, now: now) == nil else { return s }
        var n = s
        n.player.francs -= buyUnitPrice(mineralId, player: s.player, now: now) * amount
        n.player.stash[mineralId, default: 0] += amount
        return n
    }

    /// One alert per mineral: setting again moves the target and re-arms it.
    public static func applySetAlert(_ s: GameState, mineralId: String, target: Int) -> GameState {
        guard exchangeBuilt(s.player), Minerals.byId[mineralId] != nil, target > 0 else { return s }
        var others = s.player.priceAlerts.filter { $0.mineralId != mineralId }
        guard others.count < maxPriceAlerts else { return s }
        others.append(PriceAlert(id: "alert-\(mineralId)", mineralId: mineralId, target: target))
        var n = s
        n.player.priceAlerts = others
        return n
    }

    public static func applyRemoveAlert(_ s: GameState, alertId: String) -> GameState {
        guard s.player.priceAlerts.contains(where: { $0.id == alertId }) else { return s }
        var n = s
        n.player.priceAlerts.removeAll { $0.id == alertId }
        return n
    }

    public static func dueAlerts(_ p: Player, now: Double) -> [PriceAlert] {
        p.priceAlerts.filter { $0.firedAt == nil && spot($0.mineralId, player: p, now: now) >= $0.target }
    }

    /// Marks due alerts as fired; returns the same state when nothing is due.
    public static func applyFireDue(_ s: GameState, now: Double) -> GameState {
        let due = Set(dueAlerts(s.player, now: now).map(\.id))
        guard !due.isEmpty else { return s }
        var n = s
        for i in n.player.priceAlerts.indices where due.contains(n.player.priceAlerts[i].id) { n.player.priceAlerts[i].firedAt = now }
        return n
    }

    public static func firedCount(_ p: Player) -> Int { p.priceAlerts.filter { $0.firedAt != nil }.count }
}
