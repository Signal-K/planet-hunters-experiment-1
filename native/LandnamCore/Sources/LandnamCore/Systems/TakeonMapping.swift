import Foundation

/// Landnam ids to Takeon ids, for screens that show Landnam cargo or targets inside a Takeon field
/// (web `lib/takeon/minerals.ts` and `takeonBodyForTarget`). Rendering only: Landnam's own cargo stays the economic truth.
public enum TakeonMapping {
    /// Web `LANDNAM_TO_TAKEON_MINERAL`. Several Landnam minerals share one Takeon resource.
    public static let resource: [String: String] = [
        "iron": "iron", "silicon": "silica", "copper": "copper", "ice": "ice",
        "rare": "crystal", "platinum": "crystal", "palladium": "crystal", "iridium": "crystal", "rhodium": "crystal",
        "gold": "crystal", "orionid_debris": "crystal", "draconid_debris": "crystal", "leonid_debris": "crystal",
        "geminid_debris": "crystal", "fireball_fragment": "crystal",
        "carbon": "stone", "nickel": "titanium", "cobalt": "alloy", "aluminium": "iron-plate", "hydrogen": "water",
        "uranium": "crystal",
    ]

    /// Web `TAKEON_BODY_BY_LANDNAM_TARGET`, falling back to `ironrock` for asteroids and `mars` otherwise.
    public static let bodies: [String: String] = [
        "bennu": "bennu", "itokawa": "ironrock", "vesta": "ceres", "ceres": "ceres", "eros": "ironrock",
        "psyche": "ironrock", "mars": "mars", "moon": "moon", "europa": "europa", "io": "io",
    ]

    public static func body(for target: Target?) -> String {
        guard let target else { return "mars" }
        return bodies[target.id] ?? (target.type == .asteroid ? "ironrock" : "mars")
    }

    /// The rover hold for a Landnam manifest. Unmapped minerals are dropped, as on web.
    public static func cargo(_ cargo: Cargo) -> [String: Double] {
        var out: [String: Double] = [:]
        for (id, units) in cargo where units > 0 {
            guard let res = resource[id] else { continue }
            out[res, default: 0] += Double(units)
        }
        return out
    }

    /// FNV-1a over the UTF-16 units, matching web's `stableSeed` (`Math.imul`, `>>> 0`).
    public static func stableSeed(_ value: String) -> UInt64 {
        var hash: UInt32 = 2_166_136_261
        for unit in value.utf16 { hash = (hash ^ UInt32(unit)) &* 16_777_619 }
        return UInt64(hash)
    }
}
