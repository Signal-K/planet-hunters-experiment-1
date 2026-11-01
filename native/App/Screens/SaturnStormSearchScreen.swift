import SwiftUI
import LandnamCore

/// Saturn imager classify screen (mirrors web SaturnStormSearchScreen, SSL-492): one Cassini
/// frame a day under a 3x3 grid; pick a square, answer Yes / No / Maybe, optionally mark a storm.
struct SaturnStormSearchScreen: View {
    @Environment(GameStore.self) private var store
    @Environment(FeedModel.self) private var feed
    /// Snapshot tests pass a candidate so no network is touched.
    var candidate: SaturnCandidate?
    @State private var selected = 2
    @State private var storms: Set<Int> = []
    @State private var answers: [Int: SaturnVerdict] = [:]
    /// SSL-745: imaging module (web IMAGING · SI-04).
    @State private var contrast = 1.0
    @State private var palette = 0
    @State private var sharpen = false
    @State private var loupe = false

    /// False-colour maps for the greyscale frame (web SATURN_PALETTES). iOS tints the greyscale
    /// frame with the map's mid colour; web maps brightness through a full colour ramp.
    static let palettes: [(name: String, tint: Color?)] = [
        ("CLR", nil), ("HEAT", Theme.hex(0xFF8A2A)), ("ICE", Theme.hex(0x5FD3FF)), ("MT", Theme.hex(0xE05CFF)),
    ]

    private var frame: SaturnCandidate? { candidate ?? Saturn.today(candidates: feed.saturn, player: store.player, nowMs: store.now) }

    var body: some View { content.task { if candidate == nil { await feed.loadSaturn() } } }

    @ViewBuilder private var content: some View {
        if !store.player.freeOperations {
            gate("Free Operations Required", "Saturn imager downlinks unlock after the starter contract arc.", action: nil)
        } else if store.player.saturnImagerLaunchedAt == nil {
            gate("Launch Saturn Imager", "Deploy the Saturn imager from the Launchpad to start receiving Cassini frames.", action: ("OPEN LAUNCHPAD", { store.go(.launchpad) }))
        } else if let frame {
            classify(frame)
        }
    }

    /// The Saturn desk briefs the player on their first frame (web `SATURN_BRIEFING`).
    static let briefing = [
        "Saturn desk here. This is a real Cassini frame of Saturn's clouds, cut into nine squares. Your satellite sends one a day.",
        "Tap a square to look at it. The white box shows the square you picked. Aim, zoom and exposure help you see detail.",
        "A storm is a bright, round knot or swirl in the cloud bands. If you see one, tap MARK STORM, then answer YES.",
        "Smooth bands with no knot are NO. If you cannot tell, answer MAYBE. Each answer is saved straight away. Answer all nine squares to finish the frame.",
    ]

    private func classify(_ c: SaturnCandidate) -> some View {
        let saved = store.player.saturnClassifications[c.id]
        return InstrumentViewport(
            eyebrow: "Instrument data feed · Saturn downlink", title: c.opusId.uppercased(),
            status: saved == nil ? "Review" : "Saved", caption: Saturn.question,
            back: { store.go(.instrumentHub) },
            onCommand: { line, view in
                let words = line.uppercased().split(whereSeparator: \.isWhitespace).map(String.init)
                let arg = words.dropFirst().first
                switch words.first ?? "" {
                case "PALETTE":
                    let i = arg.map { a in Self.palettes.firstIndex { $0.name == a } ?? -1 } ?? (palette + 1) % Self.palettes.count
                    guard i >= 0 else { return Instrument.CommandResult(view: view, lines: ["> PALETTE  USE " + Self.palettes.map(\.name).joined(separator: " ")]) }
                    palette = i; return Instrument.CommandResult(view: view, lines: ["> PALETTE  \(Self.palettes[i].name)"])
                case "CONTRAST":
                    if let n = arg.flatMap(Double.init) { contrast = min(3, max(0.5, n)) }
                    return Instrument.CommandResult(view: view, lines: [String(format: "> CONTRAST  %.1f", contrast)])
                case "SHARPEN": sharpen.toggle(); return Instrument.CommandResult(view: view, lines: ["> SHARPEN  \(sharpen ? "ON" : "OFF")"])
                case "LOUPE": loupe.toggle(); return Instrument.CommandResult(view: view, lines: ["> LOUPE  \(loupe ? "ON" : "OFF")"])
                default: return nil
                }
            },
            well: {
                if loupe && saved == nil { loupeView(c) } else { frameImage(c) }
            },
            overlay: {
                if !(loupe && saved == nil) { grid(locked: saved != nil) }
            },
            answers: {
                if let saved {
                    Panel(accent: Theme.teal) { Text("Classification submitted: \(saved.verdict.rawValue.capitalized)").font(AppFont.display(16)) }
                } else {
                    HStack(spacing: 10) {
                        ForEach(SaturnVerdict.allCases, id: \.self) { v in
                            InstrumentAnswerButton(title: v.rawValue) { answers[selected] = v; store.classifySaturn(c.id, verdict: v) }
                        }
                    }
                }
            },
            tool: {
                InstrumentAnswerButton(title: storms.contains(selected) ? "Unmark storm" : "Mark storm", enabled: saved == nil) {
                    if storms.contains(selected) { storms.remove(selected) } else { storms.insert(selected) }
                }
            },
            briefing: InstrumentBriefing(speaker: "Saturn desk", lines: Self.briefing, startOpen: store.player.saturnClassifications.isEmpty),
            instrumentId: "saturn-imager", level: store.player.transitSatelliteLevel ?? 1,
            module: InstrumentModule(name: "IMAGING · SI-04", lights: [("SHRP", sharpen, false), ("LOUPE", loupe, true)], content: AnyView(
                VStack(spacing: 10) {
                    HStack(alignment: .top, spacing: 8) {
                        Knob(label: "CONTRAST", readout: String(format: "%.1f×", contrast), value: contrast, range: 0.5...3) { contrast = $0 }
                        ModuleKey(label: "PALETTE", readout: Self.palettes[palette].name, pressed: palette > 0) { palette = (palette + 1) % Self.palettes.count }
                        ModuleKey(label: "NEXT SQ", readout: "SQ \(selected + 1)", enabled: saved == nil) { selected = (selected + 1) % Saturn.gridCells }
                    }
                    HStack(spacing: 10) {
                        LeverSwitch(label: "SHARPEN", on: sharpen) { sharpen.toggle() }
                        LeverSwitch(label: "LOUPE", on: loupe) { loupe.toggle() }
                    }
                })))
        .id(c.id)
    }

    /// LOUPE: the selected square fills the well at 3× (web `.loupe`).
    private func loupeView(_ c: SaturnCandidate) -> some View {
        GeometryReader { geo in
            let col = CGFloat(selected % 3), row = CGFloat(selected / 3)
            frameImage(c)
                .frame(width: geo.size.width * 3, height: geo.size.height * 3)
                .offset(x: -col * geo.size.width, y: -row * geo.size.height)
                .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
                .clipped()
                .overlay(alignment: .topLeading) {
                    Text("SQ \(selected + 1) · 3×").font(AppFont.mono(14)).foregroundStyle(ConsoleHW.cream)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6)).padding(12)
                }
        }
    }

    @ViewBuilder private func frameImage(_ c: SaturnCandidate) -> some View {
        AsyncImage(url: c.imageURL) { phase in
            switch phase {
            case .success(let image):
                let tint = Self.palettes[palette].tint
                image.resizable().scaledToFill()
                    .grayscale(tint == nil ? 0 : 1)
                    .colorMultiply(tint ?? .white)
                    // iOS approximates SHARPEN with a local contrast lift; web runs an unsharp kernel.
                    .contrast(contrast * (sharpen ? 1.25 : 1))
                    .brightness(sharpen ? 0.03 : 0)
            default:
                LinearGradient(colors: [Theme.ink, Theme.blue.opacity(0.7), Theme.ink], startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        }
        .accessibilityLabel("Cassini frame \(c.opusId)")
    }

    private func grid(locked: Bool) -> some View {
        GeometryReader { geo in
            let w = geo.size.width / 3, h = geo.size.height / 3
            ForEach(0..<Saturn.gridCells, id: \.self) { i in
                let r = CGFloat(i / 3), col = CGFloat(i % 3)
                Button { selected = i } label: { // tap-floor-ignore: the 26pt ring is a marker inside a full grid cell
                    ZStack {
                        Rectangle().stroke(.white.opacity(0.55), lineWidth: 1)
                        if selected == i { Rectangle().stroke(Theme.blueBright, lineWidth: 4) }
                        if let a = answers[i] { Text(String(a.rawValue.prefix(1)).uppercased()).font(AppFont.display(16)).foregroundStyle(.white).padding(4).background(Theme.blue, in: Circle()).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading) }
                        if storms.contains(i) { Circle().stroke(Theme.blueBright, lineWidth: 3).frame(width: 26, height: 26) }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain).disabled(locked)
                .frame(width: w, height: h).position(x: col * w + w / 2, y: r * h + h / 2)
                .accessibilityLabel("Square \(i + 1)\(storms.contains(i) ? ", storm marked" : "")")
            }
        }
    }

    private func gate(_ title: String, _ body: String, action: (String, () -> Void)?) -> some View {
        ScreenFrame(title: "Saturn Imager", back: { store.go(.instrumentHub) }) {
            Panel {
                VStack(alignment: .leading, spacing: 10) {
                    Text(title).font(AppFont.display(16))
                    Text(body).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    if let action { PrimaryButton(title: action.0, action: action.1) }
                }
            }
        }
    }
}
