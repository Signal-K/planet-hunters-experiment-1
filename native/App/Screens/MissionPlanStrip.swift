import SwiftUI
import LandnamCore

enum PlanSheet: String, Identifiable { case destination, vehicle; var id: String { rawValue } }

/// Contract, Plan, Launch (SSL-616): the auto-picked destination and vehicle made visible and changeable in place.
struct MissionPlanStrip: View {
    @Environment(GameStore.self) private var store
    @Binding var sheet: PlanSheet?
    var launching = false

    private var rocketName: String {
        let selected = store.player.stagedRockets.first { $0.id == store.player.selectedStagedRocketId }
        return selected.flatMap { Rockets.model(id: Rockets.canonicalId($0.rocketId)) }?.name ?? Rockets.models[0].name
    }
    /// Liam, 01.11: Cargo says what comes back (haul and pay) and what the rocket carries out (web MissionPlanStrip).
    private var cargo: String {
        guard let mission = store.mission else { return "" }
        let haul = mission.requires.minerals.sorted { $0.key < $1.key }.map { "\(Minerals.byId[$0.key]?.name ?? $0.key) ×\($0.value)" }
        let pay = mission.payout.francs > 0 ? Economy.format(francs: mission.payout.francs) : nil
        let getting = ([haul.joined(separator: ", ")] + [pay].compactMap { $0 }).filter { !$0.isEmpty }.joined(separator: " · ")
        let drill = store.catalog.parts.drill.first { $0.id == store.state.rocket.drill }
        let payload: String? = mission.payload?.name
            ?? (mission.requires.minerals.isEmpty ? (mission.construction != nil ? "Construction kit" : nil)
                : drill.map { $0.name.lowercased().hasPrefix("laser") ? "Mining laser \($0.name.dropFirst(5).trimmingCharacters(in: .whitespaces))" : $0.name } ?? "Mining laser")
        return "GETTING \(getting.isEmpty ? "Nothing" : getting)" + (payload.map { " · PAYLOAD \($0)" } ?? "")
    }
    private var hold: String? {
        guard let mission = store.mission, let target = store.target else { return nil }
        let selected = store.player.stagedRockets.first { $0.id == store.player.selectedStagedRocketId }
        let model = selected.flatMap { Rockets.model(id: Rockets.canonicalId($0.rocketId)) } ?? Rockets.models[0]
        return store.catalog.parts.validate(mission: mission, target: target, rocket: Rockets.config(for: model), loadoutBonus: RocketBuilder.loadoutBonus(store.player.shipCustomizerParts)).problems.first
    }

    /// A run on your own account keeps nothing without a silo: say so before launch, not after landing.
    private var noSilo: Bool {
        guard let mission = store.mission,
              mission.id != OrionidsRun.missionId,
              mission.id != OrionidsRun.surfaceResearchMissionId,
              mission.isOwnProgram,
              mission.construction == nil,
              store.state.deliveryTargetId == nil
        else { return false }
        return !HomeDelivery.silo(store.player, cargo: [:]).built
    }

    var body: some View {
        if let target = store.target, store.mission != nil {
            VStack(spacing: 4) {
                HStack(spacing: 16) {
                    ForEach(Array(["CONTRACT", "PLAN", "LAUNCH"].enumerated()), id: \.offset) { index, label in
                        let step = launching ? 2 : 1
                        HStack(spacing: 4) {
                            Circle().fill(index <= step ? Theme.ink : Color.clear).overlay(Circle().stroke(Theme.ink, lineWidth: 1)).frame(width: 8, height: 8)
                            Text(label).font(AppFont.display(14, "Bold")).tracking(1.2)
                        }.opacity(index == step ? 1 : 0.6)
                    }
                }
                .foregroundStyle(Theme.ink).padding(.horizontal, 16).frame(minHeight: 32)
                .background(Theme.paper, in: Capsule()).overlay(Capsule().stroke(Theme.ink, lineWidth: 1))
                .accessibilityLabel("Mission step \(launching ? 3 : 2) of 3")
                HStack(spacing: 8) {
                    slot("TARGET", target.name, change: .destination, id: "plan-destination", spoken: "Destination")
                    slot("VEHICLE", rocketName, change: .vehicle, id: "plan-vehicle")
                    slot("CARGO", cargo, change: nil, id: "plan-cargo")
                }
                if noSilo && !launching {
                    HStack(spacing: 4) {
                        Text("No storage silo: ore you mine is sold when you land.").font(AppFont.body(14, "Bold")).foregroundStyle(Theme.ink)
                        Button { store.go(.build) } label: {
                            Text("Build a silo").font(AppFont.body(14, "Bold")).underline().foregroundStyle(Theme.ink).frame(minHeight: 44).padding(.horizontal, 4)
                        }.buttonStyle(.plain)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 8)
                    .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 1))
                    .accessibilityElement(children: .contain).accessibilityIdentifier("plan-no-silo")
                }
                if let hold {
                    Text("BUILD HOLD: \(hold)").font(AppFont.body(14, "Bold")).foregroundStyle(Theme.ink)
                        .frame(maxWidth: .infinity, alignment: .leading).padding(8)
                        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 1))
                        .accessibilityIdentifier("plan-clearance")
                }
            }
        }
    }

    @ViewBuilder private func slot(_ label: String, _ value: String, change: PlanSheet?, id: String, spoken: String? = nil) -> some View {
        let content = VStack(alignment: .leading, spacing: 2) {
            Text(label).font(AppFont.display(14, "Bold")).tracking(0.3).lineLimit(1).opacity(0.75)
            Text(value).font(AppFont.body(14, "Bold")).lineLimit(1)
        }
        .foregroundStyle(Theme.ink)
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).padding(.horizontal, 8)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
        if let change, !launching {
            Button { sheet = change } label: { content }.buttonStyle(.plain).accessibilityIdentifier(id).accessibilityLabel("\(spoken ?? label), \(value), change")
        } else {
            content.accessibilityIdentifier(id)
        }
    }
}

/// Bottom panel for the Destination and Vehicle changes.
struct MissionPlanSheet: View {
    @Environment(GameStore.self) private var store
    let sheet: PlanSheet
    var close: () -> Void
    @State private var notice = ""

    private var targets: [Target] {
        guard let mission = store.mission else { return [] }
        return Targets.feasible(for: mission, targets: store.catalog.targets, parts: store.catalog.parts, missionsDone: store.player.missionsDone,
                                launchpadUpgraded: store.player.launchpadUpgraded, launchpadLevel: BuildingLevels.level(store.player, "launchpad"))
    }
    /// Every unlocked rocket; `roles` says which one flies this job (SSL-728).
    private var rockets: [RocketModel] {
        guard store.mission != nil, store.target != nil else { return [] }
        return Rockets.models.filter { !$0.locked && $0.missionsRequired <= store.player.missionsDone }
    }
    private var roles: [String: Rockets.JobRole] {
        guard let mission = store.mission, let target = store.target else { return [:] }
        return Rockets.jobRoles(rockets, mission: mission) { Rockets.compatible($0, with: mission)
            && store.catalog.parts.validate(mission: mission, target: target, rocket: Rockets.config(for: $0)).ok }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(sheet == .destination ? "DESTINATION" : "VEHICLE").font(AppFont.display(14, "Bold")).tracking(1.4)
                Spacer()
                Button(action: close) {
                    Text("CLOSE").font(AppFont.display(14, "Bold")).tracking(1.2).padding(.horizontal, 16).frame(minHeight: 44)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 1))
                }.buttonStyle(.plain)
            }
            if sheet == .destination {
                Text("Only targets with the required minerals, range, cargo and drill are shown.").font(AppFont.body(14, "Regular"))
            }
            if !notice.isEmpty { Text(notice).font(AppFont.display(14, "Bold")).tracking(1) }
            ScrollView {
                VStack(spacing: 8) {
                    if sheet == .destination {
                        ForEach(targets, id: \.id) { t in
                            row(t.name, "\(t.type.rawValue) · orbit \(t.orbit)", current: t.id == store.target?.id) { store.pickTarget(t.id); close() }
                        }
                        if targets.isEmpty { Text("Nothing else fits this contract.").font(AppFont.body(14, "Regular")) }
                    } else {
                        Text("The smallest rocket that fits flies the job. Bigger ones are for more cargo or a farther orbit.").font(AppFont.body(14, "Regular"))
                        let roles = self.roles
                        ForEach(rockets, id: \.id) { r in
                            let price = Rockets.price(r, for: store.player)
                            let cost = price == 0 ? "No cost" : Economy.format(francs: price)
                            if let note = roles[r.id]?.note {
                                row("\(r.name) · \(r.cargo)U · ORB \(r.maxOrbit)", note, current: false) {}.disabled(true).opacity(0.6)
                            } else {
                                row("\(r.name) · \(r.cargo)U · ORB \(r.maxOrbit)", "Stage · \(cost)", current: true) {
                                    if store.player.francs < price { notice = "NOT ENOUGH FRANCS: \(Economy.format(francs: price - store.player.francs)) MORE NEEDED"; return }
                                    store.purchaseRocket(r.id); close()
                                }
                            }
                        }
                        if rockets.isEmpty { Text("No rocket is unlocked yet.").font(AppFont.body(14, "Regular")) }
                    }
                }
            }.frame(maxHeight: 280)
        }
        .foregroundStyle(Theme.ink)
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Theme.paper)
        .overlay(alignment: .top) { Rectangle().fill(Theme.ink).frame(height: 2) }
        .accessibilityIdentifier("plan-sheet-\(sheet.rawValue)")
    }

    private func row(_ title: String, _ detail: String, current: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title).font(AppFont.body(14, "Bold"))
                Spacer(minLength: 16)
                Text(detail).font(AppFont.body(14, "Regular"))
            }
            .padding(.horizontal, 16).frame(maxWidth: .infinity, minHeight: 44)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: current ? 2 : 1))
        }.buttonStyle(.plain)
    }
}
