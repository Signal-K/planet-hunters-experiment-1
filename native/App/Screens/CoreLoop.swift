import SwiftUI
import LandnamCore

private func francs(_ n: Int) -> String { Economy.format(francs: n) }

struct IntroScreen: View {
    @Environment(GameStore.self) private var store
    var body: some View {
        ScreenFrame(title: "Landnam") {
            Panel { Text("Run a small space agency. Take client contracts, mine, return, get paid.") }
            PrimaryButton(title: "Begin") { store.go(.hub) }
        }
    }
}

struct HubScreen: View {
    @Environment(GameStore.self) private var store
    var body: some View {
        ScreenFrame(title: "Hub") {
            Panel {
                Text("Funds: \(francs(store.player.francs))").font(.headline)
                Text("Contracts completed: \(store.player.missionsDone)")
            }
            PrimaryButton(title: "Mission board") { store.go(.missions) }
            PrimaryButton(title: "Market") { store.go(.market) }
            Menu("All scenes") {
                ForEach(Screen.allCases.filter { !$0.needsMissionContext }, id: \.self) { s in
                    Button(s.rawValue) { store.go(s) }
                }
            }
        }
    }
}

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
    var body: some View {
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
            PrimaryButton(title: "Launch", enabled: store.player.stagedRockets.contains { $0.location == .launchpad }) { store.launch() }
            Button("Abandon contract", role: .destructive) { store.abandonMission() }
        }
    }
}

struct TransitScreen: View {
    @Environment(GameStore.self) private var store
    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.5)) { ctx in
            let start = store.player.transitStartedAt ?? store.now
            let end = store.player.arrivalAt ?? start
            let p = end > start ? min(1, max(0, (ctx.date.timeIntervalSince1970 * 1000 - start) / (end - start))) : 1
            ScreenFrame(title: store.player.returningToEarth ? "Returning to Earth" : "In transit") {
                Panel { ProgressView(value: p); Text("\(Int(p * 100))%") }
                PrimaryButton(title: "Arrive", enabled: p >= 1) { store.transitArrived() }
            }
        }
    }
}

struct MiningScreen: View {
    @Environment(GameStore.self) private var store
    @State private var cargo: Cargo = [:]
    var body: some View {
        let need = store.mission?.requires.minerals ?? [:]
        ScreenFrame(title: "Mining at \(store.target?.name ?? "target")") {
            Panel {
                ForEach(need.keys.sorted(), id: \.self) { id in
                    Text("\(id): \(cargo[id, default: 0]) / \(need[id] ?? 0)")
                    Button("Mine \(id)") { cargo[id, default: 0] += 1 }
                }
            }
            PrimaryButton(title: "Return to Earth", enabled: !cargo.isEmpty) { store.miningDone(cargo) }
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
