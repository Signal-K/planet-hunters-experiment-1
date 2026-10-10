import SwiftUI
import LandnamCore

/// One-screen launch review: contract, destination, vehicle and clearance in a single view
/// (mirrors web MissionSetupRoutes "Launch review", SSL-450). Replaces the old
/// Targets / Rocket yard / Launchpad hops.
struct LaunchReviewScreen: View {
    @State private var archiveFocus: String?
    @State private var showArchive = false
    @Environment(GameStore.self) private var store
    @State private var launching = false

    private var mission: Mission? { store.mission }
    private var target: Target? { store.target }
    private var selected: StagedRocket? {
        store.player.stagedRockets.first { $0.id == store.player.selectedStagedRocketId }
    }
    private var model: RocketModel {
        selected.flatMap { Rockets.model(id: Rockets.canonicalId($0.rocketId)) } ?? Rockets.models[0]
    }
    private var selectable: [RocketModel] {
        guard let mission, let target else { return [] }
        return Rockets.models.filter { !$0.locked && $0.missionsRequired <= store.player.missionsDone }.filter {
            store.catalog.parts.validate(mission: mission, target: target, rocket: Rockets.config(for: $0), skills: store.player.unlockedSkillNodes).ok
        }
    }
    private var targets: [Target] {
        guard let mission else { return [] }
        return Targets.feasible(for: mission, parts: store.catalog.parts, missionsDone: store.player.missionsDone,
                                launchpadUpgraded: store.player.launchpadUpgraded, launchpadLevel: BuildingLevels.level(store.player, "launchpad"), skills: store.player.unlockedSkillNodes)
    }
    private var onPad: Bool { selected?.location == .launchpad }
    private var ready: Bool {
        guard let mission, let target else { return false }
        return store.catalog.parts.validate(mission: mission, target: target, rocket: Rockets.config(for: model), skills: store.player.unlockedSkillNodes).ok
    }
    private var variant: String { model.id == "prospector" ? "prospector" : "explorer" }

    var body: some View {
        if launching {
            LaunchSequenceScreen(variant: variant) { store.launch() }
        } else if let mission, let target {
            review(mission, target)
        } else {
            operations
        }
    }

    /// Launchpad with nothing queued: the player's own programme (instrument launches, surveys, self-directed mining, builds, story).
    private var operations: some View {
        let p = store.player
        let own = MissionBoard.programBoard(catalog: store.catalog, player: p, now: store.now)
        let instruments = own.filter { $0.mission.payload?.type == .satellite }
        let surveys = own.filter { $0.mission.tag == "SCIENCE" }
        let mining = own.filter { $0.mission.tag == "FREE OPS" && $0.mission.payload == nil }
        let builds = own.filter { $0.mission.construction != nil }
        let story = own.filter { $0.mission.tag == "STORY" && $0.mission.payload == nil }
        return ScreenFrame(title: "Launchpad", back: { store.go(.hub) }) {
            Eyebrow(text: "Base · Operations")
            if !p.freeOperations {
                Panel { VStack(alignment: .leading, spacing: 8) {
                    Text("Take a contract").font(AppFont.display(16))
                    Text("Your own operations open with Free Operations. Until then, fly the contracts on the mission board.").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    PrimaryButton(title: "Open mission board") { store.go(.missions) }
                } }
            } else {
                group("Instruments", "Launch an owned instrument. Its daily feed opens in the Control Station.", instruments)
                group("Discovery surveys", "Follow up a confirmed transit with a survey flight.", surveys)
                group("Self-directed mining", "No client and no daily limit. Sell the haul yourself.", mining)
                group("Off-world builds", "Carry a construction kit from storage to a site and start a structure.", builds)
                group("Story", "Milestones that open new parts of the base.", story)
                PrimaryButton(title: "Open mission board") { store.go(.missions) }
            }
            PrimaryButton(title: "Archive · pathways and unlocks") { archiveFocus = nil; showArchive = true }
        }
        .sheet(isPresented: $showArchive) { ArchiveScreen(focus: archiveFocus) }
    }

    @ViewBuilder private func group(_ title: String, _ blurb: String, _ entries: [MissionBoard.Entry]) -> some View {
        if !entries.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: title)
                Text(blurb).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                ForEach(entries) { e in
                    let m = e.mission
                    Panel(accent: e.unlocked ? Theme.teal : Theme.textMuted) { VStack(alignment: .leading, spacing: 6) {
                        Text(m.title).font(AppFont.display(16))
                        Text(m.programReward?.outcome ?? m.brief).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                        if e.unlocked {
                            if m.id == AuthoredMissions.academyStoryId {
                                PrimaryButton(title: "Open the Academy") { store.go(.academy) }
                            } else {
                                PrimaryButton(title: m.payload != nil ? "Plan launch" : m.construction != nil ? "Plan delivery" : "Plan run") { store.pickMission(m.id) }
                            }
                        } else {
                            HStack(spacing: 8) {
                                Image(systemName: "lock.fill").foregroundStyle(Theme.textMuted)
                                Text(e.lockedReason ?? "Locked").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                            }
                            Button { archiveFocus = "mission:\(m.id)"; showArchive = true } label: {
                                Text("SEE THE PATHWAY").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.bluePress).frame(minHeight: 44, alignment: .leading)
                            }.buttonStyle(.plain)
                        }
                    } }
                }
            }
        }
    }

    private func review(_ mission: Mission, _ target: Target) -> some View {
        ScreenFrame(title: "Launch review", back: { store.go(mission.isOwnProgram ? .launchpad : .missions) }) {
            scene
            VStack(alignment: .leading, spacing: 4) {
                Eyebrow(text: mission.isOwnProgram ? "Own operation" : "Client contract")
                Text(mission.title).font(AppFont.display(23)).foregroundStyle(Theme.ink)
            }
            Panel { VStack(alignment: .leading, spacing: 10) {
                fact("Destination", "\(target.name) · \(target.type.rawValue.capitalized)")
                fact("Vehicle", model.name)
                fact("Required cargo", mission.requires.minerals.map { "\($0.value) \($0.key)" }.sorted().joined(separator: ", "))
            } }
            RouteMap(targets: targets, pickedId: target.id, maxOrbit: mission.requires.maxOrbit) { store.pickTarget($0) }
            Panel { VStack(alignment: .leading, spacing: 8) {
                chooser("Destination", target.name, count: targets.count) { step(-1, in: targets.map(\.id), current: target.id) { store.pickTarget($0) } }
                    next: { step(1, in: targets.map(\.id), current: target.id) { store.pickTarget($0) } }
                Divider().overlay(Theme.hairline)
                chooser("Vehicle", model.name, count: selectable.count) { step(-1, in: selectable.map(\.id), current: model.id) { store.purchaseRocket($0) } }
                    next: { step(1, in: selectable.map(\.id), current: model.id) { store.purchaseRocket($0) } }
            } }
            clearance
            PrimaryButton(title: buttonTitle, enabled: buttonEnabled, action: primary)
            Button("Abandon contract", role: .destructive) { store.abandonMission() }
                .font(AppFont.display(14)).frame(minHeight: 44)
        }
    }

    private var scene: some View {
        ZStack(alignment: .bottomLeading) {
            Theme.paper2
            Art.view(variant == "prospector" ? "ships/ship_sr2.png" : "ships/ship_sr1.png")
                .resizable().interpolation(.high).aspectRatio(contentMode: .fit).padding(.horizontal, 12).padding(.top, 12).padding(.bottom, 72)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            VStack(alignment: .leading, spacing: 4) {
                Text("LAUNCHPAD · READY FOR DEPARTURE").font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.textMuted)
                Text(model.name.uppercased()).font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.ink)
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(Theme.paper).overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
            .background(Rectangle().fill(Theme.ink).offset(x: 4, y: 4))
            .padding(16)
        }
        .frame(height: 260).clipped()
        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
    }

    private func fact(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Eyebrow(text: label)
            Text(value).font(AppFont.body(16, "Bold")).foregroundStyle(Theme.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func chooser(_ label: String, _ value: String, count: Int, prev: @escaping () -> Void, next: @escaping () -> Void) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Eyebrow(text: label)
                Text(value).font(AppFont.body(16, "Bold")).foregroundStyle(Theme.ink)
            }
            Spacer(minLength: 0)
            arrow("chevron.left", label: "Previous \(label.lowercased())", enabled: count > 1, action: prev)
            arrow("chevron.right", label: "Next \(label.lowercased())", enabled: count > 1, action: next)
        }
    }

    private func arrow(_ symbol: String, label: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.system(size: 16, weight: .bold))
                .frame(width: 44, height: 44)
                .foregroundStyle(Theme.ink)
                .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
                .opacity(enabled ? 1 : 0.4)
        }
        .buttonStyle(.plain).disabled(!enabled).accessibilityLabel(label)
    }

    private var clearance: some View {
        let good = ready && onPad
        return Panel(accent: good ? Theme.teal : Theme.blue) { VStack(alignment: .leading, spacing: 4) {
            Eyebrow(text: "Launch clearance")
            Text(!onPad ? "PREPARING VEHICLE" : ready ? "ALL PARAMETERS PASS" : "BUILD HOLD")
                .font(AppFont.display(16)).foregroundStyle(good ? Theme.teal : Theme.ink)
            if !ready { Text("MISSION REQUIREMENTS NOT MET").font(AppFont.body(14)).foregroundStyle(Theme.textMuted) }
        } }
    }

    private var buttonTitle: String {
        if onPad { return "Launch" }
        if selected?.location == .hangar { return "Roll out to pad" }
        return model.costFrancs == 0 ? "Prepare \(model.name)" : "Build \(model.name) · \(Economy.format(francs: model.costFrancs))"
    }
    private var buttonEnabled: Bool {
        if onPad { return ready }
        if selected?.location == .hangar { return true }
        return Market.purchaseRefusal(store.state, rocket: model) == nil
    }
    private func primary() {
        if onPad { launching = true }
        else if selected?.location == .hangar { store.rollOutToPad() }
        else { store.purchaseRocket(model.id); store.rollOutToPad() }
    }

    private func step(_ offset: Int, in ids: [String], current: String, pick: (String) -> Void) {
        guard ids.count > 1, let i = ids.firstIndex(of: current) else { return }
        pick(ids[(i + offset + ids.count) % ids.count])
    }
}
