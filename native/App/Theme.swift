import SwiftUI
import CoreText
import LandnamCore

/// Light "blueprint" direction, mirroring web `--ln-*` tokens in globals.css.
/// No dark default.
enum Theme {
    static func hex(_ v: UInt32, _ a: Double = 1) -> Color {
        Color(.sRGB, red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255, opacity: a)
    }

    static let bg = hex(0xEEF3F8)
    static let paper = hex(0xFFFFFF)
    static let paper2 = hex(0xDFE9F3)
    static let ink = hex(0x0F2436)
    static let blue = hex(0x1F78C1)
    static let blueBright = hex(0x42A6DF)
    static let bluePress = hex(0x17639F)
    static let teal = hex(0x0E6F66)      // web --ln-amber / payout
    static let crimson = hex(0xB8223A)
    static let textDim = hex(0x48596A)
    static let textMuted = hex(0x566879)
    static let hairline = ink.opacity(0.14)
    static let border = ink.opacity(0.30)

    // Hub scene gradient tokens (color-mix of blue into paper).
    static func mix(_ pct: Double) -> Color {
        let b: (Double, Double, Double) = (0x1F / 255, 0x78 / 255, 0xC1 / 255)
        return Color(.sRGB, red: b.0 * pct + (1 - pct), green: b.1 * pct + (1 - pct), blue: b.2 * pct + (1 - pct))
    }
    static let skyTop = mix(0.14)
    static let skyMid = mix(0.28)
    static let horizon = mix(0.46)
    static let groundFar = mix(0.34)
    static let groundNear = mix(0.48)
    static let groundLip = hex(0xADB4BB)
    static let chalk = mix(0.18)

    // Base HUD (Out There: Omega style): white panels, thin black outline, bold black glyphs, mint accents.
    static let hudInk = hex(0x111111)
    static let hudPanel = hex(0xFFFFFF)
    static let hudTrack = hex(0xE6E9EC)
    static let hudMint = hex(0x5EDBA8)

    // Legacy aliases used by older screens.
    static let line = blue
    static let accent = blue
    static let panel = paper
}

enum AppFont {
    /// Registers bundled Oxanium and Turret Road once (works on macOS and iOS).
    static func register() {
        guard let urls = Bundle.main.urls(forResourcesWithExtension: "ttf", subdirectory: nil) else { return }
        for url in urls { CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil) }
    }

    static func display(_ size: CGFloat, _ weight: String = "ExtraBold") -> Font { .custom("Oxanium-\(weight)", size: size) }
    static func body(_ size: CGFloat, _ weight: String = "Medium") -> Font { .custom("Oxanium-\(weight)", size: size) }
    static func mono(_ size: CGFloat, _ weight: String = "Bold") -> Font { .custom("TurretRoad-\(weight)", size: size) }
}

/// Eyebrow label: tracked uppercase display text.
struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(AppFont.display(14, "Bold")).tracking(1.8).foregroundStyle(Theme.textMuted)
    }
}

/// Outlined card with the web's hard offset shadow.
struct Panel<Content: View>: View {
    var accent: Color = Theme.blue
    @ViewBuilder var content: Content
    var body: some View {
        // One container, so several children share a single card instead of each getting its own padding and background.
        VStack(alignment: .leading, spacing: 8) { content }
            .font(AppFont.body(14))
            .fixedSize(horizontal: false, vertical: true)
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.hudInk, lineWidth: 2))
            .background(RoundedRectangle(cornerRadius: 9).fill(accent.opacity(0.72)).offset(x: 4, y: 4))
            .padding(.trailing, 4).padding(.bottom, 4)
    }
}

struct PrimaryButton: View {
    let title: String
    var enabled = true
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title.uppercased()).font(AppFont.display(14)).tracking(1.4)
                .frame(maxWidth: .infinity).padding(.vertical, 12)
                // Disabled keeps readable ink text on a pale fill; fading white-on-blue left the label unreadable.
                .foregroundStyle(enabled ? Color.white : Theme.ink.opacity(0.75))
                .background(enabled ? Theme.blue : Theme.blue.opacity(0.14), in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink.opacity(enabled ? 0.55 : 0.3), lineWidth: 1.5))
        }
        .buttonStyle(.plain).disabled(!enabled)
    }
}

/// Small bordered icon badge + value, like the web HUD rail cards.
struct RailCard<Label: View>: View {
    let symbol: String
    var accent: Color = Theme.blue
    @ViewBuilder var label: Label
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: symbol).font(.system(size: 14, weight: .semibold)).foregroundStyle(accent)
                .frame(width: 22, height: 22)
                .background(Theme.paper2, in: RoundedRectangle(cornerRadius: 6))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(accent, lineWidth: 1.5))
            label
        }
        .padding(.vertical, 7).padding(.leading, 7).padding(.trailing, 10)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 9))
        .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.border, lineWidth: 1.5))
        .background(RoundedRectangle(cornerRadius: 9).fill(Theme.blue).offset(x: 4, y: 4))
    }
}

private struct FlatLayoutKey: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    /// Snapshot tests set this because ImageRenderer draws nothing inside a ScrollView.
    var flatLayout: Bool { get { self[FlatLayoutKey.self] } set { self[FlatLayoutKey.self] = newValue } }
}

struct ScreenFrame<Content: View>: View {
    @Environment(\.flatLayout) private var flat
    @Environment(GameStore.self) private var store
    let title: String
    var back: (() -> Void)?
    @ViewBuilder var content: Content
    var body: some View {
        ZStack {
            OperationsPaperScene().ignoresSafeArea()
            scroller {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(alignment: .center, spacing: 12) {
                        if let back {
                            Button(action: back) {
                                Text("‹ BASE").font(AppFont.display(14)).tracking(1.6).foregroundStyle(Theme.bluePress)
                                    .frame(minWidth: 44, minHeight: 44, alignment: .leading).contentShape(Rectangle())
                            }.buttonStyle(.plain).accessibilityLabel("Back to base")
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Eyebrow(text: "Program operations")
                            Text(title).font(AppFont.display(23)).foregroundStyle(Theme.ink)
                        }
                        Spacer(minLength: 0)
                        Image(systemName: "dot.radiowaves.left.and.right")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(Theme.blue)
                            .frame(width: 44, height: 44)
                            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.hudInk, lineWidth: 2))
                    }
                    ProgramReadout(missions: store.player.missionsDone, francs: store.player.francs, research: store.player.researchXP)
                    content
                }
                .padding(16).frame(maxWidth: 720, alignment: .leading).frame(maxWidth: .infinity)
            }
        }
        .foregroundStyle(Theme.ink)
    }

    @ViewBuilder private func scroller<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        if flat { c().frame(maxHeight: .infinity, alignment: .top) } else { ScrollView { c() } }
    }
}

/// A small, stable telemetry layer shown on every internal page. It keeps the
/// player's current programme state visible without turning route content into
/// another dashboard.
private struct ProgramReadout: View {
    let missions: Int
    let francs: Int
    let research: Int

    var body: some View {
        HStack(spacing: 0) {
            metric("MISSIONS", "\(missions)", "flag.checkered")
            Divider().overlay(Theme.hairline).padding(.vertical, 6)
            metric("FUNDS", Economy.format(francs: francs), "banknote")
            Divider().overlay(Theme.hairline).padding(.vertical, 6)
            metric("RESEARCH", "\(research) XP", "waveform.path.ecg")
        }
        .padding(10)
        .background(Theme.paper.opacity(0.94), in: RoundedRectangle(cornerRadius: 9))
        .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.hudInk, lineWidth: 2))
        .background(RoundedRectangle(cornerRadius: 9).fill(Theme.blue.opacity(0.35)).offset(x: 4, y: 4))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Program status: \(missions) missions, \(Economy.format(francs: francs)), \(research) research XP")
    }

    private func metric(_ label: String, _ value: String, _ symbol: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: symbol).font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.bluePress)
            VStack(alignment: .leading, spacing: 1) {
                Text(label).font(AppFont.display(11, "Bold")).tracking(1)
                Text(value).font(AppFont.mono(13)).lineLimit(1).minimumScaleFactor(0.72)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 4)
    }
}

/// Technical-station scene art for menu and record pages. It deliberately
/// depicts an instrument deck and uplink paths, never a planet or a person.
struct OperationsPaperScene: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [Theme.bg, Theme.paper2.opacity(0.8), Theme.bg], startPoint: .topLeading, endPoint: .bottomTrailing)
            Canvas { context, size in
                var grid = Path()
                let spacing: CGFloat = 32
                for x in stride(from: 0, through: size.width, by: spacing) { grid.move(to: CGPoint(x: x, y: 0)); grid.addLine(to: CGPoint(x: x, y: size.height)) }
                for y in stride(from: 0, through: size.height, by: spacing) { grid.move(to: CGPoint(x: 0, y: y)); grid.addLine(to: CGPoint(x: size.width, y: y)) }
                context.stroke(grid, with: .color(Theme.blue.opacity(0.10)), lineWidth: 1)

                let panel = CGRect(x: size.width * 0.62, y: size.height * 0.12, width: size.width * 0.30, height: size.height * 0.22)
                context.fill(Path(roundedRect: panel, cornerRadius: 12), with: .color(Theme.paper.opacity(0.55)))
                context.stroke(Path(roundedRect: panel, cornerRadius: 12), with: .color(Theme.blue.opacity(0.32)), lineWidth: 2)
                var signal = Path()
                signal.move(to: CGPoint(x: size.width * 0.10, y: size.height * 0.78))
                signal.addCurve(to: CGPoint(x: size.width * 0.82, y: size.height * 0.22), control1: CGPoint(x: size.width * 0.30, y: size.height * 0.42), control2: CGPoint(x: size.width * 0.58, y: size.height * 0.62))
                context.stroke(signal, with: .color(Theme.teal.opacity(0.28)), style: StrokeStyle(lineWidth: 3, dash: [8, 10]))
                for point in [CGPoint(x: size.width * 0.10, y: size.height * 0.78), CGPoint(x: size.width * 0.82, y: size.height * 0.22)] {
                    context.fill(Path(ellipseIn: CGRect(x: point.x - 7, y: point.y - 7, width: 14, height: 14)), with: .color(Theme.blue.opacity(0.38)))
                }
            }
        }
        .accessibilityHidden(true)
    }
}

/// Outlined progress bar (ProgressView renders as a placeholder in headless snapshots and ignores the blueprint outline).
struct Bar: View {
    let value: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.paper2)
                Capsule().fill(Theme.blue).frame(width: g.size.width * min(1, max(0, value)))
            }.overlay(Capsule().stroke(Theme.ink, lineWidth: 1.5))
        }.frame(height: 10).accessibilityValue("\(Int(min(1, max(0, value)) * 100)) percent")
    }
}
