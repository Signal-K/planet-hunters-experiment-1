import SwiftUI
import LandnamCore

/// Launchpad rocket builder. Mirrors web `RocketBuilderScene`: destination landscape, blueprint, part tray, target card, Launch.
/// Swift is not compiled in this environment; keep this beside `web/components/game/screens/RocketBuilderScene.tsx`.
struct RocketBuilderScreen: View {
    @Environment(GameStore.self) private var store
    var launchEnabled: Bool
    var onLaunch: () -> Void
    var onChooseMission: () -> Void
    @State private var showSettings = false
    @State private var selectedSlot: String?
    @State private var notice = ""
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
            ZStack(alignment: .top) {
                landView(land)
                VStack(spacing: 8) {
                    HStack(alignment: .top) {
                        HudGearClock { showSettings = true }
                        Spacer(minLength: 8)
                        HudChips(francs: store.player.francs)
                    }
                    actions
                    MissionPlanStrip(sheet: $planSheet)
                    if guided {
                        Text(guidedSlot.map { id in "STEP \(fittedCount + 1) OF \(RocketBuilder.slots.count) · FIT YOUR \(RocketBuilder.slots.first { $0.id == id }?.label ?? "")" } ?? "ROCKET READY · PRESS LAUNCH")
                            .font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.paper)
                            .frame(maxWidth: .infinity, alignment: .leading).padding(10)
                            .background(Theme.blue, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2))
                    }
                    if !(customizing || guided) {
                        blueprint(fittedCount: fittedCount, numbers: numbers, row: true).frame(height: max(150, geo.size.height * 0.3))
                        Spacer(minLength: 0)
                    } else if wide {
                        HStack(alignment: .top, spacing: 8) {
                            blueprint(fittedCount: fittedCount, numbers: numbers, row: true).frame(width: geo.size.width * 0.3).frame(maxHeight: .infinity)
                            choices(active: active, guidedSlot: guidedSlot, loadout: loadout, compact: geo.size.height < 520)
                        }
                    } else {
                        blueprint(fittedCount: fittedCount, numbers: numbers, row: true).frame(height: max(150, geo.size.height * 0.26))
                        choices(active: active, guidedSlot: guidedSlot, loadout: loadout, compact: false)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 12)
                .padding(.bottom, 72)
                BaseDock(tile: 44, zones: HUDZones.standard.dock, onPrev: { store.go(.hub) })
                    .padding(.bottom, 8)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                if let sheet = planSheet {
                    MissionPlanSheet(sheet: sheet) { planSheet = nil }.frame(maxHeight: .infinity, alignment: .bottom).zIndex(2)
                }
            }
        }
        .background(Theme.paper)
                .overlay { if showSettings { SettingsSheet { showSettings = false } } }
    }

    private var actions: some View {
        // Back, Launch and Customize always fit; the Target card only joins them when there is room (the plan strip also names the destination).
        ViewThatFits(in: .horizontal) {
            actionsRow(showTarget: true)
            actionsRow(showTarget: false)
        }
    }

    private func actionsRow(showTarget: Bool) -> some View {
        HStack(alignment: .center, spacing: 8) {
            Button { store.go(.hub) } label: {
                Text("‹ BACK").font(AppFont.display(14, "Bold")).tracking(1.4).foregroundStyle(Theme.ink).lineLimit(1).fixedSize()
                    .padding(.horizontal, 16).frame(minHeight: 44)
                    .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.ink, lineWidth: 2))
            }.buttonStyle(.plain).accessibilityLabel("Back")
            Button(action: onLaunch) {
                Text(store.mission != nil && store.target != nil ? "LAUNCH" : "CONTRACTS").font(AppFont.display(14, "Bold")).tracking(1.4)
                    .frame(minWidth: 110, minHeight: 44).padding(.horizontal, 12)
                    .foregroundStyle(launchEnabled ? Theme.paper : Theme.ink)
                    .background(launchEnabled ? Theme.blue : Theme.paper2, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
            }
            .buttonStyle(.plain).disabled(!launchEnabled).accessibilityIdentifier("launch-btn")
            if !guided && store.mission != nil && store.target != nil {
                Button { customizing.toggle() } label: {
                    Text(customizing ? "DONE" : "CUSTOMIZE").font(AppFont.display(14, "Bold")).tracking(1.4).foregroundStyle(Theme.ink).lineLimit(1).fixedSize()
                        .padding(.horizontal, 16).frame(minHeight: 44)
                        .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.ink, lineWidth: 2))
                }.buttonStyle(.plain).accessibilityIdentifier("builder-customize")
            }
            Spacer(minLength: 4)
            if showTarget { Button(action: onChooseMission) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("TARGET").font(AppFont.display(14, "Bold")).tracking(1.4)
                    Text(store.target?.name ?? "Choose a mission").font(AppFont.body(14, "Bold")).lineLimit(1)
                }
                .foregroundStyle(Theme.ink)
                .frame(minWidth: 110, minHeight: 44, alignment: .leading).padding(.horizontal, 12)
                .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
            }.buttonStyle(.plain) }
        }
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
        ZStack(alignment: .bottom) {
            LinearGradient(colors: [land.skyTop, land.skyHorizon, land.ground], startPoint: .top, endPoint: .bottom)
            HStack {
                Image("scene-launchpad-plate-landscape-left").resizable().interpolation(.none).scaledToFit().frame(width: 160)
                Spacer()
                Image("scene-launchpad-plate-landscape-right").resizable().interpolation(.none).scaledToFit().frame(width: 140)
            }
            .padding(.bottom, 48)
            // Pieces stand on the horizon (web `.piece`: bottom 16%, left = x / period of the width).
            GeometryReader { g in
                ForEach(Array(land.pieces.enumerated()), id: \.offset) { _, piece in
                    Art.view("mining/terrain_\(piece.kind).png")
                        .resizable()
                        .interpolation(.none)
                        .scaledToFit()
                        .frame(width: 72, height: 72, alignment: .bottom)
                        .scaleEffect(x: (piece.flip ? -1 : 1) * piece.scale, y: piece.scale, anchor: .bottom)
                        .position(x: CGFloat(piece.x / land.period) * g.size.width, y: g.size.height * 0.84 - 36)
                }
            }
            // Drawn ground: the old plate had the part cards painted into it, which doubled the live list.
            land.ground.frame(height: 72)
            land.tint.opacity(0.38).blendMode(.multiply).allowsHitTesting(false)
        }
        .ignoresSafeArea()
    }

    private var tower: some View {
        Button(action: onChooseMission) {
            Image("scene-launchpad-tower").resizable().interpolation(.none).scaledToFit().frame(width: 88)
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        .padding(.leading, 12)
        .padding(.bottom, 120)
        .accessibilityLabel("Choose a mission")
    }

    private func blueprint(fittedCount: Int, numbers: (capacity: Int, range: Int, laser: Int), row: Bool) -> some View {
        HStack(spacing: 8) {
            Image("scene-launchpad-rocket-multistage").resizable().interpolation(.none).scaledToFit()
                .opacity(0.55 + Double(fittedCount) * 0.09)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            VStack(spacing: 6) {
                stat("CAPACITY", numbers.capacity)
                stat("RANGE", numbers.range)
                stat("LASER", numbers.laser)
            }.frame(width: 110)
        }
        .padding(10)
        .frame(minHeight: 0, maxHeight: .infinity)
        .background(Theme.blue)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 3))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Rocket blueprint")
    }

    private func stat(_ label: String, _ value: Int) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(label).font(AppFont.display(14, "Bold")).tracking(1)
            Text("\(value)").font(AppFont.display(20, "ExtraBold"))
        }
        .foregroundStyle(Theme.ink)
        .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 8).padding(.vertical, 4)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
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
