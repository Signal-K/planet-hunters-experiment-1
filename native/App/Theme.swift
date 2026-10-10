import SwiftUI
import CoreText

/// Web `:root` / `.theme-deep` tokens from `web/app/globals.css`.
/// Charcoal shell, cyan accent, lime only for payout. Not the light blueprint paper.
enum Theme {
    static func hex(_ v: UInt32, _ a: Double = 1) -> Color {
        Color(.sRGB, red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255, opacity: a)
    }

    static let shell = hex(0x0A0A0C)          // --ln-shell / --ln-void
    static let bg = hex(0x131316)             // --ln-bg
    static let paper = hex(0x1C1C20)          // --ln-panel
    static let paper2 = hex(0x25252A)         // --ln-panel-2
    static let surface3 = hex(0x303036)       // --ln-surface-3
    static let ink = hex(0xE9E9EC)            // --ln-text
    static let blue = hex(0x70D9EA)           // --ln-cyan
    static let blueBright = hex(0xA3ECF5)     // --ln-cyan-bright
    static let bluePress = hex(0x3FB8CC)      // --ln-cyan-press
    static let teal = hex(0xD8FF55)           // --ln-payout
    static let ok = hex(0x5AD07E)             // --ln-ok
    static let crimson = hex(0xC8293E)        // --ln-crimson
    static let textDim = hex(0xB4B4BC)        // --ln-text-dim
    static let textMuted = hex(0x7C7C86)      // --ln-text-muted
    static let onAccent = hex(0x0A1418)       // --ln-text-on-cyan
    static let hairline = Color.white.opacity(0.14)          // --ln-hairline
    static let border = Color.white.opacity(0.22)            // --ln-border
    static let glassBorder = hex(0x70D9EA, 0.48)             // --ln-glass-border

    /// Cyan mixed into the shell. Flight and field skies read as space, not pale paper.
    static func mix(_ pct: Double) -> Color {
        let c: (Double, Double, Double) = (0x70 / 255, 0xD9 / 255, 0xEA / 255)
        let base: (Double, Double, Double) = (0x0A / 255, 0x0A / 255, 0x0C / 255)
        return Color(.sRGB, red: base.0 + (c.0 - base.0) * pct, green: base.1 + (c.1 - base.1) * pct, blue: base.2 + (c.2 - base.2) * pct)
    }
    static let skyTop = shell
    static let skyMid = bg
    static let horizon = hex(0x1A3036)
    static let groundFar = paper
    static let groundNear = paper2
    static let groundLip = surface3
    static let chalk = blue

    // Base HUD: charcoal glass, thin light outline, light glyphs. Mint is status, not a fill for body text.
    static let hudInk = ink
    static let hudPanel = paper
    static let hudTrack = surface3
    static let hudMint = ok

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

/// Glass card: charcoal fill, thin accent outline, inner hairline. Chrome does not take taps.
struct Panel<Content: View>: View {
    var accent: Color = Theme.blue
    @ViewBuilder var content: Content
    var body: some View {
        // One container, so several children share a single card instead of each getting its own padding and background.
        VStack(alignment: .leading, spacing: 8) { content }
            .font(AppFont.body(14))
            .foregroundStyle(Theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.paper.opacity(0.92), in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(accent.opacity(0.72), lineWidth: 1).allowsHitTesting(false))
            .overlay(RoundedRectangle(cornerRadius: 8).inset(by: 3).stroke(Color.white.opacity(0.08), lineWidth: 1).allowsHitTesting(false))
    }
}

struct PrimaryButton: View {
    let title: String
    var enabled = true
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title.uppercased()).font(AppFont.display(14)).tracking(1.4)
                .frame(maxWidth: .infinity, minHeight: 44).padding(.vertical, 8)
                .contentShape(Rectangle())
                // Cyan is a light accent: dark text on it, dim ink when the control is off.
                .foregroundStyle(enabled ? Theme.onAccent : Theme.ink.opacity(0.75))
                .background(enabled ? Theme.blue : Theme.blue.opacity(0.14), in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.glassBorder.opacity(enabled ? 1 : 0.45), lineWidth: 1).allowsHitTesting(false))
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
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(accent, lineWidth: 1).allowsHitTesting(false))
            label
        }
        .padding(.vertical, 7).padding(.leading, 7).padding(.trailing, 10)
        .background(Theme.paper.opacity(0.92), in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(accent.opacity(0.72), lineWidth: 1).allowsHitTesting(false))
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
                content
            }
            .padding(16).frame(maxWidth: 720, alignment: .leading).frame(maxWidth: .infinity)
        }
        .background { PageBackdrop().ignoresSafeArea().allowsHitTesting(false) }
        .foregroundStyle(Theme.ink)
    }

    @ViewBuilder private func scroller<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        if flat { c().frame(maxHeight: .infinity, alignment: .top) } else { ScrollView { c() } }
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
            }.overlay(Capsule().stroke(Theme.border, lineWidth: 1).allowsHitTesting(false))
        }.frame(height: 10).accessibilityValue("\(Int(min(1, max(0, value)) * 100)) percent")
    }
}
