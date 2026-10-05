import SwiftUI
import LandnamCore

/// Routes every one of the 26 screens. Core-loop screens are playable; the rest
/// show a staged placeholder until their systems are ported (see README).
struct RootView: View {
    @Environment(GameStore.self) private var store
    @Environment(AuthModel.self) private var auth

    var body: some View {
        if auth.session == nil { SignInScreen() } else { game }
    }

    private var game: some View {
        Group {
            switch store.screen {
            case .intro, .hub, .hubSubsurface: HubScreen()
            case .missions: MissionsScreen()
            case .targets: TargetsScreen()
            case .rocketBuy: RocketBuyScreen()
            case .fab, .launchpad, .hangar, .build: LaunchScreen()
            case .transit: TransitScreen()
            case .mining, .roverMining, .landing: MiningScreen()
            case .delivery: DeliveryScreen()
            case .debrief: DebriefScreen()
            case .market: MarketScreen()
            default: StubScreen(screen: store.screen)
            }
        }
        .tint(Theme.accent)
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
