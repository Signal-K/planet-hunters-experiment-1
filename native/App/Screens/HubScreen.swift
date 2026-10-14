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
    /// Homecoming (SSL-553): the core stage lands on the pad behind the delivery sheet.
    var homecoming = false
    var padLift: CGFloat = 0
    @State private var camera: BaseCamera
    private let zones = HUDZones.standard

    /// `startX` / `startDepth` set the opening camera (fixtures and screenshots); the game starts at the surface, x 0.
    init(safeAreaOverride: EdgeInsets? = nil, biome: EarthBiome = .resolve(), startX: CGFloat = 0, startDepth: CGFloat = 0, homecoming: Bool = false, padLift: CGFloat = 0) {
        self.safeAreaOverride = safeAreaOverride
        self.homecoming = homecoming
        self.padLift = padLift
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
        .overlay { if showSettings { SettingsSheet(onClose: { showSettings = false }) } }
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
                excavated: store.player.subsurfaceExcavated || !store.player.subsurfaceBuilt.isEmpty,
                secondTank: store.player.subsurfaceBuilt.contains("mineral-vault"),
                padOccupied: store.player.activeMission != nil,
                padCore: homecoming,
                padLift: padLift,
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
            if !homecoming, let craft = SkyCraft.current(for: store.player, now: store.now) {
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

/// Settings gear destination, matching the web Settings sheet: account, training (replay, skip), reset, Free Ops, patch notes.
struct SettingsSheet: View {
    @Environment(GameStore.self) private var store
    @Environment(AuthModel.self) private var auth
    @State private var confirmSignOut = false
    @State private var confirmSkip = false
    @State private var confirmReset = false
    @State private var showPatchNotes = false
    @State private var width: CGFloat = 390
    #if os(iOS)
    @AppStorage(OrientationPreference.storageKey) private var orientation = OrientationPreference.auto.rawValue
    #endif
    let onClose: () -> Void

    private static let tryNames = ["mining": "Mining", "scan": "Planet scan", "part": "Part tweak"]

    var body: some View {
        GeometryReader { geo in
            let landscape = geo.size.width > geo.size.height
            settingsBody
                .frame(width: min(760, geo.size.width - (landscape ? 48 : 32)))
                .frame(maxHeight: .infinity)
                .background(SettingsStyle.bg)
                .overlay(Rectangle().stroke(SettingsStyle.ink, lineWidth: 3))
                .background(SettingsStyle.ink.offset(x: 6, y: 6))
                .padding(.top, landscape ? 68 : 84)
                .padding(.bottom, landscape ? 84 : 100)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear { width = min(760, geo.size.width - (landscape ? 48 : 32)) }
                .onChange(of: geo.size) { _, size in width = min(760, size.width - (size.width > size.height ? 48 : 32)) }
        }
            .confirmationDialog("Sign out?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) { auth.signOut() }
                Button("Stay signed in", role: .cancel) {}
            } message: {
                Text("Your progress stays saved on this device and in the cloud. Sign back in to continue.")
            }

    }

    private var settingsBody: some View {
        VStack(spacing: 0) {
            HStack {
                Text(showPatchNotes ? "PATCH NOTES" : "SETTINGS").font(AppFont.display(20)).tracking(20 * 0.14).foregroundStyle(SettingsStyle.ink)
                Spacer()
                Button { if showPatchNotes { showPatchNotes = false } else { onClose() } } label: {
                    Image(systemName: showPatchNotes ? "chevron.left" : "xmark").font(.system(size: 16, weight: .heavy)).foregroundStyle(SettingsStyle.ink)
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel(showPatchNotes ? "Back" : "Close")
            }.padding(.horizontal, 16).padding(.vertical, 8)
                .background(SettingsStyle.trim)
                .overlay(alignment: .top) { Rectangle().fill(SettingsStyle.blue).frame(height: 4) }
                .overlay(alignment: .bottom) { Rectangle().fill(SettingsStyle.ink).frame(height: 3) }
            ScrollView { if showPatchNotes { SettingsPatchNotes() } else { content } }

        }
    }

    private var content: some View {
        let col = max(0, width - 32)
        let wide = width >= 600
        return VStack(spacing: SettingsStyle.gap) {
            #if os(iOS)
            displaySection
            #endif
            if wide {
                HStack(alignment: .top, spacing: SettingsStyle.gap) {
                    trainingSection
                    gameSection
                }
            } else {
                trainingSection
                gameSection
            }
            let pairLayout = wide ? AnyLayout(HStackLayout(alignment: .top, spacing: 16)) : AnyLayout(VStackLayout(spacing: 24))
            pairLayout {
                VStack(spacing: 8) {
                    SettingsHeading(text: "Patch notes")
                    pairCard(SettingsRowText(title: "What changed", status: "This build")) {
                        SettingsButton(title: "Open", compact: true) { showPatchNotes = true }
                    }
                }
                VStack(spacing: 8) {
                    SettingsHeading(text: "Account")
                    pairCard(SettingsRowText(title: auth.session?.email ?? "Email account", status: "Signed in")) {
                        SettingsButton(title: "Sign out", compact: true) { confirmSignOut = true }
                    }
                }
            }
            row(SettingsRowText(title: "Reset progress", status: confirmReset ? "Tap again to erase all progress" : "Erase all progress and start over", titleColor: SettingsStyle.danger),
                border: SettingsStyle.danger) {
                SettingsButton(title: confirmReset ? "Confirm reset" : "Reset", color: SettingsStyle.danger, compact: true) {
                    if confirmReset { confirmReset = false; onClose(); store.reset() } else { confirmReset = true }
                }
            }
        }
        .frame(width: col)
        .padding(.top, 16).padding(.bottom, 24)
        .frame(maxWidth: .infinity)

    }

    private var trainingSection: some View {
        VStack(spacing: 8) {
            SettingsHeading(text: "Training")
            VStack(spacing: 0) {
                ForEach(Array(FlightPlanProgress.tryIds.enumerated()), id: \.element) { i, id in
                    if i > 0 { Rectangle().fill(SettingsStyle.ink.opacity(0.15)).frame(height: 1) }
                    trainingRow(id)
                }
                if !store.player.freeOperations {
                    Rectangle().fill(SettingsStyle.ink.opacity(0.15)).frame(height: 1)
                    inline(SettingsRowText(title: "Skip", status: confirmSkip ? "Tap again to confirm" : "Marks every try done")) {
                        SettingsButton(title: confirmSkip ? "Confirm" : "Skip", compact: true) {
                            if confirmSkip { confirmSkip = false; onClose(); store.skipTraining() } else { confirmSkip = true }
                        }
                    }
                }
            }.settingsCard(padding: 8)
        }
    }

    private var gameSection: some View {
        VStack(spacing: 8) {
            SettingsHeading(text: "Game")
            row(SettingsRowText(title: "Free Ops", status: "Play without a contract")) {
                let on = Binding(get: { store.player.freeOperations }, set: { store.setFreeOps($0) })
                SettingsSegment(options: ["Off", "On"], selected: on.wrappedValue ? 1 : 0) { on.wrappedValue = $0 == 1 }
                    .frame(width: 140)
            }
        }
    }

    #if os(iOS)
    private var displaySection: some View {
        VStack(spacing: 8) {
            SettingsHeading(text: "Display")
            orientationCard
        }
    }
    #endif

    private func inline<A: View>(_ text: SettingsRowText, @ViewBuilder action: () -> A) -> some View {
        HStack(spacing: 12) {
            text
            Spacer(minLength: 8)
            action()
        }.padding(.horizontal, 12).padding(.vertical, 8).frame(minHeight: 72)
    }

    private func pairCard<A: View>(_ text: SettingsRowText, @ViewBuilder action: () -> A) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            text
            action()
        }.settingsCard(padding: 16)
    }

    private func row<A: View>(_ text: SettingsRowText, border: Color = SettingsStyle.ink, @ViewBuilder action: () -> A) -> some View {
        HStack(spacing: 16) {
            text
            Spacer(minLength: 8)
            action()
        }.settingsCard(border: border)
    }

    private func trainingRow(_ id: String) -> some View {
        let plan = store.player.flightPlan
        let status = plan.completed[id] == true ? "Done" : plan.currentTry == id && !store.player.freeOperations ? "On air" : "Standby"
        return inline(SettingsRowText(title: Self.tryNames[id] ?? id, status: status)) {
            SettingsButton(title: "Replay", compact: true) { onClose(); store.replayTry(id) }
                .accessibilityLabel("Replay \(Self.tryNames[id] ?? id)")
        }
    }

    #if os(iOS)
    private var orientationCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            SettingsRowText(title: "Screen orientation", status: "Lock to portrait or landscape")
            SettingsSegment(options: OrientationPreference.allCases.map(\.title),
                       selected: OrientationPreference.allCases.firstIndex(of: OrientationPreference(stored: orientation)) ?? 0) {
                orientation = OrientationPreference.allCases[$0].rawValue
            }
        }.settingsCard()
    }
    #endif
}

/// Native patch notes: newest first.
struct SettingsPatchNotes: View {
    private static let notes: [(String, [String])] = [
        ("Base and flight scenes", ["Pixel-art launchpad, hangar and underground silo", "Swipe down from the base to dig", "Shared dock and HUD on every scene"]),
        ("Laser mining", ["Ship laser mining is the default", "Buried deposits spaced across the dig", "Layered strata ground"]),
        ("Training", ["Replay or skip the three tries from Settings", "Free Ops opens when training is done"]),
    ]
    var body: some View {
        VStack(spacing: 16) {
            ForEach(Self.notes, id: \.0) { note in
                VStack(alignment: .leading, spacing: 8) {
                    SettingsHeading(text: note.0)
                    ForEach(note.1, id: \.self) { Text("• \($0)").font(AppFont.body(14)).foregroundStyle(SettingsStyle.ink) }
                }.settingsCard(padding: 16)
            }
        }.padding(16)
    }
}
