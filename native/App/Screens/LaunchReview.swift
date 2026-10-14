import SwiftUI
import LandnamCore

/// Rocket builder for a chosen mission (SSL-560). Replaces the old launch-review sheet.
/// Preparing a vehicle still buys it and rolls it to the pad; Launch uses `Loop.launch`.
struct LaunchReviewScreen: View {
    @Environment(GameStore.self) private var store
    @State private var launching = false

    private var selected: StagedRocket? { store.player.stagedRockets.first { $0.id == store.player.selectedStagedRocketId } }
    private var model: RocketModel {
        selected.flatMap { Rockets.model(id: Rockets.canonicalId($0.rocketId)) } ?? Rockets.models[0]
    }
    private var onPad: Bool { selected?.location == .launchpad }
    private var ready: Bool {
        guard let mission = store.mission, let target = store.target else { return false }
        return store.catalog.parts.validate(mission: mission, target: target, rocket: Rockets.config(for: model), skills: store.player.unlockedSkillNodes).ok
    }

    var body: some View {
        if launching {
            LaunchSequenceScreen(variant: model.id == "prospector" ? "prospector" : "explorer") { store.launch() }
        } else {
            RocketBuilderScreen(launchEnabled: launchEnabled, onLaunch: launchTapped, onChooseMission: { store.go(.missions) }, guided: store.state.tutorial)
        }
    }

    private var launchEnabled: Bool {
        guard store.mission != nil, store.target != nil else { return true }
        if selected?.location == .hangar { return true }
        if !onPad { return Market.purchaseRefusal(store.state, rocket: model) == nil }
        return ready
    }

    private func launchTapped() {
        guard store.mission != nil, store.target != nil else { store.go(.missions); return }
        if onPad { launching = true; return }
        if selected?.location == .hangar { store.rollOutToPad(); return }
        store.purchaseRocket(model.id)
        store.rollOutToPad()
    }
}
