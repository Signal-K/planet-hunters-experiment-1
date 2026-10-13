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

/// Completed work as illustrated destination cards above the live base. The base keeps the one dock.
struct MissionHistoryScreen: View {
    @Environment(GameStore.self) private var store
    @State private var openKey: Int?

    private static func date(_ ms: Double) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }

    var body: some View {
        let ordered = MissionLog.entries(store.player)
        let missionEntries = ordered.filter { !$0.isTransit }.count
        let lifetime = max(store.player.missionsDone, missionEntries)
        MissionRecordOverlay(bare: true) {
            VStack(alignment: .leading, spacing: 24) {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text("\(lifetime)").font(AppFont.display(32)).foregroundStyle(Theme.blue)
                    Text("MISSIONS COMPLETED").font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.ink)
                    Spacer(minLength: 8)
                    Button { store.go(.hub) } label: {
                        Text("BACK").font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.ink)
                            .padding(.horizontal, 16).frame(minHeight: 44)
                            .background(RecordCream.paper)
                            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Back")
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RecordCream.paper)
                .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
                .overlay(alignment: .top) { Rectangle().fill(Theme.blue).frame(height: 6) }

                if ordered.isEmpty {
                    Text("No completed missions yet. Choose a contract from the Mission Board to start your log.")
                        .font(AppFont.body(14)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
                        .padding(.vertical, 32).padding(.horizontal, 20).frame(maxWidth: .infinity)
                        .background(RecordCream.paper)
                        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
                } else {
                    VStack(spacing: 24) {
                        ForEach(Array(ordered.enumerated()), id: \.offset) { i, r in record(r, index: i, total: ordered.count) }
                    }
                }
            }
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }

    private func place(_ r: MissionLogEntry) -> (id: String, type: TargetType, archetype: TargetArchetype?) {
        let mission = r.missionId.flatMap { id in store.catalog.missions.first { $0.id == id } }
        let id = r.targetId ?? mission?.targetId
        if let named = store.catalog.targets.first(where: { $0.id == id || (r.targetName != nil && $0.name == r.targetName) }) {
            return (named.id, named.type, named.archetype)
        }
        if r.isTransit { return ("transit-telescope", .planet, nil) }
        return (id ?? r.title, .asteroid, nil)
    }

    private func meta(_ r: MissionLogEntry) -> String {
        let kind = r.isTransit ? "TRANSIT TELESCOPE" : r.isProgram ? "OWN PROGRAM" : (r.clientName ?? "CLIENT OPERATION")
        return r.targetName.map { "\(kind) · \($0)" } ?? kind
    }

    private func record(_ r: MissionLogEntry, index i: Int, total: Int) -> some View {
        let open = openKey == i
        let mission = r.missionId.flatMap { id in store.catalog.missions.first { $0.id == id } }
        let spot = place(r)
        return VStack(alignment: .leading, spacing: 0) {
            Button { openKey = open ? nil : i } label: {
                VStack(alignment: .leading, spacing: 12) {
                    DestinationVista(targetId: spot.id, type: spot.type, archetype: spot.archetype, card: true)
                        .frame(height: 148)
                        .frame(maxWidth: .infinity)
                        .clipped()
                    VStack(alignment: .leading, spacing: 6) {
                        Text(String(format: "%02d", total - i)).font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.blue)
                        Text(r.title).font(AppFont.display(18)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                        Text(meta(r)).font(AppFont.display(14, "Bold")).tracking(1.1).foregroundStyle(Theme.ink)
                        Text(Self.date(r.completedAt)).font(AppFont.mono(14)).foregroundStyle(Theme.blue)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(16)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(open ? .isSelected : [])
            if open { debrief(r, mission: mission) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RecordCream.paper)
        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
        .overlay(alignment: .top) { Rectangle().fill(Theme.blue).frame(height: 6) }
    }

    private func debrief(_ r: MissionLogEntry, mission: Mission?) -> some View {
        let day = Self.date(r.completedAt)
        func row(_ k: String, _ v: String) -> some View {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text(k.uppercased()).font(AppFont.display(14, "Bold")).tracking(1.1).foregroundStyle(Theme.blue)
                Spacer(minLength: 0)
                Text(v).font(AppFont.body(14)).foregroundStyle(Theme.ink).multilineTextAlignment(.trailing)
            }
        }
        return VStack(alignment: .leading, spacing: 8) {
            Text("DEBRIEF").font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.blue)
            Text(r.isTransit ? "You classified a light curve from your Space Telescope." : mission?.brief ?? "Filed to your record.")
                .font(AppFont.body(14)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            row("Result", "Completed \(day)")
            if r.isTransit, let v = r.verdict { row("Verdict", v) } else if let t = r.targetName { row("Target", t) }
            if let mission, !r.isProgram, mission.payout.francs > 0 { row("Payout", Economy.format(francs: mission.payout.francs)) }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
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

/// These record screens keep the same live scene, clock, resource chips and dock as the base.
struct MissionRecordOverlay<Content: View>: View {
    var bare = false
    @ViewBuilder var content: Content
    var body: some View {
        GeometryReader { geo in
            ZStack {
                HubScreen()
                ScrollView {
                    if bare {
                        content
                            .padding(.horizontal, 16)
                            .padding(.bottom, 24)
                    } else {
                        VStack(alignment: .leading, spacing: 16) { content }
                            .padding(20)
                            .frame(maxWidth: 680, alignment: .leading)
                            .background(RecordCream.paper)
                            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
                            .overlay(alignment: .top) { Rectangle().fill(Theme.blue).frame(height: 6) }
                            .padding(4)
                            .frame(maxWidth: .infinity, alignment: geo.size.width > 700 ? .trailing : .center)
                    }
                }
                .padding(.horizontal, bare ? 0 : 16)
                .padding(.top, geo.size.height < 500 ? 64 : 88)
                .padding(.bottom, 88)
            }
        }
    }
}

struct DebriefRecordPanel<Content: View>: View {
    var accent: Color = Theme.blue
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 16) { content }
            .font(AppFont.body(14)).padding(20).frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.paper)
            .overlay(Rectangle().stroke(Theme.blue, lineWidth: 2))
    }
}
