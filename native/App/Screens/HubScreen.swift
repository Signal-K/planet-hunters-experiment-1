import SwiftUI
import LandnamCore

/// Earth Base: the terrain scene with the player's structures standing on it, a francs chip and
/// contract card top-left, friends/settings top-right and one floating dock bottom-centre.
/// HUD positions come from `HUDZones` (shared/layout/base-hud-zones.json), measured from the safe area.
struct HubScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(Services.self) private var services: Services?
    /// Snapshots have no real safe area; fixtures pass the device insets they want to show.
    var safeAreaOverride: EdgeInsets?
    var biome: EarthBiome?
    @State private var showSettings = false
    @State private var showFriends = false
    @State private var showNotifications = false
    @State private var notificationCount = 0
    @State private var menuOpen = false
    /// In-scene placement: pick an unlocked structure, then tap a free slot (the Build screen is this mode).
    @State private var placing: Bool
    @State private var picked: String?
    @State private var placeNote: String?
    /// Build mode: tapping a placed Launchpad or Silo opens its upgrade bar (web `ActionConfirmBar`).
    @State private var upgrading: String?
    /// Measured dock height: on narrow phones it stacks into two rows, so overlays above it cannot use a fixed offset.
    @State private var dockHeight: CGFloat = 112
    /// Homecoming (SSL-553): the core stage lands on the pad behind the delivery sheet.
    var homecoming = false
    var padLift: CGFloat = 0
    var padDismantle: CGFloat = 0
    @State private var camera: BaseCamera
    private let zones = HUDZones.standard

    /// `startX` / `startDepth` set the opening camera (fixtures and screenshots); the game starts at the surface, x 0.
    init(safeAreaOverride: EdgeInsets? = nil, biome: EarthBiome = .resolve(), startX: CGFloat = 0, startDepth: CGFloat = 0, homecoming: Bool = false, padLift: CGFloat = 0, padDismantle: CGFloat = 0, placing: Bool = false, upgrading: String? = nil) {
        _placing = State(initialValue: placing)
        _upgrading = State(initialValue: upgrading)
        self.safeAreaOverride = safeAreaOverride
        self.homecoming = homecoming
        self.padLift = padLift
        self.padDismantle = padDismantle
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
        .overlay {
            if showSettings { SettingsSheet(onClose: { showSettings = false }) }
            if showFriends { FriendsSheet(onClose: { showFriends = false }) }
            if showNotifications { NotificationTray(onClose: { showNotifications = false; Task { await refreshNotifications() } }) }
        }
        .task { await refreshNotifications() }
    }

    private func scene(size: CGSize, insets: EdgeInsets) -> some View {
        let layout = BaseLayout(size: size, insets: insets, zones: zones, hasPlaced: !store.player.placed.isEmpty)
        let cameraWorld = BaseWorld(w: size.width, h: size.height)
        let portrait = layout.portrait
        return ZStack(alignment: .topLeading) {
            BaseWorldScene(
                biome: biome ?? EarthBiome(rawValue: store.player.earthBiome) ?? .mountains,
                placed: store.player.placed,
                plots: store.player.placementPlots,
                levels: store.player.buildingLevels,
                oreFraction: oreFraction,
                excavated: store.player.subsurfaceExcavated || !store.player.subsurfaceBuilt.isEmpty,
                secondTank: store.player.subsurfaceBuilt.contains("mineral-vault"),
                padOccupied: store.player.activeMission != nil || selectedStagedRocket?.location == .launchpad,
                padCore: homecoming,
                padLift: padLift,
                padDismantle: padDismantle,
                insets: insets,
                camera: camera,
                onStructure: { openStructure($0) },
                onShaft: { if !offerUpgrade("surface-silo") { store.go(.hubSubsurface) } },
                onBuildSilo: { buildSilo() },
                placing: placing,
                pickedKind: picked ?? options.first?.id,
                onSlot: { placeOnSlot($0) }
            )
            skyCraft(width: size.width, height: size.height)
            topLeftHud(insets: insets, portrait: portrait)
            topRightHud(insets: insets)
            if placing, let upgrading { upgradeBar(upgrading, insets: insets) }
            else if placing { picker(width: size.width, insets: insets) }
            BaseDock(tile: layout.tile, zones: zones.dock,
                     onPrev: { camera.pan(by: -size.width * 0.55, BaseWorld(w: size.width, h: size.height)) },
                     onNext: { camera.pan(by: size.width * 0.55, BaseWorld(w: size.width, h: size.height)) },
                     onBuild: { placeNote = nil; upgrading = nil; placing.toggle() },
                     onMenu: { menuOpen = true },
                     onMission: (!placing && store.player.activeMission == nil && !store.player.pendingLaunch) ? { store.go(.missions) } : nil,
                     locationLabel: "Earth",
                     locationNavigationDisabled: false,
                     compact: !portrait,
                     onOverview: !placing ? { camera.overview(cameraWorld) } : nil,
                     overviewPosition: cameraWorld.maxX == 0 ? 0 : min(max(Double(camera.x / cameraWorld.maxX), 0), 1),
                     onOverviewPositionChange: !placing ? { camera.setPosition(CGFloat($0), cameraWorld) } : nil)
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { dockHeight = $0 }
                .padding(.bottom, insets.bottom + max(zones.dock.bottomInset, 14))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            if menuOpen { BaseMenu(onClose: { menuOpen = false }, onBuild: { placeNote = nil; placing = true }) }
        }
    }

    /// Share of the silo's capacity holding ore, for the stored-ore crates in the cutaway.
    private var oreFraction: Double {
        let capacity = 40 * BuildingLevels.siloCapacityMultiplier(store.player.buildingLevels["surface-silo"] ?? 1)
        let held = store.player.stash.values.reduce(0, +)
        return min(1, Double(held) / Double(max(capacity, 1)))
    }

    private var selectedStagedRocket: StagedRocket? {
        guard let id = store.player.selectedStagedRocketId else { return nil }
        return store.player.stagedRockets.first { $0.id == id }
    }

    /// Builds the silo on the first free plot; when it is locked or unaffordable the Build screen explains why.
    private func buildSilo() {
        let used = Set(Construction.occupied(store.player).values)
        let plot = (0..<Construction.plotCount).first { !used.contains($0) } ?? 0
        if !store.place("surface-silo", plot: plot) { placing = true }
    }

    /// Unlocked structures that are not yet on the base. Locked ones are not offered.
    private var options: [StructureBlueprint] {
        Construction.catalog(for: store.player).filter { Construction.unlocked($0, player: store.player) }
    }

    private func placeOnSlot(_ plot: Int) {
        guard let id = picked ?? options.first?.id, let b = Construction.byId[id] else { return }
        if !Construction.canAfford(b, player: store.player) {
            placeNote = "\(b.name) · Need \(Construction.gaps(b, player: store.player).joined(separator: ", "))"; return
        }
        if store.place(id, plot: plot) { placeNote = nil; picked = nil; placing = false } else { placeNote = "That slot is taken or locked. Try another slot." }
    }

    private func picker(width: CGFloat, insets: EdgeInsets) -> some View {
        VStack(spacing: 6) {
            if let placeNote {
                Text(placeNote).font(AppFont.display(14)).foregroundStyle(Theme.hudInk)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Capsule().fill(Theme.hudPanel)).overlay(Capsule().stroke(Theme.hudInk, lineWidth: 2))
            }
            if picked == "surface-silo" || (picked == nil && options.first?.id == "surface-silo") {
                Button("PLACE SILO") { buildSilo() }
                    .font(AppFont.display(14)).tracking(0.8).foregroundStyle(Theme.hudInk).frame(minHeight: 44).padding(.horizontal, 18)
                    .background(Capsule().fill(Theme.hudPanel)).overlay(Capsule().stroke(Theme.hudInk, lineWidth: 2))
            }
            if options.count == 1 && placeNote == nil {
                // One choice: the site marker in the scene already names it (web hides the chip too).
                EmptyView()
            } else if options.isEmpty {
                Text("Nothing to build yet").font(AppFont.display(14)).foregroundStyle(Theme.hudInk)
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .background(Capsule().fill(Theme.hudPanel)).overlay(Capsule().stroke(Theme.hudInk, lineWidth: 2))
            } else {
                // One row above the dock, like web: a plain row when it fits, scrolling sideways when it does not.
                let chips = HStack(spacing: 8) {
                    ForEach(options) { b in
                        let on = (picked ?? options.first?.id) == b.id
                        Button { picked = b.id; placeNote = Construction.canAfford(b, player: store.player) ? nil : "\(b.name) · Need \(Construction.gaps(b, player: store.player).joined(separator: ", "))" } label: {
                            Text("\(b.name.uppercased()) · \(b.cost == 0 ? "FREE" : Economy.format(francs: b.cost))")
                                .font(AppFont.display(14)).tracking(0.8)
                                .foregroundStyle(on ? Theme.hudPanel : Theme.hudInk)
                                .padding(.horizontal, 16).frame(minHeight: 44)
                                .background(Capsule().fill(on ? Theme.hudInk : Theme.hudPanel))
                                .overlay(Capsule().stroke(Theme.hudInk, lineWidth: 2))
                        }.buttonStyle(.plain)
                    }
                }.padding(.horizontal, 12)
                ViewThatFits(in: .horizontal) {
                    chips
                    ScrollView(.horizontal, showsIndicators: false) { chips }
                }
            }
        }
        .padding(.bottom, aboveDock(insets))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    }

    private func aboveDock(_ insets: EdgeInsets) -> CGFloat { insets.bottom + max(zones.dock.bottomInset, 14) + dockHeight + 12 }

    /// In Build mode a finished upgradable building opens its upgrade bar instead of its screen.
    private func offerUpgrade(_ kind: String) -> Bool {
        guard placing, BuildingLevels.ids.contains(kind), store.player.placed.contains(kind),
              Construction.progress(store.player.underConstruction[kind], now: store.now) >= 1 else { return false }
        upgrading = kind
        return true
    }

    /// Web's upgrade confirm bar: level step, the effect now and next, the shortfall, and the price on the button.
    private func upgradeBar(_ kind: String, insets: EdgeInsets) -> some View {
        let level = BuildingLevels.level(store.player, kind)
        let cost = BuildingLevels.cost(kind, level: level)
        let effects = BuildingLevels.effects[kind] ?? []
        let effect = { (l: Int) in effects.indices.contains(l - 1) ? effects[l - 1] : "" }
        let francs = store.player.francs
        let description: String = {
            guard let cost else { return "\(effect(level)). Fully upgraded." }
            let short = francs < cost ? "Needs \(Economy.format(francs: cost - francs)) more. " : ""
            return "Now: \(effect(level)). Next: \(effect(level + 1)). \(short)Upgrades are permanent."
        }()
        let canBuy = cost.map { francs >= $0 } ?? false
        return VStack(alignment: .leading, spacing: 8) {
            Text((cost == nil ? "Level \(level) of \(BuildingLevels.maxLevel)" : "Level \(level) to \(level + 1)").uppercased())
                .font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.textMuted)
            Text("Upgrade \(BuildingLevels.names[kind] ?? kind)").font(AppFont.display(18)).foregroundStyle(Theme.hudInk)
            Text(description).font(AppFont.body(14)).foregroundStyle(Theme.hudInk)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 8) {
                Button("CANCEL") { upgrading = nil }
                    .font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.hudInk)
                    .frame(minWidth: 88, minHeight: 44)
                    .background(Capsule().fill(Theme.hudPanel)).overlay(Capsule().stroke(Theme.hudInk, lineWidth: 2))
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("confirm-action-dismiss")
                PrimaryButton(title: cost.map { "Upgrade (\(Economy.format(francs: $0)))" } ?? "Max level", enabled: canBuy) {
                    if store.upgradeBuilding(kind) { upgrading = nil }
                }
                .accessibilityIdentifier("confirm-action-confirm")
            }
        }
        .padding(14)
        .frame(maxWidth: 440, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.hudPanel))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.hudInk, lineWidth: 2))
        .padding(.horizontal, 16)
        .padding(.top, insets.top + 68)
        .padding(.bottom, insets.top < 10 ? 0 : aboveDock(insets))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: insets.top < 10 ? .top : .bottom)
        .accessibilityIdentifier("action-confirm-bar")
    }

    private func openStructure(_ kind: String) {
        if offerUpgrade(kind) { return }
        switch kind {
        case "launchpad": store.go(.launchpad)
        // Mission first: the hangar opens on its rocket choice only once a mission and destination are set up.
        case "hangar", "garage": store.go(store.mission != nil && store.target != nil ? .hangar : .missions)
        case "market": store.go(.market)
        case "control-station": store.go(.instrumentHub)
        default: break
        }
    }

    private func topLeftHud(insets: EdgeInsets, portrait: Bool) -> some View {
        let z = zones.topLeft
        return VStack(alignment: .leading, spacing: z.gap) {
            HudGearClock(onSettings: { showSettings = true }, onFriends: { showFriends = true }, onNotifications: { showNotifications = true }, notificationCount: notificationCount)
            if store.player.activeMission != nil {
                ContractCard(width: z.contractCard.width, collapsible: portrait && z.contractCard.collapseInPortrait)
            }
            if portrait && !(placing && upgrading != nil) {
                SkyEventChip(allDay: true)
            }
        }
        .padding(.leading, max(insets.leading + z.inset, 12))
        .padding(.top, max(insets.top + z.inset, 12))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func topRightHud(insets: EdgeInsets) -> some View {
        let z = zones.topRight
        return HudChips(francs: store.player.francs, stash: store.player.stash, onSell: { store.go(.market) })
        .padding(.trailing, max(insets.trailing + z.inset, 12))
        .padding(.top, max(insets.top + z.inset, 12))
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

    private func refreshNotifications() async {
        guard let api = services?.notificationsAPI() else { notificationCount = 0; return }
        notificationCount = (try? await api.list().count) ?? 0
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
    /// Hard offset drop shadow drawn behind the shape. `.shadow` on the finished view also shadows its text, which ghosts
    /// through any translucent fill; this only ever shadows the silhouette.
    func hardShadow(_ color: Color, x: CGFloat = 0, y: CGFloat = 0, radius: CGFloat = 10) -> some View {
        background { RoundedRectangle(cornerRadius: radius).fill(color).offset(x: x, y: y) }
    }

    /// White rounded panel with a thin black outline (base HUD surface).
    func hudPanel(radius: CGFloat = 12) -> some View {
        background(Theme.hudPanel, in: RoundedRectangle(cornerRadius: radius))
            .overlay(RoundedRectangle(cornerRadius: radius).stroke(Theme.hudInk, lineWidth: 1.5))
    }
}

/// Settings gear destination, matching the web Settings sheet: account, one replay row, reset, Free Ops, a patch-notes link.
struct SettingsSheet: View {
    @Environment(GameStore.self) private var store
    @Environment(AuthModel.self) private var auth
    @State private var confirmSignOut = false
    @State private var confirmReset = false
    @State private var moveBiome = "mountains"
    @State private var confirmMoveBase = false
    @State private var skyCity = ""
    @State private var skyLatitude = "0"
    @State private var skyTimeZone = TimeZone.current.identifier
    @State private var showPatchNotes = false
    @State private var confirmSkipTraining = false
    @State private var width: CGFloat = 390
    #if os(iOS)
    @AppStorage(OrientationPreference.storageKey) private var orientation = OrientationPreference.auto.rawValue
    #endif
    /// Optional focus used by the native scene catalog to render the relocation acceptance surface directly.
    let initialScrollTarget: String?
    let onClose: () -> Void

    init(onClose: @escaping () -> Void, initialScrollTarget: String? = nil) {
        self.onClose = onClose
        self.initialScrollTarget = initialScrollTarget
    }

    var body: some View {
        GeometryReader { geo in
            let pageWidth = geo.size.width
            settingsBody()
                .frame(width: pageWidth, height: geo.size.height)
                .background(SettingsStyle.bg)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear { width = pageWidth }
                .onChange(of: geo.size) { _, size in width = size.width }
        }
        .ignoresSafeArea()
            .confirmationDialog("Sign out?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) { auth.signOut() }
                Button("Stay signed in", role: .cancel) {}
            } message: {
                Text("Your progress stays saved on this device and in the cloud. Sign back in to continue.")
            }

    }

    private func settingsBody() -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(showPatchNotes ? "PATCH NOTES" : "SETTINGS").font(AppFont.display(20)).tracking(20 * 0.14).foregroundStyle(SettingsStyle.ink)
                Spacer()
                Button { if showPatchNotes { showPatchNotes = false } else { onClose() } } label: {
                    Image(systemName: showPatchNotes ? "chevron.left" : "xmark").font(.system(size: 16, weight: .heavy)).foregroundStyle(SettingsStyle.ink)
                        .frame(width: 48, height: 48)
                        .background(SettingsStyle.card, in: RoundedRectangle(cornerRadius: 2))
                        .overlay(RoundedRectangle(cornerRadius: 2).stroke(SettingsStyle.ink, lineWidth: 2))
                        .contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel(showPatchNotes ? "Back" : "Close")
            }.padding(.horizontal, 20).padding(.vertical, 12)
                .background(SettingsStyle.card)
                .overlay(alignment: .top) { Rectangle().fill(SettingsStyle.blue).frame(height: 2) }
                .overlay(alignment: .bottom) { Rectangle().fill(SettingsStyle.ink.opacity(0.2)).frame(height: 1) }
            ScrollViewReader { proxy in
                ScrollView { if showPatchNotes { SettingsPatchNotes() } else { content } }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .task {
                        guard let initialScrollTarget else { return }
                        await Task<Never, Never>.yield()
                        proxy.scrollTo(initialScrollTarget, anchor: .top)
                    }
            }
        }
    }

    private var content: some View {
        let wideChoices = width >= 560
        let columns = Array(repeating: GridItem(.flexible(minimum: 0), spacing: 24, alignment: .topLeading), count: width >= 720 ? 2 : 1)
        return LazyVGrid(columns: columns, alignment: .center, spacing: SettingsStyle.gap) {
            #if os(iOS)
            displaySection(wide: wideChoices)
            #endif
            trainingSection
            skyEventsSection
            if !store.player.placed.isEmpty && !store.player.earthBiomeMoveUsed { baseLandscapeSection.id("base-landscape-move") }
            VStack(spacing: 16) {
                SettingsHeading(text: "Account")
                row(SettingsRowText(title: auth.session?.email ?? "Email account", status: "Signed in")) {
                    SettingsButton(title: "Sign out", fill: !wideChoices) { confirmSignOut = true }
                }
            }
            row(SettingsRowText(title: "Reset progress", status: confirmReset ? "Tap again to erase all progress" : "Erases the saved game", titleColor: SettingsStyle.danger),
                border: SettingsStyle.danger) {
                SettingsButton(title: confirmReset ? "Confirm reset" : "Reset progress", color: SettingsStyle.danger, fill: !wideChoices) {
                    if confirmReset { confirmReset = false; onClose(); store.reset() } else { confirmReset = true }
                }
            }
            Button { showPatchNotes = true } label: {
                Text("Patch notes")
                    .font(AppFont.display(16, "Bold"))
                    .underline()
                    .foregroundStyle(SettingsStyle.blue)
                    .frame(minWidth: 48, minHeight: 48)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)
            .accessibilityLabel("Patch notes")
        }
        .frame(maxWidth: 1280)
        .padding(.horizontal, width >= 720 ? 40 : 16)
        .padding(.top, shortPageInset).padding(.bottom, 32)
        .frame(maxWidth: .infinity)
    }

    private var shortPageInset: CGFloat { width > 700 ? 24 : 16 }

    private var trainingSection: some View {
        VStack(spacing: 16) {
            SettingsHeading(text: "Training")
            VStack(spacing: 12) {
                Text("Completed tries pay again on completion: +\(FlightPlan.replayFrancs) francs · +\(FlightPlan.replayResearchXP) research XP · +\(FlightPlan.replayIron) iron")
                    .font(AppFont.body(14)).foregroundStyle(SettingsStyle.ink)
                    .padding(10).frame(maxWidth: .infinity, alignment: .leading)
                    .background(SettingsStyle.blue.opacity(0.22), in: RoundedRectangle(cornerRadius: 8))
                ForEach(Array(zip(["mining", "scan", "part"], ["Mining", "Planet scan", "Part tweak"])), id: \.0) { id, title in
                    let progress = FlightPlan.patchProgress(store.player, screen: store.screen, tryId: id)
                    HStack(spacing: 12) {
                        TrainingPatchRing(segments: progress.total, stitched: progress.stitched)
                            .frame(width: 44, height: 44)
                            .accessibilityLabel("\(title): \(progress.stitched) of \(progress.total) steps stitched")
                        VStack(alignment: .leading, spacing: 2) {
                            Text(title).font(AppFont.display(14, "Bold")).foregroundStyle(SettingsStyle.ink)
                            Text(store.player.flightPlan.completed[id] == true ? "Done" : (store.player.flightPlan.currentTry == id ? "On air" : "Locked · After \(FlightPlanProgress.tryIds.firstIndex(of: id) ?? 0)"))
                                .font(AppFont.body(14)).foregroundStyle(SettingsStyle.ink.opacity(0.72))
                        }
                        Spacer(minLength: 4)
                        SettingsButton(title: "Replay", fill: false) { onClose(); store.replayTry(id) }
                            .accessibilityLabel("Replay \(title)")
                    }.frame(minHeight: 48)
                }
                HStack(spacing: 12) {
                    Text("◇").font(.system(size: 24, weight: .bold)).frame(width: 44, height: 44)
                        .accessibilityLabel("Free Ops patch")
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Free Ops").font(AppFont.display(14, "Bold"))
                        Text(store.player.freeOperations ? "Unlocked" : "Locked · After 3").font(AppFont.body(14)).foregroundStyle(SettingsStyle.ink.opacity(0.72))
                    }
                    Spacer()
                }.frame(minHeight: 48)
                if !store.player.freeOperations {
                    HStack {
                        SettingsRowText(title: "Skip", status: confirmSkipTraining ? "Confirm: mark all tries done" : "Marks every try done")
                        Spacer(minLength: 8)
                        SettingsButton(title: confirmSkipTraining ? "Confirm" : "Skip", fill: false) {
                            if confirmSkipTraining { store.skipTraining(); confirmSkipTraining = false; onClose() }
                            else { confirmSkipTraining = true }
                        }.accessibilityLabel(confirmSkipTraining ? "Confirm skip training" : "Skip training")
                    }
                }
            }.settingsCard(padding: width < 560 ? 12 : 18)
        }
    }

    private var baseLandscapeSection: some View {
        VStack(spacing: 16) {
            SettingsHeading(text: "Base landscape")
            VStack(spacing: 16) {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(["mountains", "desert", "tundra", "coast"], id: \.self) { id in
                        Button { moveBiome = id; confirmMoveBase = false } label: {
                            VStack(spacing: 4) {
                                GeometryReader { geometry in
                                    Image("Biome/\(id)-layer-far").resizable().scaledToFill()
                                        .saturation(0)
                                        .frame(width: geometry.size.width, height: 48).clipped()
                                }.frame(height: 48).clipped()
                                Text(id.capitalized).font(AppFont.display(14)).lineLimit(1)
                            }.frame(maxWidth: .infinity).padding(6)
                                .background(moveBiome == id ? SettingsStyle.blue.opacity(0.22) : SettingsStyle.bg.opacity(0.7))
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(moveBiome == id ? SettingsStyle.blue : SettingsStyle.ink.opacity(0.3), lineWidth: 1))
                        }.buttonStyle(.plain).frame(minHeight: 68)
                    }
                }
                HStack(spacing: 16) {
                    SettingsRowText(title: "Move base", status: confirmMoveBase ? "Confirm relocation" : "Available once")
                    Spacer(minLength: 8)
                    SettingsButton(title: confirmMoveBase ? "Confirm move" : "Move", fill: false) {
                        if confirmMoveBase {
                            store.setEarthBiome(moveBiome, asMove: true)
                            confirmMoveBase = false
                        } else { confirmMoveBase = true }
                    }
                }
            }.settingsCard()
        }
        .onAppear { moveBiome = store.player.earthBiome }
    }

    private var skyEventsSection: some View {
        VStack(spacing: 16) {
            SettingsHeading(text: "Sky events")
            VStack(alignment: .leading, spacing: 16) {
                Picker("City", selection: $skyCity) {
                    Text("Manual").tag("")
                    ForEach(SkyEventWindows.cities.compactMap(\.city), id: \.self) { Text($0).tag($0) }
                }
                .pickerStyle(.menu)
                .onChange(of: skyCity) { _, city in
                    guard let selected = SkyEventWindows.cities.first(where: { $0.city == city }) else { return }
                    skyLatitude = String(Int(selected.latitude)); skyTimeZone = selected.timeZone
                }
                TextField("Coarse latitude", text: $skyLatitude).textFieldStyle(.roundedBorder).frame(minHeight: 44)
                TextField("Timezone", text: $skyTimeZone).textFieldStyle(.roundedBorder).frame(minHeight: 44)
                Text("Only the city, latitude rounded to 1°, and timezone are saved. No longitude or GPS.")
                    .font(AppFont.body(14)).foregroundStyle(SettingsStyle.muted)
                HStack(spacing: 12) {
                    SettingsButton(title: "Save", fill: false) {
                        guard let latitude = Double(skyLatitude), TimeZone(identifier: skyTimeZone) != nil else { return }
                        store.setSkyEventLocation(PlayerLocation(city: skyCity.isEmpty ? nil : skyCity, latitude: latitude, timeZone: skyTimeZone))
                    }.accessibilityIdentifier("save-sky-event-location")
                    SettingsButton(title: "Clear", fill: false) { store.setSkyEventLocation(nil) }
                        .accessibilityIdentifier("clear-sky-event-location")
                }
            }.settingsCard()
        }
        .onAppear {
            let location = store.player.skyEventLocation ?? SkyEventWindows.deviceLocation()
            skyCity = location.city ?? ""; skyLatitude = String(Int(location.latitude)); skyTimeZone = location.timeZone
        }
        .accessibilityIdentifier("sky-event-location-settings")
    }

    #if os(iOS)
    private func displaySection(wide: Bool) -> some View {
        VStack(spacing: 16) {
            SettingsHeading(text: "Display")
            VStack(alignment: .leading, spacing: 16) {
                SettingsRowText(title: "Screen orientation", status: "Lock to portrait or landscape")
                orientationChoices(wide: wide)
            }.settingsCard()
        }
    }

    private func orientationChoices(wide: Bool) -> some View {
        let options = OrientationPreference.allCases
        let selected = options.firstIndex(of: OrientationPreference(stored: orientation)) ?? 0
        let layout = wide ? AnyLayout(HStackLayout(spacing: 12)) : AnyLayout(VStackLayout(spacing: 12))
        return layout {
            ForEach(Array(options.enumerated()), id: \.offset) { i, pref in
                let on = i == selected
                Button { orientation = pref.rawValue } label: {
                    Text(pref.title.uppercased()).font(AppFont.display(14)).tracking(14 * 0.06)
                        .foregroundStyle(SettingsStyle.ink)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(on ? SettingsStyle.blue : SettingsStyle.bg.opacity(0.7), in: RoundedRectangle(cornerRadius: SettingsStyle.radius))
                        .overlay(RoundedRectangle(cornerRadius: SettingsStyle.radius).stroke(SettingsStyle.ink.opacity(0.32), lineWidth: 1))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(pref.title)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
    #endif

    private func row<A: View>(_ text: SettingsRowText, border: Color = SettingsStyle.ink, @ViewBuilder action: () -> A) -> some View {
        let narrow = width < 560
        let layout = narrow ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16)) : AnyLayout(HStackLayout(spacing: 16))
        return layout {
            text
            if !narrow { Spacer(minLength: 8) }
            action()
        }.settingsCard(border: border)
    }
}

private struct PatchRingView: View {
    let count: Int
    let stitched: Int
    var silhouette = false
    var body: some View {
        ZStack {
            ForEach(0..<max(1, count), id: \.self) { index in
                Circle().trim(from: CGFloat(index) / CGFloat(max(1, count)), to: (CGFloat(index) + 0.72) / CGFloat(max(1, count)))
                    .stroke(index < stitched ? Theme.teal : Theme.border, style: StrokeStyle(lineWidth: 3, lineCap: .butt))
                    .rotationEffect(.degrees(-90))
            }
            if silhouette { Text("◇").font(AppFont.display(22)).foregroundStyle(Theme.textDim) }
            else { Text(String(format: "%02d", stitched)).font(AppFont.display(9, "Bold")).foregroundStyle(Theme.ink) }
        }
        .frame(width: 44, height: 44)
        .accessibilityElement()
        .accessibilityLabel(silhouette ? "Free Ops patch" : "\(stitched) of \(count) steps stitched")
    }
}

private struct TrainingPatchRing: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let segments: Int
    let stitched: Int

    var body: some View {
        ZStack {
            Circle().stroke(SettingsStyle.ink.opacity(0.18), lineWidth: 3)
            ForEach(0..<segments, id: \.self) { index in
                Circle()
                    .trim(from: CGFloat(index) / CGFloat(segments) + 0.018,
                          to: CGFloat(index + 1) / CGFloat(segments) - 0.018)
                    .stroke(index < stitched ? SettingsStyle.blue : SettingsStyle.ink.opacity(0.2), style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            Text(String(format: "%02d", stitched)).font(AppFont.display(14, "Bold")).foregroundStyle(SettingsStyle.ink)
        }
        .accessibilityElement(children: .ignore)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.4), value: stitched)
    }
}

/// Native patch notes: newest first.
struct SettingsPatchNotes: View {
    private static let notes: [(String, [String])] = [
        ("Base and flight scenes", ["Pixel-art launchpad, hangar and underground silo", "Swipe down from the base to dig", "Shared dock and HUD on every scene"]),
        ("Laser mining", ["Ship laser mining is the default", "Buried deposits spaced across the dig", "Layered strata ground"]),
        ("Training", ["Replay the three tries from Settings", "Free Ops opens when training is done"]),
    ]
    var body: some View {
        VStack(spacing: 24) {
            ForEach(Self.notes, id: \.0) { note in
                VStack(alignment: .leading, spacing: 8) {
                    SettingsHeading(text: note.0)
                    ForEach(note.1, id: \.self) { Text("• \($0)").font(AppFont.body(14)).foregroundStyle(SettingsStyle.ink) }
                }.settingsCard(padding: 24)
            }
        }.padding(24)
    }
}
