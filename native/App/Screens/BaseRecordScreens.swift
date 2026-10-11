import SwiftUI
import LandnamCore

/// Opening scene (mirrors web IntroScreen): wordmark, one sentence, one button into the base.
struct IntroScreen: View {
    @Environment(GameStore.self) private var store
    var body: some View {
        let p = store.player
        let returning = p.missionsDone > 0
        VStack(spacing: 18) {
            Spacer(minLength: 0)
            Eyebrow(text: "Mission operations")
            Text("LANDNAM").font(AppFont.display(44)).tracking(4).foregroundStyle(Theme.ink)
            Text(returning ? "Welcome back, Commander." : "Welcome, Commander.").font(AppFont.display(20))
            Text(returning
                 ? "Missions completed: \(p.missionsDone) · Total earned: \(Economy.format(francs: p.francs))"
                 : "Build your base. Mine the asteroids. Fulfill the contract. The belt is waiting.")
                .font(AppFont.body(16)).foregroundStyle(Theme.textDim).multilineTextAlignment(.center).frame(maxWidth: 420)
            PrimaryButton(title: returning ? "Resume operations" : "Begin operations") { store.go(returning || !p.placed.isEmpty ? .hub : .build) }.frame(maxWidth: 320)
            Spacer(minLength: 0)
        }
        .padding(24).frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.bg.ignoresSafeArea()).foregroundStyle(Theme.ink)
    }
}

/// Completed client work and own-programme runs (mirrors web MissionHistoryScreen).
struct MissionHistoryScreen: View {
    @Environment(GameStore.self) private var store

    private static func date(_ ms: Double) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }

    var body: some View {
        let ordered = MissionLog.entries(store.player)
        let missionEntries = ordered.filter { !$0.isTransit }.count
        let lifetime = max(store.player.missionsDone, missionEntries)
        ScreenFrame(title: "Mission Log", back: { store.go(.hub) }) {
            Eyebrow(text: "Base · Mission log")
            Panel(accent: Theme.teal) {
                HStack(spacing: 14) {
                    Text("\(lifetime)").font(AppFont.display(36))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("MISSIONS COMPLETED").font(AppFont.display(14)).tracking(1.2)
                        Text(lifetime > missionEntries ? "Detailed entries below cover your most recent operations." : "Your record stays available after the daily contract board refreshes.")
                            .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    }
                }
            }
            if ordered.isEmpty {
                Panel { Text("No completed missions yet. Choose a contract from the Mission Board to start your log.").foregroundStyle(Theme.textDim) }
            }
            ForEach(Array(ordered.enumerated()), id: \.offset) { i, r in
                Panel(accent: Theme.blueBright) {
                    HStack(alignment: .top, spacing: 12) {
                        Text(String(format: "%02d", ordered.count - i)).font(AppFont.mono(14)).foregroundStyle(Theme.textMuted)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(r.title).font(AppFont.display(16))
                            Text(r.meta).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                        }
                        Spacer(minLength: 0)
                        Text(Self.date(r.completedAt)).font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
                    }
                }
            }
        }
    }
}

/// Product ledger (mirrors web NarrativeLedgerScreen): live, adapting and planned mechanics side by side.
struct NarrativeLedgerScreen: View {
    @Environment(GameStore.self) private var store
    private let loop = ["PLAYER BUILDS FOR CLIENTS", "CLIENT XP UPDATES", "NEXT-DAY DEMAND IS SET", "MARKET PRICES REFRESH", "SITE REVENUE FUNDS TREASURY"]

    var body: some View {
        ScreenFrame(title: "Narrative Ledger", back: { store.go(.hub) }) {
            Eyebrow(text: "Internal product map")
            Text("One source of truth for the player promise, the systems behind it, and what is actually built.")
                .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
            Panel(accent: Theme.blueBright) {
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "The player-facing rule")
                    Text("What do I launch today?").font(AppFont.display(20))
                    Text("Every meaningful session starts with one decision. The choices stay visible; the systems behind them stay out of the way.")
                        .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    Text("CLIENT WORK · OWN INFRA · MINING · TEST LAUNCH").font(AppFont.display(14)).tracking(1)
                }
            }
            Panel(accent: Theme.teal) {
                VStack(alignment: .leading, spacing: 6) {
                    Eyebrow(text: "Daily economy loop · 00:01 AEST")
                    ForEach(Array(loop.enumerated()), id: \.offset) { i, l in
                        Text("\(i + 1)  \(l)").font(AppFont.display(14)).tracking(0.6)
                    }
                }
            }
            HStack(spacing: 10) {
                ForEach(LedgerState.allCases, id: \.self) { s in
                    Text("\(NarrativeLedger.entries.filter { $0.state == s }.count) \(s.label)")
                        .font(AppFont.display(14)).tracking(1).padding(.horizontal, 10).frame(minHeight: 44)
                        .background(color(s).opacity(0.18), in: Capsule()).overlay(Capsule().stroke(color(s), lineWidth: 2))
                }
            }
            ForEach(NarrativeLedger.entries) { e in
                Panel(accent: color(e.state)) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack { Text(e.owner).font(AppFont.display(14)).foregroundStyle(Theme.textMuted); Spacer(); Text(e.state.label).font(AppFont.display(14)).foregroundStyle(color(e.state)) }
                        Text(e.title).font(AppFont.display(18))
                        Text(e.playerVerb).font(AppFont.body(14, "SemiBold"))
                        Text(e.purpose).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                        Text("CADENCE  \(e.cadence)").font(AppFont.mono(14))
                        Text("DEPENDS ON  \(e.dependencies.joined(separator: " · "))").font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
                        Text(e.implementation).font(AppFont.body(14)).foregroundStyle(Theme.textMuted)
                    }
                }
            }
        }
    }

    private func color(_ s: LedgerState) -> Color { s == .live ? Theme.teal : s == .adapt ? Theme.blueBright : Theme.textMuted }
}
