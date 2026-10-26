import SwiftUI
import LandnamCore

/// Meteor-shower weather for the base sky (SSL-521). Mirrors web MeteorShowerWeather:
/// thin 2pt pixel streaks with fading tails, stepped on a fixed grid, no orange.
struct MeteorShowerWeather: View {
    @Environment(GameStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private static let count = 4
    private static let px: CGFloat = 2
    private static let trail: [(Double, Color)] = [
        (1, Color(red: 0.95, green: 0.97, blue: 1)), (1, Color(red: 0.95, green: 0.97, blue: 1)),
        (1, Color(red: 0.81, green: 0.90, blue: 1)), (1, Color(red: 0.81, green: 0.90, blue: 1)),
        (1, Color(red: 0.61, green: 0.78, blue: 0.95)),
        (0.7, Color(red: 0.44, green: 0.64, blue: 0.85)),
        (0.35, Color(red: 0.29, green: 0.50, blue: 0.72)),
    ]

    var body: some View {
        if SkyEvents.activePreset(at: store.now) != nil {
            TimelineView(.animation(minimumInterval: 1.0 / 12, paused: reduceMotion)) { ctx in
                let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
                Canvas { gc, size in
                    var seed: UInt64 = 1021
                    func rnd() -> Double { seed = (seed &* 1103515245 &+ 12345) & 0x7fffffff; return Double(seed) / Double(0x7fffffff) }
                    for i in 0..<Self.count {
                        let dur = 8 + rnd() * 6
                        let left = 0.30 + rnd() * 0.68
                        let top = 0.02 + rnd() * 0.26
                        let phase = ((t / dur) + Double(i) / Double(Self.count)).truncatingRemainder(dividingBy: 1)
                        guard phase < 0.22 else { continue }
                        let f = phase / 0.22
                        let steps = (f * 28).rounded(.down) / 28
                        let fade = f < 0.1 ? f / 0.1 : (f > 0.8 ? (1 - f) / 0.2 : 1)
                        let x = size.width * left - steps * 112
                        let y = size.height * 0.42 * top + steps * 76
                        for (k, (a, c)) in Self.trail.enumerated() {
                            let r = CGRect(x: (x + CGFloat(k) * Self.px).rounded(), y: (y - CGFloat(k) * Self.px).rounded(), width: Self.px, height: Self.px)
                            gc.fill(Path(r), with: .color(c.opacity(a * fade)))
                        }
                    }
                }
            }
            .allowsHitTesting(false)
        }
    }
}
