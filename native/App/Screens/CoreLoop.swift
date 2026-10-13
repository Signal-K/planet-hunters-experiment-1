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

    var body: some View {
        let entries = MissionBoard.clientBoard(catalog: store.catalog, player: store.player, now: store.now)
        let index = entries.isEmpty ? 0 : min(selected, entries.count - 1)
        scroller {
            VStack(alignment: .leading, spacing: 12) {
                header
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
            .overlay(alignment: .leading) { Rectangle().fill(Theme.green).frame(width: 7).padding(.vertical, 1.5) }
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
                .background(Theme.green, in: RoundedRectangle(cornerRadius: 4))
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
    var body: some View {
        let m = store.mission
        let payout = m.map { MissionGenerator.calibrateOnboardingPayout(raw: $0.payout.francs, missionsDone: store.player.missionsDone) } ?? 0
        let client = m?.client.flatMap { id in Clients.all.first { $0.id == id } }
        let cargo = store.state.lastCargo ?? [:]
        ScreenFrame(title: "Debrief") {
            DebriefStrip(title: m?.title ?? "Contract", from: store.target?.name)
            if let client { DebriefClientPanel(client: client, xp: m?.payout.affinity ?? 0) }
            if let m, !m.requires.minerals.isEmpty { DebriefManifest(title: m.title, required: m.requires.minerals, delivered: cargo) }
            DebriefLedger(payout: m?.payload == nil ? payout : nil, reward: m?.programReward)
            if let m, !m.isOwnProgram, store.player.missionsDone >= 2, LaserCapacitor.units(store.player.stash) > 0 || !cargo.isEmpty {
                LaserCapacitorPanel(level: store.player.laserCapacitorLevel,
                                    haulUnits: LaserCapacitor.units(cargo),
                                    stashUnits: LaserCapacitor.units(store.player.stash),
                                    reservedUnits: m.requires.minerals.values.reduce(0, +)) {
                    store.buyLaserCapacitor(expectedLevel: store.player.laserCapacitorLevel, reservedUnits: m.requires.minerals.values.reduce(0, +))
                }
            }
            PrimaryButton(title: m?.payload?.type == .satellite ? "Open control station" : (m?.isOwnProgram == true && m?.client == nil && m?.programReward != nil ? "File report" : "Collect payout")) {
                store.debriefDone(payout: payout, affinity: m?.payout.affinity ?? 0, consumed: cargo)
            }
        }
    }
}

/// Status strip: docked, which mission, where it returned from (mirrors web debrief-mission-strip).
struct DebriefStrip: View {
    let title: String
    let from: String?
    var body: some View {
        Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Circle().fill(Theme.teal).frame(width: 10, height: 10)
                    Text("DOCKED · MISSION COMPLETE").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.teal)
                }
                Eyebrow(text: "Mission")
                Text(title).font(AppFont.display(18)).foregroundStyle(Theme.ink)
                if let from { Eyebrow(text: "Returned from"); Text(from).font(AppFont.display(16)).foregroundStyle(Theme.ink) }
            }
        }
    }
}

struct DebriefClientPanel: View {
    let client: Client
    let xp: Int
    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow(text: "Client")
                HStack(spacing: 12) {
                    Text(client.initial).font(AppFont.display(16)).foregroundStyle(Theme.ink)
                        .frame(width: 44, height: 44)
                        .background(Theme.paper2, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(client.name).font(AppFont.display(16)).foregroundStyle(Theme.ink)
                        Text("CLIENT WORK COMPLETE").font(AppFont.display(14)).tracking(1.0).foregroundStyle(Theme.textMuted)
                    }
                    Spacer(minLength: 0)
                    if xp > 0 { Text("+\(xp) XP").font(AppFont.mono(14)).foregroundStyle(Theme.bluePress) }
                }
            }
        }
    }
}

/// Cargo manifest: each ordered mineral with delivered / required and a DONE or SHORT chip.
struct DebriefManifest: View {
    let title: String
    let required: Cargo
    let delivered: Cargo
    var body: some View {
        let delivered = delivered
        Panel(accent: Theme.blue) {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow(text: "Manifest · \(title)")
                ForEach(required.keys.sorted(), id: \.self) { id in
                    let need = required[id] ?? 0, have = delivered[id] ?? 0
                    let meta = Minerals.all.first { $0.id == id }
                    HStack(spacing: 10) {
                        Text(meta?.symbol ?? id.prefix(2).capitalized).font(AppFont.mono(14)).foregroundStyle(Theme.ink)
                            .frame(width: 44, height: 36).background(Theme.paper2, in: RoundedRectangle(cornerRadius: 6))
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.ink, lineWidth: 1.5))
                        Text(meta?.name ?? id).font(AppFont.display(16)).foregroundStyle(Theme.ink)
                        Text("\(min(have, need)) / \(need)").font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
                        Spacer(minLength: 0)
                        Text(have >= need ? "DONE" : "SHORT").font(AppFont.display(14)).tracking(1.2)
                            .foregroundStyle(have >= need ? Theme.teal : Theme.crimson)
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background((have >= need ? Theme.teal : Theme.crimson).opacity(0.12), in: Capsule())
                    }
                }
            }
        }
    }
}

struct DebriefLedger: View {
    let payout: Int?
    let reward: ProgramReward?
    var body: some View {
        if payout != nil || reward != nil {
            Panel(accent: Theme.teal) {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "Ledger")
                    if let payout {
                        HStack { Text("Contract value").foregroundStyle(Theme.textDim); Spacer(); Text(Economy.format(francs: payout)).font(AppFont.mono(16)).foregroundStyle(Theme.ink) }
                    }
                    if let reward {
                        Text(reward.outcome).foregroundStyle(Theme.textDim)
                        HStack { Text("Research").foregroundStyle(Theme.textDim); Spacer(); Text("+\(reward.researchXP) XP").font(AppFont.mono(16)).foregroundStyle(Theme.bluePress) }
                    }
                }
            }
        }
    }
}

/// SSL-462: names the link between the haul and the next build and spends it on the Laser Capacitor
/// (mirrors web LaserCapacitorPanel).
struct LaserCapacitorPanel: View {
    let level: Int
    let haulUnits: Int
    let stashUnits: Int
    let reservedUnits: Int
    let install: () -> Void

    var body: some View {
        let spare = max(0, stashUnits - reservedUnits)
        if let next = LaserCapacitor.next(level) {
            let canAfford = spare >= next.costUnits
            Panel(accent: canAfford ? Theme.teal : Theme.blue) {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "Next build · \(next.name)")
                    Text(canAfford
                         ? "You brought \(haulUnits) ore, enough for \(next.name) (\(next.costUnits) ore). It adds \(next.bonusCharges - LaserCapacitor.bonus(level)) laser charges, so your next run lasts longer and brings home more."
                         : "You brought \(haulUnits) ore. \(next.name) needs \(next.costUnits) spare ore and you hold \(spare). Keep firing after the order is filled to bring home the rest.")
                        .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    PrimaryButton(title: canAfford ? "Install \(next.name) · \(next.costUnits) ore" : "Need \(next.costUnits - spare) more ore", enabled: canAfford, action: install)
                }
            }
        } else {
            Panel(accent: Theme.teal) {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "Next build · Laser Capacitor")
                    Text("\(LaserCapacitor.tiers.last { $0.level == level }?.name ?? "Laser Capacitor") is installed: +\(LaserCapacitor.bonus(level)) laser charges on every run. Fully upgraded.")
                        .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                }
            }
        }
    }
}
