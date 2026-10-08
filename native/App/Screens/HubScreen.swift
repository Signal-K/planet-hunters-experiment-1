import SwiftUI
import LandnamCore

/// Earth Base: the terrain scene with the player's structures standing on it, a francs chip and
/// contract card top-left, friends/settings top-right and one floating dock bottom-centre.
/// HUD positions come from `HUDZones` (shared/layout/base-hud-zones.json), measured from the safe area.
struct HubScreen: View {
    @Environment(GameStore.self) private var store
    /// Snapshots have no real safe area; fixtures pass the device insets they want to show.
    var safeAreaOverride: EdgeInsets?
    @State private var showSettings = false
    @State private var showFriends = false
    @State private var showLocations = false
    private let zones = HUDZones.standard

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height
            let insets = safeAreaOverride ?? geo.safeAreaInsets
            let portrait = h > w * 1.3
            let ground = portrait ? 0.36 : 0.28
            // Landscape keeps the middle clear for the bottom-centre dock.
            let xs: [CGFloat] = portrait ? [0.17, 0.46, 0.79] : [0.20, 0.72, 0.90]
            let k = min(max(w / 402, 0.8), h / 874 * 1.25 + 0.6)
            let groundY = h * (1 - ground)
            ZStack(alignment: .topLeading) {
                TerrainScene(composition: .earthBaseWide, ground: ground)
                PlanetBackdrop().frame(width: w, height: groundY).allowsHitTesting(false)
                building("Launchpad", sprite: "base/launchpad_flat.png", aspect: 192.0 / 318, width: 84 * k * 0.62,
                         x: w * xs[0], groundY: groundY + 2 * k) { store.go(.launchpad) }
                building("Hangar", sprite: "base/hangar_flat.png", aspect: 182.0 / 155, width: 176 * k * 0.62,
                         x: w * xs[1], groundY: groundY + 2 * k) { store.go(.hangar) }
                // The Commodity Exchange is the only way into the Market: a real, tappable base structure.
                building("Exchange", sprite: "base/exchange_flat.png", aspect: 1153.0 / 461, width: 210 * k * 0.62,
                         x: w * xs[2], groundY: groundY + 2 * k) { store.go(.market) }
                ForEach(["surface-silo", "refinery", "astronaut-academy"], id: \.self) { kind in
                    if let plot = store.player.placementPlots[kind], store.player.placed.contains(kind) {
                        placedStructure(kind, plot: plot, width: w, groundY: groundY, k: k, portrait: portrait)
                    }
                }
                BaseTraffic(width: w, groundY: groundY, k: k).allowsHitTesting(false)
                subsurfaceHotspot(x: w * (portrait ? 0.28 : 0.33), groundY: groundY - 22 * k)
                skyCraft(width: w, height: h)
                topLeftHud(insets: insets, portrait: portrait)
                topRightHud(insets: insets)
                dock.padding(.bottom, insets.bottom + zones.dock.bottomInset)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            }
        }
        .background(Theme.bg)
        .ignoresSafeArea()
        .sheet(isPresented: $showSettings) { SettingsSheet(onClose: { showSettings = false }) }
        .sheet(isPresented: $showFriends) { FriendsSheet(onClose: { showFriends = false }) }
    }

    private func topLeftHud(insets: EdgeInsets, portrait: Bool) -> some View {
        let z = zones.topLeft
        return VStack(alignment: .leading, spacing: z.gap) {
            HStack(spacing: 8) {
                Image(systemName: "f.circle.fill").font(.system(size: 24, weight: .bold)).foregroundStyle(Theme.hudInk)
                Text(Economy.format(francs: store.player.francs)).font(AppFont.mono(16)).foregroundStyle(Theme.hudInk)
            }
            .padding(.horizontal, 12).frame(minHeight: z.francsChip.height)
            .hudPanel()
            .accessibilityElement(children: .combine)
            ContractCard(width: z.contractCard.width, collapsible: portrait && z.contractCard.collapseInPortrait)
            SkyEventChip()
        }
        .padding(.leading, insets.leading + z.inset).padding(.top, insets.top + z.inset)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func topRightHud(insets: EdgeInsets) -> some View {
        let z = zones.topRight
        return HStack(spacing: 0) {
            Button { showFriends = true } label: { hudGlyph("person.2.fill", z.pill.buttonSize) }
                .buttonStyle(.plain).accessibilityLabel("Friends")
            Button { showSettings = true } label: { hudGlyph("gearshape.fill", z.pill.buttonSize) }
                .buttonStyle(.plain).accessibilityLabel("Settings")
        }
        .padding(2).hudPanel()
        .padding(.trailing, insets.trailing + z.inset).padding(.top, insets.top + z.inset)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }

    private func hudGlyph(_ symbol: String, _ size: CGFloat) -> some View {
        Image(systemName: symbol).font(.system(size: 20, weight: .black)).foregroundStyle(Theme.hudInk)
            .frame(width: size, height: size).contentShape(Rectangle())
    }

    /// Small ground hotspot that opens the subsurface level (no dock tile for it).
    /// TODO: native has no separate subsurface scene yet; `.hubSubsurface` renders this same base screen.
    private func subsurfaceHotspot(x: CGFloat, groundY: CGFloat) -> some View {
        Button { store.go(.hubSubsurface) } label: {
            Image(systemName: "arrow.down.to.line").font(.system(size: 18, weight: .black)).foregroundStyle(Theme.hudInk)
                .frame(width: 44, height: 44).hudPanel(radius: 10)
        }
        .buttonStyle(.plain)
        .position(x: x, y: groundY)
        .accessibilityLabel("Open the subsurface")
    }

    /// Storyboard 2026-09-24: a craft that needs a tap hangs in the sky and opens its mission step.
    private func skyCraft(width: CGFloat, height: CGFloat) -> some View {
        TimelineView(.periodic(from: .now, by: 1)) { _ in
            if let craft = SkyCraft.current(for: store.player, now: store.now) {
                ZStack {
                    Capsule().fill(Theme.blue.opacity(0.6)).offset(x: 3, y: 3)
                    Button { store.go(craft.opens) } label: {
                        HStack(spacing: 8) {
                            Image(systemName: craft.state == .waiting ? "arrow.up.circle" : "paperplane.fill").font(.system(size: 16, weight: .bold))
                            Text(craft.label).font(AppFont.display(14)).tracking(1.2)
                        }
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 14).frame(minHeight: 44)
                        .background(Capsule().fill(Theme.paper))
                        .overlay(Capsule().stroke(Theme.border, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(craft.accessibilityLabel)
                }
                .fixedSize()
                .position(x: width * 0.5, y: height * 0.34)
            }
        }
    }

    /// Player-placed structures stand on the four apron plots, nearer the camera than the main buildings.
    @ViewBuilder private func placedStructure(_ kind: String, plot: Int, width w: CGFloat, groundY: CGFloat, k: CGFloat, portrait: Bool) -> some View {
        let x = w * (portrait ? [0.15, 0.38, 0.62, 0.85] : [0.08, 0.30, 0.70, 0.92] as [CGFloat])[min(max(plot, 0), 3)], y = groundY + 92 * k
        switch kind {
        case "refinery":
            structure("Refinery", art: StructureShape(kind: .refinery), width: 70 * k, x: x, groundY: y) { store.go(.refinery) }
        case "astronaut-academy":
            structure("Academy", art: StructureShape(kind: .academy), width: 70 * k, x: x, groundY: y) { store.go(.academy) }
        default:
            building("Silo", sprite: "base/surface_silo_flat.png", aspect: 192.0 / 205, width: 62 * k * 0.62, x: x, groundY: y) { store.go(.market) }
        }
    }

    private func structure(_ name: String, art: StructureShape, width: CGFloat, x: CGFloat, groundY: CGFloat, tap: @escaping () -> Void) -> some View {
        Button(action: tap) {
            VStack(spacing: 4) {
                art.frame(width: width, height: width * 0.8)
                Text(name.uppercased()).font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.ink)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.border, lineWidth: 1))
            }
        }
        .buttonStyle(.plain)
        .position(x: x, y: groundY - width * 0.4 + 18)
    }

    private func building(_ name: String, sprite: String, aspect: CGFloat, width: CGFloat, x: CGFloat, groundY: CGFloat, tap: @escaping () -> Void) -> some View {
        Button(action: tap) {
            VStack(spacing: 4) {
                Art.view(sprite).resizable().interpolation(.high).aspectRatio(aspect, contentMode: .fit).frame(width: width)
                Text(name.uppercased()).font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.ink)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.border, lineWidth: 1))
            }
        }
        .buttonStyle(.plain)
        .position(x: x, y: groundY - width / aspect / 2 + 18)
    }

    /// Locations the player can jump to: a craft that needs a tap, plus every settlement they own.
    /// TODO: no combined settlement + mission location list exists in core yet; this reads the same
    /// sources the old « » and the Surface Ops screen use. Replace with the real list when it lands.
    private var quickLocations: [(title: String, screen: Screen)] {
        var out: [(String, Screen)] = []
        if let craft = SkyCraft.current(for: store.player, now: store.now) { out.append((craft.accessibilityLabel, craft.opens)) }
        for site in SurfaceOps.sites where SurfaceOps.progress(store.player, site.id).siteAccessPurchasedAt != nil {
            out.append((site.name, .surfaceOps))
        }
        return out
    }

    /// One floating dock, bottom-centre: « » quick access, Build, Hub.
    private var dock: some View {
        let tile = zones.dock.tileSize
        let locations = quickLocations
        return HStack(alignment: .top, spacing: 12) {
            Button {
                if locations.count == 1, let only = locations.first { store.go(only.screen) } else { showLocations = true }
            } label: {
                dockTile(tile, label: nil) { Text("«»").font(AppFont.display(28)).foregroundStyle(Theme.hudInk) }
            }
            .buttonStyle(.plain)
            .disabled(locations.isEmpty).opacity(locations.isEmpty ? 0.4 : 1)
            .accessibilityLabel("Go to a settlement or mission location")
            .confirmationDialog("Go to", isPresented: $showLocations, titleVisibility: .visible) {
                ForEach(Array(locations.enumerated()), id: \.offset) { _, loc in
                    Button(loc.title) { store.go(loc.screen) }
                }
            }
            Button { store.go(.build) } label: {
                dockTile(tile, label: "Build") { Image(systemName: "hammer.fill").font(.system(size: 28, weight: .black)).foregroundStyle(Theme.hudInk) }
            }.buttonStyle(.plain).accessibilityLabel("Build")
            Button { store.go(.instrumentHub) } label: {
                dockTile(tile, label: "Hub") { Image(systemName: "globe").font(.system(size: 28, weight: .bold)).foregroundStyle(Theme.hudInk) }
            }.buttonStyle(.plain).accessibilityLabel("Open the instrument hub")
        }
        .padding(8).hudPanel(radius: 14)
    }

    private func dockTile<Glyph: View>(_ size: CGFloat, label: String?, @ViewBuilder glyph: () -> Glyph) -> some View {
        VStack(spacing: 4) {
            glyph().frame(width: size, height: size).hudPanel(radius: 12)
            Text((label ?? " ").uppercased()).font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.hudInk).lineLimit(1)
        }
    }
}

/// Contract card: active mission title plus progress. In portrait it collapses to a chip that expands on tap.
private struct ContractCard: View {
    @Environment(GameStore.self) private var store
    let width: CGFloat
    let collapsible: Bool
    @State private var expanded = false

    private var title: String { store.player.activeMission?.label ?? "Free Ops: pick a contract" }
    private var progress: Double {
        guard store.player.activeMission != nil else { return 0 }
        switch store.player.missionPhase ?? .transit {
        case .transit: return 0.2
        case .landing: return 0.4
        case .mining: return 0.6
        case .delivery: return 0.8
        case .debrief: return 0.9
        }
    }

    var body: some View {
        if collapsible && !expanded { chip } else { card }
    }

    private var chip: some View {
        Button { expanded = true } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(AppFont.display(14)).foregroundStyle(Theme.hudInk).lineLimit(1)
                HudBar(value: progress)
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .frame(width: width, alignment: .leading).frame(minHeight: 44).hudPanel()
        }
        .buttonStyle(.plain).accessibilityLabel("Contract: \(title). Tap to expand")
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("CONTRACT").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.hudMint)
                .padding(.horizontal, 12).frame(height: 24)
                .background(Theme.hudInk, in: UnevenRoundedRectangle(topLeadingRadius: 8, topTrailingRadius: 8))
            VStack(alignment: .leading, spacing: 8) {
                Button { if collapsible { expanded = false } else { store.go(.missions) } } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(title).font(AppFont.display(14)).foregroundStyle(Theme.hudInk).multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                        HudBar(value: progress)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(collapsible ? "Collapse contract" : "Open contracts")
                if collapsible {
                    Button { store.go(.missions) } label: {
                        Text("OPEN CONTRACTS").font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.hudInk)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(Theme.hudMint, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.hudInk, lineWidth: 1.5))
                    }.buttonStyle(.plain)
                }
            }
            .padding(10)
            .background(Theme.hudPanel, in: UnevenRoundedRectangle(bottomLeadingRadius: 12, bottomTrailingRadius: 12, topTrailingRadius: 12))
            .overlay(UnevenRoundedRectangle(bottomLeadingRadius: 12, bottomTrailingRadius: 12, topTrailingRadius: 12).stroke(Theme.hudInk, lineWidth: 1.5))
        }
        .frame(width: width)
    }
}

private struct HudBar: View {
    let value: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.hudTrack)
                Capsule().fill(Theme.hudMint).frame(width: g.size.width * min(1, max(0, value)))
            }.overlay(Capsule().stroke(Theme.hudInk, lineWidth: 1))
        }.frame(height: 10).accessibilityValue("\(Int(min(1, max(0, value)) * 100)) percent")
    }
}

extension View {
    /// White rounded panel with a thin black outline (base HUD surface).
    func hudPanel(radius: CGFloat = 12) -> some View {
        background(Theme.hudPanel, in: RoundedRectangle(cornerRadius: radius))
            .overlay(RoundedRectangle(cornerRadius: radius).stroke(Theme.hudInk, lineWidth: 1.5))
    }
}

/// Settings gear destination: the screens the old MENU dock button listed.
private struct SettingsSheet: View {
    @Environment(GameStore.self) private var store
    let onClose: () -> Void

    private var destinations: [Screen] {
        Screen.allCases.filter { !$0.needsMissionContext && $0 != .hub && $0 != .hubSubsurface && $0 != .missions && $0 != .market }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("SETTINGS").font(AppFont.display(18)).tracking(1.4).foregroundStyle(Theme.hudInk)
                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark").font(.system(size: 18, weight: .black)).foregroundStyle(Theme.hudInk)
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel("Close")
            }.padding(.horizontal, 16).padding(.top, 8)
            ScrollView {
                VStack(spacing: 8) {
                    row("Missions", .missions)
                    ForEach(destinations, id: \.self) { row($0.rawValue.replacingOccurrences(of: "-", with: " ").capitalized, $0) }
                }.padding(16)
            }
        }
        .background(Theme.bg)
        .presentationDetents([.medium, .large])
    }

    private func row(_ title: String, _ screen: Screen) -> some View {
        Button { onClose(); store.go(screen) } label: {
            HStack {
                Text(title.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.hudInk)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 14, weight: .bold)).foregroundStyle(Theme.hudInk)
            }
            .padding(.horizontal, 14).frame(maxWidth: .infinity, minHeight: 48).hudPanel(radius: 10)
        }.buttonStyle(.plain)
    }
}

/// TODO: friends are not ported to native yet (web: FriendsSheet / lib/friends/client.ts).
private struct FriendsSheet: View {
    let onClose: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("FRIENDS").font(AppFont.display(18)).tracking(1.4).foregroundStyle(Theme.hudInk)
                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark").font(.system(size: 18, weight: .black)).foregroundStyle(Theme.hudInk)
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel("Close")
            }
            Text("Friends are not available in the native app yet.").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
            Spacer()
        }
        .padding(16).background(Theme.bg)
        .presentationDetents([.medium])
    }
}

/// Layer part: a huge outlined planet hanging in the sky behind the base
/// (reference frame "side-on base"). Ink outline, offset shade, ice/cyan bands only.
private struct PlanetBackdrop: View {
    var body: some View {
        GeometryReader { geo in
            let d = min(geo.size.width * 0.62, geo.size.height * 0.5)
            let c = CGPoint(x: geo.size.width * 0.70, y: geo.size.height * 0.34)
            ZStack {
                Circle().fill(Theme.blue.opacity(0.35)).frame(width: d, height: d).offset(x: 5, y: 5)
                Circle().fill(Theme.paper2).frame(width: d, height: d)
                ZStack {
                    ForEach(0..<3, id: \.self) { i in
                        Capsule().fill((i == 1 ? Theme.teal : Theme.blueBright).opacity(0.45))
                            .frame(width: d, height: d * 0.09)
                            .offset(y: d * (-0.18 + 0.17 * CGFloat(i)))
                    }
                }
                .frame(width: d, height: d).clipShape(Circle())
                Circle().stroke(Theme.ink, lineWidth: 3).frame(width: d, height: d)
            }
            .frame(width: d, height: d)
            .position(c)
        }
    }
}

/// Layer part: ambient base traffic. An outlined road rover loops along the apron (mirrors web RoadRover).
private struct BaseTraffic: View {
    let width: CGFloat, groundY: CGFloat, k: CGFloat
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: reduceMotion)) { ctx in
            let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
            let roverW = 56 * k
            let drive = CGFloat(t.truncatingRemainder(dividingBy: 18) / 18)
            ZStack(alignment: .topLeading) {
                Art.view("actors/road_rover.png").resizable().aspectRatio(1.5, contentMode: .fit).frame(width: roverW)
                    .position(x: -roverW + drive * (width + roverW * 2), y: groundY + 6 * k - roverW / 3)
            }
        }
    }
}

/// Blueprint-outlined stand-ins for structures with no sprite (the web Hub draws none either):
/// paper body, offset ice shade, 2.5pt ink outline.
private struct StructureShape: View {
    enum Kind { case refinery, academy }
    let kind: Kind

    var body: some View {
        Canvas { ctx, size in
            let w = size.width, h = size.height
            func outlined(_ path: Path, fill: Color) {
                ctx.fill(path.offsetBy(dx: 3, dy: 3), with: .color(Theme.blue.opacity(0.35)))
                ctx.fill(path, with: .color(fill))
                ctx.stroke(path, with: .color(Theme.ink), lineWidth: 2.5)
            }
            switch kind {
            case .refinery:
                outlined(Path(CGRect(x: 0, y: h * 0.45, width: w * 0.62, height: h * 0.55)), fill: Theme.paper)
                outlined(Path(CGRect(x: w * 0.12, y: h * 0.08, width: w * 0.12, height: h * 0.4)), fill: Theme.paper2)
                outlined(Path(CGRect(x: w * 0.36, y: h * 0.22, width: w * 0.1, height: h * 0.26)), fill: Theme.paper2)
                outlined(Path(roundedRect: CGRect(x: w * 0.68, y: h * 0.4, width: w * 0.32, height: h * 0.6), cornerRadius: 8), fill: Theme.paper2)
                ctx.fill(Path(CGRect(x: w * 0.06, y: h * 0.62, width: w * 0.5, height: h * 0.1)), with: .color(Theme.teal))
            case .academy:
                outlined(Path(CGRect(x: 0, y: h * 0.5, width: w, height: h * 0.5)), fill: Theme.paper)
                var dome = Path()
                dome.addArc(center: CGPoint(x: w * 0.5, y: h * 0.5), radius: w * 0.3, startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
                dome.closeSubpath()
                outlined(dome, fill: Theme.paper2)
                var mast = Path(); mast.move(to: CGPoint(x: w * 0.5, y: h * 0.2)); mast.addLine(to: CGPoint(x: w * 0.5, y: h * 0.02))
                ctx.stroke(mast, with: .color(Theme.ink), lineWidth: 2.5)
                ctx.fill(Path(CGRect(x: w * 0.5, y: h * 0.02, width: w * 0.16, height: h * 0.1)), with: .color(Theme.teal))
                for i in 0..<3 { ctx.fill(Path(CGRect(x: w * (0.14 + 0.28 * Double(i)), y: h * 0.68, width: w * 0.16, height: h * 0.18)), with: .color(Theme.blueBright.opacity(0.7))) }
            }
        }
        .accessibilityHidden(true)
    }
}
