import SwiftUI
import LandnamCore
import TakeonKit

/// Cargo hand-off at the client's berth (web `DeliveryScreen`). Normally zero taps: the unload runs on the persisted
/// clock and hands itself over to the flight home. The transport lesson (`Dropoff`) is driven instead: take the Mule
/// rover to the depot, dump the cargo, return the rover. Back pauses at the base either way.
/// With the Go runtime linked the lesson runs on the Takeon field like web (seeded cache and hold); without it, on the
/// berth scene's rover lane.
struct DeliveryScreen: View {
    @Environment(GameStore.self) private var store
    @State private var dropoff: Dropoff
    /// The lesson's Takeon field, made on first appearance (or passed in by snapshots). Never saved, as on web.
    @State private var field: TakeonSceneModel?
    private let zones = HUDZones.standard
    /// The empty rover's drive back to the ship before the hand-off.
    private static let returnSeconds = 1.2

    /// Snapshot tests pass a lesson already under way; the app starts with the rover at the ship.
    /// Snapshots of the lane fallback pass `useField: false` on builds that link the runtime.
    private let useField: Bool

    init(dropoff: Dropoff = Dropoff(), field: TakeonSceneModel? = nil, useField: Bool = takeonGoRuntimeAvailable) {
        _dropoff = State(initialValue: dropoff)
        _field = State(initialValue: field)
        self.useField = useField
    }

    private var takeonLesson: Bool { useField && takeonGoRuntimeAvailable && field?.failure == nil }

    var body: some View {
        let rows = Delivery.orderedCargo(store.state.lastCargo ?? [:], mission: store.mission)
        let units = rows.reduce(0) { $0 + $1.units }
        let lesson = Dropoff.applies(store.player)
        GeometryReader { outer in
            let wide = outer.size.width > outer.size.height
            let inset: CGFloat = wide ? 340 + 16 : 0
            ZStack(alignment: wide ? .bottomLeading : .bottom) {
                if lesson && takeonLesson {
                    if let field { takeonField(field) } else { Theme.ink.onAppear { field = makeField() } }
                    lessonPlate(rows: rows, units: units)
                        .frame(maxWidth: wide ? 340 : 480)
                        .padding(.horizontal, 16)
                        .padding(.bottom, outer.safeAreaInsets.bottom + zones.dock.bottomInset)
                } else if lesson {
                    DeliveryWorldScene(progress: 0, cargoUnits: units, leadingInset: inset, rover: dropoff.rover,
                                       dumped: dropoff.stage != .driving, onTapLane: { f in drive { $0.drive(to: f) } })
                    lessonPlate(rows: rows, units: units)
                        .frame(maxWidth: wide ? 340 : 480)
                        .padding(.horizontal, 16)
                        .padding(.bottom, outer.safeAreaInsets.bottom + zones.dock.bottomInset)
                } else {
                    TimelineView(.animation(minimumInterval: 0.1)) { _ in
                        let now = store.now
                        let p = Delivery.progress(store.player, now: now)
                        ZStack(alignment: wide ? .bottomLeading : .bottom) {
                            DeliveryWorldScene(progress: p, cargoUnits: units, leadingInset: inset)
                            plate(progress: p, remainingMs: Delivery.remainingMs(store.player, now: now), rows: rows, units: units)
                                .frame(maxWidth: wide ? 340 : 480)
                                .padding(.horizontal, 16)
                                .padding(.bottom, outer.safeAreaInsets.bottom + zones.dock.bottomInset)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Theme.ink.ignoresSafeArea())
        .task { await handOff(lesson: lesson) }
        .task(id: dropoff.stage) { await lessonHandOff() }
    }

    /// Waits out the clock, then unloads and starts the flight home (web completes 350 ms after 100%).
    private func handOff(lesson: Bool) async {
        guard store.mission != nil, store.state.deliveryTargetId != nil else { store.go(.hub); return }
        guard !lesson else { return }
        let wait = Delivery.remainingMs(store.player, now: store.now) + 350
        try? await Task.sleep(for: .milliseconds(Int(wait.rounded(.up))))
        guard !Task.isCancelled, store.screen == .delivery else { return }
        store.deliveryUnloadComplete()
    }

    /// Once the rover is back aboard, launch for Earth (web completes 350 ms after the redock).
    private func lessonHandOff() async {
        guard dropoff.stage == .returned else { return }
        // The lane rover drives home first; the Takeon rover is redocked at once, as on web.
        try? await Task.sleep(for: .milliseconds(Int((takeonLesson ? 0 : Self.returnSeconds) * 1000) + 350))
        guard !Task.isCancelled, store.screen == .delivery else { return }
        store.deliveryUnloadComplete()
    }

    /// Web mounts the drop-off on the delivery target's Takeon body, seeded from the mission id.
    private func makeField() -> TakeonSceneModel {
        let target = store.catalog.target(store.state.deliveryTargetId)
        let m = TakeonSceneModel(target: TakeonMapping.body(for: target),
                                 seed: TakeonMapping.stableSeed("tutorial-delivery-\(store.mission?.id ?? "")"), persist: false)
        m.seedDropoff(TakeonMapping.cargo(Cargo(uniqueKeysWithValues: Delivery.orderedCargo(store.state.lastCargo ?? [:], mission: store.mission).map { ($0.id, $0.units) })))
        return m
    }

    /// The iso field, stepped like the rover survey. The cache carries web's lock-on marker until the cargo is in it.
    private func takeonField(_ m: TakeonSceneModel) -> some View {
        TimelineView(.animation) { tl in
            let t = tl.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                var ctx = ctx
                if let st = m.state, let tr = m.terrain {
                    TakeonIsoRenderer(terrain: tr, state: st, selected: dropoff.stage == .driving ? st.caches?.first : nil, time: t)
                        .draw(&ctx, size: size)
                }
            }
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
        .task {
            var last = ContinuousClock.now
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(50))
                let now = ContinuousClock.now
                let d = (now - last).components
                last = now
                m.tick(dt: min(0.25, Double(d.seconds) + Double(d.attoseconds) / 1e18))
            }
        }
    }

    private func dump(units: Int) {
        if let field, takeonLesson {
            let moved = field.deposit()
            drive { $0.dump(cargoUnits: units, nearCache: moved > 0) }
        } else {
            drive { $0.dump(cargoUnits: units) }
        }
    }

    private func drive(_ change: (inout Dropoff) -> Void) {
        withAnimation(.easeInOut(duration: 0.45)) { change(&dropoff) }
    }

    // MARK: plates

    private var berthLine: String {
        let berth = store.catalog.target(store.state.deliveryTargetId)?.name ?? ""
        return berth.isEmpty ? (store.mission?.title ?? "") : "\(berth) · \(store.mission?.title ?? "")"
    }

    private func header(_ kicker: String, status: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(kicker).font(AppFont.display(14)).tracking(14 * 0.14)
                Text(berthLine).font(AppFont.body(16)).lineLimit(1)
            }
            Spacer(minLength: 8)
            Text(status).font(AppFont.mono(16)).monospacedDigit()
        }
    }

    private func manifest(_ rows: [(id: String, units: Int)]) -> some View {
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
    }

    private var backButton: some View {
        Button("BACK") { store.go(.hub) }
            .font(AppFont.display(14)).tracking(1.1)
            .buttonStyle(.plain)
            .frame(minWidth: 64, minHeight: 44)
            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
    }

    private func fee(hint: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text("TRANSPORT FEE").font(AppFont.display(14)).tracking(14 * 0.14)
                Text("Settles at the Earth debrief").font(AppFont.body(14)).foregroundStyle(Theme.textMuted)
            }
            Spacer(minLength: 8)
            Text(Economy.format(francs: Delivery.transportFee(store.mission))).font(AppFont.mono(16)).monospacedDigit()
            backButton.accessibilityHint(hint)
        }
    }

    private func framed<V: View>(@ViewBuilder _ content: () -> V) -> some View {
        VStack(alignment: .leading, spacing: 8, content: content)
            .foregroundStyle(Theme.ink)
            .padding(12)
            .background(Theme.paper)
            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
    }

    private func plate(progress p: Double, remainingMs: Double, rows: [(id: String, units: Int)], units: Int) -> some View {
        let done = p >= 1
        let secs = Int((remainingMs / 1000).rounded(.up))
        let pct = Int((p * 100).rounded())
        return framed {
            header(done ? "TRANSFER VERIFIED" : "UNLOAD IN PROGRESS", status: done ? "SECURED" : String(format: "%02d:%02d", secs / 60, secs % 60))
            ProgressTrack(value: p)
                .accessibilityElement().accessibilityLabel("Ship hold to client depot").accessibilityValue("\(pct) percent")
            HStack(spacing: 8) {
                Text("HOLD → DEPOT").font(AppFont.display(14)).tracking(14 * 0.14).foregroundStyle(Theme.textMuted)
                Text("\(pct)%").font(AppFont.mono(14)).monospacedDigit()
                Spacer(minLength: 8)
                Text("\(max(0, Int((Double(units) * (1 - p)).rounded()))) U LEFT").font(AppFont.mono(14)).monospacedDigit()
            }
            manifest(rows)
            fee(hint: "Pauses at the base. The unload keeps going.")
        }
    }

    /// Web's tutorial drop-off panel: the same manifest and fee, with the drive pad and one step button.
    private func lessonPlate(rows: [(id: String, units: Int)], units: Int) -> some View {
        let stage = dropoff.stage
        return framed {
            header(stage == .returned ? "ROVER REDOCKED" : stage == .dumped ? "MINERALS UNLOADED" : "DRIVE TO THE BUILDING SITE",
                   status: stage == .returned ? "LAUNCH READY" : stage == .dumped ? "UNLOADED" : "MANUAL")
            manifest(rows)
            fee(hint: "Pauses at the base. The rover starts again at the ship.")
            if let r = dropoff.refusal {
                Text(Dropoff.message(for: r)).font(AppFont.display(14)).tracking(1.1)
                    .accessibilityIdentifier("delivery-dump-error")
            }
            if stage == .driving, let field, takeonLesson {
                // Engine directions as seen on screen: 3 NE, 0 SE, 1 SW, 2 NW.
                HStack(spacing: 8) {
                    padButton("arrow.up.left", "Drive north west") { field.move(2) }
                    padButton("arrow.up.right", "Drive north east") { field.move(3) }
                    padButton("arrow.down.left", "Drive south west") { field.move(1) }
                    padButton("arrow.down.right", "Drive south east") { field.move(0) }
                    Spacer(minLength: 0)
                }
            }
            HStack(spacing: 8) {
                if stage == .driving {
                    if !takeonLesson {
                        padButton("chevron.left", "Drive toward the ship") { drive { $0.drive(by: -Dropoff.step) } }
                        padButton("chevron.right", "Drive toward the depot") { drive { $0.drive(by: Dropoff.step) } }
                    }
                    PrimaryButton(title: "Dump cargo at building site") { dump(units: units) }
                        .accessibilityIdentifier("delivery-dump-cargo")
                } else {
                    PrimaryButton(title: stage == .returned ? "Rover redocked · launch ready" : "Return rover to ship", enabled: stage == .dumped) {
                        withAnimation(.easeInOut(duration: takeonLesson ? 0.2 : Self.returnSeconds)) { dropoff.returnRover() }
                    }
                    .accessibilityIdentifier("delivery-return-rover")
                }
            }
            if stage != .driving {
                Text(stage == .returned
                     ? "Rover secured. The ship is ready to launch for Earth and settle the transport fee."
                     : "Minerals delivered beside the depot. Return the empty Mule rover to the ship before launch.")
                    .font(AppFont.body(14)).foregroundStyle(Theme.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func padButton(_ symbol: String, _ label: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Image(systemName: symbol).font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.ink).frame(width: 44, height: 44)
                .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
        }.buttonStyle(.plain).accessibilityLabel(label)
    }
}
