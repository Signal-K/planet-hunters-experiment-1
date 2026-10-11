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

/// Completed client work and own-programme runs (mirrors web MissionHistoryScreen: the web screen is
/// `theme-light`, so it sits on the warm paper surface with flat hairline cards, no offset shadows).
struct MissionHistoryScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(\.flatLayout) private var flat
    @State private var openKey: Int?

    /// Web `theme-light` tokens (`--ln-void`, `--ln-text*`, `--ln-cyan*`, `--ln-hairline*`).
    private enum Light {
        static let void = Theme.hex(0xF4F1EA)
        static let surface2 = Theme.hex(0xF2EEE4)
        static let text = Theme.hex(0x1C1A14)
        static let dim = Theme.hex(0x4A4536)
        static let muted = Theme.hex(0x7A7460)
        static let cyan = Theme.hex(0x1C7FBF)
        static let cyanSoft = Theme.hex(0x1C7FBF, 0.10)
        static let cyanBorder = Theme.hex(0x1C7FBF, 0.32)
        static let hairline = Theme.hex(0x1C1A14, 0.12)
        static let hairlineStrong = Theme.hex(0x1C1A14, 0.28)
    }

    private static func date(_ ms: Double) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }

    private func label(_ text: String, color: Color = Light.text) -> some View {
        Text(text.uppercased()).font(AppFont.display(14)).tracking(1.4).foregroundStyle(color)
    }

    var body: some View {
        let ordered = MissionLog.entries(store.player)
        let missionEntries = ordered.filter { !$0.isTransit }.count
        let lifetime = max(store.player.missionsDone, missionEntries)
        scroller {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    label("Base · Mission log", color: Light.cyan).padding(.bottom, 8)
                    Text("Mission Log").font(AppFont.display(26)).foregroundStyle(Light.text)
                    Text("A concise record of completed client work and program operations.")
                        .font(AppFont.body(15, "Regular")).foregroundStyle(Light.dim).padding(.top, 12)
                        .fixedSize(horizontal: false, vertical: true)
                    Button { store.go(.hub) } label: {
                        label("Back to base", color: Light.cyan).padding(.horizontal, 14).frame(minHeight: 44)
                            .background(Light.surface2, in: RoundedRectangle(cornerRadius: 6))
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Light.cyanBorder, lineWidth: 1))
                    }.buttonStyle(.plain).accessibilityLabel("Back to base").padding(.top, 16)
                }.padding(.bottom, 24)

                HStack(spacing: 4) {
                    label("Operations", color: Light.cyan)
                    Text("\(lifetime)").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Light.dim)
                }
                .padding(.horizontal, 14).frame(minHeight: 44)
                .background(Light.cyanSoft, in: RoundedRectangle(cornerRadius: 6))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Light.cyanBorder, lineWidth: 1))
                .padding(.bottom, 16)

                HStack(spacing: 16) {
                    Text("\(lifetime)").font(AppFont.display(32)).foregroundStyle(Light.cyan)
                    VStack(alignment: .leading, spacing: 2) {
                        label("Missions completed")
                        Text(lifetime > missionEntries ? "Detailed entries below cover your most recent operations." : "Your record stays available after the daily contract board refreshes.")
                            .font(AppFont.body(14, "Regular")).foregroundStyle(Light.dim).fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.paper, in: RoundedRectangle(cornerRadius: 6))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Light.hairlineStrong, lineWidth: 1))
                .padding(.bottom, 16)

                if ordered.isEmpty {
                    Text("No completed missions yet. Choose a contract from the Mission Board to start your log.")
                        .font(AppFont.body(14, "Regular")).foregroundStyle(Light.dim).multilineTextAlignment(.center)
                        .padding(.vertical, 32).padding(.horizontal, 16).frame(maxWidth: .infinity)
                        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 6))
                        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Light.hairlineStrong, style: StrokeStyle(lineWidth: 1, dash: [4, 3])))
                } else {
                    VStack(spacing: 8) {
                        ForEach(Array(ordered.enumerated()), id: \.offset) { i, r in record(r, index: i, total: ordered.count) }
                    }
                }
            }
            .padding(.horizontal, 16).padding(.top, 24).padding(.bottom, 48)
            .frame(maxWidth: 1040, alignment: .leading).frame(maxWidth: .infinity)
        }
        .background(Light.void.ignoresSafeArea())
    }

    @ViewBuilder private func scroller<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        if flat { c().frame(maxHeight: .infinity, alignment: .top) } else { ScrollView { c() } }
    }

    private func record(_ r: MissionLogEntry, index i: Int, total: Int) -> some View {
        let open = openKey == i
        let mission = r.missionId.flatMap { id in store.catalog.missions.first { $0.id == id } }
        return VStack(alignment: .leading, spacing: 0) {
            Button { openKey = open ? nil : i } label: {
                HStack(alignment: .center, spacing: 12) {
                    label(String(format: "%02d", total - i), color: Light.muted)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(r.title).font(AppFont.display(15)).foregroundStyle(Light.text).lineLimit(1)
                        Text(r.meta.uppercased()).font(AppFont.display(14)).tracking(1.4).foregroundStyle(Light.dim).lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    label(Self.date(r.completedAt), color: Light.cyan)
                }
                .frame(minHeight: 44).contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityAddTraits(open ? .isSelected : [])
            if open { debrief(r, mission: mission) }
        }
        .padding(.horizontal, 16).padding(.vertical, 14).frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 6))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Light.hairline, lineWidth: 1))
    }

    private func debrief(_ r: MissionLogEntry, mission: Mission?) -> some View {
        let day = Self.date(r.completedAt)
        let type = r.isTransit ? "Transit Telescope classification" : r.isProgram ? "Own program, no client" : r.clientName ?? "Client operation"
        func row(_ k: String, _ v: String) -> some View {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                label(k, color: Light.muted)
                Spacer(minLength: 0)
                Text(v).font(AppFont.body(14, "Regular")).foregroundStyle(Light.text).multilineTextAlignment(.trailing)
            }
        }
        return VStack(alignment: .leading, spacing: 8) {
            Rectangle().fill(Light.hairline).frame(height: 1)
            label("Debrief", color: Light.cyan)
            Text(r.isTransit ? "You classified a light curve from your Transit Telescope." : mission?.brief ?? "This operation was completed and filed to your record.")
                .font(AppFont.body(14, "Regular")).foregroundStyle(Light.dim).fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
            VStack(spacing: 6) {
                row("Result", "Completed \(day)")
                if r.isTransit, let v = r.verdict { row("Verdict", v) } else if let t = r.targetName { row("Target", t) }
                row("Type", type)
                if let mission, !r.isProgram, mission.payout.francs > 0 { row("Payout", Economy.format(francs: mission.payout.francs)) }
                if let outcome = mission?.programReward?.outcome { row("Outcome", outcome) }
            }
        }.padding(.top, 12)
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
