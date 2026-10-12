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
    @State private var camera: BaseCamera
    private let zones = HUDZones.standard

    /// `startX` / `startDepth` set the opening camera (fixtures and screenshots); the game starts at the surface, x 0.
    init(safeAreaOverride: EdgeInsets? = nil, biome: EarthBiome = .resolve(), startX: CGFloat = 0, startDepth: CGFloat = 0) {
        self.safeAreaOverride = safeAreaOverride
        self.biome = biome
        _camera = State(initialValue: BaseCamera(x: startX, depth: startDepth))
    }

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
                oreFraction: oreFraction,
                insets: insets,
                camera: camera,
                onStructure: { openStructure($0) },
                onShaft: { store.go(.hubSubsurface) },
                onBuildSilo: { buildSilo() }
            )
            skyCraft(width: size.width, height: size.height)
            topLeftHud(insets: insets, portrait: portrait)
            topRightHud(insets: insets)
            BaseDock(tile: layout.tile, zones: zones.dock,
                     onPrev: { camera.pan(by: -size.width * 0.55, BaseWorld(w: size.width, h: size.height)) },
                     onNext: { camera.pan(by: size.width * 0.55, BaseWorld(w: size.width, h: size.height)) })
                .padding(.bottom, insets.bottom + zones.dock.bottomInset)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
    }

    /// Share of the silo's capacity holding ore, for the stored-ore crates in the cutaway.
    private var oreFraction: Double {
        let capacity = 40 * BuildingLevels.siloCapacityMultiplier(store.player.buildingLevels["surface-silo"] ?? 1)
        let held = store.player.stash.values.reduce(0, +)
        return min(1, Double(held) / Double(max(capacity, 1)))
    }

    /// Builds the silo on the first free plot; when it is locked or unaffordable the Build screen explains why.
    private func buildSilo() {
        let used = Set(Construction.occupied(store.player).values)
        let plot = (0..<Construction.plotCount).first { !used.contains($0) } ?? 0
        if !store.place("surface-silo", plot: plot) { store.go(.build) }
    }

    private func openStructure(_ kind: String) {
        switch kind {
        case "launchpad": store.go(.launchpad)
        case "hangar", "garage": store.go(.hangar)
        case "astronaut-academy": store.go(.academy)
        default: break
        }
    }

    private func topLeftHud(insets: EdgeInsets, portrait: Bool) -> some View {
        let z = zones.topLeft
        return VStack(alignment: .leading, spacing: z.gap) {
            HudGearClock(onSettings: { showSettings = true })
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
        return HudChips(francs: store.player.francs)
        .padding(.trailing, insets.trailing + z.inset).padding(.top, insets.top + z.inset)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
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

/// Admin-dashboard palette for Settings: white cards on light grey, soft grey borders.
private enum Admin {
    static let page = Theme.hex(0xF4F5F7)
    static let card = Color.white
    static let border = Theme.hex(0xE1E4E8)
    static let ink = Theme.hex(0x1B1F24)
    static let muted = Theme.hex(0x6B7280)
    static let danger = Theme.hex(0xD6303B)
    static let primary = Theme.hex(0x1F78C1)
}

/// Settings gear destination, matching the web Settings sheet: account, training (replay, skip), reset, Free Ops, patch notes.
struct SettingsSheet: View {
    @Environment(GameStore.self) private var store
    @Environment(AuthModel.self) private var auth
    @Environment(\.flatLayout) private var flat
    @State private var confirmSignOut = false
    @State private var confirmSkip = false
    @State private var confirmReset = false
    @State private var showPatchNotes = false
    #if os(iOS)
    @AppStorage(OrientationPreference.storageKey) private var orientation = OrientationPreference.auto.rawValue
    #endif
    let onClose: () -> Void

    private static let tryNames = ["mining": "Mining", "scan": "Planet scan", "part": "Part tweak"]

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Settings").font(AppFont.display(20)).foregroundStyle(Admin.ink)
                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark").font(.system(size: 16, weight: .bold)).foregroundStyle(Admin.muted)
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel("Close")
            }.padding(.horizontal, 20).padding(.top, flat ? 24 : 8)
            if flat { content.frame(maxHeight: .infinity, alignment: .top) } else { ScrollView { content } }
        }
        .sheet(isPresented: $showPatchNotes) { PatchNotesSheet() }
        .confirmationDialog("Sign out?", isPresented: $confirmSignOut, titleVisibility: .visible) {
            Button("Sign out", role: .destructive) { auth.signOut() }
            Button("Stay signed in", role: .cancel) {}
        } message: {
            Text("Your progress stays saved on this device and in the cloud. Sign back in to continue.")
        }
        .background(Admin.page)
        .presentationDetents([.medium, .large])
    }

    private var content: some View {
        VStack(spacing: 16) {
            #if os(iOS)
            label("Display")
            orientationCard
            #endif
            label("Training")
            VStack(spacing: 0) {
                ForEach(Array(FlightPlanProgress.tryIds.enumerated()), id: \.element) { i, id in
                    if i > 0 { Divider().overlay(Admin.border) }
                    trainingRow(id)
                }
                if !store.player.freeOperations {
                    Divider().overlay(Admin.border)
                    HStack {
                        rowText("Skip training", confirmSkip ? "Tap again to mark all tries done" : "Mark all tries as done")
                        Spacer(minLength: 12)
                        outlineButton(confirmSkip ? "Confirm" : "Skip", color: Admin.ink) {
                            if confirmSkip { confirmSkip = false; onClose(); store.skipTraining() } else { confirmSkip = true }
                        }
                    }.padding(20)
                }
            }.card()
            label("Game")
            VStack(spacing: 0) {
                HStack {
                    rowText("Free Ops", "Play without a contract: mine, survey, build and trade on your own")
                    Spacer(minLength: 12)
                    let on = Binding(get: { store.player.freeOperations }, set: { store.setFreeOps($0) })
                    if flat {
                        // Headless snapshots cannot draw UIKit-backed controls; mirror the Toggle's look.
                        Capsule().fill(on.wrappedValue ? Admin.primary : Admin.border).frame(width: 51, height: 31)
                            .overlay(Circle().fill(Color.white).padding(2).frame(maxWidth: .infinity, alignment: on.wrappedValue ? .trailing : .leading))
                    } else {
                        Toggle("Free Ops", isOn: on).labelsHidden().tint(Admin.primary)
                    }
                }.padding(20)
                Divider().overlay(Admin.border)
                HStack {
                    rowText("Patch notes", "What changed in recent builds")
                    Spacer(minLength: 12)
                    outlineButton("View", color: Admin.ink) { showPatchNotes = true }
                }.padding(20)
            }.card()
            label("Account")
            VStack(spacing: 0) {
                HStack {
                    rowText("Account", auth.session?.email.map { "Signed in as \($0)" } ?? "Signed in")
                    Spacer(minLength: 12)
                    outlineButton("Sign out", color: Admin.ink) { confirmSignOut = true }
                }.padding(20)
            }.card()
            label("Danger zone")
            HStack {
                rowText("Reset progress", confirmReset ? "Tap again to erase all progress. This cannot be undone." : "Erase all progress and start over", titleColor: Admin.danger)
                Spacer(minLength: 12)
                outlineButton(confirmReset ? "Confirm reset" : "Reset", color: Admin.danger) {
                    if confirmReset { confirmReset = false; onClose(); store.reset() } else { confirmReset = true }
                }
            }.padding(20).card(border: Admin.danger.opacity(0.35))
        }
        .padding(.horizontal, 20).padding(.top, 8).padding(.bottom, 32)
        .frame(maxWidth: 640)
        .frame(maxWidth: .infinity)
    }

    private func label(_ title: String) -> some View {
        Text(title.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Admin.muted)
            .frame(maxWidth: .infinity, alignment: .leading).padding(.top, 12).padding(.bottom, -4)
    }

    private func rowText(_ title: String, _ subtitle: String, titleColor: Color = Admin.ink) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(AppFont.display(16)).foregroundStyle(titleColor)
            Text(subtitle).font(AppFont.display(14)).foregroundStyle(Admin.muted).fixedSize(horizontal: false, vertical: true)
        }
    }

    private func outlineButton(_ title: String, color: Color, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Text(title).font(AppFont.display(14)).foregroundStyle(color)
                .padding(.horizontal, 16).frame(minWidth: 88, minHeight: 44)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(color.opacity(0.6), lineWidth: 1))
                .contentShape(Rectangle())
        }.buttonStyle(.plain)
    }

    private func trainingRow(_ id: String) -> some View {
        let plan = store.player.flightPlan
        let status = plan.completed[id] == true ? "Done" : plan.currentTry == id && !store.player.freeOperations ? "On air" : "Standby"
        return HStack {
            rowText(Self.tryNames[id] ?? id, status)
            Spacer(minLength: 12)
            outlineButton("Replay", color: Admin.ink) { onClose(); store.replayTry(id) }
                .accessibilityLabel("Replay \(Self.tryNames[id] ?? id)")
        }.padding(20)
    }

    #if os(iOS)
    private var orientationCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            rowText("Screen orientation", "Lock the game to portrait or landscape")
            HStack(spacing: 8) {
                ForEach(OrientationPreference.allCases) { option in
                    let on = OrientationPreference(stored: orientation) == option
                    Button { orientation = option.rawValue } label: {
                        Text(option.title).font(AppFont.display(14))
                            .foregroundStyle(on ? Color.white : Admin.ink)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(on ? Admin.primary : Color.clear, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(on ? Admin.primary : Admin.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Orientation \(option.title)")
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
        .padding(20).frame(maxWidth: .infinity, alignment: .leading).card()
    }
    #endif
}

private extension View {
    func card(border: Color = Admin.border) -> some View {
        frame(maxWidth: .infinity, alignment: .leading)
            .background(Admin.card, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(border, lineWidth: 1))
    }
}

/// Native patch notes: newest first.
struct PatchNotesSheet: View {
    @Environment(\.dismiss) private var dismiss
    private static let notes: [(String, [String])] = [
        ("Base and flight scenes", ["Pixel-art launchpad, hangar and underground silo", "Swipe down from the base to dig", "Shared dock and HUD on every scene"]),
        ("Laser mining", ["Ship laser mining is the default", "Buried deposits spaced across the dig", "Layered strata ground"]),
        ("Training", ["Replay or skip the three tries from Settings", "Free Ops opens when training is done"]),
    ]
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("PATCH NOTES").font(AppFont.display(18)).tracking(1.4).foregroundStyle(Theme.hudInk)
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark").font(.system(size: 18, weight: .black)).foregroundStyle(Theme.hudInk)
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel("Close")
            }.padding(.horizontal, 16).padding(.top, 8)
            ScrollView {
                VStack(spacing: 8) {
                    ForEach(Self.notes, id: \.0) { note in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(note.0.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.hudInk)
                            ForEach(note.1, id: \.self) { Text("• \($0)").font(AppFont.display(14)).foregroundStyle(Theme.textDim) }
                        }
                        .padding(14).frame(maxWidth: .infinity, alignment: .leading).hudPanel(radius: 10)
                    }
                }.padding(16)
            }
        }.background(Theme.bg)
    }
}
