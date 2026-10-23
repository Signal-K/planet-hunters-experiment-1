import SwiftUI
import LandnamCore

/// Cargo hand-off at the client's berth (web `DeliveryScreen`, timed unload). Zero taps: the unload runs on the
/// persisted clock and hands itself over to the flight home. Back pauses at the base and the clock keeps running.
struct DeliveryScreen: View {
    @Environment(GameStore.self) private var store
    private let zones = HUDZones.standard

    var body: some View {
        let rows = Delivery.orderedCargo(store.state.lastCargo ?? [:], mission: store.mission)
        let units = rows.reduce(0) { $0 + $1.units }
        GeometryReader { outer in
            let wide = outer.size.width > outer.size.height
            TimelineView(.animation(minimumInterval: 0.1)) { _ in
                let now = store.now
                let p = Delivery.progress(store.player, now: now)
                ZStack(alignment: wide ? .bottomLeading : .bottom) {
                    DeliveryWorldScene(progress: p, cargoUnits: units, leadingInset: wide ? 340 + 16 : 0)
                    plate(progress: p, remainingMs: Delivery.remainingMs(store.player, now: now), rows: rows, units: units)
                        .frame(maxWidth: wide ? 340 : 480)
                        .padding(.horizontal, 16)
                        .padding(.bottom, outer.safeAreaInsets.bottom + zones.dock.bottomInset)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Theme.ink.ignoresSafeArea())
        .task { await handOff() }
    }

    /// Waits out the clock, then unloads and starts the flight home (web completes 350 ms after 100%).
    private func handOff() async {
        guard store.mission != nil, store.state.deliveryTargetId != nil else { store.go(.hub); return }
        let wait = Delivery.remainingMs(store.player, now: store.now) + 350
        try? await Task.sleep(for: .milliseconds(Int(wait.rounded(.up))))
        guard !Task.isCancelled, store.screen == .delivery else { return }
        store.deliveryUnloadComplete()
    }

    private func plate(progress p: Double, remainingMs: Double, rows: [(id: String, units: Int)], units: Int) -> some View {
        let done = p >= 1
        let secs = Int((remainingMs / 1000).rounded(.up))
        let pct = Int((p * 100).rounded())
        let berth = store.catalog.target(store.state.deliveryTargetId)?.name ?? ""
        return VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(done ? "TRANSFER VERIFIED" : "UNLOAD IN PROGRESS").font(AppFont.display(14)).tracking(14 * 0.14)
                    Text(berth.isEmpty ? (store.mission?.title ?? "") : "\(berth) · \(store.mission?.title ?? "")")
                        .font(AppFont.body(16)).lineLimit(1)
                }
                Spacer(minLength: 8)
                Text(done ? "SECURED" : String(format: "%02d:%02d", secs / 60, secs % 60))
                    .font(AppFont.mono(16)).monospacedDigit()
            }
            ProgressTrack(value: p)
                .accessibilityElement().accessibilityLabel("Ship hold to client depot").accessibilityValue("\(pct) percent")
            HStack(spacing: 8) {
                Text("HOLD → DEPOT").font(AppFont.display(14)).tracking(14 * 0.14).foregroundStyle(Theme.textMuted)
                Text("\(pct)%").font(AppFont.mono(14)).monospacedDigit()
                Spacer(minLength: 8)
                Text("\(max(0, Int((Double(units) * (1 - p)).rounded()))) U LEFT").font(AppFont.mono(14)).monospacedDigit()
            }
            ForEach(rows, id: \.id) { row in
                let meta = Minerals.byId[row.id]
                HStack(spacing: 8) {
                    Rectangle().fill(Color(hex: meta?.colorHex) ?? Theme.paper2).frame(width: 12, height: 12)
                        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 1))
                    Text(meta?.name ?? row.id).font(AppFont.body(14))
                    Spacer(minLength: 8)
                    Text("\(row.units) U").font(AppFont.mono(14)).monospacedDigit()
                }
            }
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("TRANSPORT FEE").font(AppFont.display(14)).tracking(14 * 0.14)
                    Text("Settles at the Earth debrief").font(AppFont.body(14)).foregroundStyle(Theme.textMuted)
                }
                Spacer(minLength: 8)
                Text(Economy.format(francs: Delivery.transportFee(store.mission))).font(AppFont.mono(16)).monospacedDigit()
                Button("BACK") { store.go(.hub) }
                    .font(AppFont.display(14)).tracking(1.1)
                    .buttonStyle(.plain)
                    .frame(minWidth: 64, minHeight: 44)
                    .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                    .accessibilityHint("Pauses at the base. The unload keeps going.")
            }
        }
        .foregroundStyle(Theme.ink)
        .padding(12)
        .background(Theme.paper)
        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
    }
}
