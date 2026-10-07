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
    @State private var confirmingScrub = false
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
                        SkyEventChip().frame(maxWidth: .infinity, alignment: .leading)
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
                        MiningActionRow(field: field, onReturn: { handleReturn(field) }, onScrub: { confirmingScrub = true })
                    }.padding(16)
                }
            }
            .onAppear { if scene == nil { setup(geo.size) } }
        }
        .background(Theme.bg)
        .confirmationDialog("Scrub mission?", isPresented: $confirmingScrub, titleVisibility: .visible) {
            Button("Scrub mission", role: .destructive) { store.abandonMission() }
            Button("Keep mining", role: .cancel) {}
        } message: {
            Text("\(field?.cargoUnits ?? 0) units collected will be lost.")
        }
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
        let s = MiningScene(field: f, size: size)
        s.onChange = { f in
            field = f
            for id in SkyEvents.debrisResourceIds where f.cargo[id, default: 0] > 0 { store.debrisMined(id) }
        }
        s.reducedMotion = reduceMotion
        s.onDash = { dashCharge = $0 }
        s.onFeedback = { msg in toast = msg; Task { try? await Task.sleep(for: .seconds(1.4)); if toast == msg { toast = nil } } }
        field = f; scene = s
    }
}

/// SSL-411 action row: one Return button that carries order progress and laser charge, plus a ... menu for rare actions.
struct MiningActionRow: View {
    let field: MiningField
    let onReturn: () -> Void
    let onScrub: () -> Void

    private var ready: Bool { field.isComplete || field.charge <= 0 }
    private var need: Int { field.required.values.reduce(0, +) }
    private var have: Int { field.required.reduce(0) { $0 + min($1.value, field.cargo[$1.key, default: 0]) } }

    var body: some View {
        HStack(spacing: 10) {
            Button(action: onReturn) {
                VStack(spacing: 4) {
                    Text(ready ? (field.isComplete ? "CONTRACT FILLED · RETURN" : "OUT OF CHARGE · RETURN") : "FILL ORDER TO RETURN")
                        .font(AppFont.display(14, "Bold")).tracking(1.0).lineLimit(1).minimumScaleFactor(0.9)
                    HStack(spacing: 6) {
                        Image(systemName: "bolt.fill").font(.system(size: 14))
                        Text("\(field.charge)/\(field.chargeCap)").font(AppFont.mono(14))
                        Text("· ORDER \(have)/\(need)").font(AppFont.mono(14))
                    }
                    ProgressTrack(value: need > 0 ? Double(have) / Double(need) : 0)
                }
                .foregroundStyle(ready ? Color.white : Theme.ink)
                .padding(.horizontal, 12).padding(.vertical, 8)
                .frame(maxWidth: .infinity, minHeight: 56)
                .background(ready ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 2))
                .background(RoundedRectangle(cornerRadius: 8).fill(Theme.blue).offset(x: 3, y: 3))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Return to Earth. Order \(have) of \(need). Laser charge \(field.charge) of \(field.chargeCap).")
            Menu {
                Button("Scrub mission", role: .destructive, action: onScrub)
            } label: {
                Image(systemName: "ellipsis").font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.ink)
                    .frame(width: 48, height: 56)
                    .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 2))
            }
            .menuStyle(.borderlessButton).menuIndicator(.hidden).fixedSize()
            .accessibilityLabel("More controls")
        }
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
