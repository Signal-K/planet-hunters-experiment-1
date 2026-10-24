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
    /// Untimed legs (the trip home, SSL-553) fly a short local course: ~4.4 s, and each Boost skips ahead.
    @State private var flightStart = Date()
    @State private var boost: Double = 0
    private let zones = HUDZones.standard
    private static let untimedSeconds = 4.4

    private func progress(_ date: Date) -> Double {
        if let end = store.player.arrivalAt {
            let start = store.player.transitStartedAt ?? store.now
            return end > start ? min(1, max(0, (date.timeIntervalSince1970 * 1000 - start) / (end - start))) : 1
        }
        return min(1, max(0, date.timeIntervalSince(flightStart) / Self.untimedSeconds + boost))
    }

    var body: some View {
        GeometryReader { outer in
            let insets = outer.safeAreaInsets
            TimelineView(.animation(minimumInterval: 0.25)) { ctx in
                let p = progress(ctx.date)
                ZStack(alignment: .topLeading) {
                    FlightWorldScene(progress: p, returning: store.player.returningToEarth ?? false)
                    VStack(spacing: 24) {
                        FlightProgressBar(value: p)
                        HStack(spacing: 8) {
                            Button("BACK") { store.go(.hub) }.frame(minWidth: 44, minHeight: 44)
                            Button(p >= 1 ? "ARRIVE" : "BOOST") {
                                if p >= 1 { store.transitArrived() }
                                else if store.player.arrivalAt == nil { boost += 0.14 }
                            }.frame(minWidth: 44, minHeight: 44)
                        }
                        .font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.ink)
                        .buttonStyle(.plain)
                        .padding(8)
                        .background(Theme.paper)
                        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                    }
                    .padding(.bottom, insets.bottom + zones.dock.bottomInset)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                }
            }
        }
        .background(Color(red: 0.05, green: 0.04, blue: 0.16).ignoresSafeArea())
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
    @State private var targetCue: String?
    @State private var obstacleAhead = false
    @State private var toast: String?
    @State private var laserCharging = false
    /// Orionid fragments already added to the ledger from this field's cargo (SSL-651).
    @State private var fragmentsCounted = 0
    @FocusState private var keysFocused: Bool
    @State private var confirmingScrub = false
    @State private var showSettings = false
    @State private var showGuide = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// SSL-411: Return stays tappable (a dead button reads as a bug) and says what is still missing.
    private func handleReturn(_ f: MiningField) {
        // SSL-651: a shower run whose fragments are caught (launch plus mined) is filled; leaving early pays it.
        let showerFilled = store.mission?.id == OrionidsRun.missionId && OrionidsRun.filled(store.player)
        if f.isComplete || f.charge <= 0 || showerFilled {
            guard f.cargoUnits > 0 || showerFilled else { say("Nothing mined yet"); return }
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
                if let field, !showGuide {
                    laserChrome(field, insets: geo.safeAreaInsets, narrow: geo.size.width < 600, short: geo.size.height < 520).ignoresSafeArea()
                }
                if showGuide {
                    MiningGuide(
                        isOrionids: store.mission?.id == OrionidsRun.missionId,
                        onRecharge: { showGuide = false; scene?.refill(); say("Laser refilled. Cargo kept.") },
                        onScrub: { showGuide = false; confirmingScrub = true },
                        onClose: { showGuide = false }
                    )
                }
            }
            .onAppear { if scene == nil { setup(geo.size) }; keysFocused = true }
            // Hardware keyboard (iOS keyboard / macOS): W/S or arrows steer altitude, A/D or arrows speed, Space/F fire while held.
            .focusable()
            .focused($keysFocused)
            .focusEffectDisabled()
            .onKeyPress(phases: [.down, .up]) { press in
                let down = press.phase == .down
                switch press.key {
                case .upArrow: scene?.setClimb(down ? -1 : 0)
                case .downArrow: scene?.setClimb(down ? 1 : 0)
                case .leftArrow: scene?.setSteer(down ? -1 : 0)
                case .rightArrow: scene?.setSteer(down ? 1 : 0)
                case .space: scene?.setTrigger(down)
                default:
                    switch press.characters.lowercased() {
                    case "w": scene?.setClimb(down ? -1 : 0)
                    case "s": scene?.setClimb(down ? 1 : 0)
                    case "a": scene?.setSteer(down ? -1 : 0)
                    case "d": scene?.setSteer(down ? 1 : 0)
                    case "f": scene?.setTrigger(down)
                    default: return .ignored
                    }
                }
                return .handled
            }
        }
        .background(Theme.bg)
        .overlay { if showSettings { SettingsSheet(onClose: { showSettings = false }) } }
        .confirmationDialog("Scrub mission?", isPresented: $confirmingScrub, titleVisibility: .visible) {
            Button("Scrub mission", role: .destructive) { store.abandonMission() }
            Button("Keep mining", role: .cancel) {}
        } message: {
            Text("\(field?.cargoUnits ?? 0) units collected will be lost.")
        }
    }

    private func laserChrome(_ field: MiningField, insets: EdgeInsets, narrow: Bool, short: Bool = false) -> some View {
        let compact = narrow || short
        let zones = HUDZones.standard
        let trainingCue = store.player.flightPlan.currentTry == "mining" ? "Fire on a labelled seam" : nil
        let order = VStack(alignment: .leading, spacing: 6) {
            MiningActionRow(field: field, onReturn: { handleReturn(field) }, onScrub: { confirmingScrub = true }, showFire: false, targetCue: targetCue ?? trainingCue, showerCaught: store.mission?.id == OrionidsRun.missionId ? OrionidsRun.catches(store.player) : nil)
                .onLongPressGesture { showGuide = true }
        }
        .frame(maxWidth: 220)
        return ZStack {
            VStack(alignment: .leading, spacing: 8) {
                if narrow { order }
                SkyEventChip().frame(maxWidth: .infinity, alignment: .leading)
                Spacer()
            }
            .padding(.leading, insets.leading + zones.topLeft.inset).padding(.top, insets.top + zones.topLeft.inset)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

            if !narrow {
                order
                    .padding(.top, insets.top + zones.topLeft.inset)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }

            CargoMenu(field: field) { id, all in scene?.jettison(id, all: all) }
                .padding(.trailing, insets.trailing + zones.topRight.inset + 64).padding(.top, insets.top + zones.topRight.inset)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)

            // Phones: compact pad and gauge in the clear strip under the ground deposits.
            MiningDPad(onAltitude: { scene?.setClimb($0) }, onSteer: { scene?.setSteer($0) }, obstacleAhead: obstacleAhead, tile: short ? 44 : compact ? 52 : 56)
                .padding(.leading, insets.leading + 16)
                .padding(.bottom, insets.bottom + zones.dock.bottomInset + (short ? 8 : narrow ? 72 : 16))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)

            // Hint sits up top, clear of the d-pad, gauge and deposits (SSL-538 phone layout).
            if let toast {
                Text(toast).font(AppFont.display(14)).foregroundStyle(Glass.ink)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .glowPanel(Capsule())
                    .padding(.top, insets.top + zones.topLeft.inset + (narrow ? 112 : 64))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }

            // Gauge: centred on wide screens; on phones it moves right, level with the d-pad, well above the ground.
            LaserGauge(charge: field.charge, cap: field.chargeCap, charging: laserCharging, width: compact ? 160 : 260)
                .padding(.trailing, compact ? insets.trailing + 16 : 0)
                .padding(.bottom, insets.bottom + zones.dock.bottomInset + (short ? 8 : narrow ? 72 : 84))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: compact ? .bottomTrailing : .bottom)

            VStack(spacing: 8) {
                Spacer()
                BaseDock(tile: 44, zones: zones.dock, items: [
                    ("Fire", "bolt.fill", {}),
                    ("Hub", "dot.radiowaves.left.and.right", { store.go(.instrumentHub) }),
                ], onPrev: { scene?.nudge(-1) }, onNext: { scene?.nudge(1) }, holdFirst: { scene?.setTrigger($0) }, glass: true)
            }
            .padding(.bottom, insets.bottom + zones.dock.bottomInset)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
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
        // SSL-538: a full charge lasts about twice as long (matches web MAX_CHARGES * 2).
        let charges = 2 * (mission.sequence <= 2
            ? max(80, ore * 16)
            : max(Skills.laserChargeCap(store.player.unlockedSkillNodes), ore * 4) + LaserCapacitor.bonus(store.player.laserCapacitorLevel))
        // Meteor-shower debris joins the field only inside its window and the player's local night (SSL-475).
        let shower = SkyEvents.activePreset(at: store.now).map { (resourceId: $0.resourceId, count: max(1, Int((SkyEvents.ratePerMinute($0, at: store.now, location: store.player.skyEventLocation) / 2).rounded(.up)))) }
        let required = mission.id == OrionidsRun.missionId ? ["orionid_debris": max(1, OrionidsRun.fragmentGoal - OrionidsRun.catches(store.player))] : mission.requires.minerals
        let f = MiningField(target: target, required: required, cargoCapacity: cap, laserTier: tier, chargeCap: charges, seed: mission.id.utf8.reduce(UInt64(14695981039346656037)) { ($0 ^ UInt64($1)) &* 1099511628211 }, debris: shower, skyFed: mission.id == OrionidsRun.missionId ? "orionid_debris" : nil)
        let palette = LaserPalette.resolve(id: target.id, type: target.type, archetype: target.archetype)
        let s = MiningScene(field: f, size: size, palette: palette, landscapeKey: target.id)
        if mission.id == OrionidsRun.missionId, let preset = SkyEvents.activePreset(at: store.now) {
            // Shower fragments fall and bank on landing; the laser is for ore (matches web autoCollect).
            s.fragmentRain = (preset.resourceId, SkyEvents.ratePerMinute(preset, at: store.now, location: store.player.skyEventLocation))
        }
        s.showsOpsBrackets = !store.player.freeOperations && store.player.flightPlan.currentTry == "mining"
        s.onChange = { f in
            field = f
            for id in SkyEvents.debrisResourceIds where f.cargo[id, default: 0] > 0 { store.debrisMined(id) }
            let fragments = f.cargo["orionid_debris", default: 0]
            if fragments > fragmentsCounted { store.fragmentsMined(fragments - fragmentsCounted); fragmentsCounted = fragments }
        }
        s.onTargetCue = { cue in targetCue = cue }
        s.onObstacleAhead = { obstacleAhead = $0 }
        s.reducedMotion = reduceMotion
        #if DEBUG
        // Simulator playtests have no tap driver: `-autofire` holds the real trigger so the laser path is exercised unattended.
        if ProcessInfo.processInfo.arguments.contains("-autofire") { s.setTrigger(true) }
        #endif
        s.onBump = { say("Hull bumped: −1 charge") }
        s.onCharging = { c in laserCharging = c }
        s.onFeedback = { msg in toast = msg; Task { try? await Task.sleep(for: .seconds(1.4)); if toast == msg { toast = nil } } }
        fragmentsCounted = f.cargo["orionid_debris", default: 0]
        field = f; scene = s
    }
}

/// Order lines and the fire control. Scrub stays an accessibility action so the panel matches the approved dock.
struct MiningActionRow: View {
    let field: MiningField
    let onReturn: () -> Void
    let onScrub: () -> Void
    var onFire: () -> Void = {}
    var showFire = true
    var targetCue: String? = nil
    /// Shower run: the order reads caught fragments (launch plus mined) over the full goal, like web.
    var showerCaught: Int? = nil

    private var chargePct: Double { field.chargeCap > 0 ? Double(field.charge) / Double(field.chargeCap) : 0 }

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onReturn) {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(field.required.keys.sorted(), id: \.self) { id in
                        let shower = id == "orionid_debris" ? showerCaught : nil
                        let need = shower != nil ? OrionidsRun.fragmentGoal : (field.required[id] ?? 0)
                        let have = min(need, shower ?? field.cargo[id, default: 0])
                        Text("\(Minerals.byId[id]?.name ?? id) \(have)/\(need)")
                            .font(AppFont.mono(14)).foregroundStyle(Glass.ink).lineLimit(1)
                    }
                    if let targetCue {
                        Text(targetCue).font(AppFont.display(14)).foregroundStyle(Glass.cyan).lineLimit(1)
                    }
                    GeometryReader { g in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.14))
                            Capsule().fill(Glass.cyan).frame(width: max(4, g.size.width * chargePct))
                        }
                    }.frame(height: 8)
                }
                .padding(.horizontal, 12).padding(.vertical, 8)
                .frame(maxWidth: .infinity, minHeight: showFire ? 64 : 44, alignment: .leading)
                .glowPanel(RoundedRectangle(cornerRadius: 6))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Order. Laser charge \(field.charge) of \(field.chargeCap).")
            .accessibilityAction(named: "Scrub mission", onScrub)
            if showFire {
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
        }
        .padding(showFire ? 10 : 4)
        .frame(maxWidth: 720)
        .background(showFire ? Theme.paper : .clear, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(showFire ? Theme.border : .clear, lineWidth: 1))
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

/// Mining controls guide (mirrors web `mining-guide-dock`): full screen while open, one card per control with 24pt
/// gaps, Recharge and Scrub as separate full-width buttons. The HUD and dock are removed while it shows.
struct MiningGuide: View {
    @Environment(\.flatLayout) private var flat
    var isOrionids = false
    let onRecharge: () -> Void
    let onScrub: () -> Void
    let onClose: () -> Void

    private static let baseItems: [(String, String)] = [
        ("Fire Laser", "Fires the vertical beam. Scroll ore under the beam, then fire."),
        ("Charges", "The fire button reads Depleted when the laser is empty. Empty, with the order unfinished, the run stops."),
        ("Order", "The order card lists each mineral still owed. Tap it to return once the order is filled, or while the laser is empty."),
        ("Scroll", "The dock arrows change how fast the ground moves. They settle back to a steady crawl."),
        ("Inventory", "The order lines show collected against required. Fill every line to unlock return."),
        ("Return home", "Return for recovery. Payout unlocks after landing."),
    ]

    private var items: [(String, String)] {
        guard isOrionids else { return Self.baseItems }
        var items = Self.baseItems
        items.insert(("Catch Orionid debris", "Blue fragments fall from the shower and are caught when they hit the ground. No laser needed. Catches count toward the shower run and cannot be dropped."), at: 1)
        return items
    }

    private var cards: some View {
        VStack(spacing: SetStyle.gap) {
            ForEach(items, id: \.0) { item in
                VStack(alignment: .leading, spacing: 8) {
                    Text(item.0).font(AppFont.display(16, "Bold")).foregroundStyle(SetStyle.ink)
                    Text(item.1).font(AppFont.body(16)).foregroundStyle(SetStyle.muted).fixedSize(horizontal: false, vertical: true)
                }.setCard()
            }
        }.padding(.horizontal, 16).padding(.vertical, 8).setColumn()
    }

    private var buttons: some View {
        VStack(spacing: SetStyle.gap) {
            SetButton(title: "Recharge laser", solid: true, fill: true, action: onRecharge)
            SetButton(title: "Scrub mission", color: SetStyle.danger, fill: true, action: onScrub)
        }.padding(16)
    }

    var body: some View {
        GeometryReader { geo in
            let wide = geo.size.width > geo.size.height
            VStack(spacing: 0) {
                HStack {
                    Text("Controls".uppercased()).font(AppFont.display(20)).tracking(20 * 0.14).foregroundStyle(SetStyle.ink)
                    Spacer()
                    Button(action: onClose) {
                        Image(systemName: "xmark").font(.system(size: 18, weight: .heavy)).foregroundStyle(SetStyle.ink)
                            .frame(width: 44, height: 44)
                            .background(SetStyle.card, in: RoundedRectangle(cornerRadius: SetStyle.radius))
                            .overlay(RoundedRectangle(cornerRadius: SetStyle.radius).stroke(SetStyle.ink, lineWidth: SetStyle.border))
                    }.buttonStyle(.plain).accessibilityLabel("Close")
                }.padding(.horizontal, 16).padding(.vertical, 8).frame(minHeight: 60).setColumn(wide: wide)
                if wide {
                    HStack(alignment: .top, spacing: 0) {
                        scroller { cards }
                        buttons.frame(width: 300)
                    }
                } else {
                    scroller { cards }
                    buttons.setColumn()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SetStyle.bg.ignoresSafeArea())
    }

    @ViewBuilder private func scroller<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        if flat { c().frame(maxHeight: .infinity, alignment: .top) } else { ScrollView { c() } }
    }
}
