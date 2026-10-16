import Foundation

/// SSL-553: returning the minerals. Mirrors web `HomeDeliverySystem`.
/// Back on the Earth pad every unit of the haul goes to the client, the underground silo, or the market.
/// The haul is already in the stash (the return leg stashes it), so settling only takes units out again.
public enum HomeDelivery {
    public enum Destination: String, CaseIterable, Sendable { case client, silo, sell }
    public struct Row: Equatable, Sendable {
        public var client = 0, silo = 0, sell = 0
        public init(client: Int = 0, silo: Int = 0, sell: Int = 0) { self.client = client; self.silo = silo; self.sell = sell }
        public subscript(_ d: Destination) -> Int {
            get { switch d { case .client: client; case .silo: silo; case .sell: sell } }
            set { switch d { case .client: client = newValue; case .silo: silo = newValue; case .sell: sell = newValue } }
        }
        public var total: Int { client + silo + sell }
    }
    public typealias Split = [String: Row]

    /// Units the contract wants per mineral (empty for self-directed hauls).
    public static func demand(_ mission: Mission?, cargo: Cargo) -> Cargo {
        guard let mission, mission.client != nil else { return [:] }
        return (mission.construction?.requiredMaterials ?? mission.requires.minerals).filter { $0.value > 0 }
    }

    public struct Silo: Equatable, Sendable { public var capacity: Int; public var used: Int; public var free: Int; public var built: Bool }
    /// Free silo room for this haul; the haul already sits in the stash so it does not count against the room.
    public static func silo(_ p: Player, cargo: Cargo) -> Silo {
        let built = Market.earthStorageBuilt(p)
        let capacity = built ? Market.storageCapacity(p) : 0
        let used = max(0, Market.storedUnits(p.stash) - Market.storedUnits(cargo))
        return Silo(capacity: capacity, used: used, free: max(0, capacity - used), built: built)
    }

    /// Contract first, then the silo, then sell the rest.
    public static func defaultSplit(_ cargo: Cargo, demand: Cargo, siloFree: Int) -> Split {
        var split: Split = [:]
        var room = siloFree
        for id in cargo.keys.sorted() {
            let units = cargo[id] ?? 0
            guard units > 0 else { continue }
            let client = min(units, demand[id] ?? 0)
            let silo = min(units - client, room)
            room -= silo
            split[id] = Row(client: client, silo: silo, sell: units - client - silo)
        }
        return split
    }

    public static func totals(_ split: Split) -> Row {
        split.values.reduce(Row()) { Row(client: $0.client + $1.client, silo: $0.silo + $1.silo, sell: $0.sell + $1.sell) }
    }

    /// Move one unit of `id` into `to`, taking it from another choice (sell, then silo, then client).
    public static func shift(_ split: Split, id: String, to: Destination, demand: Cargo, siloFree: Int) -> Split {
        guard var row = split[id] else { return split }
        if to == .client && row.client >= (demand[id] ?? 0) { return split }
        if to == .silo && totals(split).silo >= siloFree { return split }
        guard let from = [Destination.sell, .silo, .client].first(where: { $0 != to && row[$0] > 0 }) else { return split }
        row[from] -= 1; row[to] += 1
        var n = split; n[id] = row; return n
    }

    /// Move one unit of `id` out of `from` (to the market, or to the silo when taking from sell).
    public static func release(_ split: Split, id: String, from: Destination, siloFree: Int) -> Split {
        guard var row = split[id], row[from] > 0 else { return split }
        let to: Destination = from == .sell ? (totals(split).silo < siloFree ? .silo : .sell) : .sell
        guard to != from else { return split }
        row[from] -= 1; row[to] += 1
        var n = split; n[id] = row; return n
    }

    public static func pick(_ split: Split, _ d: Destination) -> Cargo { split.compactMapValues { $0[d] > 0 ? $0[d] : nil } }

    public static func fulfilled(_ split: Split, demand: Cargo) -> Bool {
        !demand.isEmpty && demand.allSatisfy { (split[$0.key]?.client ?? 0) >= $0.value }
    }

    public static func clientPayout(_ mission: Mission?, split: Split, demand: Cargo, missionsDone: Int) -> Int {
        guard let mission, fulfilled(split, demand: demand) else { return 0 }
        return MissionGenerator.calibrateOnboardingPayout(raw: mission.payout.francs, missionsDone: missionsDone)
    }

    public static func marketValue(_ p: Player, units: Cargo, now: Double) -> Int {
        units.reduce(0) { $0 + Market.unitPrice($1.key, player: p, clientId: nil, now: now).price * $1.value }
    }

    /// Settle the market share (sold out of the stash) and leave silo units in place. Returns the client share for the debrief ledger.
    public static func apply(_ s: GameState, split: Split, now: Double) -> (state: GameState, consumed: Cargo) {
        var n = Market.applySellHaul(s, haul: pick(split, .sell), now: now)
        n.player.homeDeliveryPending = false
        n.player.cargoSettledOffworld = true
        n.player.freeHaulDisposition = nil
        return (n, pick(split, .client))
    }
}
