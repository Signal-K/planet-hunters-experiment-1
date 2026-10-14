import SwiftUI
import LandnamCore

/// Routes every one of the 26 screens. Core-loop screens are playable; the rest
/// show a staged placeholder until their systems are ported (see README).
struct RootView: View {
    @Environment(GameStore.self) private var store
    @Environment(AuthModel.self) private var auth
    @Environment(FeedModel.self) private var feed

    var body: some View {
        if auth.session == nil { SignInScreen() } else { game }
    }

    private var game: some View {
        Group {
            switch store.welcomePending ? nil : store.screen {
            case nil: WelcomeScreen()
            case .intro: IntroScreen()
            case .hub, .hubSubsurface: HubRoute()
            case .refinery: RefineryScreen()
            case .skills: SkillTreeScreen()
            case .academy: AcademyScreen()
            case .missionHistory: MissionHistoryScreen()
            case .narrativeLedger: NarrativeLedgerScreen()
            case .missions: MissionsScreen()
            case .targets, .rocketBuy, .fab, .launchpad: LaunchReviewScreen()
            case .hangar: LaunchScreen()
            case .build: BuildScreen()
            case .surfaceOps: SurfaceOpsScreen()
            case .transit: TransitScreen()
            case .roverMining: RoverFieldScreen()
            case .mining, .landing: MiningScreen()
            case .delivery: DeliveryScreen()
            case .debrief: DebriefScreen()
            case .market: MarketScreen()
            case .instrumentHub: ControlStationScreen()
            case .saturnStormSearch: SaturnStormSearchScreen()
            case .asteroidDiscovery: AsteroidDiscoveryScreen()
            case .galaxy: TessDiscoveryScreen()
            default: StubScreen(screen: store.screen)
            }
        }
        .tint(Theme.accent)
        // Someone confirmed a planet: flag a re-point on the exoplanet target flow (web useConfirmedDiscoveryPoll).
        .task { await feed.pollConfirmed(store: store) }
    }
}

/// Keeps the Base and its below-grade silo in one local route. The web flow
/// remains on the Hub route while the camera descends; this gives native the
/// same direct, reversible transition without adding a dock destination.
private struct HubRoute: View {
    @Environment(GameStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            if store.screen == .hub {
                HubScreen()
                    .transition(.opacity)
            } else {
                SubsurfaceSiloScreen()
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.52), value: store.screen)
    }
}

struct StubScreen: View {
    @Environment(GameStore.self) private var store
    let screen: Screen
    var body: some View {
        ScreenFrame(title: screen.rawValue.replacingOccurrences(of: "-", with: " ").capitalized, back: { store.go(.hub) }) {
            Panel { Text("Staged: this scene is routed but its systems are not ported yet.") }
        }
    }
}
