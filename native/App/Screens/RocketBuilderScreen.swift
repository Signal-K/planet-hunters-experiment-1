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

    var body: some View {
        let land = backdrop
        let numbers = RocketBuilder.stats(store.state, catalog: store.catalog)
        let fitted = RocketBuilder.fitted(store.player.shipCustomizerParts)
        let fittedCount = RocketBuilder.slots.filter { RocketBuilder.partId(store.player.shipCustomizerParts, slot: $0.id) != nil }.count
        GeometryReader { geo in
            let wide = geo.size.width > geo.size.height
            ZStack(alignment: .top) {
                landView(land)
                tower
                VStack(spacing: 8) {
                    HStack(alignment: .top) {
                        HudGearClock { showSettings = true }
                        Spacer(minLength: 8)
                        HudChips(francs: store.player.francs)
                    }
                    HStack(alignment: .top, spacing: 8) {
                        Button(action: onLaunch) {
                            Text("LAUNCH").font(AppFont.display(14, "Bold")).tracking(1.4)
                                .frame(minWidth: 132, minHeight: 44)
                                .padding(.horizontal, 12)
                                .foregroundStyle(launchEnabled ? Theme.paper : Theme.ink)
                                .background(launchEnabled ? Theme.blue : Theme.paper2, in: RoundedRectangle(cornerRadius: 8))
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                        }
                        .buttonStyle(.plain)
                        .disabled(!launchEnabled)
                        .accessibilityIdentifier("launch-btn")
                        Spacer(minLength: 8)
                        Button(action: onChooseMission) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("TARGET").font(AppFont.display(14, "Bold")).tracking(1.4)
                                Text(store.target?.name ?? "Choose a mission").font(AppFont.body(14, "Bold")).lineLimit(1)
                            }
                            .foregroundStyle(Theme.ink)
                            .frame(minWidth: 132, minHeight: 44, alignment: .leading)
                            .padding(.horizontal, 12)
                            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                        }
                        .buttonStyle(.plain)
                    }
                    blueprint(fitted: fitted, fittedCount: fittedCount, numbers: numbers, short: geo.size.height < 520 || wide)
                    tray
                }
                .padding(.horizontal, 12)
                .padding(.top, 12)
                .padding(.bottom, 72)
                BaseDock(tile: 44, zones: HUDZones.standard.dock, onPrev: { store.go(.hub) })
                    .padding(.bottom, 8)
                    .frame(maxHeight: .infinity, alignment: .bottom)
            }
        }
        .background(Theme.paper)
        .sheet(isPresented: $showSettings) { SettingsSheet { showSettings = false } }
    }

    private var backdrop: (skyTop: Color, skyHorizon: Color, ground: Color, tint: Color, pieces: [Landscape.Piece], period: Double) {
        let target = store.target
        let palette = target.map { LaserPalette.resolve(id: $0.id, type: $0.type, archetype: $0.archetype) } ?? LaserPalette.named("mars")
        let layout = Landscape.layout(palette.landscape, key: target?.id ?? "earth-base")
        return (
            lifted(palette.skyTop, 0.84),
            lifted(palette.skyHorizon, 0.72),
            lifted(palette.ground, 0.35),
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
            ForEach(Array(land.pieces.enumerated()), id: \.offset) { _, piece in
                Art.view("mining/terrain_\(piece.kind).png")
                    .resizable()
                    .interpolation(.none)
                    .scaledToFit()
                    .frame(width: 72)
                    .scaleEffect(x: (piece.flip ? -1 : 1) * piece.scale, y: piece.scale, anchor: .bottom)
                    .position(x: CGFloat(piece.x / land.period) * 800, y: 0)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .padding(.bottom, 36)
            }
            Image("scene-launchpad-plate-ground").resizable().interpolation(.none).scaledToFill().frame(height: 72).clipped()
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

    private func blueprint(fitted: [String: Bool], fittedCount: Int, numbers: (capacity: Int, range: Int, laser: Int), short: Bool) -> some View {
        VStack(spacing: 8) {
            HStack(alignment: .center, spacing: 8) {
                Image("scene-launchpad-rocket-multistage")
                    .resizable()
                    .interpolation(.none)
                    .scaledToFit()
                    .opacity(0.45 + Double(fittedCount) * 0.11)
                    .frame(maxWidth: .infinity, maxHeight: short ? 160 : 360)
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(RocketBuilder.modules, id: \.id) { module in
                        Text(module.label)
                            .font(AppFont.display(14, "Bold"))
                            .tracking(1.2)
                            .foregroundStyle(Theme.ink)
                            .padding(.horizontal, 8)
                            .frame(maxWidth: .infinity, minHeight: 28, alignment: .leading)
                            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 6))
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(selectedSlot == module.id || (module.id == "engines" && selectedSlot == "engine") ? Theme.blue : Theme.ink, lineWidth: 2))
                            .opacity(fitted[module.id] == true ? 1 : 0.55)
                    }
                }
                .frame(width: short ? 132 : 168)
            }
            HStack(spacing: 16) {
                Text("CAPACITY \(numbers.capacity)")
                Text("RANGE \(numbers.range)")
                Text("LASER \(numbers.laser)")
            }
            .font(AppFont.display(14, "Bold"))
            .tracking(1.2)
            .foregroundStyle(Theme.ink)
            .frame(maxWidth: .infinity, minHeight: 36, alignment: .leading)
            .padding(.horizontal, 10)
            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
            if !notice.isEmpty {
                Text(notice).font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.ink).frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            Image("scene-launchpad-blueprint-panel").resizable().interpolation(.none).scaledToFill()
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 3))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Rocket blueprint")
    }

    private var tray: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(RocketBuilder.slots, id: \.id) { slot in
                    let part = RocketBuilder.partId(store.player.shipCustomizerParts, slot: slot.id)
                    let locked = RocketBuilder.nextId(slot.id, loadout: store.player.shipCustomizerParts, missionsDone: store.player.missionsDone) == nil && part == nil
                    Button {
                        selectedSlot = slot.id
                        if locked {
                            notice = "LOCKED"
                        } else if store.installBuilderPart(slot.id) {
                            notice = ""
                        } else {
                            notice = "CANNOT AFFORD THIS PART"
                        }
                    } label: {
                        VStack(spacing: 4) {
                            cardImage(slot.id)
                            Text(slot.label).font(AppFont.display(14, "Bold")).tracking(1.1).foregroundStyle(Theme.ink)
                        }
                        .frame(width: 132, height: 112)
                        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(selectedSlot == slot.id ? Theme.blue : Theme.ink, lineWidth: selectedSlot == slot.id ? 3 : 2))
                        .opacity(locked ? 0.55 : 1)
                    }
                    .buttonStyle(.plain)
                    .disabled(locked)
                }
            }
        }
        .frame(height: 120)
    }

    @ViewBuilder private func cardImage(_ slot: String) -> some View {
        let name: String = switch slot {
        case "engine": "scene-launchpad-card-engine"
        case "fuel-tank": "scene-launchpad-card-fuel-tank"
        case "cargo-hold": "scene-launchpad-card-cargo-hold"
        case "mining-laser": "scene-launchpad-card-mining-laser"
        default: "scene-launchpad-card-booster"
        }
        Image(name).resizable().interpolation(.none).scaledToFit().frame(height: 64)
    }

    /// Pull a palette colour toward blueprint paper. Orange leans cool toward blue.
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
