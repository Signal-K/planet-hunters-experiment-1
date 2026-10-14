import SwiftUI
import CoreText

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
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.border, lineWidth: 1.5))
            .background(RoundedRectangle(cornerRadius: 9).fill(accent).offset(x: 4, y: 4))
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
    let title: String
    var back: (() -> Void)?
    @ViewBuilder var content: Content
    var body: some View {
        ZStack {
            InternalPageScene(title: title).ignoresSafeArea()
            scroller {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(alignment: .center, spacing: 12) {
                        if let back {
                            Button(action: back) {
                                Text("‹ BASE").font(AppFont.display(14)).tracking(1.6).foregroundStyle(Theme.bluePress)
                                    .frame(minWidth: 44, minHeight: 44, alignment: .leading).contentShape(Rectangle())
                            }.buttonStyle(.plain).accessibilityLabel("Back to base")
                        }
                        Text(title).font(AppFont.display(23)).foregroundStyle(Theme.ink)
                    }
                    PageStatusStrip(title: title)
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

/// The shared internal-page landscape. It is deliberately an outlined building
/// or instrument, never a planet or a person, so a data page still feels like
/// a place in the base.
private struct InternalPageScene: View {
    let title: String
    private var kind: Int {
        let key = title.lowercased()
        if key.contains("control") || key.contains("imager") { return 0 }
        if key.contains("mission") || key.contains("launch") { return 1 }
        if key.contains("market") { return 2 }
        if key.contains("refinery") { return 3 }
        return 4
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                LinearGradient(colors: [Theme.skyTop, Theme.bg], startPoint: .top, endPoint: .bottom)
                Canvas { ctx, size in
                    let ground = size.height * 0.52
                    var grid = Path()
                    stride(from: CGFloat(0), through: size.width, by: 32).forEach { grid.move(to: CGPoint(x: $0, y: 0)); grid.addLine(to: CGPoint(x: $0, y: ground)) }
                    stride(from: CGFloat(0), through: ground, by: 32).forEach { grid.move(to: CGPoint(x: 0, y: $0)); grid.addLine(to: CGPoint(x: size.width, y: $0)) }
                    ctx.stroke(grid, with: .color(Theme.ink.opacity(0.12)), lineWidth: 1)
                    let w = min(size.width * 0.72, 520), x = (size.width - w) / 2
                    var building = Path()
                    switch kind {
                    case 0: // instrument room and signal mast
                        building.addRect(CGRect(x: x + w * 0.22, y: ground - 118, width: w * 0.56, height: 118))
                        building.move(to: CGPoint(x: x + w * 0.5, y: ground - 118)); building.addLine(to: CGPoint(x: x + w * 0.5, y: ground - 210))
                        building.addEllipse(in: CGRect(x: x + w * 0.39, y: ground - 232, width: w * 0.22, height: 48))
                    case 1: // launch review tower
                        building.addRect(CGRect(x: x + w * 0.38, y: ground - 185, width: w * 0.24, height: 185))
                        building.addRect(CGRect(x: x + w * 0.68, y: ground - 145, width: w * 0.1, height: 145))
                        building.move(to: CGPoint(x: x + w * 0.68, y: ground - 145)); building.addLine(to: CGPoint(x: x + w * 0.78, y: ground - 105))
                    case 2: // Exchange remains a building
                        building.addRect(CGRect(x: x + w * 0.12, y: ground - 122, width: w * 0.76, height: 122))
                        building.move(to: CGPoint(x: x, y: ground - 122)); building.addLine(to: CGPoint(x: x + w * 0.5, y: ground - 192)); building.addLine(to: CGPoint(x: x + w, y: ground - 122)); building.closeSubpath()
                    case 3: // refinery stacks
                        for offset in [0.18, 0.42, 0.66] { building.addRect(CGRect(x: x + w * offset, y: ground - 190 + w * offset * 0.12, width: 36, height: 190 - w * offset * 0.12)) }
                    default: // workshop / academy bay
                        building.addRect(CGRect(x: x + w * 0.12, y: ground - 140, width: w * 0.76, height: 140))
                        building.move(to: CGPoint(x: x + w * 0.12, y: ground - 140)); building.addLine(to: CGPoint(x: x + w * 0.22, y: ground - 184)); building.addLine(to: CGPoint(x: x + w * 0.78, y: ground - 184)); building.addLine(to: CGPoint(x: x + w * 0.88, y: ground - 140))
                    }
                    ctx.fill(building, with: .color(Theme.paper.opacity(0.92)))
                    ctx.stroke(building, with: .color(Theme.ink.opacity(0.72)), lineWidth: 1.5)
                    var horizon = Path(); horizon.move(to: CGPoint(x: 0, y: ground)); horizon.addLine(to: CGPoint(x: size.width, y: ground))
                    ctx.stroke(horizon, with: .color(Theme.ink.opacity(0.7)), lineWidth: 1.5)
                }
            }
        }
        .accessibilityHidden(true)
    }
}

private struct PageStatusStrip: View {
    let title: String
    private var labels: (String, String, String, String) {
        let key = title.lowercased()
        if key.contains("mission") || key.contains("launch") { return ("CONTRACTS", "REVIEW", "REWARD", "PUBLISHED") }
        if key.contains("market") { return ("EXCHANGE", "LIVE", "RATES", "PUBLISHED") }
        if key.contains("control") || key.contains("imager") { return ("FEEDS", "MONITORED", "QUEUE", "READY") }
        if key.contains("refinery") { return ("PROCESSING", "MONITORED", "OUTPUT", "STORED") }
        return ("PROGRAMME", "ACTIVE", "PROGRESS", "TRACKED")
    }
    var body: some View {
        let l = labels
        HStack(spacing: 8) {
            status(l.0, l.1); status(l.2, l.3)
        }.accessibilityElement(children: .combine).accessibilityLabel("\(l.0) \(l.1), \(l.2) \(l.3)")
    }
    private func status(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(AppFont.display(11, "Bold")).tracking(1.0).foregroundStyle(Theme.textMuted)
            Text(value).font(AppFont.mono(14)).foregroundStyle(Theme.ink)
        }.padding(.vertical, 7).padding(.horizontal, 10).frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.paper.opacity(0.94), in: RoundedRectangle(cornerRadius: 7))
            .overlay(RoundedRectangle(cornerRadius: 7).stroke(Theme.ink, lineWidth: 1.25))
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
