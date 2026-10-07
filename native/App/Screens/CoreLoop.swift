import SwiftUI
import LandnamCore

private func francs(_ n: Int) -> String { Economy.format(francs: n) }

struct MissionsScreen: View {
    @Environment(GameStore.self) private var store
    var body: some View {
        ScreenFrame(title: "Mission board", back: { store.go(.hub) }) {
            ForEach(store.catalog.missions.filter { !$0.locked }.prefix(12)) { m in
                Panel {
                    Text(m.title).font(.headline)
                    Text("\(m.client ?? "Own program") · seq \(m.sequence) · \(francs(m.payout.francs))").font(.caption)
                    Text(m.requires.minerals.map { "\($0.value) \($0.key)" }.sorted().joined(separator: ", ")).font(.caption)
                    PrimaryButton(title: "Take contract") { store.pickMission(m.id) }
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
            }
            ForEach(store.player.stagedRockets) { r in
                Panel {
                    Text("\(r.rocketId) · \(r.location.rawValue)")
                    if r.location == .hangar { PrimaryButton(title: "Roll out to pad") { store.rollOutToPad() } }
                }
            }
            PrimaryButton(title: "Launch", enabled: store.player.stagedRockets.contains { $0.location == .launchpad }) { launching = true }
            Button("Abandon contract", role: .destructive) { store.abandonMission() }
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
        ScreenFrame(title: "Debrief") {
            Panel {
                Text(m?.title ?? "Contract").font(.headline)
                if let reward = m?.programReward { Text(reward.outcome).foregroundStyle(Theme.textDim) }
                if m?.payload == nil { Text("Payout: \(francs(payout))") }
            }
            if let m, !m.isOwnProgram, store.player.missionsDone >= 2, LaserCapacitor.units(store.player.stash) > 0 || !(store.state.lastCargo ?? [:]).isEmpty {
                LaserCapacitorPanel(level: store.player.laserCapacitorLevel,
                                    haulUnits: LaserCapacitor.units(store.state.lastCargo ?? [:]),
                                    stashUnits: LaserCapacitor.units(store.player.stash),
                                    reservedUnits: m.requires.minerals.values.reduce(0, +)) {
                    store.buyLaserCapacitor(expectedLevel: store.player.laserCapacitorLevel, reservedUnits: m.requires.minerals.values.reduce(0, +))
                }
            }
            PrimaryButton(title: m?.payload?.type == .satellite ? "Open control station" : (m?.isOwnProgram == true && m?.client == nil && m?.programReward != nil ? "File report" : "Collect payout")) {
                store.debriefDone(payout: payout, affinity: m?.payout.affinity ?? 0, consumed: store.state.lastCargo ?? [:])
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
