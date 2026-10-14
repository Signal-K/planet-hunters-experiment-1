import SwiftUI
import LandnamCore

/// Assembly bay. The plate is the room, the gantry holds the staged rocket, the
/// blueprint is the wall drawing, and the floor is a row of vehicle cards.
/// SwiftUI was written to match the web scene; this environment cannot compile it.
struct HangarScreen: View {
    @Environment(GameStore.self) private var store
    @State private var showSettings = false
    @State private var configuring = false
    @State private var launching = false
    @State private var focused = "explorer"
    private let zones = HUDZones.standard

    private var customizerUnlocked: Bool {
        store.player.unlockedSkillNodes.contains("ship-customizer-1")
            || store.player.crewModuleResearched
            || store.player.landingResearched
    }

    private var stagedInBay: Bool { store.player.stagedRockets.contains { $0.location == .hangar } }
    private var stagedOnPad: Bool { store.player.stagedRockets.contains { $0.location == .launchpad } }

    var body: some View {
        if launching {
            LaunchSequenceScreen(variant: focused == "explorer" ? "explorer" : "prospector") { store.launch() }
        } else if configuring {
            HangarModulesPanel(onClose: { configuring = false })
        } else {
            bay
                .overlay { if showSettings { SettingsSheet(onClose: { showSettings = false }) } }
        }
    }

    private var bay: some View {
        GeometryReader { geo in
            let short = geo.size.height < 500
            let narrow = geo.size.width < 720
            ZStack {
                Image("scene-hangar-plate-bay")
                    .resizable()
                    .interpolation(.none)
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
                    .saturation(1.18)
                    .hueRotation(.degrees(8))
                    .accessibilityHidden(true)
                    .overlay {
                        LinearGradient(
                            stops: [
                                .init(color: Theme.blueBright.opacity(0.18), location: 0),
                                .init(color: .clear, location: 0.46),
                                .init(color: Theme.blue.opacity(0.2), location: 1),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        .blendMode(.color)
                        .allowsHitTesting(false)
                    }
                assembly(in: geo)
            }
            .overlay(alignment: .topLeading) {
                blueprint(narrow: narrow, width: narrow ? min(156, geo.size.width * 0.4) : min(260, geo.size.width * 0.2))
                    .padding(.top, narrow ? 68 : 84)
                    .padding(.leading, narrow ? 12 : 28)
            }
            .overlay(alignment: .bottom) {
                cards(short: short, narrow: narrow)
                    .frame(maxWidth: short ? 520 : 1100)
                    .padding(.horizontal, narrow ? 12 : 24)
                    .padding(.bottom, short ? 58 : 76)
            }
            .overlay(alignment: .center) {
                if stagedInBay || stagedOnPad {
                    Button {
                        if stagedInBay { store.rollOutToPad() } else { launching = true }
                    } label: {
                        Color.clear
                            .frame(width: max(44, min(220, geo.size.width * 0.34)), height: max(44, min(280, geo.size.height * 0.42)))
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(stagedInBay ? "Roll out to pad" : "Launch")
                    .offset(y: short ? -36 : -48)
                }
            }
        .frame(width: geo.size.width, height: geo.size.height)
        .clipped()
        .overlay(alignment: .top) { hud(short: short) }
            .overlay(alignment: .bottom) {
                BaseDock(tile: 44, zones: zones.dock, onPrev: { store.go(.hub) }, onNext: { store.go(.launchpad) })
                    .padding(.bottom, short ? 4 : 8)
            }
        }
        .foregroundStyle(Theme.ink)
        .ignoresSafeArea()
        #if !os(macOS)
        .statusBarHidden()
        #endif
        .accessibilityElement(children: .contain)
    }

    private func assembly(in geo: GeometryProxy) -> some View {
        let height = geo.size.height * (geo.size.height < 500 ? 0.92 : 0.86)
        return Image("scene-hangar-sheet")
            .resizable()
            .interpolation(.none)
            .scaledToFill()
        .frame(width: geo.size.width, height: height * 1.34, alignment: .top)
        .frame(width: geo.size.width, height: height, alignment: .top)
        .clipped()
        .overlay {
            Rectangle()
                .fill(Theme.blue)
                .blendMode(.color)
                .opacity(0.5)
                .allowsHitTesting(false)
        }
        .mask(
            LinearGradient(stops: [
                .init(color: .black, location: 0),
                .init(color: .black, location: 0.72),
                .init(color: .clear, location: 1),
            ], startPoint: .top, endPoint: .bottom)
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func blueprint(narrow: Bool, width: CGFloat) -> some View {
        Button {
            if customizerUnlocked { configuring = true }
        } label: {
            Image("scene-hangar-blueprint-panel")
                .resizable()
                .interpolation(.none)
                .scaledToFit()
                .frame(width: width)
                .opacity(narrow ? 1 : 0.001)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("open-ship-customizer")
        .accessibilityLabel("Vehicle blueprint")
    }

    private func cards(short: Bool, narrow: Bool) -> some View {
        let vehicles: [(id: String, name: String)] = [
            ("explorer", "Explorer"),
            ("prospector", "Prospector"),
        ]
        return HStack(spacing: short ? 12 : 20) {
            ForEach(vehicles, id: \.id) { vehicle in
                Button { focused = vehicle.id } label: {
                    HangarRocketThumbnail(cargo: vehicle.id == "prospector")
                        .frame(maxWidth: .infinity)
                        .frame(height: short ? 48 : (narrow ? 88 : 120))
                        .padding(short ? 4 : 16)
                        .frame(maxWidth: .infinity, minHeight: short ? 64 : 120)
                        .background(Theme.paper2)
                        .overlay(Rectangle().stroke(focused == vehicle.id ? Theme.ink : Theme.blue, lineWidth: 3))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(vehicle.name)
            }
        }
    }

    private func hud(short: Bool) -> some View {
        HStack(alignment: .top, spacing: 8) {
            HudGearClock(onSettings: { showSettings = true })
            Spacer(minLength: 8)
            HudChips(francs: store.player.francs)
        }
        .padding(short ? 8 : 12)
    }
}

private struct HangarRocketThumbnail: View {
    let cargo: Bool

    var body: some View {
        Canvas { context, size in
            let transform = CGAffineTransform(scaleX: size.width / 210, y: size.height / 107)
            context.concatenate(transform)
            let outline = Theme.ink
            let hull = Theme.paper
            let blue = Theme.blue
            let glass = Theme.blueBright
            let asphalt = Theme.ink
            func polygon(_ points: [CGPoint], color: Color, lineWidth: CGFloat = 4) {
                var path = Path()
                path.addLines(points)
                path.closeSubpath()
                context.fill(path, with: .color(color))
                context.stroke(path, with: .color(outline), lineWidth: lineWidth)
            }
            polygon([CGPoint(x: 24, y: 42), CGPoint(x: 138, y: 42), CGPoint(x: 182, y: 53), CGPoint(x: 138, y: 65), CGPoint(x: 24, y: 65)], color: hull)
            polygon([CGPoint(x: 43, y: 42), CGPoint(x: 30, y: 26), CGPoint(x: 60, y: 42)], color: blue)
            polygon([CGPoint(x: 43, y: 65), CGPoint(x: 30, y: 81), CGPoint(x: 60, y: 65)], color: blue)
            let engine = Path(CGRect(x: 18, y: 44, width: 12, height: 19))
            context.fill(engine, with: .color(asphalt))
            context.stroke(engine, with: .color(outline), lineWidth: 3)
            context.fill(Path(CGRect(x: 110, y: 43, width: 10, height: 21)), with: .color(blue))
            let window = Path(roundedRect: CGRect(x: 76, y: 48, width: 13, height: 10), cornerRadius: 4)
            context.fill(window, with: .color(glass))
            context.stroke(window, with: .color(outline), lineWidth: 2)
            if cargo {
                polygon([CGPoint(x: 91, y: 30), CGPoint(x: 129, y: 30), CGPoint(x: 129, y: 42), CGPoint(x: 91, y: 42)], color: blue)
            }
        }
        .accessibilityHidden(true)
    }
}
