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

struct TargetsScreen: View {
    @Environment(GameStore.self) private var store
    var body: some View {
        ScreenFrame(title: "Pick a target", back: { store.go(.missions) }) {
            ForEach(store.mission.map { Targets.compatible(with: $0, targets: store.catalog.targets) } ?? store.catalog.targets) { t in
                Panel {
                    Text(t.name).font(.headline)
                    Text("Orbit \(t.orbit) · \(t.minerals.joined(separator: ", "))").font(.caption)
                    PrimaryButton(title: "Select") { store.pickTarget(t.id) }
                }
            }
        }
    }
}

struct RocketBuyScreen: View {
    @Environment(GameStore.self) private var store
    var body: some View {
        ScreenFrame(title: "Rocket yard", back: { store.go(.missions) }) {
            ForEach(Rockets.models, id: \.id) { r in
                let refusal = Market.purchaseRefusal(store.state, rocket: r)
                Panel {
                    Text(r.name).font(.headline)
                    Text("\(francs(r.costFrancs)) · cargo \(r.cargo) · orbit \(r.maxOrbit)").font(.caption)
                    if let refusal { Text(refusal).font(.caption) }
                    PrimaryButton(title: "Buy", enabled: refusal == nil) { store.purchaseRocket(r.id) }
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
            Panel { Text(m?.title ?? "Contract").font(.headline); Text("Payout: \(francs(payout))") }
            PrimaryButton(title: "Collect payout") {
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
