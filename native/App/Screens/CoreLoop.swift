import SwiftUI
import LandnamCore

private func francs(_ n: Int) -> String { Economy.format(francs: n) }

/// Mission board (mirrors web `MissionSetupRoutes` "Choose a contract"): one contract slide at a time with
/// previous / next arrows, the client mark, facts, required cargo and ACCEPT & PREPARE.
struct MissionsScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(\.flatLayout) private var flat
    @State private var archiveFocus: String?
    @State private var showArchive = false
    @State private var selected = 0
    @State private var tab: Int

    init(startTab: Int = 0) { _tab = State(initialValue: startTab) }

    var body: some View {
        let entries = MissionBoard.clientBoard(catalog: store.catalog, player: store.player, now: store.now)
        let index = entries.isEmpty ? 0 : min(selected, entries.count - 1)
        scroller {
            VStack(alignment: .leading, spacing: 12) {
                header
                tabs
                if tab == 1 {
                    ProgramRoadmap { archiveFocus = $0; showArchive = true }
                } else {
                WorldSpaceWeekBanner(banner: WorldSpaceWeek.banner(badges: store.player.badges, now: store.now))
                if entries.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("NO CONTRACTS ARE OFFERED YET").font(AppFont.display(16)).foregroundStyle(Theme.ink)
                        Text("Your own operations are on the Launchpad. The archive shows what unlocks the next contract.")
                            .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    }.padding(16).frame(maxWidth: .infinity, alignment: .leading).stage(accent: mixWhite("#17703F", 0.12, fallback: Theme.paper))
                } else {
                    let e = entries[index]
                    HStack(alignment: .center, spacing: 4) {
                        arrow("chevron.left", label: "Previous contract", disabled: entries.count < 2) { selected = (index - 1 + entries.count) % entries.count }
                        MissionSlide(entry: e, position: index + 1, count: entries.count, catalog: store.catalog, player: store.player, rocket: store.state.rocket,
                                     wsw: WorldSpaceWeek.chips(for: e.mission, badges: store.player.badges, now: store.now),
                                     onTake: { store.pickMission(e.id) }, onPathway: { archiveFocus = "mission:\(e.id)"; showArchive = true })
                        arrow("chevron.right", label: "Next contract", disabled: entries.count < 2) { selected = (index + 1) % entries.count }
                    }
                    .padding(.vertical, 8).padding(.horizontal, 4)
                    .stage(accent: mixWhite(e.mission.client.flatMap { Clients.byId[$0]?.colorHex } ?? "#17703F", 0.12, fallback: Theme.paper))
                }
                PrimaryButton(title: "Archive · pathways and unlocks") { archiveFocus = nil; showArchive = true }
                }
            }
            .padding(.horizontal, 16).padding(.top, 16).padding(.bottom, 32)
            .frame(maxWidth: 720, alignment: .leading).frame(maxWidth: .infinity)
        }
        .background(Theme.bg.ignoresSafeArea())
        .foregroundStyle(Theme.ink)
        .sheet(isPresented: $showArchive) { ArchiveScreen(focus: archiveFocus) }
    }

    @ViewBuilder private func scroller<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        if flat { c().frame(maxHeight: .infinity, alignment: .top) } else { ScrollView { c() } }
    }

    private var tabs: some View {
        HStack(spacing: 8) {
            ForEach(Array(["CONTRACTS", "PROGRAM"].enumerated()), id: \.offset) { i, title in
                Button { tab = i } label: {
                    Text(title).font(AppFont.display(14, "ExtraBold")).tracking(1.2)
                        .foregroundStyle(tab == i ? Theme.paper : Theme.ink)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(tab == i ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.ink, lineWidth: 2))
                }.buttonStyle(.plain).accessibilityAddTraits(tab == i ? .isSelected : [])
            }
        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 8) {
            Button { store.go(.hub) } label: {
                Image(systemName: "chevron.left").font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.ink)
                    .frame(width: 48, height: 48).background(Theme.paper).overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.ink, lineWidth: 3))
                    .background(RoundedRectangle(cornerRadius: 4).fill(Theme.ink.opacity(0.42)).offset(y: 4))
            }.buttonStyle(.plain).accessibilityLabel("Back")
            VStack(alignment: .leading, spacing: 4) {
                Text("CONTRACT → LAUNCH").font(AppFont.display(14)).tracking(2.0)
                Text("Choose a contract").font(AppFont.display(20))
            }
            .padding(.vertical, 8).padding(.leading, 12).padding(.trailing, 12).frame(minHeight: 48, alignment: .leading)
            .background(Theme.paper)
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.ink, lineWidth: 3))
            .overlay(alignment: .leading) { Rectangle().fill(Theme.blue).frame(width: 7).padding(.vertical, 1.5) }
            .background(RoundedRectangle(cornerRadius: 4).fill(Theme.ink.opacity(0.42)).offset(y: 4))
        }
        .padding(.bottom, 4)
    }

    private func arrow(_ symbol: String, label: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.ink)
                .frame(width: 44, height: 64).background(Theme.paper).overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
        }.buttonStyle(.plain).disabled(disabled).opacity(disabled ? 0.5 : 1).accessibilityLabel(label)
    }
}

/// `hex` at `pct` strength over white (CSS `color-mix(in srgb, hex pct, #fff)`).
private func mixWhite(_ hex: String?, _ pct: Double, fallback: Color) -> Color {
    guard let hex, hex.hasPrefix("#"), let v = UInt32(hex.dropFirst(), radix: 16) else { return fallback }
    let c = (r: Double((v >> 16) & 0xFF) / 255, g: Double((v >> 8) & 0xFF) / 255, b: Double(v & 0xFF) / 255)
    return Color(.sRGB, red: c.r * pct + (1 - pct), green: c.g * pct + (1 - pct), blue: c.b * pct + (1 - pct))
}

private extension Color {
    init?(hex: String?) {
        guard let hex, hex.hasPrefix("#"), let v = UInt32(hex.dropFirst(), radix: 16) else { return nil }
        self = Theme.hex(v)
    }
}

private extension View {
    /// The web contract stage: 3pt ink frame, 8pt radius, a tint of the client colour behind the left half.
    func stage(accent: Color) -> some View {
        self.background(
            GeometryReader { g in
                HStack(spacing: 0) {
                    Rectangle().fill(accent).frame(width: g.size.width * 0.5)
                    Rectangle().fill(Theme.paper2)
                }
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 3))
        .background(RoundedRectangle(cornerRadius: 8).fill(Theme.ink.opacity(0.42)).offset(y: 8))
        .padding(.bottom, 8)
    }
}

/// One contract: identity, brief, facts, cargo and the accept button (web `contractSlide`).
struct MissionSlide: View {
    let entry: MissionBoard.Entry
    let position: Int
    let count: Int
    let catalog: Catalog
    let player: Player
    let rocket: RocketConfig
    let wsw: [WorldSpaceWeek.Chip]
    let onTake: () -> Void
    let onPathway: () -> Void

    private func compactFrancs(_ n: Int) -> String {
        if n >= 1_000_000_000 { return String(format: "₣%.1fB", Double(n) / 1e9) }
        if n >= 1_000_000 { return String(format: "₣%.0fM", Double(n) / 1e6) }
        return Economy.format(francs: n)
    }

    var body: some View {
        let m = entry.mission
        let client = m.client.flatMap { Clients.byId[$0] }
        let accent = Color(hex: client?.colorHex) ?? Theme.blue
        let level = client.map { 1 + max(0, player.clientMissions[$0.id] ?? 0) / Clients.affinityMissionThreshold }
        let route: String = {
            if let from = m.targetId.flatMap(catalog.target)?.name, let to = m.deliveryTargetId.flatMap(catalog.target)?.name { return "\(from) → \(to)".uppercased() }
            return "\(entry.feasibleTargets) ELIGIBLE TARGET\(entry.feasibleTargets == 1 ? "" : "S")"
        }()
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Theme.paper)
                    Circle().stroke(accent, lineWidth: 2)
                    Text(client?.initial ?? "OP").font(AppFont.display(28)).foregroundStyle(Theme.ink)
                }.frame(width: 88, height: 88)
                VStack(alignment: .leading, spacing: 8) {
                    Text("CLIENT CONTRACT \(position) / \(count)").font(AppFont.display(14)).tracking(2.0)
                    Text(client?.name ?? "Your program").font(AppFont.display(18)).fixedSize(horizontal: false, vertical: true)
                }
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(m.title).font(AppFont.display(26)).fixedSize(horizontal: false, vertical: true)
                Text(route).font(AppFont.display(14)).tracking(1.7)
                WorldSpaceWeekChips(chips: wsw).padding(.top, 6)
                Text(m.brief).font(AppFont.body(14, "SemiBold")).fixedSize(horizontal: false, vertical: true)
            }
            HStack(alignment: .top, spacing: 8) {
                fact("VALUE", compactFrancs(m.payout.francs))
                fact("CLIENT LEVEL", level.map { "L\($0)" } ?? "PROGRAM")
                fact("MISSION TIER", m.difficulty)
            }
            if !m.requires.minerals.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("REQUIRED CARGO").font(AppFont.display(14)).tracking(2.0)
                    ChipFlow(spacing: 8) {
                        ForEach(m.requires.minerals.sorted { $0.key < $1.key }, id: \.key) { id, amount in
                            if let meta = Minerals.byId[id] { cargoChip(meta, amount) }
                        }
                    }
                }
            }
            Art.view(Rockets.model(for: rocket).id == "prospector" ? "ships/ship_sr2.png" : "ships/ship_sr1.png")
                .resizable().interpolation(.high).aspectRatio(contentMode: .fit).frame(height: 140).frame(maxWidth: .infinity)
            Button(action: onTake) {
                HStack(spacing: 8) {
                    Image(systemName: "location.north.fill").font(.system(size: 16, weight: .bold))
                    Text("ACCEPT & PREPARE").font(AppFont.display(14)).tracking(1.7)
                }
                .foregroundStyle(.white).frame(maxWidth: .infinity, minHeight: 48)
                .background(Theme.teal, in: RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.ink, lineWidth: 3))
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.ink.opacity(0.72)).offset(y: 4))
                .padding(.bottom, 4)
            }.buttonStyle(.plain).disabled(!entry.unlocked).opacity(entry.unlocked ? 1 : 0.5)
            if !entry.unlocked {
                HStack(spacing: 8) {
                    Image(systemName: "lock.fill").foregroundStyle(Theme.textMuted)
                    Text(entry.lockedReason ?? "Locked").font(AppFont.body(14)).foregroundStyle(Theme.textDim).fixedSize(horizontal: false, vertical: true)
                }
                Button(action: onPathway) {
                    Text("SEE THE PATHWAY").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.bluePress).frame(minHeight: 44, alignment: .leading)
                }.buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 4)
    }

    private func fact(_ k: String, _ v: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(k).font(AppFont.display(14)).tracking(1.7).fixedSize(horizontal: false, vertical: true)
            Text(v).font(AppFont.display(15))
        }.frame(maxWidth: .infinity, alignment: .leading)
    }

    private func cargoChip(_ meta: MineralMeta, _ amount: Int) -> some View {
        HStack(spacing: 0) {
            Text(meta.symbol).font(AppFont.display(14)).frame(minWidth: 28).frame(maxHeight: .infinity)
                .background(mixWhite(meta.colorHex, 0.35, fallback: Theme.paper2))
                .overlay(alignment: .trailing) { Rectangle().fill(Theme.ink).frame(width: 2) }
            Text("×\(amount)").font(AppFont.display(14)).padding(.horizontal, 6)
            Text(meta.name).font(AppFont.display(14)).padding(.trailing, 6)
        }
        .frame(minHeight: 32).fixedSize()
        .background(Theme.paper).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
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
                Panel { Text(m.title).font(.headline); Text("Target: \(store.target?.name ?? "none")") }
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

struct DeliveryScreen: View {
    @Environment(GameStore.self) private var store
    var body: some View {
        ScreenFrame(title: "Delivery") {
            PrimaryButton(title: "Unload cargo") { store.deliveryUnloadComplete() }
        }
    }
}

struct DebriefScreen: View {
    @Environment(GameStore.self) private var store
    @State private var showSettings = false
    @State private var collecting = false
    @State private var scrapped = false

    var body: some View {
        let m = store.mission
        let cargo = store.state.lastCargo ?? [:]
        let haulUnits = cargo.values.reduce(0) { $0 + max(0, $1) }
        let payout = m.map { MissionGenerator.calibrateOnboardingPayout(raw: $0.payout.francs, missionsDone: store.player.missionsDone) } ?? 0
        let isFreeHaul = (m?.isOwnProgram == true && m?.deliveryTargetId == nil && m?.construction == nil) && cargo.values.contains { $0 > 0 }
        let orbital = m?.payload?.type == .satellite
        let program = m?.isOwnProgram == true && !isFreeHaul
        let stored = Market.earthStorageBuilt(store.player)
        let disposition = store.player.freeHaulDisposition ?? (stored ? HaulDisposition.store : .sell)
        let willStore = isFreeHaul && disposition == .store && stored
        let sale = HomeDelivery.marketValue(store.player, units: cargo, now: store.now)
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
                RecordDockButton(title: collectTitle(free: isFreeHaul, store: willStore, overflow: overflow, sale: sale, program: program || orbital, payout: payout), filled: true, enabled: !collecting) {
                    guard !collecting else { return }
                    collecting = true
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
            if store { return overflow > 0 ? "Store haul · sell \(overflow) over cap" : "Keep haul on Earth" }
            return "Collect \(Economy.format(francs: sale))"
        }
        if program { return "Log Program Outcome" }
        return "Collect \(Economy.format(francs: payout))"
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
