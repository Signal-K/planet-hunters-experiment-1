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
    @State private var scene: FlightScene?

    private var shipArt: String { "ships/ship_sr1.png" }

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation(minimumInterval: 0.25)) { ctx in
                let start = store.player.transitStartedAt ?? store.now
                let end = store.player.arrivalAt ?? start
                let p = end > start ? min(1, max(0, (ctx.date.timeIntervalSince1970 * 1000 - start) / (end - start))) : 1
                let s = scene ?? makeScene(geo.size)
                ZStack(alignment: .top) {
                    SpriteView(scene: s).ignoresSafeArea()
                    VStack(spacing: 10) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Eyebrow(text: store.player.returningToEarth ? "Returning" : "En route")
                                Text(store.player.returningToEarth ? "Earth" : (store.target?.name ?? "Target")).font(AppFont.display(24)).foregroundStyle(Theme.ink)
                            }
                            Spacer()
                        }
                        Spacer()
                        Panel {
                            HStack {
                                Eyebrow(text: p >= 1 ? "Arrived" : "Transit")
                                Spacer()
                                Text("\(Int(p * 100))%").font(AppFont.mono(14)).foregroundStyle(Theme.ink)
                            }
                            ProgressTrack(value: p)
                            PrimaryButton(title: p >= 1 ? "Arrive" : "In flight", enabled: p >= 1) { store.transitArrived() }
                        }
                    }
                    .padding(16)
                }
                .onChange(of: p) { _, new in s.progress = new }
                .onAppear { scene = s; s.progress = p }
            }
        }
        .background(Theme.bg)
    }

    private func makeScene(_ size: CGSize) -> FlightScene {
        FlightScene(size: size, returning: store.player.returningToEarth ?? false, targetName: store.target?.name ?? "Target", shipArt: shipArt)
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
    @State private var dashCharge = 1.0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .top) {
                if let scene { SpriteView(scene: scene).ignoresSafeArea() }
                if let field {
                    VStack(spacing: 10) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 2) {
                                Eyebrow(text: "Mining")
                                Text(store.target?.name ?? "Target").font(AppFont.display(24)).foregroundStyle(Theme.ink)
                            }
                            Spacer()
                            RailCard(symbol: "shippingbox") {
                                Text("\(field.cargoUnits)/\(field.cargoCapacity)").font(AppFont.mono(14)).foregroundStyle(Theme.ink)
                            }
                        }
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(field.required.keys.sorted(), id: \.self) { id in
                                    OrderChip(symbol: Minerals.byId[id]?.symbol ?? id, have: field.cargo[id, default: 0], need: field.required[id] ?? 0,
                                              color: Theme.hex(UInt32(Minerals.byId[id]?.colorHex.dropFirst() ?? "ffffff", radix: 16) ?? 0xFFFFFF))
                                }
                            }.padding(.trailing, 4).padding(.bottom, 4)
                        }
                        Spacer()
                        if let toast { Text(toast.uppercased()).font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.crimson)
                            .padding(.horizontal, 10).padding(.vertical, 6).background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.crimson, lineWidth: 1.5)) }
                        HStack(alignment: .bottom) {
                            Text("DRAG THE GROUND TO DRIVE · TAP ORE TO FIRE").font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.textDim)
                                .padding(.horizontal, 8).padding(.vertical, 5).background(Theme.paper.opacity(0.85), in: Capsule())
                            Spacer()
                            DashButton(charge: dashCharge) { scene?.dash() }
                        }
                        Panel {
                            HStack {
                                Eyebrow(text: "Laser charge")
                                Spacer()
                                Text("\(field.charge)/\(field.chargeCap)").font(AppFont.mono(14))
                            }
                            ProgressTrack(value: Double(field.charge) / Double(max(1, field.chargeCap)))
                            PrimaryButton(title: field.isComplete ? "Contract filled · Return" : "Return to Earth", enabled: field.cargoUnits > 0) {
                                store.miningDone(field.cargo)
                            }
                        }
                    }.padding(16)
                }
            }
            .onAppear { if scene == nil { setup(geo.size) } }
        }
        .background(Theme.bg)
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
        let f = MiningField(target: target, required: mission.requires.minerals, cargoCapacity: cap, laserTier: tier, chargeCap: charges, seed: mission.id.utf8.reduce(UInt64(14695981039346656037)) { ($0 ^ UInt64($1)) &* 1099511628211 })
        let s = MiningScene(field: f, size: size)
        s.onChange = { field = $0 }
        s.reducedMotion = reduceMotion
        s.onDash = { dashCharge = $0 }
        s.onFeedback = { msg in toast = msg; Task { try? await Task.sleep(for: .seconds(1.4)); if toast == msg { toast = nil } } }
        field = f; scene = s
    }
}

/// Round dash button with a recharge ring, bottom-right of the mining HUD.
struct DashButton: View {
    let charge: Double
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            ZStack {
                Circle().fill(Theme.paper)
                Circle().trim(from: 0, to: charge).stroke(charge >= 1 ? Theme.teal : Theme.blue, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90)).padding(3)
                Image(systemName: "bolt.fill").font(.system(size: 20, weight: .bold)).foregroundStyle(charge >= 1 ? Theme.teal : Theme.textMuted)
            }
            .frame(width: 58, height: 58)
            .overlay(Circle().stroke(Theme.border, lineWidth: 1.5))
            .background(Circle().fill(Theme.blue).offset(x: 3, y: 3))
        }
        .buttonStyle(.plain).disabled(charge < 1)
        .keyboardShortcut(.space, modifiers: [])
        .accessibilityLabel("Dash")
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
                        Spacer()
                        VStack(alignment: .trailing, spacing: 6) {
                            RailCard(symbol: "arrow.up") { Text("\(telemetry.altitudeKm) KM").font(AppFont.mono(14)).foregroundStyle(Theme.ink) }
                            RailCard(symbol: "speedometer") { Text("\(telemetry.speedMs) M/S").font(AppFont.mono(14)).foregroundStyle(Theme.ink) }
                        }.padding(.trailing, 4)
                    }
                    ProgressTrack(value: telemetry.progress)
                    Spacer()
                    Button { scene?.skip() } label: {
                        Text("SKIP").font(AppFont.display(14)).tracking(1.6).foregroundStyle(Theme.blue)
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
