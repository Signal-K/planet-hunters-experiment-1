import Foundation

/// Cargo hand-off at the client's berth (web `lib/systems/DeliverySystem.ts` and `DeliveryScreen`).
/// The unload runs on a persisted clock, so a resumed or synced save picks it up where it was.
public enum Delivery {
    public static let unloadMs = Economy.deliveryUnloadMs

    /// 0...1. An unload reopened with no clock is already due, so it can never stall (web shows 0% and waits).
    public static func progress(_ p: Player, now: Double) -> Double {
        guard let start = p.deliveryUnloadStartedAt, start.isFinite else { return 1 }
        return min(1, max(0, (now - start) / unloadMs))
    }

    public static func remainingMs(_ p: Player, now: Double) -> Double {
        guard let start = p.deliveryUnloadStartedAt, start.isFinite else { return 0 }
        return max(0, unloadMs - max(0, now - start))
    }

    /// SSL-482: only the minerals the contract ordered; leftover mining cargo is not part of this delivery.
    public static func orderedCargo(_ cargo: Cargo, mission: Mission?) -> [(id: String, units: Int)] {
        let ordered = Set(mission?.requires.minerals.keys.map { $0 } ?? [])
        return cargo.filter { $0.value > 0 && (ordered.isEmpty || ordered.contains($0.key)) }
            .sorted { $0.key < $1.key }
            .map { (id: $0.key, units: $0.value) }
    }

    /// The transport half of the payout, settled at the Earth debrief (web `transportFee`).
    public static func transportFee(_ mission: Mission?) -> Int {
        guard let francs = mission?.payout.francs else { return 0 }
        return francs - Int((Double(francs) * 0.5).rounded())
    }
}
