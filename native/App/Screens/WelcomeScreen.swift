import SwiftUI
import LandnamCore

/// Shown once after a web save is imported: confirms what came across and teaches the touch controls.
struct WelcomeScreen: View {
    @Environment(GameStore.self) private var store
    @State private var page = 0

    private static let structureNames = ["launchpad": "Launchpad", "surface-silo": "Surface Silo", "refinery": "Refinery"]

    var body: some View {
        let p = store.player
        VStack(spacing: 18) {
            Spacer(minLength: 0)
            Eyebrow(text: "Mobile crew briefing · \(page + 1) of 3")
            if page == 0 {
                Text("Welcome back, Commander.").font(AppFont.display(28)).multilineTextAlignment(.center)
                Text("Your agency came across from the web. Nothing was lost.")
                    .font(AppFont.body(16)).foregroundStyle(Theme.textDim).multilineTextAlignment(.center)
                Panel(accent: Theme.teal) {
                    VStack(alignment: .leading, spacing: 8) {
                        row("FUNDS", Economy.format(francs: p.francs))
                        row("MISSIONS COMPLETED", "\(max(p.missionsDone, p.completedMissions.count))")
                        row("STRUCTURES", p.placed.isEmpty ? "None yet" : p.placed.map { Self.structureNames[$0] ?? $0.replacingOccurrences(of: "-", with: " ").capitalized }.joined(separator: ", "))
                    }
                }.frame(maxWidth: 420)
            } else if page == 1 {
                Text("Built for touch.").font(AppFont.display(28))
                Panel {
                    VStack(alignment: .leading, spacing: 12) {
                        tip("Tap a building on the base to open it.")
                        tip("Use the Base button, top left, to come back from any screen.")
                        tip("Market and Menu sit at the bottom of the base. Your thumb reaches them.")
                        tip("Turn the phone sideways for wider scenes; it all works in both.")
                    }
                }.frame(maxWidth: 420)
            } else {
                Text("Play anywhere.").font(AppFont.display(28))
                Panel {
                    VStack(alignment: .leading, spacing: 12) {
                        tip("No signal needed. Missions, mining and building all work offline.")
                        tip("Your progress saves on this device first and syncs when you are back online.")
                        tip("The same account keeps the web and mobile games in step.")
                    }
                }.frame(maxWidth: 420)
            }
            PrimaryButton(title: page < 2 ? "Next" : "Resume operations") {
                if page < 2 { page += 1 } else { store.finishWelcome() }
            }.frame(maxWidth: 320)
            Spacer(minLength: 0)
        }
        .padding(24).frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.bg.ignoresSafeArea()).foregroundStyle(Theme.ink)
    }

    private func row(_ k: String, _ v: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(k).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.textDim)
            Text(v).font(AppFont.body(18))
        }
    }
    private func tip(_ t: String) -> some View { Text(t).font(AppFont.body(16)).fixedSize(horizontal: false, vertical: true) }
}
