import SwiftUI
import LandnamCore

/// Orionids meteor-shower weather for the base sky (SSL-521). Mirrors web MeteorShowerWeather:
/// 4pt pixel streaks stepped on a fixed grid, blue on the dusk sky, no orange.
struct MeteorShowerWeather: View {
    @Environment(GameStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private static let count = 7
    private static let px: CGFloat = 4
    private static let trail: [Double] = [1, 1, 0.8, 0.8, 0.5, 0.5, 0.25, 0.25]

    var body: some View {
        if SkyEvents.activePreset(at: store.now)?.eventId == "orionids-2026" {
            TimelineView(.animation(minimumInterval: 1.0 / 12, paused: reduceMotion)) { ctx in
                let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
                Canvas { gc, size in
                    var seed: UInt64 = 1021
                    func rnd() -> Double { seed = (seed &* 1103515245 &+ 12345) & 0x7fffffff; return Double(seed) / Double(0x7fffffff) }
                    for i in 0..<Self.count {
                        let dur = 5 + rnd() * 5
                        let left = 0.18 + rnd() * 0.8
                        let top = 0.02 + rnd() * 0.30
                        let phase = ((t / dur) + Double(i) / Double(Self.count)).truncatingRemainder(dividingBy: 1)
                        guard phase < 0.38 else { continue }
                        let f = phase / 0.38
                        let steps = (f * 24).rounded(.down) / 24
                        let fade = f < 0.1 ? f / 0.1 : (f > 0.8 ? (1 - f) / 0.2 : 1)
                        let x = size.width * left - steps * 220
                        let y = size.height * 0.55 * top + steps * 220
                        for (k, a) in Self.trail.enumerated() {
                            let r = CGRect(x: (x + CGFloat(k) * Self.px).rounded(), y: (y - CGFloat(k) * Self.px).rounded(), width: Self.px, height: Self.px)
                            gc.fill(Path(r), with: .color(Theme.blueBright.opacity(a * fade)))
                        }
                    }
                }
            }
            .allowsHitTesting(false)
        }
    }
}
