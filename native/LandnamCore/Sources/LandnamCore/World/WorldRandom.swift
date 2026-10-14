import Foundation

/// Deterministic randomness for the base world, identical to web `lib/world/rng.ts`: FNV-1a hashes a key to a
/// seed, mulberry32 draws from it. `shared/scenes/world-fixture.json` pins both platforms to the same values.
public func worldHashSeed(_ key: String) -> UInt32 {
    var h: UInt32 = 0x811c9dc5
    for unit in key.utf16 {
        h ^= UInt32(unit)
        h = h &* 0x01000193
    }
    return h
}

public struct WorldRandom: Sendable {
    private var state: UInt32

    public init(seed: UInt32) { state = seed }
    public init(key: String) { state = worldHashSeed(key) }

    /// Uniform in [0, 1).
    public mutating func next() -> Double {
        state = state &+ 0x6d2b79f5
        var t = state
        t = (t ^ (t >> 15)) &* (t | 1)
        t = t ^ (t &+ ((t ^ (t >> 7)) &* (t | 61)))
        return Double(t ^ (t >> 14)) / 4_294_967_296
    }

    public mutating func range(_ lo: Double, _ hi: Double) -> Double { lo + (hi - lo) * next() }
}
