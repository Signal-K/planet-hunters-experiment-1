import SwiftUI
import LandnamCore
import TakeonKit

/// Routes every one of the 26 screens. Core-loop screens are playable; the rest
/// show a staged placeholder until their systems are ported (see README).
struct RootView: View {
    @Environment(GameStore.self) private var store
    @Environment(AuthModel.self) private var auth
    @Environment(FeedModel.self) private var feed
    @Environment(SurveyCenter.self) private var surveys

    var body: some View {
        if auth.session == nil { SignInScreen() } else { game }
    }

    @Environment(\.verticalSizeClass) private var verticalSizeClass

    private var coachToShow: FlightPlan.Coach? {
        guard !store.welcomePending, store.screen != .mining, store.screen != .landing, store.screen != .intro else { return nil }
        return FlightPlan.coach(store.player, screen: store.screen, includeHidden: true)
    }

    private var game: some View {
        Group {
            switch store.welcomePending ? nil : store.screen {
            case nil: WelcomeScreen()
            case .intro: IntroScreen()
            case .hub, .hubSubsurface: HubScreen()
            case .missionHistory: MissionHistoryScreen()
            case .missions: MissionsScreen().helpable(.missions)
            case .targets, .rocketBuy, .fab: LaunchReviewScreen().helpable(.targets)
            case .launchpad: LaunchReviewScreen()
            case .hangar: HangarScreen().helpable(.hangar)
            case .build: BuildScreen()
            case .transit: TransitScreen().helpable(.transit)
            case .roverSurvey: if TakeonSceneFlag.enabled && takeonGoRuntimeAvailable { TakeonSceneScreen(onExit: { store.go(.hub) }) } else { RoverFieldScreen() }
            case .mining: MiningScreen().helpable(.mining)
            case .landing: LandingScreen().helpable(.landing)
            case .delivery: DeliveryScreen().helpable(.delivery)
            case .debrief: if store.player.homeDeliveryPending { HomecomingScreen() } else { DebriefScreen() }
            case .market: MarketScreen()
            case .instrumentHub: ControlStationScreen()
            case .saturnStormSearch: SaturnStormSearchScreen()
            case .asteroidDiscovery: AsteroidDiscoveryScreen()
            case .galaxy: TessDiscoveryScreen().helpable(.galaxy, firstVisit: true)
            default: StubScreen(screen: store.screen)
            }
        }
        // Portrait and iPad: the coach is a rail in the top inset, so screens lay out below it. Compact height (a phone
        // in landscape) keeps the floating strip in its free band.
        .safeAreaInset(edge: .top, spacing: 0) {
            if let coach = coachToShow, verticalSizeClass != .compact {
                CoachPlacement(coach: coach, screen: store.screen, docked: true)
            }
        }
        .overlay(alignment: .top) {
            if let coach = coachToShow, verticalSizeClass == .compact {
                CoachPlacement(coach: coach, screen: store.screen)
            }
        }
        .tint(Theme.accent)
        // Someone confirmed a planet: flag a re-point on the exoplanet target flow (web useConfirmedDiscoveryPoll).
        .task { await feed.pollConfirmed(store: store) }
        .onChange(of: store.state) { old, new in surveys.observe(old: old, new: new) }
        .sheet(item: Binding(get: { surveys.current.map(SurveyItem.init) }, set: { if $0 == nil, surveys.current != nil { surveys.dismiss() } })) { item in
            SurveySheet(def: item.def, submit: { surveys.submit($0) }, dismiss: { surveys.dismiss() })
        }
    }
}

struct StubScreen: View {
    @Environment(GameStore.self) private var store
    let screen: Screen
    var body: some View {
        ScreenFrame(title: "", back: { store.go(.hub) }) {
            Panel { Text("Staged: this scene is routed but its systems are not ported yet.") }
        }
    }
}

private struct SurveyItem: Identifiable { let def: SurveyDef; var id: String { def.key }; init(_ def: SurveyDef) { self.def = def } }
