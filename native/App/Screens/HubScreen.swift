import SwiftUI
import LandnamCore

/// Earth Base: the terrain scene with the player's structures standing on it, a francs chip and
/// contract card top-left, friends/settings top-right and one floating dock bottom-centre.
/// HUD positions come from `HUDZones` (shared/layout/base-hud-zones.json), measured from the safe area.
struct HubScreen: View {
    @Environment(GameStore.self) private var store
    /// Snapshots have no real safe area; fixtures pass the device insets they want to show.
    var safeAreaOverride: EdgeInsets?
    /// The default mountains biome is the web terrain kit. Other biomes are future kit variants; their layered assets stay unused for now.
    var biome: EarthBiome = .resolve()
    @State private var showSettings = false
    private let zones = HUDZones.standard

    var body: some View {
        // Read the real safe area from the outer proxy, then draw edge to edge at the full size.
        // (ignoresSafeArea on the reader itself zeroes the insets, which put the HUD under the status bar; the reader keeps them and the scene is positioned out past them.)
        GeometryReader { outer in
            let insets = safeAreaOverride ?? outer.safeAreaInsets
            let full = safeAreaOverride != nil ? outer.size
                : CGSize(width: outer.size.width + insets.leading + insets.trailing, height: outer.size.height + insets.top + insets.bottom)
            let origin = safeAreaOverride != nil ? CGSize.zero : CGSize(width: insets.leading, height: insets.top)
            scene(size: full, insets: insets)
                .frame(width: full.width, height: full.height)
                .position(x: full.width / 2 - origin.width, y: full.height / 2 - origin.height)
        }
        .background(Theme.bg.ignoresSafeArea())
        .sheet(isPresented: $showSettings) { SettingsSheet(onClose: { showSettings = false }) }
    }

    private func scene(size: CGSize, insets: EdgeInsets) -> some View {
        let layout = BaseLayout(size: size, insets: insets, zones: zones, hasPlaced: !store.player.placed.isEmpty)
        let portrait = layout.portrait
        return ZStack(alignment: .topLeading) {
            BaseWorldScene(
                placed: store.player.placed,
                plots: store.player.placementPlots,
                levels: store.player.buildingLevels,
                onStructure: { openStructure($0) },
                onShaft: { store.go(.hubSubsurface) }
            )
            skyCraft(width: size.width, height: size.height)
            topLeftHud(insets: insets, portrait: portrait)
            topRightHud(insets: insets)
            BaseDock(tile: layout.tile, zones: zones.dock)
                .padding(.bottom, insets.bottom + zones.dock.bottomInset)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
    }

    private func openStructure(_ kind: String) {
        switch kind {
        case "launchpad": store.go(.launchpad)
        case "hangar", "garage": store.go(.hangar)
        case "refinery": store.go(.refinery)
        case "astronaut-academy": store.go(.academy)
        case "command": store.go(.instrumentHub)
        default: break
        }
    }

    private func topLeftHud(insets: EdgeInsets, portrait: Bool) -> some View {
        let z = zones.topLeft
        return VStack(alignment: .leading, spacing: z.gap) {
            HStack(spacing: 8) {
                Button { showSettings = true } label: {
                    hudGlyph("gearshape.fill", 44)
                        .background(Circle().fill(Theme.hudPanel))
                        .overlay(Circle().stroke(Theme.hudInk, lineWidth: 2))
                }
                .buttonStyle(.plain).accessibilityLabel("Settings")
                TimelineView(.periodic(from: .now, by: 30)) { ctx in
                    HStack(spacing: 6) {
                        Image(systemName: "clock").font(.system(size: 16, weight: .bold))
                        Text(ctx.date.formatted(date: .omitted, time: .shortened)).font(AppFont.mono(14))
                    }
                    .foregroundStyle(Theme.hudInk)
                    .padding(.horizontal, 12)
                    .frame(minWidth: 44, minHeight: 44)
                    .background(Capsule().fill(Theme.hudPanel))
                    .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 2))
                }
                .accessibilityLabel("Clock")
            }
            if store.player.activeMission != nil {
                ContractCard(width: z.contractCard.width, collapsible: portrait && z.contractCard.collapseInPortrait)
            }
            SkyEventChip()
        }
        .padding(.leading, insets.leading + z.inset).padding(.top, insets.top + z.inset)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func topRightHud(insets: EdgeInsets) -> some View {
        let z = zones.topRight
        return HStack(spacing: 8) {
            Text(Economy.format(francs: store.player.francs)).font(AppFont.mono(14)).foregroundStyle(Theme.hudInk)
                .padding(.horizontal, 12).frame(minWidth: 44, minHeight: 44)
                .background(Capsule().fill(Theme.hudPanel))
                .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 2))
                .accessibilityLabel("Francs")
            hudGlyph("cube.fill", 44)
                .background(Circle().fill(Theme.hudPanel))
                .overlay(Circle().stroke(Theme.hudInk, lineWidth: 2))
                .accessibilityLabel("Cargo")
        }
        .padding(.trailing, insets.trailing + z.inset).padding(.top, insets.top + z.inset)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }

    private func hudGlyph(_ symbol: String, _ size: CGFloat) -> some View {
        Image(systemName: symbol).font(.system(size: 18, weight: .black)).foregroundStyle(Theme.hudInk)
            .frame(width: size, height: size).contentShape(Rectangle())
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

}

/// Contract card: active mission title plus progress. In portrait it collapses to a chip that expands on tap.
private struct ContractCard: View {
    @Environment(GameStore.self) private var store
    let width: CGFloat
    let collapsible: Bool
    @State private var expanded = false

    private var title: String { store.player.activeMission?.label ?? "" }
    private var progress: Double {
        guard store.player.activeMission != nil else { return 0 }
        switch store.player.missionPhase ?? .transit {
        case .transit: return 0.2
        case .landing: return 0.4
        case .survey: return 0.5
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
    @Environment(AuthModel.self) private var auth
    @State private var showArchive = false
    @State private var confirmSignOut = false
    #if os(iOS)
    @AppStorage(OrientationPreference.storageKey) private var orientation = OrientationPreference.auto.rawValue
    #endif
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
                    #if os(iOS)
                    orientationPicker
                    #endif
                    row("Missions", .missions)
                    ForEach(destinations, id: \.self) { row($0.rawValue.replacingOccurrences(of: "-", with: " ").capitalized, $0) }
                    action("Archive: pathways and unlocks") { showArchive = true }
                    if let email = auth.session?.email {
                        Text("Signed in as \(email)").font(AppFont.display(14)).foregroundStyle(Theme.textDim)
                    }
                    action("Sign out") { confirmSignOut = true }
                }.padding(16)
            }
        }
        .sheet(isPresented: $showArchive) { ArchiveScreen() }
        .confirmationDialog("Sign out?", isPresented: $confirmSignOut, titleVisibility: .visible) {
            Button("Sign out", role: .destructive) { auth.signOut() }
            Button("Stay signed in", role: .cancel) {}
        } message: {
            Text("Your progress stays saved on this device and in the cloud. Sign back in to continue.")
        }
        .background(Theme.bg)
        .presentationDetents([.medium, .large])
    }

    #if os(iOS)
    private var orientationPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SCREEN ORIENTATION").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.hudInk)
            HStack(spacing: 8) {
                ForEach(OrientationPreference.allCases) { option in
                    let on = OrientationPreference(stored: orientation) == option
                    Button { orientation = option.rawValue } label: {
                        Text(option.title.uppercased()).font(AppFont.display(14)).tracking(1.0)
                            .foregroundStyle(on ? Theme.hudPanel : Theme.hudInk)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(on ? Theme.hudInk : Color.clear, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.hudInk, lineWidth: 1.5))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Orientation \(option.title)")
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
        .padding(14).frame(maxWidth: .infinity, alignment: .leading).hudPanel(radius: 10)
    }
    #endif

    private func row(_ title: String, _ screen: Screen) -> some View {
        action(title) { onClose(); store.go(screen) }
    }

    private func action(_ title: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            HStack {
                Text(title.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.hudInk)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 14, weight: .bold)).foregroundStyle(Theme.hudInk)
            }
            .padding(.horizontal, 14).frame(maxWidth: .infinity, minHeight: 48).hudPanel(radius: 10)
        }.buttonStyle(.plain)
    }
}
