import SwiftUI
import SpriteKit
import LandnamCore

/// Cargo/charge/order HUD shared by the action scenes: bordered chips on a light scene.
private struct OrderChip: View {
    let symbol: String, have: Int, need: Int, color: Color
    var body: some View {
        HStack(spacing: 6) {
            Text(symbol).font(AppFont.display(14)).foregroundStyle(Theme.ink)
                .frame(width: 26, height: 22).background(color.opacity(0.35), in: RoundedRectangle(cornerRadius: 5))
            Text("\(min(have, need))/\(need)").font(AppFont.mono(14)).foregroundStyle(have >= need ? Theme.teal : Theme.ink)
        }
        .padding(.vertical, 5).padding(.horizontal, 7)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(have >= need ? Theme.teal : Theme.border, lineWidth: 1.5))
    }
}

struct TransitScreen: View {
    @Environment(GameStore.self) private var store
    @State private var showSettings = false
    private let zones = HUDZones.standard

    var body: some View {
        GeometryReader { outer in
            let insets = outer.safeAreaInsets
            TimelineView(.animation(minimumInterval: 0.25)) { ctx in
                let start = store.player.transitStartedAt ?? store.now
                let end = store.player.arrivalAt ?? start
                let p = end > start ? min(1, max(0, (ctx.date.timeIntervalSince1970 * 1000 - start) / (end - start))) : 1
                ZStack(alignment: .topLeading) {
                    FlightWorldScene(progress: p, returning: store.player.returningToEarth ?? false)
                    HudGearClock(onSettings: { showSettings = true })
                        .padding(.leading, insets.leading + zones.topLeft.inset).padding(.top, insets.top + zones.topLeft.inset)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    HudChips(francs: store.player.francs)
                        .padding(.trailing, insets.trailing + zones.topRight.inset).padding(.top, insets.top + zones.topRight.inset)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    VStack(spacing: 24) {
                        FlightProgressBar(value: p)
                        BaseDock(tile: 44, zones: zones.dock, items: [
                            (p >= 1 ? "Arrive" : "Boost", p >= 1 ? "flag.fill" : "bolt.fill", { if p >= 1 { store.transitArrived() } }),
                            ("Hub", "dot.radiowaves.left.and.right", { store.go(.instrumentHub) }),
                        ])
                    }
                    .padding(.bottom, insets.bottom + zones.dock.bottomInset)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                }
            }
        }
        .background(Color(red: 0.05, green: 0.04, blue: 0.16).ignoresSafeArea())
        .sheet(isPresented: $showSettings) { SettingsSheet(onClose: { showSettings = false }) }
    }
}

/// Slim transit progress bar that sits above the dock.
struct FlightProgressBar: View {
    let value: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color(red: 0.12, green: 0.14, blue: 0.4))
                Capsule().fill(Color(red: 0.25, green: 0.5, blue: 0.95)).frame(width: max(8, g.size.width * value))
            }
        }
        .frame(width: 300, height: 8)
        .accessibilityElement().accessibilityLabel("Flight progress").accessibilityValue("\(Int(value * 100)) percent")
    }
}

/// Chunky segmented progress bar matching the web HUD's outlined style.
struct ProgressTrack: View {
    let value: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 5).fill(Theme.paper2)
                RoundedRectangle(cornerRadius: 5).fill(Theme.blue).frame(width: max(6, g.size.width * value))
            }
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(Theme.border, lineWidth: 1.5))
        }.frame(height: 14)
    }
}

struct MiningScreen: View {
    @Environment(GameStore.self) private var store
    @State private var scene: MiningScene?
    @State private var field: MiningField?
    @State private var toast: String?
    @State private var confirmingScrub = false
    @State private var showSettings = false
    @State private var showGuide = false
    @State private var scrollPos = 0.5
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// SSL-411: Return stays tappable (a dead button reads as a bug) and says what is still missing.
    private func handleReturn(_ f: MiningField) {
        if f.isComplete || f.charge <= 0 {
            guard f.cargoUnits > 0 else { say("Nothing mined yet"); return }
            store.miningDone(f.cargo)
            return
        }
        let missing = f.required.keys.sorted().compactMap { id -> String? in
            let left = (f.required[id] ?? 0) - f.cargo[id, default: 0]
            return left > 0 ? "\(left) more \(Minerals.byId[id]?.name ?? id)" : nil
        }
        say("Order not filled: mine \(missing.joined(separator: " and "))")
    }

    private func say(_ msg: String) {
        toast = msg
        Task { try? await Task.sleep(for: .seconds(2.2)); if toast == msg { toast = nil } }
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                if let scene { SpriteView(scene: scene).ignoresSafeArea() }
                if let field {
                    laserChrome(field)
                }
            }
            .onAppear { if scene == nil { setup(geo.size) } }
        }
        .background(Theme.bg)
        .sheet(isPresented: $showSettings) { SettingsSheet(onClose: { showSettings = false }) }
        .sheet(isPresented: $showGuide) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Controls").font(AppFont.display(18, "Bold")).foregroundStyle(Theme.ink)
                Text("Hold an arrow or drag the slider so a chip crosses the beam, then fire.").font(AppFont.body(16)).foregroundStyle(Theme.ink)
                Button("Recharge laser") { showGuide = false; scene?.refill(); say("Laser refilled. Cargo kept.") }
                    .font(AppFont.display(16, "Bold")).frame(maxWidth: .infinity, minHeight: 44)
                Button("Scrub mission", role: .destructive) { showGuide = false; confirmingScrub = true }
                    .font(AppFont.display(16, "Bold")).frame(maxWidth: .infinity, minHeight: 44)
                Button("Close") { showGuide = false }
                    .font(AppFont.display(16, "Bold")).frame(maxWidth: .infinity, minHeight: 44)
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(Theme.paper)
        }
        .confirmationDialog("Scrub mission?", isPresented: $confirmingScrub, titleVisibility: .visible) {
            Button("Scrub mission", role: .destructive) { store.abandonMission() }
            Button("Keep mining", role: .cancel) {}
        } message: {
            Text("\(field?.cargoUnits ?? 0) units collected will be lost.")
        }
    }

    private func laserChrome(_ field: MiningField) -> some View {
        ZStack {
            VStack {
                HStack(spacing: 8) {
                    roundButton("gearshape.fill", "Settings") { showSettings = true }
                    roundButton("clock", "Controls") { showGuide = true }
                    Spacer(minLength: 8)
                    roundButton("cube.fill", "Cargo \(field.cargoUnits) of \(field.cargoCapacity)", tint: Theme.green) {
                        say("Cargo \(field.cargoUnits) of \(field.cargoCapacity)")
                    }
                    roundButton("person.2.fill", "Friends") { say("Friends open from home") }
                }
                SkyEventChip().frame(maxWidth: .infinity, alignment: .leading)
                Spacer()
            }
            .padding(12)

            HStack {
                roundButton("chevron.left", "Scroll slower") { }
                    .simultaneousGesture(DragGesture(minimumDistance: 0)
                        .onChanged { _ in scene?.setScroll(-1) }
                        .onEnded { _ in scene?.setScroll(0) })
                Spacer()
                roundButton("chevron.right", "Scroll faster") { }
                    .simultaneousGesture(DragGesture(minimumDistance: 0)
                        .onChanged { _ in scene?.setScroll(1) }
                        .onEnded { _ in scene?.setScroll(0) })
            }
            .padding(.horizontal, 12)

            VStack(spacing: 8) {
                Spacer()
                if let toast {
                    Text(toast).font(AppFont.display(14)).foregroundStyle(Theme.ink)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Theme.paper, in: Capsule())
                        .overlay(Capsule().stroke(Theme.border, lineWidth: 1.5))
                }
                Slider(value: $scrollPos, in: 0...1, onEditingChanged: { editing in
                    if !editing { scrollPos = 0.5; scene?.setScroll(0) }
                })
                .frame(maxWidth: 720, minHeight: 44)
                .onChange(of: scrollPos) { _, value in scene?.setScroll(value * 2 - 1) }
                MiningActionRow(field: field, onReturn: { handleReturn(field) }, onScrub: { confirmingScrub = true }, onFire: { scene?.fireLaser() })
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
    }

    private func roundButton(_ symbol: String, _ label: String, tint: Color = Theme.hudInk, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 18, weight: .bold)).foregroundStyle(tint)
                .frame(width: 44, height: 44)
                .background(Circle().fill(Theme.hudPanel))
                .overlay(Circle().stroke(Theme.hudInk, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private func setup(_ size: CGSize) {
        guard let target = store.target, let mission = store.mission else { return }
        let rocket = store.state.rocket
        let parts = store.catalog.parts
        let cap = parts.chassis.first { $0.id == rocket.chassis }?.cargo ?? 6
        let tier = parts.drill.first { $0.id == rocket.drill }?.tier ?? 1
        // Same charge budget as web MiningScreen: onboarding runs are generous, later runs add the Laser Capacitor bonus (SSL-462).
        let ore = mission.requires.minerals.values.reduce(0, +)
        let charges = mission.sequence <= 2
            ? max(80, ore * 16)
            : max(Skills.laserChargeCap(store.player.unlockedSkillNodes), ore * 4) + LaserCapacitor.bonus(store.player.laserCapacitorLevel)
        // Meteor-shower debris joins the field only inside its window and the player's local night (SSL-475).
        let shower = SkyEvents.activePreset(at: store.now).map { (resourceId: $0.resourceId, count: max(1, Int((SkyEvents.ratePerMinute($0, at: store.now) / 2).rounded(.up)))) }
        let f = MiningField(target: target, required: mission.requires.minerals, cargoCapacity: cap, laserTier: tier, chargeCap: charges, seed: mission.id.utf8.reduce(UInt64(14695981039346656037)) { ($0 ^ UInt64($1)) &* 1099511628211 }, debris: shower)
        let palette = LaserPalette.resolve(id: target.id, type: target.type, archetype: target.archetype)
        let s = MiningScene(field: f, size: size, palette: palette)
        s.onChange = { f in
            field = f
            for id in SkyEvents.debrisResourceIds where f.cargo[id, default: 0] > 0 { store.debrisMined(id) }
        }
        s.reducedMotion = reduceMotion
        s.onFeedback = { msg in toast = msg; Task { try? await Task.sleep(for: .seconds(1.4)); if toast == msg { toast = nil } } }
        field = f; scene = s
    }
}

/// Order lines and the fire control. Scrub stays an accessibility action so the panel matches the approved dock.
struct MiningActionRow: View {
    let field: MiningField
    let onReturn: () -> Void
    let onScrub: () -> Void
    var onFire: () -> Void = {}

    private var chargePct: Double { field.chargeCap > 0 ? Double(field.charge) / Double(field.chargeCap) : 0 }

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onReturn) {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(field.required.keys.sorted(), id: \.self) { id in
                        let need = field.required[id] ?? 0
                        let have = min(need, field.cargo[id, default: 0])
                        Text("\(Minerals.byId[id]?.name ?? id) \(have)/\(need)")
                            .font(AppFont.body(16)).foregroundStyle(Theme.ink).lineLimit(1)
                    }
                    GeometryReader { g in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Theme.paper)
                            Capsule().fill(Theme.green).frame(width: max(4, g.size.width * chargePct))
                        }
                    }.frame(height: 8)
                }
                .padding(.horizontal, 12).padding(.vertical, 8)
                .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
                .background(Theme.paper2, in: RoundedRectangle(cornerRadius: 16))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Order. Laser charge \(field.charge) of \(field.chargeCap).")
            .accessibilityAction(named: "Scrub mission", onScrub)
            Button(action: onFire) {
                Text(field.charge <= 0 ? "Depleted" : "Fire laser")
                    .font(AppFont.display(20)).foregroundStyle(Theme.ink)
                    .frame(maxWidth: .infinity, minHeight: 64)
                    .background(Theme.paper2, in: RoundedRectangle(cornerRadius: 16))
            }
            .buttonStyle(.plain)
            .disabled(field.charge <= 0)
            .accessibilityLabel("Fire laser")
        }
        .padding(10)
        .frame(maxWidth: 720)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.border, lineWidth: 1))
    }
}

/// The launch cinematic: SpriteKit scene under a Landnam-styled telemetry HUD. Skippable.
struct LaunchSequenceScreen: View {
    let variant: String
    let onFinish: () -> Void
    @State private var scene: LaunchScene?
    @State private var telemetry = LaunchTelemetry(elapsed: 0)
    @State private var done = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .top) {
                if let scene { SpriteView(scene: scene).ignoresSafeArea() }
                VStack(spacing: 8) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Eyebrow(text: telemetry.event.label)
                            Text(telemetry.clock).font(AppFont.display(34)).foregroundStyle(Theme.ink)
                        }
                        // The sky fades to space behind this readout, so it carries its own light card.
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Theme.paper.opacity(0.92), in: RoundedRectangle(cornerRadius: 12))
                        Spacer()
                        VStack(alignment: .trailing, spacing: 6) {
                            RailCard(symbol: "arrow.up") { Text("\(telemetry.altitudeKm) KM").font(AppFont.mono(14)).foregroundStyle(Theme.ink) }
                            RailCard(symbol: "speedometer") { Text("\(telemetry.speedMs) M/S").font(AppFont.mono(14)).foregroundStyle(Theme.ink) }
                        }.padding(.trailing, 4)
                    }
                    ProgressTrack(value: telemetry.progress)
                    Spacer()
                    Button { scene?.skip() } label: {
                        Text("SKIP").font(AppFont.display(14)).tracking(1.6).foregroundStyle(Theme.bluePress)
                            .padding(.horizontal, 14).padding(.vertical, 7).background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.border, lineWidth: 1.5))
                    }.buttonStyle(.plain)
                }.padding(16)
            }
            .onAppear {
                guard scene == nil else { return }
                let s = LaunchScene(size: geo.size, variant: variant)
                s.reducedMotion = reduceMotion
                s.onTelemetry = { telemetry = $0 }
                s.onComplete = { if !done { done = true; onFinish() } }
                scene = s
            }
        }
        .background(Theme.bg)
    }
}
