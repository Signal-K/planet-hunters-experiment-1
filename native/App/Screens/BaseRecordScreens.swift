import SwiftUI
import LandnamCore

/// What the landscape picker says about each landscape: `shared/scenes/biome-pitch.json`, the file web reads too.
struct BiomePitch: Decodable {
    struct Entry: Decodable { let label, tagline, trait: String }
    let heading, lede, note: String
    let biomes: [String: Entry]

    static let shared: BiomePitch? = Bundle.main.url(forResource: "biome-pitch", withExtension: "json")
        .flatMap { try? Data(contentsOf: $0) }.flatMap { try? JSONDecoder().decode(BiomePitch.self, from: $0) }
}

/// Opening scene (mirrors web IntroScreen): the base world as a live backdrop that follows the picked landscape,
/// a plain heading, one card per landscape with its one real difference, and one button into the base.
struct IntroScreen: View {
    @Environment(GameStore.self) private var store
    @State private var selectedBiome = "mountains"

    private static let ids = ["mountains", "desert", "tundra", "coast"]

    var body: some View {
        let p = store.player
        let returning = p.missionsDone > 0
        let shown = EarthBiome(rawValue: returning ? p.earthBiome : selectedBiome) ?? .mountains
        let pitch = BiomePitch.shared
        GeometryReader { geo in
            let wide = geo.size.width >= 640
            ZStack {
                backdrop(biome: shown)
                VStack(spacing: 12) {
                    head(returning: returning, pitch: pitch, p: p)
                    Spacer(minLength: 0)
                    panel(returning: returning, pitch: pitch, wide: wide)
                }
                .padding(.horizontal, 16).padding(.vertical, 12)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Theme.bg.ignoresSafeArea()).foregroundStyle(Theme.ink)
    }

    private func backdrop(biome: EarthBiome) -> some View {
        GeometryReader { geo in
            BaseWorldScene(
                biome: biome, grade: "dusk", placed: [], plots: [:], levels: [:],
                camera: BaseCamera(x: BaseWorld(w: geo.size.width, h: geo.size.height).homeX([]), depth: 0),
                showsControls: false,
                onStructure: { _ in }, onShaft: {}, onBuildSilo: {}
            )
            .allowsHitTesting(false)
        }
        .ignoresSafeArea()
    }

    private func head(returning: Bool, pitch: BiomePitch?, p: Player) -> some View {
        VStack(spacing: 4) {
            Text("LANDNAM").font(AppFont.display(14)).tracking(4.5).foregroundStyle(IntroInk.dim)
            if returning {
                Text("Missions completed: \(p.missionsDone) · Total earned: \(Economy.format(francs: p.francs))")
                    .font(AppFont.body(14)).foregroundStyle(IntroInk.dim)
            } else {
                Text(pitch?.heading ?? "Choose where to build").font(AppFont.display(24)).foregroundStyle(IntroInk.ink)
                Text(pitch?.lede ?? "").font(AppFont.body(14)).foregroundStyle(IntroInk.dim)
            }
        }
        .multilineTextAlignment(.center)
        .padding(.horizontal, 20).padding(.vertical, 12).frame(maxWidth: 520)
        .background(IntroInk.panel.opacity(0.94), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(IntroInk.outline, lineWidth: 2))
    }

    private func panel(returning: Bool, pitch: BiomePitch?, wide: Bool) -> some View {
        VStack(spacing: 8) {
            if !returning {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: wide ? 4 : 2), spacing: 8) {
                    ForEach(Self.ids, id: \.self) { id in card(id, pitch?.biomes[id]) }
                }
                .accessibilityElement(children: .contain).accessibilityLabel("Choose base landscape")
                Text(pitch?.note ?? "").font(AppFont.body(14)).foregroundStyle(IntroInk.dim).multilineTextAlignment(.center)
            }
            Button {
                if !returning { store.setEarthBiome(selectedBiome) }
                store.go(returning || !store.player.placed.isEmpty ? .hub : .build)
            } label: {
                Text((returning ? "Resume operations" : "Establish base").uppercased()).font(AppFont.display(14)).tracking(1.4)
                    .frame(maxWidth: .infinity, minHeight: 48).foregroundStyle(IntroInk.ink)
                    .background(IntroInk.cta, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(IntroInk.outline, lineWidth: 2))
            }
            .buttonStyle(.plain)
        }
        .padding(12).frame(maxWidth: returning ? 360 : 760)
        .background(IntroInk.panel.opacity(0.94), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(IntroInk.outline, lineWidth: 2))
    }

    private func card(_ id: String, _ entry: BiomePitch.Entry?) -> some View {
        let selected = selectedBiome == id
        return Button { selectedBiome = id } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text((entry?.label ?? id.capitalized).uppercased()).font(AppFont.display(14)).tracking(1.4).foregroundStyle(IntroInk.ink)
                // Two lines reserved so every card shares one layout.
                Text(entry?.tagline ?? "").font(AppFont.body(14)).foregroundStyle(IntroInk.dim).lineLimit(2)
                    .frame(maxWidth: .infinity, minHeight: 36, alignment: .topLeading)
                Spacer(minLength: 0)
                Text((entry?.trait ?? "").uppercased()).font(AppFont.display(14)).tracking(0.8).foregroundStyle(IntroInk.ink).lineLimit(1)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(IntroInk.muted, lineWidth: 2))
            }
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading).padding(10)
            .background(selected ? IntroInk.raised : IntroInk.deep, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(selected ? IntroInk.ink : IntroInk.outline, lineWidth: selected ? 3 : 2))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// Dusk chrome for the intro, matching the web `--dusk-*` tokens: dark navy panels, chalk text, no white or blue.
private enum IntroInk {
    static let panel = Color(red: 0x15 / 255, green: 0x20 / 255, blue: 0x33 / 255)
    static let deep = Color(red: 0x0C / 255, green: 0x14 / 255, blue: 0x24 / 255)
    static let raised = Color(red: 0x1C / 255, green: 0x2C / 255, blue: 0x48 / 255)
    static let outline = Color(red: 0x16 / 255, green: 0x29 / 255, blue: 0x3B / 255)
    static let ink = Color(red: 0xF7 / 255, green: 0xF4 / 255, blue: 0xEE / 255)
    static let dim = Color(red: 0xD7 / 255, green: 0xE0 / 255, blue: 0xD4 / 255)
    static let muted = Color(red: 0xC5 / 255, green: 0xD4 / 255, blue: 0xC8 / 255)
    static let cta = Color(red: 0x9F / 255, green: 0x4B / 255, blue: 0x5F / 255)
}

/// Completed work as illustrated destination cards on a page of their own.
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
        let legacyCompleted = max(0, lifetime - missionEntries)
        MissionRecordPage(title: "Mission log") {
            VStack(alignment: .leading, spacing: 24) {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 130), spacing: 8)], spacing: 8) {
                    stat(lifetime, "MISSIONS COMPLETED")
                    stat(ordered.filter { !$0.isTransit && !$0.isProgram }.count, "CLIENT RUNS")
                    stat(ordered.filter { $0.isProgram }.count, "OWN RUNS")
                    stat(ordered.filter { $0.isTransit }.count, "TRANSITS")
                }
                .overlay(alignment: .topTrailing) {
                    Button { store.go(.hub) } label: {
                        Text("BACK").font(AppFont.display(14, "Bold")).tracking(1.2).foregroundStyle(Theme.ink)
                            .padding(.horizontal, 14).frame(minWidth: 44, minHeight: 44)
                            .background(RecordCream.paper)
                            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Back")
                    .offset(y: -78)
                }
                .padding(.top, 8)

                if ordered.isEmpty {
                    VStack(spacing: 8) {
                        Text("ARCHIVE STATUS")
                            .font(AppFont.display(14, "Bold")).tracking(1.4).foregroundStyle(Theme.blue)
                        Text(legacyCompleted > 0
                             ? "\(legacyCompleted) completed \(legacyCompleted == 1 ? "mission predates" : "missions predate") detailed mission records. New missions will appear here with their full debrief."
                             : "No completed missions yet. Choose a contract from the Mission Board to start your log.")
                            .font(AppFont.body(14)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
                    }
                    .padding(.vertical, 24).padding(.horizontal, 20).frame(maxWidth: .infinity)
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

    private func stat(_ n: Int, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(n)").font(AppFont.display(28)).foregroundStyle(Theme.blue)
            Text(label).font(AppFont.display(14, "Bold")).tracking(1.0).foregroundStyle(Theme.ink).lineLimit(2).minimumScaleFactor(0.7)
        }
        .padding(10).frame(maxWidth: .infinity, minHeight: 84, alignment: .topLeading)
        .background(RecordCream.paper)
        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
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
                HStack(alignment: .center, spacing: 0) {
                    DestinationVista(targetId: spot.id, type: spot.type, archetype: spot.archetype, card: true)
                        .frame(width: 92, height: 104)
                        .clipped()
                        .overlay(alignment: .trailing) { Rectangle().fill(Theme.ink).frame(width: 3) }
                    HStack(alignment: .center, spacing: 12) {
                        Text(String(format: "%02d", total - i)).font(AppFont.display(14, "Bold")).tracking(1.0).foregroundStyle(RecordCream.paper)
                            .frame(minWidth: 40).padding(.vertical, 8)
                            .background(Theme.blue)
                            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
                        VStack(alignment: .leading, spacing: 4) {
                            Text(r.title).font(AppFont.display(18)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                            Text(meta(r)).font(AppFont.display(14, "Bold")).tracking(1.1).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                            Text(Self.date(r.completedAt)).font(AppFont.mono(14)).foregroundStyle(Theme.blue)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(12)
                }
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

/// A record screen is its own page with its own panel: the base world as a dimmed backdrop, a chunky framed panel
/// with a title plaque hanging over its top edge.
struct MissionRecordPage<Content: View>: View {
    @Environment(GameStore.self) private var store
    @Environment(\.flatLayout) private var flat
    var title: String
    @ViewBuilder var content: Content
    var body: some View {
        ZStack {
            GeometryReader { geo in
                BaseWorldScene(
                    biome: EarthBiome(rawValue: store.player.earthBiome) ?? .mountains,
                    placed: [], plots: [:], levels: [:],
                    camera: BaseCamera(x: BaseWorld(w: geo.size.width, h: geo.size.height).homeX([]), depth: 0),
                    showsControls: false,
                    onStructure: { _ in }, onShaft: {}, onBuildSilo: {}
                )
                .allowsHitTesting(false)
            }
            .ignoresSafeArea()
            LinearGradient(colors: [Theme.ink.opacity(0.35), Theme.ink.opacity(0.65)], startPoint: .top, endPoint: .bottom).ignoresSafeArea().allowsHitTesting(false)
            scroller {
                VStack(alignment: .leading, spacing: 16) { content }
                    .padding(.horizontal, 16).padding(.top, 36).padding(.bottom, 16)
                    .frame(maxWidth: 780, alignment: .leading)
                    .background(RecordCream.paper)
                    .overlay(Rectangle().stroke(Theme.ink, lineWidth: 4))
                    .background(alignment: .top) { Rectangle().fill(Theme.ink).offset(y: 6) }
                    .overlay(alignment: .top) {
                        Text(title.uppercased()).font(AppFont.display(16, "Bold")).tracking(2.4).foregroundStyle(RecordCream.paper)
                            .padding(.horizontal, 28).padding(.vertical, 10)
                            .background(Theme.blue)
                            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 4))
                            .offset(y: -22)
                    }
                    .padding(.horizontal, 16).padding(.top, 88).padding(.bottom, 112)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    @ViewBuilder private func scroller<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        if flat { c().frame(maxHeight: .infinity, alignment: .top) } else { ScrollView { c() } }
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

/// Product ledger (mirrors web NarrativeLedgerScreen): live, adapting and planned mechanics side by side.
struct NarrativeLedgerScreen: View {
    @Environment(GameStore.self) private var store
    private let loop = ["PLAYER BUILDS FOR CLIENTS", "CLIENT XP UPDATES", "NEXT-DAY DEMAND IS SET", "MARKET PRICES REFRESH"]

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
