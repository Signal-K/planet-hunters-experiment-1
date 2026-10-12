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

/// Settings gear destination, matching the web Settings sheet: account, training (replay, skip), reset, Free Ops, patch notes.
struct SettingsSheet: View {
    @Environment(GameStore.self) private var store
    @Environment(AuthModel.self) private var auth
    @Environment(\.flatLayout) private var flat
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
        VStack(spacing: 0) {
            HStack {
                Text("Settings".uppercased()).font(AppFont.display(20)).tracking(20 * 0.14).foregroundStyle(SetStyle.ink)
                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark").font(.system(size: 16, weight: .heavy)).foregroundStyle(SetStyle.ink)
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel("Close")
            }.padding(.horizontal, 16).padding(.top, flat ? 24 : 8).setColumn()
            if flat { content.frame(maxHeight: .infinity, alignment: .top) } else { ScrollView { content } }
        }
        .sheet(isPresented: $showPatchNotes) { PatchNotesSheet() }
        .confirmationDialog("Sign out?", isPresented: $confirmSignOut, titleVisibility: .visible) {
            Button("Sign out", role: .destructive) { auth.signOut() }
            Button("Stay signed in", role: .cancel) {}
        } message: {
            Text("Your progress stays saved on this device and in the cloud. Sign back in to continue.")
        }
        .background(SetStyle.bg)
        .presentationDetents([.medium, .large])
    }

    private var content: some View {
        let col = min(720, max(280, width * 0.92))
        let wide = width >= 600
        return VStack(spacing: SetStyle.gap) {
            if wide {
                HStack(alignment: .top, spacing: SetStyle.gap) {
                    trainingSection
                    VStack(spacing: SetStyle.gap) {
                        #if os(iOS)
                        displaySection
                        #endif
                        gameSection
                    }
                }
            } else {
                #if os(iOS)
                displaySection
                #endif
                trainingSection
                gameSection
            }
            HStack(alignment: .top, spacing: 16) {
                VStack(spacing: 8) {
                    SetHeading(text: "Patch notes")
                    pairCard(SetRowText(title: "What changed", status: "This build")) {
                        SetButton(title: "Open", compact: true) { showPatchNotes = true }
                    }
                }
                VStack(spacing: 8) {
                    SetHeading(text: "Account")
                    pairCard(SetRowText(title: auth.session?.email ?? "Email account", status: "Signed in")) {
                        SetButton(title: "Sign out", compact: true) { confirmSignOut = true }
                    }
                }
            }
            row(SetRowText(title: "Reset progress", status: confirmReset ? "Tap again to erase all progress" : "Erase all progress and start over", titleColor: SetStyle.danger),
                border: SetStyle.danger) {
                SetButton(title: confirmReset ? "Confirm reset" : "Reset", color: SetStyle.danger, compact: true) {
                    if confirmReset { confirmReset = false; onClose(); store.reset() } else { confirmReset = true }
                }
            }
        }
        .frame(width: col)
        .padding(.top, 8).padding(.bottom, 32)
        .frame(maxWidth: .infinity)
        .background(GeometryReader { g in Color.clear.onAppear { width = g.size.width }.onChange(of: g.size.width) { _, w in width = w } })
    }

    private var trainingSection: some View {
        VStack(spacing: 8) {
            SetHeading(text: "Training")
            VStack(spacing: 0) {
                ForEach(Array(FlightPlanProgress.tryIds.enumerated()), id: \.element) { i, id in
                    if i > 0 { Rectangle().fill(SetStyle.ink.opacity(0.15)).frame(height: 1) }
                    trainingRow(id)
                }
                if !store.player.freeOperations {
                    Rectangle().fill(SetStyle.ink.opacity(0.15)).frame(height: 1)
                    inline(SetRowText(title: "Skip", status: confirmSkip ? "Tap again to confirm" : "Marks every try done")) {
                        SetButton(title: confirmSkip ? "Confirm" : "Skip", compact: true) {
                            if confirmSkip { confirmSkip = false; onClose(); store.skipTraining() } else { confirmSkip = true }
                        }
                    }
                }
            }.setCard(padding: 8)
        }
    }

    private var gameSection: some View {
        VStack(spacing: 8) {
            SetHeading(text: "Game")
            row(SetRowText(title: "Free Ops", status: "Play without a contract")) {
                let on = Binding(get: { store.player.freeOperations }, set: { store.setFreeOps($0) })
                SetSegment(options: ["Off", "On"], selected: on.wrappedValue ? 1 : 0) { on.wrappedValue = $0 == 1 }
                    .frame(width: 140)
            }
        }
    }

    #if os(iOS)
    private var displaySection: some View {
        VStack(spacing: 8) {
            SetHeading(text: "Display")
            orientationCard
        }
    }
    #endif

    private func inline<A: View>(_ text: SetRowText, @ViewBuilder action: () -> A) -> some View {
        HStack(spacing: 12) {
            text
            Spacer(minLength: 8)
            action()
        }.padding(.horizontal, 12).padding(.vertical, 6).frame(minHeight: 56)
    }

    private func pairCard<A: View>(_ text: SetRowText, @ViewBuilder action: () -> A) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            text
            action()
        }.setCard(padding: 16)
    }

    private func row<A: View>(_ text: SetRowText, border: Color = SetStyle.ink, @ViewBuilder action: () -> A) -> some View {
        HStack(spacing: 16) {
            text
            Spacer(minLength: 8)
            action()
        }.setCard(border: border)
    }

    private func trainingRow(_ id: String) -> some View {
        let plan = store.player.flightPlan
        let status = plan.completed[id] == true ? "Done" : plan.currentTry == id && !store.player.freeOperations ? "On air" : "Standby"
        return inline(SetRowText(title: Self.tryNames[id] ?? id, status: status)) {
            SetButton(title: "Replay", compact: true) { onClose(); store.replayTry(id) }
                .accessibilityLabel("Replay \(Self.tryNames[id] ?? id)")
        }
    }

    #if os(iOS)
    private var orientationCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            SetRowText(title: "Screen orientation", status: "Lock to portrait or landscape")
            SetSegment(options: OrientationPreference.allCases.map(\.title),
                       selected: OrientationPreference.allCases.firstIndex(of: OrientationPreference(stored: orientation)) ?? 0) {
                orientation = OrientationPreference.allCases[$0].rawValue
            }
        }.setCard()
    }
    #endif
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
                        .setCard(padding: 16)
                    }
                }.padding(16)
            }
        }.background(SetStyle.bg)
    }
}
