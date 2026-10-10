import SwiftUI
import LandnamCore

/// Holds the "Show me" run for the screen on display. Screens report player
/// actions with `coach.report("mark")`; only the step that names it advances.
@MainActor @Observable final class CoachController {
    var run: CoachRun
    var sheetOpen = false
    init(topic: HelpTopic?) { run = CoachRun(topic: topic) }
    func report(_ action: String) { run.complete(action: action) }
}

private struct CoachControllerKey: EnvironmentKey { static let defaultValue: CoachController? = nil }
extension EnvironmentValues {
    var coach: CoachController? {
        get { self[CoachControllerKey.self] }
        set { self[CoachControllerKey.self] = newValue }
    }
}

/// Frames of every `coachTarget` on screen, measured by SwiftUI itself so the
/// lit hole can never drift off its control (web has to poll the DOM per frame).
private struct CoachFrames: PreferenceKey {
    nonisolated(unsafe) static var defaultValue: [String: Anchor<CGRect>] = [:]
    static func reduce(value: inout [String: Anchor<CGRect>], nextValue: () -> [String: Anchor<CGRect>]) {
        value.merge(nextValue()) { $1 }
    }
}

extension View {
    /// Marks a control the "Show me" run can light up.
    func coachTarget(_ id: String) -> some View {
        anchorPreference(key: CoachFrames.self, value: .bounds) { [id: $0] }
    }

    /// Adds the "?" button, the help sheet and the coach overlay for a screen that has a topic.
    @ViewBuilder func helpable(_ screen: Screen) -> some View {
        if let topic = Help.topic(for: screen) { modifier(HelpModifier(topic: topic)) } else { self }
    }
}

private struct HelpModifier: ViewModifier {
    let topic: HelpTopic
    @State private var coach: CoachController

    init(topic: HelpTopic) { self.topic = topic; _coach = State(initialValue: CoachController(topic: topic)) }

    func body(content: Content) -> some View {
        content
            .environment(\.coach, coach)
            .overlay(alignment: .topTrailing) {
                Button { coach.sheetOpen = true } label: {
                    Text("?").font(AppFont.display(20, "Bold")).foregroundStyle(Theme.ink)
                        .frame(width: 44, height: 44)
                        .background(Theme.paper, in: Circle())
                        .overlay(Circle().stroke(Theme.border, lineWidth: 1).allowsHitTesting(false))
                        .contentShape(Circle())
                }
                .buttonStyle(.plain).padding(12)
                .accessibilityLabel("Help: \(topic.title)")
            }
            .overlayPreferenceValue(CoachFrames.self) { frames in
                GeometryReader { geo in
                    if let step = coach.run.current {
                        let rects = step.targets.compactMap { frames[$0] }.map { geo[$0] }
                        CoachMarks(step: step, index: coach.run.index ?? 0, total: coach.run.steps.count,
                                   rects: rects, size: geo.size, onNext: { coach.run.advance() }, onStop: { coach.run.stop() })
                    }
                }
                // An idle coach layer fills the screen. It must not take taps from the station underneath.
                .allowsHitTesting(coach.run.current != nil)
            }
            .sheet(isPresented: Binding(get: { coach.sheetOpen }, set: { coach.sheetOpen = $0 })) {
                HelpSheet(topic: topic, onShowMe: topic.coach.isEmpty ? nil : {
                    coach.sheetOpen = false
                    coach.run.start()
                }, onClose: { coach.sheetOpen = false })
                .presentationDetents([.medium, .large])
            }
    }
}

struct HelpSheet: View {
    let topic: HelpTopic
    var onShowMe: (() -> Void)?
    let onClose: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(topic.title).font(AppFont.display(23)).foregroundStyle(Theme.ink)
                Spacer()
                Button("CLOSE", action: onClose).font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.bluePress)
                    .frame(minWidth: 44, minHeight: 44).buttonStyle(.plain)
            }
            ForEach(topic.cards, id: \.title) { card in
                Panel {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(card.title).font(AppFont.display(16, "Bold")).foregroundStyle(Theme.ink)
                        Text(card.body).font(AppFont.body(15)).foregroundStyle(Theme.textDim).fixedSize(horizontal: false, vertical: true)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            if let onShowMe { PrimaryButton(title: "Show me", enabled: true, action: onShowMe) }
            Spacer(minLength: 0)
        }
        .padding(16)
        .background { PageBackdrop().ignoresSafeArea().allowsHitTesting(false) }
    }
}

/// Dims everything except the step's real controls and pins one hint beside them.
/// The dim layer blocks taps; the lit hole passes them through to the control underneath.
struct CoachMarks: View {
    let step: HelpCoachStep
    let index: Int
    let total: Int
    let rects: [CGRect]
    let size: CGSize
    let onNext: () -> Void
    let onStop: () -> Void
    private let pad: CGFloat = 8

    private var hole: CGRect? {
        guard let first = rects.first else { return nil }
        return rects.dropFirst().reduce(first) { $0.union($1) }.insetBy(dx: -pad, dy: -pad)
    }

    private var dim: Path {
        var p = Path(CGRect(origin: .zero, size: size))
        if let hole { p.addRoundedRect(in: hole, cornerSize: CGSize(width: 10, height: 10)) }
        return p
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            dim.fill(Theme.shell.opacity(0.72), style: FillStyle(eoFill: true))
                .contentShape(dim, eoFill: true)
                .onTapGesture {}
            if let hole {
                RoundedRectangle(cornerRadius: 10).stroke(Theme.blue, lineWidth: 3)
                    .frame(width: hole.width, height: hole.height).position(x: hole.midX, y: hole.midY)
                    .allowsHitTesting(false)
            }
            bubble
        }
    }

    private var bubble: some View {
        let w = min(340, size.width - 32)
        let below = hole.map { size.height - $0.maxY } ?? 0
        let y: CGFloat = hole.map { below >= 170 ? $0.maxY + 12 + 75 : max(95, $0.minY - 12 - 75) } ?? size.height - 110
        let x = min(max(16 + w / 2, hole?.midX ?? size.width / 2), size.width - 16 - w / 2)
        return VStack(alignment: .leading, spacing: 8) {
            Text("STEP \(index + 1) OF \(total)").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.bluePress)
            Text(step.hint).font(AppFont.body(15)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            HStack {
                Button("STOP", action: onStop).foregroundStyle(Theme.textDim)
                Spacer()
                Button(index + 1 >= total ? "DONE" : "NEXT", action: onNext).foregroundStyle(Theme.bluePress)
            }
            .font(AppFont.display(14, "Bold")).tracking(1.4).buttonStyle(.plain)
            .frame(minHeight: 44)
        }
        .padding(14).frame(width: w)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.border, lineWidth: 2))
        .background(RoundedRectangle(cornerRadius: 10).fill(Theme.blue).offset(x: 3, y: 3))
        .position(x: x, y: y)
    }
}
