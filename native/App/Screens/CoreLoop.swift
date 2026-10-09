import SwiftUI
import LandnamCore

private func francs(_ n: Int) -> String { Economy.format(francs: n) }

struct MissionsScreen: View {
    @Environment(GameStore.self) private var store
    @State private var archiveFocus: String?
    @State private var showArchive = false

    var body: some View {
        let entries = MissionBoard.clientBoard(catalog: store.catalog, player: store.player, now: store.now)
        ScreenFrame(title: "Mission board", back: { store.go(.hub) }) {
            Eyebrow(text: store.player.freeOperations ? "Free Operations · client work" : "Guided contracts")
            if entries.isEmpty {
                Panel {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("No contracts open right now").font(AppFont.display(16))
                        Text("Your own operations are on the Launchpad. The archive shows what unlocks the next contract.")
                            .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    }
                }
            }
            ForEach(entries) { e in MissionCard(entry: e, catalog: store.catalog) {
                store.pickMission(e.id)
            } onPathway: { archiveFocus = "mission:\(e.id)"; showArchive = true } }
            PrimaryButton(title: "Archive · pathways and unlocks") { archiveFocus = nil; showArchive = true }
        }
        .sheet(isPresented: $showArchive) { ArchiveScreen(focus: archiveFocus) }
    }
}

/// One contract: who, where, what it pays, and either a Take button or the plain reason it is locked.
struct MissionCard: View {
    let entry: MissionBoard.Entry
    let catalog: Catalog
    let onTake: () -> Void
    let onPathway: () -> Void

    var body: some View {
        let m = entry.mission
        let client = m.client.flatMap { Clients.byId[$0]?.name } ?? "Your programme"
        let from = m.targetId.flatMap(catalog.target)?.name
        let to = m.deliveryTargetId.flatMap(catalog.target)?.name
        Panel(accent: entry.unlocked ? Theme.blue : Theme.textMuted) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    Text(m.title).font(AppFont.display(18)).fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 8)
                    Text(m.tag.uppercased()).font(AppFont.display(14, "Bold")).tracking(1.0).foregroundStyle(Theme.textDim)
                }
                Text("\(client) · \(m.difficulty)").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                if let from { Text(to.map { "\(from) → \($0)" } ?? "Target: \(from)").font(AppFont.body(14)) }
                if !m.requires.minerals.isEmpty {
                    Text(m.requires.minerals.sorted { $0.key < $1.key }.map { "\($0.value) \(Minerals.byId[$0.key]?.name ?? $0.key)" }.joined(separator: ", ")).font(AppFont.body(14))
                }
                if m.payout.francs > 0 { Text(Economy.format(francs: m.payout.francs)).font(AppFont.display(16)).foregroundStyle(Theme.teal) }
                if entry.unlocked {
                    PrimaryButton(title: "Take contract", action: onTake)
                } else {
                    HStack(spacing: 8) {
                        Image(systemName: "lock.fill").foregroundStyle(Theme.textMuted)
                        Text(entry.lockedReason ?? "Locked").font(AppFont.body(14)).foregroundStyle(Theme.textDim).fixedSize(horizontal: false, vertical: true)
                    }
                    Button(action: onPathway) {
                        Text("SEE THE PATHWAY").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.bluePress).frame(minHeight: 44, alignment: .leading)
                    }.buttonStyle(.plain)
                }
            }
        }
    }
}

struct LaunchScreen: View {
    @Environment(GameStore.self) private var store
    @State private var launching = false
    private var variant: String {
        store.player.stagedRockets.first { $0.location == .launchpad }?.rocketId.contains("explorer") == true ? "explorer" : "prospector"
    }
    var body: some View {
        if launching {
            LaunchSequenceScreen(variant: variant) { store.launch() }
        } else {
            pad
        }
    }

    private var pad: some View {
        ScreenFrame(title: "Launchpad", back: { store.go(.hub) }) {
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

struct MarketScreen: View {
    @Environment(GameStore.self) private var store
    var body: some View {
        ScreenFrame(title: "Market", back: { store.go(.hub) }) {
            Panel { Text("Funds: \(francs(store.player.francs))") }
            ForEach(store.player.stash.keys.sorted(), id: \.self) { id in
                let n = store.player.stash[id] ?? 0
                Panel {
                    Text("\(id) ×\(n)")
                    PrimaryButton(title: "Sell all", enabled: n > 0) { store.sell(id, amount: n) }
                }
            }
            if store.player.stash.isEmpty { Panel { Text("Nothing in storage.") } }
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
