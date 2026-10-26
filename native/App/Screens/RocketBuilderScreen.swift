import SwiftUI
import LandnamCore

/// Where the rocket is on the pad (web `AssemblyPhase`, plus `idle` when no mission is chosen).
enum PadPhase { case idle, design, building, ready }

/// How long the rocket takes to rise on the pad (web `ROLLOUT_MS`).
let padRolloutSeconds: Double = 1.6

/// Launchpad scene. Mirrors web `RocketBuilderScene`: the launch complex (pad, gantry, rail, hangar), a big Choose a mission when the pad
/// is empty, then the rocket designed (blueprint), built under a scaffold and ready to launch, plus the part tray.
struct RocketBuilderScreen: View {
    @Environment(GameStore.self) private var store
    var launchEnabled: Bool
    var onLaunch: () -> Void
    var onChooseMission: () -> Void
    var assembly: PadPhase = .ready
    /// Snapshots freeze the rise at this fraction (the live screen animates `buildProgress`).
    var previewProgress: Double?
    @State private var buildProgress: Double = 0
    @State private var pulsing = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var selectedSlot: String?
    @State private var notice = ""
    @State private var confirmingDismantle = false
    /// The free Explorer launches as it is: the parts shop stays closed until the player asks for it (web `builder-customize`).
    @State private var customizing: Bool = {
        #if DEBUG
        return ProcessInfo.processInfo.arguments.contains("-customize")
        #else
        return false
        #endif
    }()
    @State private var planSheet: PlanSheet?
    /// Snapshots render ScrollView content as empty; catalog scenes set this to lay the list out flat.
    @Environment(\.flatLayout) private var flat

    var guided = false

    var body: some View {
        let land = backdrop
        let numbers = RocketBuilder.stats(store.state, catalog: store.catalog)
        let loadout = store.player.shipCustomizerParts
        let fittedCount = RocketBuilder.slots.filter { RocketBuilder.partId(loadout, slot: $0.id) != nil }.count
        let guidedSlot = guided ? RocketBuilder.slots.first { RocketBuilder.partId(loadout, slot: $0.id) == nil }?.id : nil
        let active = selectedSlot.flatMap { id in shownSlots.contains { $0.id == id } ? id : nil } ?? guidedSlot ?? (shownSlots.first ?? RocketBuilder.slots[0]).id
        GeometryReader { geo in
            let wide = geo.size.width > geo.size.height
            // Short landscape has no room under the plan strip: the pad stands behind it, like web where the strip sits over the sky.
            // Customization is now an overlay, so it must not change this camera.
            let shortWide = wide && geo.size.height < 520 && !guided
            let shortIdle = shortWide && phase == .idle
            let shortMission = shortWide && phase != .idle
            ZStack(alignment: .top) {
                landView(land)
                if shortIdle {
                    padScene(numbers: numbers).padding(.horizontal, 12).padding(.top, 100).padding(.bottom, 72)
                }
                VStack(spacing: 8) {
                    actions
                    if !shortMission { MissionPlanStrip(sheet: $planSheet) }
                    if guided {
                        Text(guidedSlot.map { id in "STEP \(fittedCount + 1) OF \(RocketBuilder.slots.count) · FIT YOUR \(RocketBuilder.slots.first { $0.id == id }?.label ?? "")" } ?? "ROCKET READY · PRESS LAUNCH")
                            .font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.paper)
                            .frame(maxWidth: .infinity, alignment: .leading).padding(10)
                            .background(Theme.blue, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
                    }
                    if !guided {
                        if shortIdle {
                            Spacer(minLength: 0)
                        } else if shortMission {
                            // Pad on the left, the plan strip beside it: stacked, the strip would hide the pad.
                            HStack(alignment: .top, spacing: 8) {
                                padScene(numbers: numbers).frame(width: geo.size.width * 0.5).frame(maxHeight: .infinity)
                                MissionPlanStrip(sheet: $planSheet).frame(maxWidth: .infinity, alignment: .top)
                            }.frame(maxHeight: .infinity)
                        } else {
                            padScene(numbers: numbers).frame(maxHeight: .infinity)
                        }
                    } else if wide {
                        HStack(alignment: .top, spacing: 8) {
                            padScene(numbers: numbers).frame(maxWidth: .infinity).frame(maxHeight: .infinity)
                            choices(active: active, guidedSlot: guidedSlot, loadout: loadout, compact: geo.size.height < 520)
                                .frame(width: max(280, geo.size.width * 0.38))
                        }
                    } else {
                        padScene(numbers: numbers).frame(height: max(200, geo.size.height * 0.4))
                        choices(active: active, guidedSlot: guidedSlot, loadout: loadout, compact: false)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 12)
                .padding(.bottom, 72)
                if phase != .idle {
                    launchDock
                        .padding(.bottom, 84)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                        .zIndex(1)
                }
                if customizing && !guided {
                    choices(active: active, guidedSlot: nil, loadout: loadout, compact: geo.size.height < 520)
                        .frame(width: wide ? max(280, geo.size.width * 0.38) : nil)
                        .frame(maxHeight: wide ? geo.size.height - 40 : max(220, geo.size.height * 0.54))
                        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 2))
                        .padding(12)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: wide ? .topTrailing : .bottom)
                        .zIndex(2)
                }
                if let sheet = planSheet {
                    MissionPlanSheet(sheet: sheet) { planSheet = nil }.frame(maxHeight: .infinity, alignment: .bottom).zIndex(2)
                }
                if confirmingDismantle {
                    VStack(spacing: 10) {
                        Text("DISMANTLE THIS UNLAUNCHED ROCKET?").font(AppFont.display(14, "Bold")).tracking(1.1).multilineTextAlignment(.center)
                        HStack(spacing: 8) {
                            Button("CONFIRM") { confirmingDismantle = false; store.dismantleStagedRocket() }
                            Button("KEEP") { confirmingDismantle = false }
                        }
                    }
                    .foregroundStyle(Theme.ink).padding(14).background(Theme.paper, in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 2))
                    .padding(20).frame(maxHeight: .infinity, alignment: .center).zIndex(3)
                }
            }
        }
        .background(Theme.paper)
        .onChange(of: assembly) { _, next in
            guard next == .building else { return }
            var reset = Transaction(); reset.disablesAnimations = true
            withTransaction(reset) { buildProgress = 0 }
            DispatchQueue.main.async { withAnimation(.linear(duration: reduceMotion ? 0 : padRolloutSeconds)) { buildProgress = 1 } }
        }
    }

    private var hasMission: Bool { store.mission != nil && store.target != nil }
    private var phase: PadPhase { hasMission ? assembly : .idle }
    private var hasStagedRocket: Bool {
        store.player.stagedRockets.contains { $0.id == store.player.selectedStagedRocketId && $0.location == .launchpad }
    }

    private var actions: some View {
        // Back and the primary button always fit; the Target card only shows on the idle pad (the plan strip names the destination once a mission is chosen).
        ViewThatFits(in: .horizontal) {
            actionsRow(showTarget: true)
            actionsRow(showTarget: false)
        }
    }

    private var primaryLabel: String {
        switch phase {
        case .design: "BUILD ROCKET"
        case .building: "BUILDING"
        default: "LAUNCH"
        }
    }

    private func actionsRow(showTarget: Bool) -> some View {
        HStack(alignment: .center, spacing: 8) {
            Button { store.go(.hub) } label: {
                Text("‹ BACK").font(AppFont.display(14, "Bold")).tracking(1.4).foregroundStyle(Theme.ink).lineLimit(1).fixedSize()
                    .padding(.horizontal, 16).frame(minHeight: 44)
                    .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.ink, lineWidth: 2))
            }.buttonStyle(.plain).accessibilityLabel("Back")
            Spacer(minLength: 4)
            if !guided && phase != .idle {
                Button { customizing.toggle() } label: {
                    Text(customizing ? "DONE" : "CUSTOMIZE").font(AppFont.display(14, "Bold")).tracking(1.4).foregroundStyle(Theme.ink).lineLimit(1).fixedSize()
                        .padding(.horizontal, 16).frame(minHeight: 44)
                        .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.ink, lineWidth: 2))
                }.buttonStyle(.plain).accessibilityIdentifier("builder-customize")
            }
            if showTarget { Button(action: onChooseMission) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(phase == .idle ? "SELECT MISSION" : "CHANGE MISSION").font(AppFont.display(14, "Bold")).tracking(1.4)
                    Text(phase == .idle ? "Choose a mission" : "\(store.mission?.title ?? "Mission") · \(store.target?.name ?? "Target")").font(AppFont.body(14, "Bold")).lineLimit(1)
                }
                .foregroundStyle(Theme.ink)
                .frame(minWidth: 110, minHeight: 44, alignment: .leading).padding(.horizontal, 12)
                .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
            }.buttonStyle(.plain).accessibilityIdentifier("rocket-builder-target") }
            if hasStagedRocket {
                Button { confirmingDismantle = true } label: {
                    Text("DISMANTLE").font(AppFont.display(14, "Bold")).tracking(1.2)
                        .foregroundStyle(Theme.paper).frame(minHeight: 44).padding(.horizontal, 12)
                        .background(Theme.ink.opacity(0.78), in: Capsule()).overlay(Capsule().stroke(Theme.paper.opacity(0.7), lineWidth: 2))
                }.buttonStyle(.plain).accessibilityIdentifier("builder-dismantle")
            }
        }
    }

    private var launchDock: some View {
        let enabled = launchEnabled && phase != .building
        return Button(action: onLaunch) {
            Text(primaryLabel).font(AppFont.display(16, "Bold")).tracking(1.5)
                .frame(minWidth: 280, minHeight: 56).padding(.horizontal, 20)
                .foregroundStyle(enabled ? Theme.paper : Theme.ink)
                .background(enabled ? Theme.blue : Theme.paper2, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
                .hardShadow(Theme.ink.opacity(0.35), x: 4, y: 4)
        }
        .buttonStyle(.plain).disabled(!enabled).accessibilityIdentifier(phase == .design ? "prepare-launch-btn" : "launch-btn")
    }

    private var backdrop: (skyTop: Color, skyHorizon: Color, ground: Color, tint: Color, pieces: [Landscape.Piece], period: Double) {
        let target = store.target
        let palette = target.map { LaserPalette.resolve(id: $0.id, type: $0.type, archetype: $0.archetype) } ?? LaserPalette.named("mars")
        let layout = Landscape.layout(palette.landscape, key: target?.id ?? "earth-base")
        return (
            lifted(palette.skyTop, 0.08),
            lifted(palette.skyHorizon, 0.16),
            lifted(palette.ground, 0.08),
            lifted(layout.tint, 0.2),
            layout.pieces,
            layout.period
        )
    }

    private func landView(_ land: (skyTop: Color, skyHorizon: Color, ground: Color, tint: Color, pieces: [Landscape.Piece], period: Double)) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                LinearGradient(colors: [Theme.ink, land.skyTop.opacity(0.72), land.skyHorizon.opacity(0.54)], startPoint: .top, endPoint: .bottom)
                ForEach(0..<15, id: \.self) { index in
                    Circle()
                        .fill(Theme.paper.opacity(index.isMultiple(of: 3) ? 0.52 : 0.28))
                        .frame(width: index.isMultiple(of: 4) ? 2 : 1, height: index.isMultiple(of: 4) ? 2 : 1)
                        .position(x: geo.size.width * (0.06 + Double((index * 37) % 89) / 100), y: geo.size.height * (0.05 + Double((index * 29) % 52) / 100))
                }
                VStack(spacing: 0) {
                    Rectangle().fill(Theme.paper.opacity(0.24)).frame(height: 3)
                    Rectangle()
                        .fill(Theme.ink.opacity(0.82))
                        .overlay(alignment: .top) { Rectangle().fill(land.ground.opacity(0.34)).frame(height: 12) }
                }
                .frame(height: geo.size.height * 0.34)
                .frame(maxWidth: .infinity)
            }
        }
        .ignoresSafeArea()
    }

    // MARK: Pad scene (web `.pad` / `.complex`)

    /// The launch complex fitted to the room it has, standing on a ground band that follows its foot.
    private func padScene(numbers: (capacity: Int, range: Int, laser: Int)) -> some View {
        GeometryReader { g in
            let w = min(g.size.width, g.size.height * 1.276)
            let h = w / 1.276
            let progress: Double = phase == .building ? (previewProgress ?? buildProgress) : (phase == .ready ? 1 : 0)
            ZStack(alignment: .topLeading) {
                Theme.ink.opacity(0.82)
                    .frame(width: g.size.width + 600, height: 1400)
                    .position(x: g.size.width / 2, y: g.size.height - 28 + 700)
                Theme.paper.opacity(0.24)
                    .frame(width: g.size.width + 600, height: 4)
                    .position(x: g.size.width / 2, y: g.size.height - 28 + 2)
                complex(w: w, h: h, phase: phase, progress: progress)
                    .frame(width: w, height: h)
                    .position(x: g.size.width / 2, y: g.size.height - 4 - h / 2)
                if phase == .idle {
                    chooseButton(g.size)
                } else {
                    statsOverlay(numbers: numbers, size: g.size)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Launchpad")
    }

    private func complex(w: CGFloat, h: CGFloat, phase: PadPhase, progress: Double) -> some View {
        LaunchpadPrefab(phase: phase, progress: progress, width: w, height: h, onChooseMission: onChooseMission)
    }

    /// The big call to action when nothing is on the pad.
    private func chooseButton(_ size: CGSize) -> some View {
        let portrait = size.width < 520
        let short = size.height < 300
        let width = portrait ? min(size.width * 0.86, 420) : min(size.width * 0.46, 440)
        let cx = portrait ? size.width / 2 : (short ? size.width - width / 2 : size.width * 0.64)
        let top = short ? size.height * 0.04 : (portrait ? size.height * 0.14 : size.height * 0.08)
        return Button(action: onChooseMission) {
            VStack(spacing: 6) {
                Text("NOTHING ON THE PAD").font(AppFont.display(14, "Bold")).tracking(1.4)
                Text("CHOOSE A MISSION").font(AppFont.display(portrait ? 26 : 32, "ExtraBold")).tracking(1.4)
                    .multilineTextAlignment(.center).minimumScaleFactor(0.7)
            }
            .foregroundStyle(Theme.paper)
            .frame(width: width, height: short ? 72 : 96)
            .background { RoundedRectangle(cornerRadius: 14).fill(Theme.blue).shadow(color: Theme.ink, radius: 0, x: 0, y: 6) }
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.ink, lineWidth: 4))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.paper.opacity(pulsing ? 0 : 0.7), lineWidth: 4).scaleEffect(pulsing ? 1.07 : 1))
        }
        .buttonStyle(.plain)
        .position(x: cx, y: top + (short ? 36 : 48))
        .accessibilityIdentifier("builder-choose-contract")
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.8).repeatForever(autoreverses: false)) { pulsing = true }
        }
    }

    @ViewBuilder private func statsOverlay(numbers: (capacity: Int, range: Int, laser: Int), size: CGSize) -> some View {
        if size.width < 520 {
            HStack(spacing: 6) {
                stat("CAPACITY", numbers.capacity); stat("RANGE", numbers.range); stat("LASER", numbers.laser)
            }
            .frame(width: size.width).frame(maxHeight: .infinity, alignment: .top)
        } else {
            VStack(spacing: 6) {
                stat("CAPACITY", numbers.capacity); stat("RANGE", numbers.range); stat("LASER", numbers.laser)
            }
            .frame(width: 110)
            .position(x: size.width - 55, y: 70)
        }
    }

    private func stat(_ label: String, _ value: Int) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 7) {
                statMark(label)
                Text(label).font(AppFont.display(14, "Bold")).tracking(1)
            }
            Text("\(value)").font(AppFont.display(24, "ExtraBold"))
            Rectangle().fill(Theme.blue).frame(height: 3)
        }
        .foregroundStyle(Theme.ink)
        .frame(maxWidth: .infinity, alignment: .leading).padding(9)
        .background(LinearGradient(colors: [Theme.paper, Theme.paper2], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink.opacity(0.7), lineWidth: 2))
        .hardShadow(Theme.ink.opacity(0.45), x: 3, y: 3)
    }

    @ViewBuilder private func statMark(_ label: String) -> some View {
        if label == "CAPACITY" {
            RoundedRectangle(cornerRadius: 3).stroke(Theme.blue, lineWidth: 2).overlay(HStack(spacing: 2) { Rectangle().fill(Theme.blue); Rectangle().fill(Theme.blue); Rectangle().fill(Theme.blue) }.padding(3))
                .frame(width: 18, height: 18)
        } else if label == "RANGE" {
            Image(systemName: "location.north.fill").font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.blue)
        } else {
            Image(systemName: "laser.burst").font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.blue)
        }
    }

    /// Only slots with something fittable today: locked parts and empty tabs stay out of sight instead of reading as dead ends.
    private var shownSlots: [(id: String, label: String, module: String)] {
        let loadout = store.player.shipCustomizerParts
        return RocketBuilder.slots.filter { slot in
            !RocketBuilder.options(slot.id, missionsDone: store.player.missionsDone).isEmpty || RocketBuilder.partId(loadout, slot: slot.id) != nil
        }
    }

    private func availableParts(_ slot: String, loadout: [String: String]) -> [RocketBuilder.Part] {
        let fitted = RocketBuilder.partId(loadout, slot: slot)
        return RocketBuilder.allOptions(slot).filter { $0.unlockedAt <= store.player.missionsDone || $0.id == fitted }
    }

    private func choices(active: String, guidedSlot: String?, loadout: [String: String], compact: Bool) -> some View {
        // Flat (snapshot) layout has no scroller, so show only what fits: two rows on a short landscape screen.
        let all = availableParts(active, loadout: loadout)
        let options = flat && compact ? Array(all.prefix(2)) : all
        let fittedId = RocketBuilder.partId(loadout, slot: active)
        return VStack(spacing: 0) {
            HStack(spacing: 6) {
                ForEach(shownSlots, id: \.id) { slot in
                    let part = RocketBuilder.partId(loadout, slot: slot.id)
                    let blocked = guidedSlot != nil && slot.id != guidedSlot && part == nil
                    Button { selectedSlot = slot.id; notice = "" } label: {
                        VStack(spacing: 2) {
                            if !compact { cardImage(slot.id) }
                            Text(slot.label).font(AppFont.display(14, "Bold")).multilineTextAlignment(.center).lineLimit(2).minimumScaleFactor(0.8)
                            if !compact { Text(part.flatMap { id in RocketBuilder.parts.first { $0.id == id }?.name } ?? "Empty").font(AppFont.body(14)).lineLimit(1) }
                        }
                        .foregroundStyle(active == slot.id ? Theme.paper : Theme.ink)
                        .frame(maxWidth: .infinity, minHeight: compact ? 44 : 72).padding(4)
                        .background(active == slot.id ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 10))
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
                        .opacity(blocked ? 0.45 : 1)
                    }
                    .buttonStyle(.plain).disabled(blocked)
                    .accessibilityIdentifier("builder-part-\(slot.id)")
                }
            }
            .padding(8).background(Theme.paper2)
            optionsScroll {
                VStack(spacing: 8) {
                    ForEach(options, id: \.id) { part in
                        let locked = part.unlockedAt > store.player.missionsDone
                        let fitted = part.id == fittedId
                        Button {
                            if locked { notice = "UNLOCKS AFTER \(part.unlockedAt) MISSIONS" }
                            else { notice = store.installBuilderPart(active, partId: part.id) || fitted ? "" : "NOT ENOUGH FRANCS FOR THIS PART" }
                        } label: {
                            HStack(spacing: 10) {
                                cardImage(active).frame(width: 56, height: 56)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(part.name.uppercased()).font(AppFont.display(14, "ExtraBold")).tracking(0.6)
                                    Text(part.effect.uppercased()).font(AppFont.display(14, "Bold")).tracking(0.6).foregroundStyle(Theme.blue)
                                }
                                Spacer(minLength: 6)
                                Text(fitted ? "FITTED" : locked ? "AFTER \(part.unlockedAt) MISSIONS" : Economy.format(francs: part.price))
                                    .font(AppFont.display(14, "ExtraBold")).multilineTextAlignment(.trailing)
                            }
                            .foregroundStyle(Theme.ink)
                            .padding(10).frame(maxWidth: .infinity, minHeight: 72)
                            .background(fitted ? Theme.blue.opacity(0.14) : Theme.paper, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(fitted ? Theme.blue : Theme.ink, lineWidth: fitted ? 3 : 2))
                            .opacity(locked ? 0.6 : 1)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("builder-option-\(part.id)")
                    }
                }.padding(10)
            }
            if !notice.isEmpty {
                Text(notice).font(AppFont.display(14, "Bold")).tracking(1).foregroundStyle(Theme.ink)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(10).background(Theme.paper2)
            }
        }
        .background(Theme.paper)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 3))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .frame(maxHeight: .infinity)
    }

    @ViewBuilder private func optionsScroll<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        if flat { content().frame(maxHeight: .infinity, alignment: .top).clipped() } else { ScrollView { content() } }
    }

    @ViewBuilder private func cardImage(_ slot: String) -> some View {
        let name: String = switch slot {
        case "engine": "scene-launchpad-card-engine"
        case "fuel-tank": "scene-launchpad-card-fuel-tank"
        case "cargo-hold": "scene-launchpad-card-cargo-hold"
        case "mining-laser": "scene-launchpad-card-mining-laser"
        default: "scene-launchpad-card-booster"
        }
        Image(name).resizable().interpolation(.none).scaledToFit().frame(height: 40)
    }

    /// Pull a palette colour slightly toward paper (dusk, never a grey wash). Orange leans cool toward blue.
    private func lifted(_ hex: UInt32, _ mix: Double) -> Color {
        func channel(_ shift: UInt32) -> Double { Double((hex >> shift) & 255) }
        var r = channel(16) + (238 - channel(16)) * mix
        var g = channel(8) + (243 - channel(8)) * mix
        var b = channel(0) + (248 - channel(0)) * mix
        if r > b + 24 && r >= g {
            let pull = min(48, r - b)
            r -= pull
            b = min(255, b + pull * 0.4)
        }
        return Color(.sRGB, red: r / 255, green: g / 255, blue: b / 255, opacity: 1)
    }
}
