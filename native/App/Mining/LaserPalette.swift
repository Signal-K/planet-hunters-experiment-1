import Foundation
import SwiftUI
import LandnamCore

/// Per-world laser scene colours. The art lives in `laser-palettes.json` so a new world is a data entry.
/// The in-code fallback is a neutral grey field with a cyan beam, used only when the file is missing.
enum LaserPalette {
    struct Planet {
        var cx: Double
        var cy: Double
        var radius: Double
        var bands: [UInt32]
    }

    struct Spec {
        var id: String
        var skyTop: UInt32
        var skyHorizon: UInt32
        var starAlpha: Double
        var distant: UInt32
        var nearRidge: UInt32
        var ground: UInt32
        var groundDeep: UInt32
        var groundSpeck: UInt32
        var beam: UInt32
        var beamCore: UInt32
        var light: UInt32
        var lightAlpha: Double
        var dust: UInt32
        var clouds: Bool
        var terrain: String
        var planet: Planet?
    }

    /// Linear mix of two palette colours, t clamped to 0...1.
    static func mix(_ a: UInt32, _ b: UInt32, _ t: CGFloat) -> UInt32 {
        let k = max(0, min(1, t))
        func ch(_ s: UInt32) -> CGFloat { CGFloat(s & 255) }
        func lerp(_ sa: UInt32, _ sb: UInt32) -> UInt32 { UInt32((ch(sa) + (ch(sb) - ch(sa)) * k).rounded()) }
        return lerp(a >> 16, b >> 16) << 16 | lerp(a >> 8, b >> 8) << 8 | lerp(a, b)
    }

    static func color(_ v: UInt32, _ a: Double = 1) -> Color { Theme.hex(v, a) }
    static func sk(_ v: UInt32, _ a: Double = 1) -> PlatformColor { Theme.hex(v, a).sk }

    /// Neutral stand-in. Real Bennu / Mars / icy-moon art comes from the shared JSON.
    static let fallback = Spec(
        id: "bennu",
        skyTop: 0x101418, skyHorizon: 0x1C2026, starAlpha: 1,
        distant: 0x3A3A3A, nearRidge: 0x4A4A4A,
        ground: 0x454545, groundDeep: 0x2A2A2A, groundSpeck: 0x6A6A6A,
        beam: 0x5CE8FF, beamCore: 0xF4FDFF,
        light: 0x9AD4FF, lightAlpha: 0,
        dust: 0x8A8A8A, clouds: false, terrain: "rubble", planet: nil
    )

    static var bennu: Spec { named("bennu") }

    static func named(_ id: String) -> Spec { cache.palettes[id] ?? fallback }

    static func resolve(id: String, type: TargetType, archetype: TargetArchetype?) -> Spec {
        if let key = cache.worlds[id], let spec = cache.palettes[key] { return spec }
        if archetype == .icy || archetype == .gasGiant { return named("icy-moon") }
        if type == .asteroid { return named("bennu") }
        return named("mars")
    }

    private static let cache: (palettes: [String: Spec], worlds: [String: String]) = load()

    private static func load() -> (palettes: [String: Spec], worlds: [String: String]) {
        guard let url = Bundle.main.url(forResource: "laser-palettes", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let palettes = root["palettes"] as? [String: [String: Any]]
        else { return ([:], [:]) }
        var compiled: [String: Spec] = [:]
        for (id, raw) in palettes { compiled[id] = compile(id, raw) }
        let worlds = root["worlds"] as? [String: String] ?? [:]
        return (compiled, worlds)
    }

    private static func compile(_ id: String, _ raw: [String: Any]) -> Spec {
        var planet: Planet?
        if let p = raw["planet"] as? [String: Any], let bands = p["bands"] as? [String] {
            planet = Planet(
                cx: num(p["cx"], 0.78),
                cy: num(p["cy"], 0.34),
                radius: num(p["radius"], 0.42),
                bands: bands.map(u32)
            )
        }
        return Spec(
            id: id,
            skyTop: u32(raw["skyTop"] as? String),
            skyHorizon: u32(raw["skyHorizon"] as? String),
            starAlpha: num(raw["starAlpha"]),
            distant: u32(raw["distant"] as? String),
            nearRidge: u32(raw["nearRidge"] as? String),
            ground: u32(raw["ground"] as? String),
            groundDeep: u32(raw["groundDeep"] as? String),
            groundSpeck: u32(raw["groundSpeck"] as? String),
            beam: u32(raw["beam"] as? String),
            beamCore: u32(raw["beamCore"] as? String),
            light: u32(raw["light"] as? String),
            lightAlpha: num(raw["lightAlpha"]),
            dust: u32(raw["dust"] as? String),
            clouds: (raw["clouds"] as? NSNumber)?.boolValue ?? false,
            terrain: raw["terrain"] as? String ?? "rubble",
            planet: planet
        )
    }

    private static func num(_ value: Any?, _ fallback: Double = 0) -> Double {
        (value as? NSNumber)?.doubleValue ?? fallback
    }

    private static func u32(_ s: String?) -> UInt32 {
        guard let s else { return 0 }
        return UInt32(s.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0
    }
}
