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
    static let teal = hex(0x168A80)      // web --ln-amber / payout
    static let crimson = hex(0xC8293E)
    static let textDim = hex(0x48596A)
    static let textMuted = hex(0x60778E)
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
    static let hillFar = mix(0.36)
    static let groundFar = mix(0.34)
    static let groundNear = mix(0.48)
    static let groundLip = hex(0xADB4BB)
    static let chalk = mix(0.18)

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
        content
            .font(AppFont.body(14))
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
                .foregroundStyle(.white)
                .background(Theme.blue, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink.opacity(0.55), lineWidth: 1.5))
                .opacity(enabled ? 1 : 0.4)
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

struct ScreenFrame<Content: View>: View {
    let title: String
    var back: (() -> Void)?
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    if let back {
                        Button(action: back) {
                            Text("‹ BASE").font(AppFont.display(14)).tracking(1.6).foregroundStyle(Theme.blue)
                        }.buttonStyle(.plain)
                    }
                    Text(title).font(AppFont.display(23)).foregroundStyle(Theme.ink)
                }
                content
            }
            .padding(16).frame(maxWidth: 720, alignment: .leading).frame(maxWidth: .infinity)
        }
        .background(Theme.bg.ignoresSafeArea())
        .foregroundStyle(Theme.ink)
    }
}
