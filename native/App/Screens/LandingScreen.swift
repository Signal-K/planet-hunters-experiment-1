import SwiftUI
import LandnamCore

/// Lander leg (web `LandingScreen`). Zero taps: the sequence runs on the persisted clock and hands itself over to surface
/// work (descent) or the flight home (ascent). Back pauses at the base and the clock keeps running.
struct LandingScreen: View {
    @Environment(GameStore.self) private var store
    private let zones = HUDZones.standard

    private static func copy(_ mode: Landing.Mode) -> (active: String, ready: String, leg: String) {
        switch mode {
        case .descend: return ("DESCENDING", "TOUCHDOWN CONFIRMED", "ORBIT → SURFACE")
        case .ascend: return ("ASCENDING", "REDOCK COMPLETE", "SURFACE → ORBIT")
        }
    }

    var body: some View {
        let mode = Landing.mode(store.player)
        GeometryReader { outer in
            let wide = outer.size.width > outer.size.height
            TimelineView(.animation(minimumInterval: 0.1)) { _ in
                let now = store.now
                let p = Landing.progress(store.player, now: now)
                ZStack(alignment: wide ? .bottomLeading : .bottom) {
                    LandingWorldScene(progress: p, mode: mode)
                    plate(mode: mode, progress: p, remainingMs: Landing.remainingMs(store.player, now: now))
                        .frame(maxWidth: wide ? 340 : 480)
                        .padding(.horizontal, 16)
                        .padding(.bottom, outer.safeAreaInsets.bottom + zones.dock.bottomInset)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Theme.ink.ignoresSafeArea())
        .task(id: mode) { await handOff() }
    }

    /// Waits out the clock, then lands or re-docks. A run with no mission left has nothing to land, so it goes home.
    private func handOff() async {
        guard store.mission != nil, store.target != nil else { store.go(.hub); return }
        let wait = Landing.remainingMs(store.player, now: store.now)
        if wait > 0 { try? await Task.sleep(for: .milliseconds(Int(wait.rounded(.up)))) }
        guard !Task.isCancelled, store.screen == .landing else { return }
        store.landingComplete()
    }

    private func plate(mode: Landing.Mode, progress p: Double, remainingMs: Double) -> some View {
        let ready = p >= 1
        let c = Self.copy(mode)
        let secs = Int((remainingMs / 1000).rounded(.up))
        return VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(ready ? c.ready : c.active).font(AppFont.display(14)).tracking(14 * 0.14)
                    Text(store.target?.name ?? "").font(AppFont.body(16)).lineLimit(1)
                }
                Spacer(minLength: 8)
                Text(ready ? "READY" : String(format: "%02d:%02d", secs / 60, secs % 60))
                    .font(AppFont.mono(16)).monospacedDigit()
            }
            ProgressTrack(value: p)
                .accessibilityElement().accessibilityLabel(c.leg).accessibilityValue("\(Int((p * 100).rounded())) percent")
            HStack(spacing: 8) {
                Text(c.leg).font(AppFont.display(14)).tracking(14 * 0.14).foregroundStyle(Theme.textMuted)
                Text("\(Int((p * 100).rounded()))%").font(AppFont.mono(14)).monospacedDigit()
                Spacer(minLength: 8)
                Button("BACK") { store.go(.hub) }
                    .font(AppFont.display(14)).tracking(1.1)
                    .buttonStyle(.plain)
                    .frame(minWidth: 64, minHeight: 44)
                    .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                    .accessibilityHint("Pauses at the base. The lander keeps going.")
            }
        }
        .foregroundStyle(Theme.ink)
        .padding(12)
        .background(Theme.paper)
        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
    }
}
