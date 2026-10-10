import Foundation

/// Market, storage and purchase rules (port of `EconomySystem.ts`).
public enum Market {
    static let supplyDipPerUnit = 0.01
    static let maxSupplyDip = 0.6
    static let recoveryWindowMs = 2.0 * 60 * 60 * 1000
    static var fullDipUnits: Double { maxSupplyDip / supplyDipPerUnit }

    public static func supplyDipMultiplier(unitsSold: Double) -> Double { max(1 - maxSupplyDip, 1 - unitsSold * supplyDipPerUnit) }

    /// Supply pressure recovers over real time so a price is not permanently discounted.
    public static func decayedUnitsSold(_ units: Double, lastSoldAt: Double?, now: Double) -> Double {
        guard units > 0, let lastSoldAt else { return max(0, units) }
        let recovered = (max(0, now - lastSoldAt) / recoveryWindowMs) * fullDipUnits
        return max(0, units - recovered)
    }

    public static func openMarketSellPrice(base: Int, unitsSold: Double) -> Int {
        Int((Double(base) * Economy.openMarketSellRate * supplyDipMultiplier(unitsSold: unitsSold)).rounded())
    }

    public struct Quote: Equatable, Sendable { public let price: Int; public let base: Int; public let premiumApplied: Bool }

    /// One unit of a mineral right now. Client premium applies only to preferred minerals.
    public static func unitPrice(_ id: String, player: Player, clientId: String?, now: Double) -> Quote {
        guard let meta = Minerals.byId[id] else { return Quote(price: 0, base: 0, premiumApplied: false) }
        let sold = decayedUnitsSold(player.marketSupply[id] ?? 0, lastSoldAt: player.marketSupplyUpdatedAt[id], now: now)
        let base = openMarketSellPrice(base: meta.price, unitsSold: sold)
        let client = clientId.flatMap { Clients.byId[$0] }
        let premium = client.map { $0.mineralPreferences.contains(id) && $0.payoutPremium > 0 } ?? false
        return Quote(price: premium ? Int((Double(base) * (1 + client!.payoutPremium)).rounded()) : base, base: base, premiumApplied: premium)
    }

    public static func quote(_ stash: Cargo, player: Player, clientId: String?, now: Double) -> Int {
        stash.reduce(0) { $0 + ($1.value > 0 ? unitPrice($1.key, player: player, clientId: clientId, now: now).price * $1.value : 0) }
    }

    /// `clientId == .some(nil)` means an explicit open-market sale with no premium.
    public static func applySell(_ s: GameState, mineralId: String, amount: Int, now: Double, clientId: String?? = nil) -> GameState {
        let held = s.player.stash[mineralId] ?? 0
        let qty = min(amount, held)
        guard qty > 0, Minerals.byId[mineralId] != nil else { return s }
        let effective: String? = clientId == nil ? s.player.lastClient : (clientId!)
        var n = s
        let sold = decayedUnitsSold(s.player.marketSupply[mineralId] ?? 0, lastSoldAt: s.player.marketSupplyUpdatedAt[mineralId], now: now)
        let revenue = unitPrice(mineralId, player: s.player, clientId: effective, now: now).price * qty
        n.player.marketSupply[mineralId] = sold + Double(qty)
        n.player.marketSupplyUpdatedAt[mineralId] = now
        n.player.stash[mineralId] = held - qty
        if n.player.stash[mineralId]! <= 0 { n.player.stash[mineralId] = nil }
        n.player.francs += revenue
        return n
    }

    // MARK: storage

    public static func earthStorageBuilt(_ p: Player) -> Bool {
        p.placed.contains("surface-silo") || p.subsurfaceBuilt.contains("mineral-vault")
    }
    public static func storageCapacity(_ p: Player) -> Int {
        (p.placed.contains("surface-silo") ? Economy.surfaceSiloCapacity * BuildingLevels.siloCapacityMultiplier(BuildingLevels.level(p, "surface-silo")) : 0)
            + (p.subsurfaceBuilt.contains("mineral-vault") ? Economy.mineralSiloCapacity : 0)
            + (p.subsurfaceBuilt.contains("deep-mineral-vault") ? Economy.deepMineralSiloCapacity : 0)
    }
    public static func storedUnits(_ stash: Cargo) -> Int { stash.values.reduce(0) { $0 + max(0, $1) } }

    public static func applySellHaul(_ s: GameState, haul: Cargo, now: Double) -> GameState {
        haul.filter { $0.value > 0 }.sorted { $0.key < $1.key }
            .reduce(s) { applySell($0, mineralId: $1.key, amount: $1.value, now: now, clientId: .some(nil)) }
    }

    /// Cheapest ore spills first so the player keeps the valuable ore.
    public static func pickOverflow(_ haul: Cargo, overflow: Int) -> Cargo {
        guard overflow > 0 else { return [:] }
        var remaining = overflow
        var spill: Cargo = [:]
        for (id, n) in haul.filter({ $0.value > 0 }).sorted(by: { ((Minerals.byId[$0.key]?.price ?? 0), $0.key) < ((Minerals.byId[$1.key]?.price ?? 0), $1.key) }) {
            if remaining <= 0 { break }
            let take = min(n, remaining)
            spill[id] = take
            remaining -= take
        }
        return spill
    }

    /// Self-directed haul on return: sell it all, or keep up to silo capacity and sell the spill.
    public static func applyFreeHaulDisposition(_ s: GameState, haul: Cargo, disposition: HaulDisposition, now: Double) -> GameState {
        guard haul.values.contains(where: { $0 > 0 }) else { return s }
        let effective: HaulDisposition = earthStorageBuilt(s.player) ? disposition : .sell
        if effective == .sell { return applySellHaul(s, haul: haul, now: now) }
        let overflow = max(0, storedUnits(s.player.stash) - storageCapacity(s.player))
        return overflow <= 0 ? s : applySellHaul(s, haul: pickOverflow(haul, overflow: overflow), now: now)
    }

    // MARK: rockets

    public static func purchaseRefusal(_ s: GameState, rocket: RocketModel) -> String? {
        if s.screen != .rocketBuy { return "Return to the rocket blueprint before building." }
        if s.missionId == nil || s.targetId == nil { return "Choose a contract destination before building a rocket." }
        if s.player.francs < rocket.costFrancs { return "Need \(Economy.format(francs: rocket.costFrancs - s.player.francs)) more to build this rocket." }
        return nil
    }

    public static func applyPurchaseRocket(_ s: GameState, rocket: RocketModel) -> GameState {
        guard s.player.francs >= rocket.costFrancs else { return s }
        let missionId = s.missionId ?? "unassigned", targetId = s.targetId ?? "unassigned"
        let staged = StagedRocket(id: "\(rocket.id)-\(missionId)-\(targetId)-\(s.player.stagedRockets.count + 1)",
                                  rocketId: rocket.id, rocket: Rockets.config(for: rocket), location: .hangar, source: .company,
                                  missionId: missionId, targetId: targetId, deliveryTargetId: s.deliveryTargetId)
        var n = s
        n.screen = .fab
        n.rocket = staged.rocket
        n.player.francs -= rocket.costFrancs
        n.player.pendingLaunch = true
        n.player.rocketPurchaseCounts[rocket.id, default: 0] += 1
        n.player.stagedRockets.append(staged)
        n.player.selectedStagedRocketId = staged.id
        n.player.pendingRocketId = rocket.id
        n.player.pendingRocketLocation = .hangar
        n.player.pendingRocketSource = .company
        return n
    }

    public static func applySelectStaged(_ s: GameState, vehicle: StagedRocket) -> GameState {
        var n = s
        n.rocket = vehicle.rocket
        n.player.pendingLaunch = true
        n.player.pendingRocketId = vehicle.rocketId
        n.player.pendingRocketLocation = vehicle.location
        n.player.pendingRocketSource = vehicle.source
        n.player.selectedStagedRocketId = vehicle.id
        return n
    }
}

/// SSL-462: the one resource sink that closes the mining loop. Ore hauled home is spent on the
/// Laser Capacitor at Debrief and each level adds laser charges to every later mining run
/// (mirrors web `mining-upgrades.ts` + `applyBuyLaserCapacitor`).
public struct LaserCapacitorTier: Equatable, Sendable {
    public let level: Int
    public let name: String
    public let costUnits: Int
    public let bonusCharges: Int
}

public enum LaserCapacitor {
    public static let tiers: [LaserCapacitorTier] = [
        LaserCapacitorTier(level: 1, name: "Laser Capacitor I", costUnits: 6, bonusCharges: 4),
        LaserCapacitorTier(level: 2, name: "Laser Capacitor II", costUnits: 12, bonusCharges: 8),
        LaserCapacitorTier(level: 3, name: "Laser Capacitor III", costUnits: 20, bonusCharges: 12),
    ]

    public static func next(_ level: Int) -> LaserCapacitorTier? { tiers.first { $0.level == level + 1 } }
    public static func bonus(_ level: Int) -> Int { tiers.last { $0.level <= level }?.bonusCharges ?? 0 }
    public static func units(_ stash: Cargo) -> Int { stash.values.reduce(0) { $0 + max(0, $1) } }

    /// Remove `units` of ore, largest piles first. Nil if short.
    static func spend(_ stash: Cargo, units: Int) -> Cargo? {
        var out = stash
        var remaining = units
        for id in out.keys.sorted(by: { (out[$0] ?? 0, $1) > (out[$1] ?? 0, $0) }) {
            if remaining <= 0 { break }
            let take = min(max(0, out[id] ?? 0), remaining)
            out[id] = (out[id] ?? 0) - take
            remaining -= take
        }
        return remaining > 0 ? nil : out
    }

    /// `expectedLevel` makes a double tap a no-op; `reservedUnits` keeps ore a client is still owed out of the spend.
    public static func applyBuy(_ s: GameState, expectedLevel: Int, reservedUnits: Int = 0) -> GameState {
        guard s.player.laserCapacitorLevel == expectedLevel, let tier = next(expectedLevel),
              units(s.player.stash) - max(0, reservedUnits) >= tier.costUnits,
              let stash = spend(s.player.stash, units: tier.costUnits) else { return s }
        var n = s
        n.player.stash = stash.filter { $0.value > 0 }
        n.player.laserCapacitorLevel = tier.level
        return n
    }
}
