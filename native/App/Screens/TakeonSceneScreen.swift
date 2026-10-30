import SwiftUI
import LandnamCore
import TakeonKit

/// Full-screen Takeon rover surface scene backed by the Go runtime (`GoTakeonEngine`).
/// The scene is always full screen; every control floats over it (slim right column, gauge card,
/// objective chip, tap-a-block card, bottom dock). Mission progress comes from the engine's `missionProgress`.
@MainActor @Observable
final class TakeonSceneModel {
    let engine: TakeonEngine
    private(set) var state: TakeonRenderState?
    private(set) var terrain: TakeonTerrainWindow?
    private(set) var mission: TakeonMissionProgress?
    private(set) var failure: String?
    var selected: TakeonRenderState.Point?
    var heading = 0
    private var lastFetch: (x: Int, y: Int, mining: Bool, edits: Int)?
    private var accum = 0.0
    /// Short engine feedback ("No route to that block", "Banked 7") shown for a few seconds.
    private(set) var notice: String?
    private var noticeUntil = 0.0
    static let half = 20

    let target: String
    let seed: UInt64
    /// False for scratch fields (the delivery drop-off) that must never overwrite the saved survey world.
    private let persist: Bool
    private var lastSave = 0.0

    init(engine: TakeonEngine = makeDefaultTakeonEngine(), target: String = "moon", seed: UInt64 = 4212, persist: Bool = true) {
        self.engine = engine
        self.target = target; self.seed = seed; self.persist = persist
        guard takeonGoRuntimeAvailable else { failure = "Rover sim unavailable in this build"; return }
        do {
            try engine.loadWorld(TakeonWorldSeed(targetId: target, seed: seed))
            // SSL-559: resume the saved world (local cache, or the account's world pulled from PocketBase).
            if persist, let snap = TakeonPersistence.load(target) { try? engine.restore(snap) }
            refresh(force: true)
        }
        catch { failure = "Takeon runtime unavailable: \(error)" }
    }

    func tick(dt: Double) {
        guard failure == nil else { return }
        let events = engine.step(dt: dt)
        accum += dt
        for e in engine.lastRawEvents {
            if e.kind == "mineOrder" { selected = nil }   // order finished (or failed): drop the card
            if let n = Self.notice(for: e) { notice = n; noticeUntil = accum + 4 } }
        if notice != nil, accum > noticeUntil { notice = nil }
        refresh(force: !events.isEmpty)
        if accum - lastSave > 15 { save() }
    }

    /// Saves the world locally and queues the PocketBase upload.
    func save() {
        lastSave = accum
        guard persist, failure == nil, let st = try? engine.state() else { return }
        TakeonPersistence.save(target: target, seed: seed, state: st, snapshot: try? engine.snapshot())
    }

    func refresh(force: Bool = false) {
        guard let data = try? engine.state(), let st = try? TakeonRenderState.decode(data) else { return }
        state = st
        let key = (x: st.rover.pos.x, y: st.rover.pos.y, mining: st.rover.mining != nil, edits: st.edits?.count ?? 0)
        if force || terrain == nil || lastFetch == nil || lastFetch! != key {
            let size = 128
            let x0 = max(0, key.x - Self.half), y0 = max(0, key.y - Self.half)
            if let w = try? engine.window(x: x0, y: y0, w: min(2 * Self.half + 1, size - x0), h: min(2 * Self.half + 1, size - y0)) { terrain = w }
            lastFetch = key
        }
        mission = try? engine.missionProgress()
        if let s = selected, let t = terrain, t.height(s.x, s.y) < 0 { selected = nil }
    }

    static func notice(for e: TakeonRawEvent) -> String? {
        switch (e.kind, e.detail ?? "") {
        case ("mineOrder", "done"): return "Block mined"
        case ("mineOrder", "failed:no-route"): return "No route to that block"
        case ("mineOrder", "failed:battery"): return "Battery too low to mine"
        case ("mineOrder", "failed:cargo-full"): return "Cargo full: bank at base"
        case ("mineOrder", let d) where d.hasPrefix("failed"): return "Can't mine that block"
        case ("banked", _): return "Banked \(Int(e.amount ?? 0)) at base"
        case ("blocked", "not-at-base"): return "Move next to base to bank"
        case ("missionComplete", _): return "Mission complete"
        default: return nil
        }
    }

    // MARK: intents

    /// Web `TakeOnMount` seedCache + seedCargo: one cache beside the rover and the host's cargo in the hold.
    func seedDropoff(_ cargo: [String: Double]) {
        guard failure == nil else { return }
        engine.seedCache()
        try? engine.seedCargo(cargo)
        refresh(force: true)
    }
    /// Units moved into an adjacent cache (0 when none is in reach or the hold is empty).
    func deposit() -> Double { let moved = engine.deposit(); refresh(force: true); return moved }
    /// One tile in an engine direction (0 SE, 1 SW, 2 NW, 3 NE on screen).
    func move(_ dir: Int) { _ = try? engine.order("move", arg: dir); heading = dir; refresh() }
    func mineSelected() { if let s = selected, engine.orderMine(x: s.x, y: s.y) { heading = state?.rover.facing ?? heading } }
    func bank() { _ = engine.bank(); refresh(force: true); save() }
    func turn(_ delta: Int) { heading = (heading + delta + 4) % 4 }
    func driveAhead() { _ = try? engine.order("move", arg: heading); refresh() }

    // MARK: derived HUD
    var energyCost: Int { Int((state?.stats.miningEnergy ?? 12).rounded()) }
    var battery: Double { guard let s = state else { return 0 }; return s.rover.battery / max(1, s.stats.batteryCapacity) }
    var drill: Double { guard let s = state else { return 0 }; return s.rover.durability / max(1, s.stats.durabilityMax) }
    var cargo: Double { guard let s = state else { return 0 }; return s.rover.cargoUsed / max(1, s.stats.cargoCapacity) }
    var activeLabel: String {
        guard let s = state else { return "OFFLINE" }
        if s.rover.mining != nil { return "ACTIVE: MINING" }
        if s.rover.moveFrom != nil { return "ACTIVE: DRIVING" }
        return "ACTIVE: SCAN ORE"
    }
    var objective: TakeonObjectiveProgress? { mission?.objectives.first { !$0.complete } ?? mission?.objectives.last }
    var canBank: Bool { state?.nearBase ?? false }
    var dockAction: String { selected != nil ? "Mine" : canBank ? "Bank" : "Drive" }
}

struct TakeonSceneScreen: View {
    @Environment(GameStore.self) private var store
    @State private var model: TakeonSceneModel
    var onExit: (() -> Void)?
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    private var compactHeight: Bool { verticalSizeClass == .compact }

    init(model: TakeonSceneModel = TakeonSceneModel(), onExit: (() -> Void)? = nil) {
        _model = State(initialValue: model)
        self.onExit = onExit
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                TimelineView(.animation) { tl in
                    let t = tl.date.timeIntervalSinceReferenceDate
                    Canvas { ctx, size in
                        var ctx = ctx
                        if let st = model.state, let tr = model.terrain {
                            TakeonIsoRenderer(terrain: tr, state: st, selected: model.selected, time: t).draw(&ctx, size: size)
                        }
                    }
                }
                .ignoresSafeArea()
                .contentShape(Rectangle())
                .gesture(SpatialTapGesture().onEnded { tap in
                    guard let st = model.state, let tr = model.terrain else { return }
                    let p = TakeonIsoRenderer(terrain: tr, state: st, selected: nil, time: 0).pick(tap.location, size: geo.size)
                    model.selected = (p == st.rover.pos) ? nil : p   // the rover's own tile is not a mining target
                })
                .accessibilityLabel("Takeon rover surface scene")

                if let f = model.failure { Text(f).font(AppFont.body(14)).padding(12).background(Theme.hudPanel, in: RoundedRectangle(cornerRadius: 12)) }
                // The canvas ignores the safe area and grows this stack past it: pin the HUD back to the safe frame.
                overlay(geo).frame(width: geo.size.width, height: geo.size.height)
            }
        }
        .background(Color.black.ignoresSafeArea())
        .task {
            // Fixed-cadence driver: the engine accumulates fractional ticks, so real elapsed time is passed straight through.
            var last = ContinuousClock.now
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(50))
                let now = ContinuousClock.now
                let dt = (now - last).components.seconds.asDouble + Double((now - last).components.attoseconds) / 1e18
                last = now
                model.tick(dt: min(0.25, dt))
            }
        }
        #if os(iOS)
        .statusBarHidden(false)
        #endif
    }

    @ViewBuilder private func overlay(_ geo: GeometryProxy) -> some View {
        ZStack {
            // Tap-a-block floating card.
            if let sel = model.selected, let st = model.state, let tr = model.terrain {
                let a = TakeonIsoRenderer(terrain: tr, state: st, selected: nil, time: 0).anchor(sel, size: geo.size)
                Button { model.mineSelected() } label: {
                    Text("Mine here,\n\(model.energyCost) energy").multilineTextAlignment(.center)
                        .font(AppFont.display(14)).foregroundStyle(Theme.hudInk).padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Theme.hudPanel, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.hudInk, lineWidth: 1.5))
                }.buttonStyle(.plain)
                .position(x: min(max(a.x, 80), geo.size.width - 170), y: max(a.y - 70, 70))
                .accessibilityIdentifier("takeon-mine-card")
            }
            if let n = model.notice {
                panel(12) { Text(n).font(AppFont.display(14)).foregroundStyle(Theme.hudInk).padding(.horizontal, 12).padding(.vertical, 8) }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top).padding(.top, 64).accessibilityIdentifier("takeon-notice")
            }
            // Mission objective chip, top right.
            VStack(alignment: .trailing, spacing: 10) {
                objectiveChip
                rightColumn
                Spacer(minLength: 0)
            }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing).padding(.trailing, 12).padding(.top, 8)
            // Exit, top left (never a bottom corner).
            if let onExit {
                Button(action: onExit) {
                    Image(systemName: "chevron.left").font(.system(size: 17, weight: .bold)).foregroundStyle(Theme.hudInk)
                        .frame(width: 44, height: 44).background(Theme.hudPanel, in: Circle()).overlay(Circle().stroke(Theme.hudInk, lineWidth: 1.5))
                }.buttonStyle(.plain).accessibilityLabel("Exit field")
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).padding(.leading, 12).padding(.top, 8)
            }
            if !compactHeight {
                gaugeCard.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading).padding(.leading, 12).padding(.bottom, 12)
            }
            dock.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom).padding(.bottom, compactHeight ? 6 : 12)
        }
    }

    // MARK: panels (light rounded, thin black outline, mint accents)
    private func panel<V: View>(_ radius: CGFloat = 14, @ViewBuilder _ v: () -> V) -> some View {
        v().background(Theme.hudPanel.opacity(0.96), in: RoundedRectangle(cornerRadius: radius))
            .overlay(RoundedRectangle(cornerRadius: radius).stroke(Theme.hudInk, lineWidth: 1.5))
    }

    private var objectiveChip: some View {
        panel(12) {
            VStack(alignment: .trailing, spacing: 1) {
                Text("MISSION OBJECTIVE").font(AppFont.display(14, "Bold")).tracking(1).foregroundStyle(Theme.textMuted)
                if let o = model.objective {
                    Text("\(o.label) \(Int(o.current))/\(Int(o.target))").font(AppFont.display(14)).foregroundStyle(Theme.hudInk)
                } else { Text("—").font(AppFont.display(14)) }
            }.padding(.horizontal, 12).padding(.vertical, 7)
        }.accessibilityIdentifier("takeon-objective")
    }

    private var rightColumn: some View {
        VStack(spacing: 6) {
            // The bottom-left gauge card already shows these; a landscape phone has no room for both.
            if !compactHeight {
                railIcon("battery.100", "BATTERY", model.battery)
                railIcon("wrench.and.screwdriver.fill", "DRILL", model.drill)
                railIcon("shippingbox.fill", "CARGO", model.cargo)
            }
            railIcon(model.state?.weather == nil ? "sun.max.fill" : "cloud.fill", "WEATHER", nil)
            panel(12) {
                HStack(spacing: 4) {
                    Circle().fill(Theme.hudMint).frame(width: 8, height: 8).overlay(Circle().stroke(Theme.hudInk, lineWidth: 1))
                    Text(model.activeLabel).font(AppFont.display(14)).foregroundStyle(Theme.hudInk).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                }.frame(width: 88).padding(.vertical, 6).padding(.horizontal, 2)
            }
        }
    }

    private func railIcon(_ symbol: String, _ label: String, _ level: Double?) -> some View {
        panel(12) {
            VStack(spacing: 2) {
                Image(systemName: symbol).font(.system(size: 20, weight: .semibold)).foregroundStyle(Theme.hudInk).frame(height: 24)
                Text(label).font(AppFont.display(14, "Bold")).foregroundStyle(Theme.hudInk)
                if let level {
                    Capsule().fill(Theme.hudTrack).frame(width: 40, height: 4)
                        .overlay(alignment: .leading) { Capsule().fill(Theme.hudMint).frame(width: 40 * max(0, min(1, level)), height: 4) }
                }
            }.frame(width: 88, height: 64)
        }.accessibilityElement(children: .combine)
    }

    private var gaugeCard: some View {
        panel(14) {
            HStack(alignment: .bottom, spacing: 5) {
                gauge("Battery", model.battery)
                gauge("Drill", model.drill)
                gauge("Cargo", model.cargo)
            }.padding(.horizontal, 7).padding(.vertical, 8)
        }.accessibilityIdentifier("takeon-gauges")
    }

    private func gauge(_ label: String, _ v: Double) -> some View {
        VStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 6).fill(Theme.hudTrack).frame(width: 16, height: 66)
                .overlay(alignment: .bottom) { RoundedRectangle(cornerRadius: 6).fill(Theme.hudMint).frame(height: 66 * max(0.03, min(1, v))) }
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.hudInk, lineWidth: 1.2))
            Text(label).font(AppFont.display(14, "Bold")).foregroundStyle(Theme.hudInk).fixedSize()
        }
    }

    private var dock: some View {
        panel(14) {
            HStack(spacing: 0) {
                dockArrow("‹‹", "Turn left") { model.turn(-1) }
                Button { dockPrimary() } label: {
                    Text(model.dockAction).font(AppFont.display(20)).foregroundStyle(Theme.hudInk).frame(minWidth: 54, minHeight: 44)
                }.buttonStyle(.plain).accessibilityIdentifier("takeon-dock-action")
                dockArrow("››", "Turn right") { model.turn(1) }
            }.padding(.horizontal, 4)
        }.background(Theme.hudMint.opacity(0.35), in: RoundedRectangle(cornerRadius: 14))
    }

    private func dockArrow(_ glyph: String, _ label: String, _ act: @escaping () -> Void) -> some View {
        Button(action: act) {
            Text(glyph).font(AppFont.display(24)).foregroundStyle(Theme.hudInk).frame(width: 38, height: 44)
        }.buttonStyle(.plain).accessibilityLabel(label)
    }

    private func dockPrimary() {
        if model.selected != nil { model.mineSelected() }
        else if model.canBank && (model.mission?.objectives.isEmpty == false) { model.bank() }
        else { model.driveAhead() }
    }
}

/// Opt-in switch (default off, so current Rover field behaviour is unchanged):
/// `defaults write com.atlasskyventures.sslandnam takeonScene -bool YES` or launch with `-takeonScene YES`.
enum TakeonSceneFlag {
    static var enabled: Bool { UserDefaults.standard.bool(forKey: "takeonScene") }
}

private extension Int64 { var asDouble: Double { Double(self) } }
