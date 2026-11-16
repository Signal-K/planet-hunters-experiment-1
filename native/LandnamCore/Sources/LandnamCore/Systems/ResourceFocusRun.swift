import Foundation

/// SSL-840: a construction's missing materials, collected over as many mining trips as needed (port of the
/// `focus-resource-mining` mission in web `runtimeCatalog.ts`). Each haul comes home to the stash; the next
/// trip asks only for what is still missing, so progress survives returns and reloads with no extra state.
public enum ResourceFocusRun {
    public static let missionId = "focus-resource-mining"
    /// The board tab that lists programme runs (`MissionsScreen` tab 3, the Free run board).
    public static let boardTab = 3

    /// What the focused construction still needs beyond the stash.
    public static func missing(_ p: Player) -> Cargo {
        (p.resourceFocus?.minerals ?? [:]).reduce(into: Cargo()) { out, entry in
            let left = entry.value - p.stash[entry.key, default: 0]
            if left > 0 { out[entry.key] = left }
        }
    }

    /// The focus run while materials are missing, or while a run is in flight (mining fills the stash mid-run,
    /// so a resume after the goal is met must still resolve the mission).
    public static func mission(_ p: Player, activeMissionId: String?) -> Mission? {
        let need = missing(p)
        let active = activeMissionId == missionId
        guard (p.resourceFocus != nil && !need.isEmpty) || active else { return nil }
        let label = p.resourceFocus?.label ?? "construction"
        return Mission(id: missionId, title: "Materials for \(label)",
                       brief: "Collect the missing materials for \(label) over as many trips as needed. Return each haul to Base and store it for construction.",
                       client: nil, tag: "RESOURCE", difficulty: "L1", locked: false, sequence: p.missionsDone + 1,
                       unlockAt: "Add a construction requirement to focus", targetId: nil, deliveryTargetId: nil,
                       // A long-term goal, not a single-flight order: a ship only needs room for one piece to start.
                       requires: MissionRequirements(minerals: need, cargoMin: need.isEmpty ? 0 : 1, drillTier: 1, maxOrbit: 8),
                       payout: MissionPayout(francs: 0, affinity: 0), construction: nil, payload: nil, programReward: nil)
    }

    /// Sets the focus. Returns false when nothing is short, so the caller need not open the board.
    @discardableResult
    public static func focus(_ p: inout Player, label: String, materials: Cargo) -> Bool {
        let short = materials.contains { p.stash[$0.key, default: 0] < $0.value }
        guard short else { return false }
        p.resourceFocus = ResourceFocus(label: label, minerals: materials)
        return true
    }
}
