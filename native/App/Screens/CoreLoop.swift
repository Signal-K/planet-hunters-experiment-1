import SwiftUI
import LandnamCore

private func francs(_ n: Int) -> String { Economy.format(francs: n) }

/// Mission board (mirrors web `MissionSetupRoutes` "Choose a contract"): one contract slide at a time with
/// previous / next arrows, the client mark, facts, required cargo and ACCEPT & PREPARE.
/// The mission board is a scene, not a page (SSL-423): contracts arrive as client transmissions over the live base.
/// One compact work order carries the deal (client, job, cargo, pay, accept); Program is one tap away on the rail.
/// Mirrors web `MissionBoard` dispatch: same base, same order, same rail.
struct MissionsScreen: View {
    @Environment(GameStore.self) private var store
    @State private var archiveFocus: String?
    @State private var showArchive = false
    @State private var showSettings = false
    @State private var selected = 0
    @State private var selectedTargetId: String?
    @State private var eventFocus: String?
    @State private var tab: Int
    @State private var camera = BaseCamera(x: 0, depth: 0)
    /// `startTitle` opens the board on that contract (scene catalog only).
    private let startTitle: String?

    init(startTab: Int = 0, startTitle: String? = nil) {
        _tab = State(initialValue: startTab)
        self.startTitle = startTitle
    }

    var body: some View {
        GeometryReader { outer in
            let insets = outer.safeAreaInsets
            let full = CGSize(width: outer.size.width + insets.leading + insets.trailing, height: outer.size.height + insets.top + insets.bottom)
            scene(size: full, insets: insets)
                .frame(width: full.width, height: full.height)
                .position(x: full.width / 2 - insets.leading, y: full.height / 2 - insets.top)
        }
        .background(Theme.bg.ignoresSafeArea())
        .overlay { if showSettings { SettingsSheet(onClose: { showSettings = false }) } }
        .sheet(isPresented: $showArchive) { ArchiveScreen(focus: archiveFocus) }
        .onAppear {
            if let requested = store.requestedMissionBoardTab {
                tab = requested
                store.requestedMissionBoardTab = nil
            }
            guard let startTitle else { return }
            let entries = MissionBoard.clientBoard(catalog: store.catalog, player: store.player, now: store.now)
            if let i = entries.firstIndex(where: { $0.mission.title == startTitle }) { selected = i }
        }
    }

    private func scene(size: CGSize, insets: EdgeInsets) -> some View {
        let portrait = size.height > size.width
        let allEntries = MissionBoard.clientBoard(catalog: store.catalog, player: store.player, now: store.now)
        let entries = selectedTargetId.map { targetId in
            allEntries.filter { feasibleTargetIds(for: $0.mission).contains(targetId) }
        } ?? allEntries
        let index = entries.isEmpty ? 0 : min(selected, entries.count - 1)
        let side = max(insets.leading, 12)
        let railTop = insets.top + 60
        return ZStack(alignment: .topLeading) {
            Color.clear
            if tab != 0 { Theme.ink.opacity(0.18).allowsHitTesting(false) }

            if tab == 0 {
                Button { store.go(.hub) } label: {
                    Image(systemName: "chevron.left").font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.paper)
                        .frame(width: 44, height: 44).background(Theme.ink.opacity(0.72), in: Circle())
                        .overlay(Circle().stroke(Theme.paper.opacity(0.35), lineWidth: 2))
                }
                .buttonStyle(.plain).accessibilityLabel("Back")
                .padding(.top, insets.top + 12).padding(.leading, side)
                .zIndex(4)
            } else {
                HStack(alignment: .top) {
                    HudGearClock { showSettings = true }
                    Spacer()
                    HudChips(francs: store.player.francs)
                }
                .padding(.top, insets.top + 8).padding(.leading, side).padding(.trailing, max(insets.trailing, 12))

                rail(portrait: portrait)
                    .padding(.top, railTop).padding(.leading, side)
            }

            if tab == 3 {
                FreeRunBoard(runs: store.catalog.missions.filter { $0.id.hasPrefix("self-directed-") && !$0.locked && ($0.id != OrionidsRun.surfaceResearchMissionId || store.player.orionidsEventStage == 1) }, eventFocus: eventFocus) { store.pickMission($0) }
                    .background(Theme.paper, in: RoundedRectangle(cornerRadius: 20))
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.ink, lineWidth: 3))
                    .padding(.top, portrait ? railTop + 64 : railTop)
                    .padding(.leading, portrait ? side : side + 144)
                    .padding(.trailing, max(insets.trailing, 12))
                    .padding(.bottom, insets.bottom + 12)
            } else if tab == 1 || tab == 2 {
                ScrollView { if tab == 1 { ProgramRoadmap { archiveFocus = $0; showArchive = true }.padding(16) } else { EventsBoard(onOpenDebris: { id in eventFocus = SkyEvents.event(id)?.name ?? id; tab = 3 }).padding(16) } }
                    .background(Theme.paper, in: RoundedRectangle(cornerRadius: 20))
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.ink, lineWidth: 3))
                    .padding(.top, portrait ? railTop + 64 : railTop)
                    .padding(.leading, portrait ? side : side + 144)
                    .padding(.trailing, max(insets.trailing, 12))
                    .padding(.bottom, insets.bottom + 12)
            } else if entries.isEmpty {
                order(width: orderWidth(size, insets: insets, portrait: portrait), size: size, insets: insets, portrait: portrait) {
                    Text("No client signals yet").font(AppFont.display(22)).foregroundStyle(Theme.ink)
                    Text("Your own operations are on the Launchpad. The archive shows what unlocks the next contract.")
                        .font(AppFont.body(14)).foregroundStyle(Theme.textDim).fixedSize(horizontal: false, vertical: true)
                }
            } else {
                let e = entries[index]
                ContractWorkspace(entries: entries, selectedIndex: index, player: store.player, portrait: portrait, topInset: insets.top,
                                  onSelect: { selected = $0 }, onTake: { store.pickMission(e.id) })
                .id(e.id)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: selected)
    }

    private func accent(_ m: Mission) -> Color {
        Color(hex: m.client.flatMap { Clients.byId[$0] }?.colorHex) ?? Theme.blue
    }

    private func contractStrip(entries: [MissionBoard.Entry], selectedIndex: Int) -> some View {
        let visibleCount = min(5, entries.count)
        let start = selectedIndex - visibleCount / 2
        return HStack(spacing: 8) {
            Spacer(minLength: 0)
            ForEach(0..<visibleCount, id: \.self) { offset in
                let index = (start + offset + entries.count) % entries.count
                let mission = entries[index].mission
                let client = mission.client.flatMap { Clients.byId[$0] }
                Button { selected = index } label: {
                    ZStack(alignment: .bottomTrailing) {
                        Circle().fill(mixWhite(client?.colorHex, 0.35, fallback: Theme.paper2))
                        Circle().stroke(index == selectedIndex ? accent(mission) : Theme.ink, lineWidth: index == selectedIndex ? 4 : 2)
                        Text(client?.initial ?? "OP").font(AppFont.display(14)).foregroundStyle(Theme.ink)
                        Text("\(index + 1)").font(AppFont.mono(10)).foregroundStyle(Theme.ink)
                            .padding(2).background(Theme.paper, in: RoundedRectangle(cornerRadius: 3))
                            .offset(x: 5, y: 4)
                    }.frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Select \(mission.title)")
                .accessibilityAddTraits(index == selectedIndex ? .isSelected : [])
            }
            Spacer(minLength: 0)
        }
        .padding(.bottom, 6)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink.opacity(0.22)).frame(height: 1) }
    }

    private func feasibleTargetIds(for mission: Mission) -> [String] {
        Targets.feasible(for: mission, targets: store.catalog.targets, parts: store.catalog.parts,
                         missionsDone: store.player.missionsDone, launchpadUpgraded: store.player.launchpadUpgraded,
                         launchpadLevel: BuildingLevels.level(store.player, "launchpad"), skills: store.player.unlockedSkillNodes).map(\.id)
    }

    private func destinationFilter(entries: [MissionBoard.Entry]) -> some View {
        let ids = Set(entries.flatMap { feasibleTargetIds(for: $0.mission) })
        let targets = store.catalog.targets.filter { ids.contains($0.id) && $0.type != .exoplanet }
        let selectedTarget = selectedTargetId.flatMap { id in targets.first { $0.id == id } }
        let resultCount = selectedTargetId.map { targetId in
            entries.filter { feasibleTargetIds(for: $0.mission).contains(targetId) }.count
        } ?? entries.count
        return VStack(alignment: .leading, spacing: 6) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    filterChip(id: nil, label: "ALL")
                    if targets.contains(where: { $0.type == .asteroid }) {
                        Text("ASTEROID BELT").font(AppFont.mono(14)).tracking(1.0).foregroundStyle(Theme.textDim)
                    }
                    ForEach(targets) { target in filterChip(id: target.id, label: target.name.uppercased()) }
                }
            }
            if let selectedTarget {
                HStack(spacing: 8) {
                    Text("\(selectedTarget.name.uppercased()) · \(resultCount) \(resultCount == 1 ? "CONTRACT" : "CONTRACTS")")
                        .font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.paper)
                    Spacer(minLength: 8)
                    Button("SHOW ALL") { selectedTargetId = nil; selected = 0 }
                        .font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.paper)
                        .frame(minHeight: 44).padding(.horizontal, 12)
                        .overlay(Capsule().stroke(Theme.paper.opacity(0.7), lineWidth: 2))
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("mission-destination-clear")
                }
                .padding(.leading, 14)
                .background(Theme.ink.opacity(0.84), in: Capsule())
                .accessibilityIdentifier("mission-destination-result")
            }
        }
        .accessibilityIdentifier("mission-destination-filter")
    }

    private func filterChip(id: String?, label: String) -> some View {
        let on = selectedTargetId == id
        return Button {
            selectedTargetId = on && id != nil ? nil : id
            selected = 0
        } label: {
            Text(label).font(AppFont.display(14)).tracking(1.0)
                .foregroundStyle(on ? Theme.paper : Theme.ink)
                .padding(.horizontal, 14).frame(minHeight: 44)
                .background(on ? Theme.blue : Theme.paper, in: Capsule())
                .overlay(Capsule().stroke(Theme.ink, lineWidth: 2))
        }
        .buttonStyle(.plain)
    }

    private func orderWidth(_ size: CGSize, insets: EdgeInsets, portrait: Bool) -> CGFloat {
        portrait ? size.width - insets.leading - insets.trailing - 24 : min(560, size.width - max(insets.leading, 12) - max(insets.trailing, 12) - 160)
    }

    /// The work-order slab, anchored to the ground: bottom edge in portrait, bottom right beside the pad otherwise.
    private func order<C: View>(width: CGFloat, size: CGSize, insets: EdgeInsets, portrait: Bool, accent: Color = Theme.blue, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: portrait ? 12 : 8) { content() }
            .padding(portrait ? 16 : 12)
            .frame(width: width, alignment: .leading)
            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 20))
            .overlay(alignment: .top) { UnevenRoundedRectangle(topLeadingRadius: 20, topTrailingRadius: 20).fill(accent).frame(height: 8) }
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.ink, lineWidth: 3))
            .background(RoundedRectangle(cornerRadius: 20).fill(Theme.ink.opacity(0.7)).offset(x: 6, y: 6))
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: portrait ? .bottom : .bottomTrailing)
            .padding(.bottom, insets.bottom + 12)
            .padding(.leading, portrait ? max(insets.leading, 12) : 0)
            .padding(.trailing, max(insets.trailing, 12) + (portrait ? 0 : 4))
    }

    private func rail(portrait: Bool) -> some View {
        let layout = portrait ? AnyLayout(HStackLayout(spacing: 8)) : AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
        return layout {
            Button { store.go(.hub) } label: {
                Image(systemName: "chevron.left").font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.ink)
                    .frame(width: 44, height: 44).background(Theme.paper, in: Circle()).overlay(Circle().stroke(Theme.ink, lineWidth: 2))
            }.buttonStyle(.plain).accessibilityLabel("Back")
            railTab(0, "Contracts", "chart.line.uptrend.xyaxis", portrait: portrait)
            railTab(1, "Program", "list.clipboard", portrait: portrait)
            railTab(2, "Events", "star", portrait: portrait)
            if store.player.freeOperations { railTab(3, "Free run", "scope", portrait: portrait) }
            Button { archiveFocus = nil; showArchive = true } label: {
                Text("LOG").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.ink)
                    .frame(minWidth: portrait ? 56 : 132, minHeight: 44)
                    .background(Theme.paper, in: RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.ink, lineWidth: 2))
            }.buttonStyle(.plain).accessibilityLabel("Archive and pathways")
        }
    }

    private func railTab(_ i: Int, _ title: String, _ symbol: String, portrait: Bool) -> some View {
        let on = tab == i
        return Button { tab = i } label: {
            HStack(spacing: 6) {
                Image(systemName: symbol).font(.system(size: 18, weight: .bold))
                if !portrait { Text(title).font(AppFont.display(14)) }
            }
            .foregroundStyle(on ? Color.white : Theme.ink)
            .frame(width: portrait ? 52 : 132, height: portrait ? 52 : 48)
            .background(on ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.ink, lineWidth: on ? 3 : 2))
        }
        .buttonStyle(.plain).accessibilityLabel(title).accessibilityAddTraits(on ? .isSelected : [])
    }
}

/// Free Ops: start your own mining run with no client or daily limit (mirrors web `MissionBoard` Free run tab).
private struct FreeRunBoard: View {
    let runs: [Mission]
    let eventFocus: String?
    let onStart: (String) -> Void
    @Environment(\.flatLayout) private var flat

    var body: some View {
        if flat { content } else { ScrollView { content } }
    }

    private var content: some View {
            VStack(alignment: .leading, spacing: 10) {
                if let eventFocus {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(eventFocus.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.ink)
                        Text("Launch catches fragments · no cargo used")
                            .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    }
                    .padding(12).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.blueBright.opacity(0.24), in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.blue, lineWidth: 2))
                    .accessibilityIdentifier("event-run-context")
                }
                Text(runs.contains(where: { $0.id == OrionidsRun.surfaceResearchMissionId }) ? "Next Orionids mission" : "Your own mining run").font(AppFont.display(20)).foregroundStyle(Theme.ink)
                Text(runs.contains(where: { $0.id == OrionidsRun.surfaceResearchMissionId }) ? "The next tier is a rover observation. Deploy the rover, log the marked outcrop, and add the result to community research." : "No client, no daily limit. Pick what to mine, keep it or sell it at market price.")
                    .font(AppFont.body(14)).foregroundStyle(Theme.textDim).fixedSize(horizontal: false, vertical: true)
                VStack(spacing: 8) {
                    ForEach(runs, id: \.id) { run in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(run.title.uppercased()).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.ink)
                            Text(run.requires.minerals.sorted { $0.key < $1.key }.map { "\($0.value) \(Minerals.byId[$0.key]?.name ?? $0.key)" }.joined(separator: ", "))
                                .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                            Button { onStart(run.id) } label: {
                                Text("START RUN").font(AppFont.display(14)).tracking(1.2).foregroundStyle(.white)
                                    .frame(maxWidth: .infinity, minHeight: 44)
                                    .background(Theme.blue, in: RoundedRectangle(cornerRadius: 12))
                            }.buttonStyle(.plain).accessibilityLabel("Start \(run.title)")
                        }
                        .padding(12)
                        .background(Theme.paper2, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 2))
                    }
                    if runs.isEmpty { Text("No free runs are available yet.").font(AppFont.body(14)).foregroundStyle(Theme.textDim) }
                }
            }.padding(16)
    }
}

private struct ContractWorkspace: View {
    let entries: [MissionBoard.Entry]
    let selectedIndex: Int
    let player: Player
    let portrait: Bool
    /// Real top safe-area inset including the coach rail, so the title and client row start below the Back button (SSL-626).
    let topInset: CGFloat
    let onSelect: (Int) -> Void
    let onTake: () -> Void

    var body: some View {
        let selected = entries[selectedIndex]
        let mission = selected.mission
        let client = mission.client.flatMap { Clients.byId[$0] }
        let level = client.map { 1 + max(0, player.clientMissions[$0.id] ?? 0) / Clients.affinityMissionThreshold }
        let layout = portrait ? AnyLayout(VStackLayout(spacing: 0)) : AnyLayout(HStackLayout(spacing: 0))
        layout {
            offers
                .frame(maxWidth: .infinity, maxHeight: portrait ? nil : .infinity)
                .background(Theme.hex(0x202656).opacity(0.96))
            VStack(spacing: portrait ? 8 : 12) {
                clientMark(client)
                Text("\((client?.name ?? "Your program").uppercased())\(level.map { " · L\($0)" } ?? "")")
                    .font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.hex(0xB8C8C0)).lineLimit(1)
                Text(mission.title).font(AppFont.display(portrait ? 24 : 28)).foregroundStyle(Theme.hex(0xF4EFE4))
                    .multilineTextAlignment(.center).lineLimit(2)
                Text(mission.brief).font(AppFont.body(14)).foregroundStyle(Theme.hex(0xF4EFE4))
                    .multilineTextAlignment(.center).lineLimit(portrait ? 3 : 4)
                Text("\(selectedIndex + 1) / \(entries.count)").font(AppFont.mono(14)).foregroundStyle(Theme.hex(0xB8C8C0))
            }
            // Landscape: the floating coach band sits over the top ~85pt of this panel, so keep the avatar below it.
            .padding(portrait ? 14 : 24).padding(.top, portrait ? 0 : 48).frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.hex(0x342C70).opacity(0.96))
            action(selected, mission: mission)
                .frame(maxWidth: .infinity, maxHeight: portrait ? nil : .infinity)
                .background(Theme.hex(0x176A94).opacity(0.96))
        }
        .ignoresSafeArea()
    }

    private var offers: some View {
        VStack(spacing: 12) {
            Text("CONTRACTS").font(AppFont.display(18)).tracking(2).foregroundStyle(Theme.hex(0xA8DCF2))
            let count = min(5, entries.count)
            let start = selectedIndex - count / 2
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(56), spacing: 10), count: portrait ? 5 : 3), spacing: 10) {
                ForEach(0..<count, id: \.self) { offset in
                    let index = (start + offset + entries.count) % entries.count
                    let contract = entries[index].mission
                    let client = contract.client.flatMap { Clients.byId[$0] }
                    Button { onSelect(index) } label: {
                        ZStack(alignment: .bottomTrailing) {
                            clientMark(client).frame(width: 52, height: 52)
                            Text("\(index + 1)").font(AppFont.mono(14)).foregroundStyle(Theme.hex(0xF4EFE4))
                        }
                        .frame(width: 56, height: 56)
                        .overlay(Rectangle().stroke(index == selectedIndex ? Theme.hex(0x58D0EA) : Theme.hex(0xF4EFE4).opacity(0.55), lineWidth: index == selectedIndex ? 3 : 1))
                    }.buttonStyle(.plain).accessibilityLabel("Select \(contract.title)")
                }
            }
        }.padding(.top, portrait ? topInset + 64 : 82).padding(.horizontal, 14).padding(.bottom, 14)
    }

    private func action(_ entry: MissionBoard.Entry, mission: Mission) -> some View {
        VStack(spacing: portrait ? 10 : 20) {
            Text("REQUIREMENTS").font(AppFont.display(18)).tracking(1.5).foregroundStyle(Theme.hex(0x9DE7EF))
            HStack(spacing: 18) {
                ForEach(mission.requires.minerals.sorted { $0.key < $1.key }, id: \.key) { id, amount in
                    if let meta = Minerals.byId[id] {
                        VStack(spacing: 2) {
                            HStack(spacing: 6) {
                                Image(systemName: "hexagon.fill").font(.system(size: 28)).foregroundStyle(Color(hex: meta.colorHex) ?? Theme.paper2)
                                Text("\(amount)").font(AppFont.display(22)).foregroundStyle(Theme.hex(0xF4EFE4))
                            }
                            Text(meta.name.uppercased()).font(AppFont.body(14)).foregroundStyle(Theme.hex(0xD5E0D9))
                        }
                    }
                }
            }
            Text(francs(mission.payout.francs)).font(AppFont.display(24)).foregroundStyle(Theme.hex(0xF4EFE4))
            Button(action: onTake) {
                Text("ACCEPT").font(AppFont.display(18)).tracking(1.5).foregroundStyle(Theme.hex(0x152033))
                    .frame(maxWidth: 220, minHeight: 52).background(Theme.hex(0xF4EFE4), in: RoundedRectangle(cornerRadius: 4))
            }.buttonStyle(.plain).disabled(!entry.unlocked)
        }.padding(portrait ? 14 : 24)
    }

    private func clientMark(_ client: Client?) -> some View {
        ZStack {
            Circle().fill(mixWhite(client?.colorHex, 0.35, fallback: Theme.paper2))
            Circle().stroke(Theme.hex(0x152033), lineWidth: 2)
            Text(client?.initial ?? "OP").font(AppFont.display(18)).foregroundStyle(Theme.hex(0x152033))
        }.frame(width: 68, height: 68)
    }
}

/// The deal on one contract: who, what, cargo, pay, accept. Everything else lives in the archive.
private struct WorkOrder: View {
    let entry: MissionBoard.Entry
    let position: Int
    let count: Int
    let player: Player
    let portrait: Bool
    let onTake: () -> Void

    var body: some View {
        let m = entry.mission
        let client = m.client.flatMap { Clients.byId[$0] }
        let level = client.map { 1 + max(0, player.clientMissions[$0.id] ?? 0) / Clients.affinityMissionThreshold }
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(mixWhite(client?.colorHex, 0.35, fallback: Theme.paper2))
                Circle().stroke(Theme.ink, lineWidth: 2)
                Text(client?.initial ?? "OP").font(AppFont.display(16)).foregroundStyle(Theme.ink)
            }.frame(width: 44, height: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text("\((client?.name ?? "Your program").uppercased())\(level.map { " · L\($0)" } ?? "")")
                    .font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.textDim).lineLimit(1)
                Text(m.title).font(AppFont.display(portrait ? 22 : 24)).foregroundStyle(Theme.ink).lineLimit(2).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 6)
            Text("\(position)/\(count)").font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
        }
        if !m.brief.isEmpty {
            Text(m.brief).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                .multilineTextAlignment(portrait ? .leading : .center).lineLimit(portrait ? 3 : 2)
                .frame(maxWidth: .infinity, alignment: portrait ? .leading : .center)
        }
        HStack(spacing: 10) {
            Rectangle().fill(accentLine(client?.colorHex)).frame(height: 1)
            Text("REQUIREMENTS").font(AppFont.display(14)).tracking(1.6).foregroundStyle(accentLine(client?.colorHex))
            Rectangle().fill(accentLine(client?.colorHex)).frame(height: 1)
        }
        HStack(alignment: .center, spacing: 8) {
            ForEach(m.requires.minerals.sorted { $0.key < $1.key }, id: \.key) { id, amount in
                if let meta = Minerals.byId[id] { crate(meta, amount) }
            }
            Spacer(minLength: 8)
            Text(compactFrancs(m.payout.francs)).font(AppFont.display(portrait ? 22 : 26)).foregroundStyle(Theme.ink).lineLimit(1)
            if !portrait { accept }
        }
        if portrait { accept }
        if !entry.unlocked {
            Text(entry.lockedReason ?? "Locked").font(AppFont.body(14)).foregroundStyle(Theme.textDim).fixedSize(horizontal: false, vertical: true)
        }
    }

    private func accentLine(_ hex: String?) -> Color { Color(hex: hex) ?? Theme.blue }

    private var accept: some View {
        Button(action: onTake) {
            Text("ACCEPT").font(AppFont.display(18)).tracking(1.8)
                .foregroundStyle(entry.unlocked ? Color.white : Theme.ink)
                .frame(maxWidth: portrait ? .infinity : nil, minHeight: 52).padding(.horizontal, 22)
                .background(entry.unlocked ? Theme.blue : Theme.paper2, in: Capsule())
                .overlay(Capsule().stroke(Theme.ink, lineWidth: 3))
                .background(Capsule().fill(Theme.ink).offset(x: 3, y: 3))
        }
        .buttonStyle(.plain).disabled(!entry.unlocked).accessibilityLabel("Accept \(entry.mission.title)")
    }

    private func crate(_ meta: MineralMeta, _ amount: Int) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "hexagon.fill").font(.system(size: 26)).foregroundStyle(Color(hex: meta.colorHex) ?? Theme.paper2)
                .overlay(Image(systemName: "hexagon").font(.system(size: 26)).foregroundStyle(Theme.ink))
            VStack(alignment: .leading, spacing: 0) {
                Text("\(amount)").font(AppFont.mono(18)).foregroundStyle(Theme.ink)
                Text(meta.name).font(AppFont.body(14)).foregroundStyle(Theme.textDim).lineLimit(1)
            }
        }
        .padding(.vertical, 6).padding(.leading, 6).padding(.trailing, 10)
        .background(mixWhite(meta.colorHex, 0.18, fallback: Theme.paper2), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 2))
        .accessibilityElement(children: .combine)
    }

    private func round(_ symbol: String, _ label: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.ink)
                .frame(width: 44, height: 44).background(Theme.paper, in: Circle()).overlay(Circle().stroke(Theme.ink, lineWidth: 2))
        }.buttonStyle(.plain).accessibilityLabel(label)
    }

    private func compactFrancs(_ n: Int) -> String {
        if n >= 1_000_000_000 { return String(format: "₣%.1fB", Double(n) / 1e9) }
        if n >= 1_000_000 { return String(format: "₣%.1fM", Double(n) / 1e6) }
        return Economy.format(francs: n)
    }
}

/// An incoming client transmission: a dashed beam from the sky, a packet riding down it, rings where it lands.
private struct SignalBeam: View {
    let color: Color
    let length: CGFloat
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        // Only the packet and rings, at 24 fps. A tall line under them (dashed with an animated `dashPhase`, sliding rectangles,
        // or even a static solid one) pinned WindowServer at 45-100% on macOS next to the live base canvas.
        ZStack(alignment: .top) {
        TimelineView(.animation(minimumInterval: 1.0 / 8, paused: reduceMotion)) { ctx in
            let t = reduceMotion ? 0 : ctx.date.timeIntervalSinceReferenceDate
            let phase = CGFloat(t.truncatingRemainder(dividingBy: 1.8) / 1.8)
            ZStack(alignment: .top) {
                RoundedRectangle(cornerRadius: 3).fill(color).overlay(RoundedRectangle(cornerRadius: 3).stroke(Theme.ink, lineWidth: 2))
                    .frame(width: 14, height: 14).offset(y: phase * (length - 14)).opacity(phase < 0.9 ? 1 : 0)
                ForEach(0..<2, id: \.self) { k in
                    let r = (phase + CGFloat(k) * 0.5).truncatingRemainder(dividingBy: 1)
                    Circle().stroke(color, lineWidth: 3).frame(width: 36, height: 36)
                        .scaleEffect(0.4 + r * 2.2).opacity(Double(1 - r) * 0.9).offset(y: length - 18)
                }
            }
            .frame(width: 4, height: length)
        }
        }
        .frame(width: 4, height: length)
        .allowsHitTesting(false).accessibilityHidden(true)
    }
}

/// `hex` at `pct` strength over white (CSS `color-mix(in srgb, hex pct, #fff)`).
private func mixWhite(_ hex: String?, _ pct: Double, fallback: Color) -> Color {
    guard let hex, hex.hasPrefix("#"), let v = UInt32(hex.dropFirst(), radix: 16) else { return fallback }
    let c = (r: Double((v >> 16) & 0xFF) / 255, g: Double((v >> 8) & 0xFF) / 255, b: Double(v & 0xFF) / 255)
    return Color(.sRGB, red: c.r * pct + (1 - pct), green: c.g * pct + (1 - pct), blue: c.b * pct + (1 - pct))
}

extension Color {
    init?(hex: String?) {
        guard let hex, hex.hasPrefix("#"), let v = UInt32(hex.dropFirst(), radix: 16) else { return nil }
        self = Theme.hex(v)
    }
}


struct LaunchScreen: View {
    @Environment(GameStore.self) private var store
    @State private var launching = false
    @State private var configuring: Bool?
    private var needsConfig: Bool { !FlightPlan.moduleKinds.allSatisfy { store.player.shipCustomizerParts[$0] != nil } }
    private var variant: String {
        store.player.stagedRockets.first { $0.location == .launchpad }?.rocketId.contains("explorer") == true ? "explorer" : "prospector"
    }
    var body: some View {
        if launching {
            LaunchSequenceScreen(variant: variant) { store.launch() }
        } else if configuring ?? needsConfig {
            HangarModulesPanel(onClose: { configuring = false })
        } else {
            pad
        }
    }

    private var pad: some View {
        ScreenFrame(title: "Hangar", back: { store.go(.hub) }) {
            SetButton(title: "Build config", fill: true) { configuring = true }
            if let m = store.mission {
                Panel {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(m.title).font(.headline)
                        Text("Target: \(store.target?.name ?? "none")")
                        if let payload = m.payload {
                            Divider()
                            Text("PAYLOAD LOADED").font(AppFont.mono(14)).tracking(1.2).foregroundStyle(Theme.blue)
                            Text(payload.name).font(AppFont.display(18))
                            Text(payload.type == .rover ? "Surface rover · deploy on target" : "Mission equipment")
                                .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                        }
                    }
                }
            } else if store.player.stagedRockets.isEmpty {
                Panel(accent: Theme.teal) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Nothing in the hangar yet").font(AppFont.display(16))
                        Text("Take a contract and pick a rocket in launch review. It rolls out here, then to the pad.")
                            .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                        PrimaryButton(title: "Open mission board") { store.go(.missions) }
                    }
                }
            }
            ForEach(store.player.stagedRockets) { r in
                Panel {
                    Text("\(r.rocketId) · \(r.location.rawValue)")
                    if r.location == .hangar { PrimaryButton(title: "Roll out to pad") { store.rollOutToPad() } }
                }
            }
            if store.mission != nil || !store.player.stagedRockets.isEmpty {
                PrimaryButton(title: "Launch", enabled: store.player.stagedRockets.contains { $0.location == .launchpad }) { launching = true }
                Button("Abandon contract", role: .destructive) { store.abandonMission() }.frame(minHeight: 44)
            }
        }
    }
}

struct DebriefScreen: View {
    @Environment(GameStore.self) private var store
    @State private var showSettings = false
    @State private var collecting = false
    @State private var scrapped = false
    /// SSL-651: what a filled Orionids shower run paid. Collecting settles the run and clears its count, so keep showing it until the screen leaves.
    @State private var shownRun: (francs: Int, fragments: Int)?

    var body: some View {
        let m = store.mission
        let cargo = store.state.lastCargo ?? [:]
        let liveRun = m?.id == OrionidsRun.missionId && OrionidsRun.filled(store.player)
            ? (francs: OrionidsRun.payout(missionsDone: store.player.missionsDone), fragments: OrionidsRun.catches(store.player)) : nil
        let run = liveRun ?? shownRun
        let haulUnits = cargo.values.reduce(0) { $0 + max(0, $1) }
        let payout = m.map { MissionGenerator.calibrateOnboardingPayout(raw: $0.payout.francs, missionsDone: store.player.missionsDone) } ?? 0
        let isOrionidsEvent = m?.id == OrionidsRun.missionId || m?.id == OrionidsRun.surfaceResearchMissionId
        let isFreeHaul = !isOrionidsEvent && (m?.isOwnProgram == true && m?.deliveryTargetId == nil && m?.construction == nil) && cargo.values.contains { $0 > 0 }
        let orbital = m?.payload?.type == .satellite
        let program = m?.isOwnProgram == true && !isFreeHaul
        let stored = Market.earthStorageBuilt(store.player)
        let disposition = store.player.freeHaulDisposition ?? (stored ? HaulDisposition.store : .sell)
        let willStore = isFreeHaul && disposition == .store && stored
        let sale = HomeDelivery.marketValue(store.player, units: run == nil ? cargo : OrionidsRun.withoutFragments(cargo), now: store.now)
        let overflow = max(0, Market.storedUnits(store.player.stash) - Market.storageCapacity(store.player))
        let target = store.target
        let status = store.player.shipDestroyed ? "Hull lost · cargo recovered" : program ? "Commissioned · instrument online" : "Docked · mission complete"
        let reserved = m?.requires.minerals.values.reduce(0, +) ?? 0
        let showLaser = m?.isOwnProgram == false && store.player.missionsDone >= 2 && (LaserCapacitor.units(store.player.stash) > 0 || !cargo.isEmpty)

        GeometryReader { geo in
            let portrait = geo.size.height > geo.size.width
            let short = geo.size.height < 520
            ZStack(alignment: .topLeading) {
                if let target {
                    DestinationVista(
                        targetId: target.id,
                        type: target.type,
                        archetype: target.archetype,
                        crates: cargo.filter { $0.value > 0 }.prefix(4).map { (file: CrateArt.file(for: $0.key), count: min(5, max(1, $0.value))) }
                    )
                    .ignoresSafeArea()
                } else {
                    RecordCream.paper.ignoresSafeArea()
                }

                ScrollView {
                VStack(alignment: .leading, spacing: short ? 16 : 24) {
                    if orbital {
                        CreamCard {
                            statusLine("Commissioned · instrument online", crit: false)
                            Text(m?.title ?? "Instrument").font(AppFont.display(22)).foregroundStyle(Theme.ink)
                            Text("PROGRAM OUTCOME").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                            if let outcome = m?.programReward?.outcome {
                                Text(outcome).font(AppFont.body(14)).foregroundStyle(Theme.ink)
                            }
                            Text("\((m?.payload?.name ?? "Instrument")) remains in Earth orbit. The sky-side status indicator marks the downlink. Stationed at \(target?.name ?? "Earth").")
                                .font(AppFont.body(14)).foregroundStyle(Theme.ink)
                        }
                    } else {
                        CreamCard {
                            statusLine(status, crit: store.player.shipDestroyed)
                            HStack(alignment: .top, spacing: 28) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("MISSION").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                                    Text(m?.title ?? "Contract").font(AppFont.display(22)).foregroundStyle(Theme.ink)
                                }
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(program ? "STATIONED AT" : "RETURNED FROM").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                                    Text(target?.name ?? "—").font(AppFont.display(22)).foregroundStyle(Theme.ink)
                                }
                            }
                        }
                    }

                    if !orbital && isFreeHaul {
                        CreamCard {
                            Text("FREE OPS HAUL").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                            if sale > 0 {
                                ledgerRow("Mining fee · your program", Economy.format(francs: sale / 2))
                                ledgerRow("Transport fee · return", Economy.format(francs: sale - sale / 2))
                            }
                            Text(willStore ? "Earth storage" : "sell on Earth return").font(AppFont.display(18)).foregroundStyle(Theme.ink).padding(.top, 8)
                            if willStore {
                                ledgerRow("Silo", "\(min(Market.storedUnits(store.player.stash), Market.storageCapacity(store.player))) / \(Market.storageCapacity(store.player)) U")
                                if overflow > 0 {
                                    Text("\(overflow) units over capacity are sold.").font(AppFont.body(14)).foregroundStyle(Theme.ink)
                                }
                            } else {
                                HStack(alignment: .firstTextBaseline) {
                                    Text("SALE VALUE").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                                    Spacer(minLength: 12)
                                    AnimatedFrancs(value: sale)
                                }.padding(.top, 8)
                            }
                            if !stored {
                                Text("Build a Mineral Vault to keep ore on Earth.").font(AppFont.body(14)).foregroundStyle(Theme.ink)
                            }
                        }
                    } else if !orbital, let reward = m?.programReward, program {
                        CreamCard {
                            Text("PROGRAM OUTCOME").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                            Text(reward.outcome).font(AppFont.body(14)).foregroundStyle(Theme.ink)
                            Text("+\(reward.researchXP) XP").font(AppFont.display(18)).foregroundStyle(Theme.ink)
                        }
                    } else if !orbital && m?.payload == nil {
                        CreamCard {
                            Text("LEDGER").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                            ledgerRow("Contract value", Economy.format(francs: m?.payout.francs ?? payout))
                            HStack(alignment: .firstTextBaseline) {
                                Text("NET").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                                Spacer(minLength: 12)
                                AnimatedFrancs(value: payout)
                            }.padding(.top, 8)
                        }
                    }

                    if let run {
                        CreamCard {
                            Text("SHOWER RUN").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                            Text("Order filled: \(run.fragments) fragments caught. Kept as fragments, not sold.").font(AppFont.body(14)).foregroundStyle(Theme.ink)
                            ledgerRow("Run pays", Economy.format(francs: run.francs))
                        }
                    }

                    if isOrionidsEvent {
                        CreamCard {
                            Text("ORIONIDS KNOWLEDGE LOG").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                            Text("This run is saved to your Data Pad as a meteor-shower observation. Add your own Orionids photos in the Atlas app to keep building the event record.")
                                .font(AppFont.body(14)).foregroundStyle(Theme.ink)
                            Link("Open Atlas photos", destination: URL(string: "https://playlandnam.space")!)
                                .font(AppFont.body(14)).fontWeight(.bold).foregroundStyle(Theme.blue)
                                .underline()
                        }
                    }

                    if showLaser, let m {
                        LaserCapacitorPanel(
                            level: store.player.laserCapacitorLevel,
                            stashUnits: LaserCapacitor.units(store.player.stash),
                            reservedUnits: reserved
                        ) {
                            store.buyLaserCapacitor(expectedLevel: store.player.laserCapacitorLevel, reservedUnits: reserved)
                        }
                    }
                }
                .padding(.horizontal, portrait ? 16 : 24)
                .padding(.bottom, 8)
                }
                .padding(.top, portrait ? 0 : (short ? 64 : 88))
                .padding(.bottom, short ? 84 : 96)
                .padding(.trailing, portrait ? 0 : 24)
                .frame(maxWidth: portrait ? .infinity : min(440, short ? geo.size.width * 0.48 : 440))
                .frame(maxHeight: portrait ? geo.size.height * 0.58 : .infinity, alignment: .top)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: portrait ? .bottom : .topTrailing)

            }
        }
        .overlay(alignment: .top) {
            HStack(alignment: .top) {
                HudGearClock { showSettings = true }
                Spacer(minLength: 8)
                Text("\(haulUnits) U")
                    .font(AppFont.mono(14)).foregroundStyle(Theme.ink)
                    .padding(.horizontal, 10)
                    .frame(minWidth: 44, minHeight: 44)
                    .background(RecordCream.paper)
                    .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                    .padding(.trailing, 56)
                    .accessibilityLabel("Cargo units")
            }
            .padding(16)
        }
        .overlay(alignment: .bottom) {
            HStack(spacing: 8) {
                if !orbital {
                    RecordDockButton(title: scrapped ? "Dismantled" : "Teardown", filled: false, enabled: !scrapped) { scrapped = true }
                }
                RecordDockButton(title: run.map { "COMPLETE MISSION · RETURN TO BASE · \(Economy.format(francs: $0.francs + (willStore ? 0 : sale)))" } ?? collectTitle(free: isFreeHaul, store: willStore, overflow: overflow, sale: sale, program: program || orbital, payout: payout), filled: true, enabled: !collecting) {
                    guard !collecting else { return }
                    collecting = true
                    shownRun = run
                    store.debriefDone(payout: payout, affinity: m?.payout.affinity ?? 0, consumed: cargo, disposition: isFreeHaul ? disposition : nil)
                }
            }
            .padding(8)
            .background(RecordCream.paper)
            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
            .padding(.bottom, 16)
        }
        .helpable(.debrief)
        .overlay { if showSettings { SettingsSheet(onClose: { showSettings = false }) } }
    }

    private func collectTitle(free: Bool, store: Bool, overflow: Int, sale: Int, program: Bool, payout: Int) -> String {
        if free {
            if store { return overflow > 0 ? "Complete mission · sell \(overflow) over cap" : "Complete mission · keep haul" }
            return "Complete mission · collect \(Economy.format(francs: sale))"
        }
        if program { return "Complete mission · log outcome" }
        return "Complete mission · collect \(Economy.format(francs: payout))"
    }

    private func statusLine(_ text: String, crit: Bool) -> some View {
        HStack(spacing: 10) {
            Rectangle().fill(crit ? Theme.crimson : Theme.blue).frame(width: 8, height: 8)
            Text(text.uppercased()).font(AppFont.mono(14)).tracking(1.4).foregroundStyle(crit ? Theme.crimson : Theme.blue)
        }
    }

    private func ledgerRow(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label.uppercased()).font(AppFont.display(14)).foregroundStyle(Theme.ink)
            Spacer(minLength: 12)
            Text(value).font(AppFont.mono(14)).foregroundStyle(Theme.ink)
        }
        .padding(.top, 12)
    }
}

private struct RecordDockButton: View {
    let title: String
    var filled: Bool
    var wide = false
    var enabled = true
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title.uppercased())
                .font(AppFont.display(14)).tracking(1.2)
                .foregroundStyle(filled ? RecordCream.paper : Theme.ink)
                .frame(maxWidth: wide ? .infinity : nil)
                .frame(minWidth: 148, minHeight: 48)
                .padding(.horizontal, 12)
                .background(filled ? Theme.blue : RecordCream.paper)
                .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.55)
    }
}

/// SSL-462: spend hauled ore on the next Laser Capacitor. Cream card, dark ink, one line of copy.
struct LaserCapacitorPanel: View {
    let level: Int
    let stashUnits: Int
    let reservedUnits: Int
    let install: () -> Void

    var body: some View {
        let spare = max(0, stashUnits - reservedUnits)
        if let next = LaserCapacitor.next(level) {
            let canAfford = spare >= next.costUnits
            CreamCard {
                Text("NEXT BUILD").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                Text(next.name).font(AppFont.display(22)).foregroundStyle(Theme.ink)
                Text("\(next.costUnits) ore").font(AppFont.body(14)).foregroundStyle(Theme.ink)
                RecordDockButton(title: canAfford ? "Install · \(next.costUnits) ore" : "Need \(next.costUnits - spare) more ore", filled: true, wide: true, enabled: canAfford, action: install)
            }
        } else {
            CreamCard {
                Text("NEXT BUILD").font(AppFont.mono(14)).tracking(1.6).foregroundStyle(Theme.blue)
                Text(LaserCapacitor.tiers.last { $0.level == level }?.name ?? "Laser Capacitor").font(AppFont.display(22)).foregroundStyle(Theme.ink)
                Text("\(LaserCapacitor.bonus(level)) charges on every run.").font(AppFont.body(14)).foregroundStyle(Theme.ink)
            }
        }
    }
}
