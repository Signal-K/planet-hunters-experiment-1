#if DEBUG
import Foundation
import LandnamCore

/// DEBUG-only test driver for real signed-in sessions on the simulator (SSL-559). Never compiled into release.
/// - `SIMCTL_CHILD_LANDNAM_TEST_EMAIL` / `_PASSWORD` (env only, never stored): signs in through the app's own
///   `AuthModel.signInWithPassword`, exactly like the sign-in sheet.
/// - `-landnam.forceOffline YES`: the app behaves as offline (writes queue, no pulls).
/// - `-landnam.autoRun YES`: plays the active run (or a new first contract) to settlement: launch, fly, mine, fly home, settle.
@MainActor
enum DebugSession {
    static func prepare() {
        PocketBaseExecutor.forceOffline = UserDefaults.standard.bool(forKey: "landnam.forceOffline")
    }

    static func run(store: GameStore, auth: AuthModel) async {
        let env = ProcessInfo.processInfo.environment
        if auth.session == nil, let email = env["LANDNAM_TEST_EMAIL"], let pw = env["LANDNAM_TEST_PASSWORD"], !PocketBaseExecutor.forceOffline {
            await auth.signInWithPassword(email: email, password: pw)
        }
        for _ in 0..<20 where store.welcomePending == false && auth.session != nil && store.player.missionsDone == 0 { try? await Task.sleep(for: .milliseconds(500)) }
        if store.welcomePending { store.finishWelcome() }
        guard UserDefaults.standard.bool(forKey: "landnam.autoRun") else { return }
        try? await Task.sleep(for: .seconds(2))
        if store.player.activeMission == nil {
            store.go(.missions)
            guard let m = store.catalog.missions.first(where: { !$0.locked && $0.client != nil && $0.payload == nil }) else { return }
            store.pickMission(m.id)
            store.launch()
        } else if store.screen == .hub {
            store.go(.transit)
        }
        for _ in 0..<40 {
            try? await Task.sleep(for: .milliseconds(400))
            switch store.screen {
            case .transit: store.transitArrived()
            case .landing: store.landingComplete()
            case .mining:
                let need = store.mission?.requires.minerals ?? [:]
                store.miningDone(need.isEmpty ? ["nickel": 2] : need)
            case .roverSurvey: store.roverSurveyComplete()
            case .delivery: store.deliveryUnloadComplete()
            case .debrief:
                if store.player.homeDeliveryPending, let cargo = store.state.lastCargo {
                    let demand = HomeDelivery.demand(store.mission, cargo: cargo)
                    store.homeDelivery(HomeDelivery.defaultSplit(cargo, demand: demand, siloFree: 0))
                } else {
                    let m = store.mission
                    store.debriefDone(payout: m.map { MissionGenerator.calibrateOnboardingPayout(raw: $0.payout.francs, missionsDone: store.player.missionsDone) } ?? 0,
                                      affinity: m?.payout.affinity ?? 0, consumed: store.state.lastCargo ?? [:])
                }
            default: break
            }
            if store.player.activeMission == nil { store.go(.hub); return }
        }
    }
}
#endif
