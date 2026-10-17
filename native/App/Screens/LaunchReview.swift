import SwiftUI
import LandnamCore

/// Rocket builder for a chosen mission (SSL-560). Replaces the old launch-review sheet.
/// Preparing a vehicle still buys it and rolls it to the pad; Launch uses `Loop.launch`.
struct LaunchReviewScreen: View {
    @Environment(GameStore.self) private var store
    @State private var launching = false
    /// The rocket is rising on the pad; the vehicle is bought when the rollout ends (web `rolling`).
    @State private var rolling = false

    private var selected: StagedRocket? { store.player.stagedRockets.first { $0.id == store.player.selectedStagedRocketId } }
    private var model: RocketModel {
        selected.flatMap { Rockets.model(id: Rockets.canonicalId($0.rocketId)) } ?? Rockets.models[0]
    }
    private var onPad: Bool { selected?.location == .launchpad }
    private var assembly: PadPhase { rolling ? .building : (onPad ? .ready : .design) }
    private var ready: Bool {
        guard let mission = store.mission, let target = store.target else { return false }
        return store.catalog.parts.validate(mission: mission, target: target, rocket: Rockets.config(for: model), skills: store.player.unlockedSkillNodes).ok
    }

    var body: some View {
        if launching {
            LaunchSequenceScreen(variant: model.id == "prospector" ? "prospector" : "explorer") { store.launch() }
        } else {
            RocketBuilderScreen(launchEnabled: launchEnabled && !rolling, onLaunch: launchTapped, onChooseMission: { store.go(.missions) }, assembly: assembly)
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
        guard !rolling else { return }
        let id = model.id
        let fromHangar = selected?.location == .hangar
        rolling = true
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(padRolloutSeconds))
            if !fromHangar { store.purchaseRocket(id) }
            store.rollOutToPad()
            rolling = false
        }
    }
}
