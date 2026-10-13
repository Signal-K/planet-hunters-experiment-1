import SwiftUI

/// Settings-only instrument panels, matching the web overlay (SSL-556).
enum SettingsStyle {
    static let bg = Theme.hex(0xF2EEE4)
    static let blue = Theme.hex(0x1F78C1)
    static let trim = Theme.hex(0xDFE9F3)
    static let card = Color.white
    static let ink = Theme.hex(0x0F2436)
    static let muted = ink
    static let danger = Theme.hex(0xC8293E)
    static let radius: CGFloat = 2
    static let pad: CGFloat = 24
    static let gap: CGFloat = 32
    static let border: CGFloat = 2
}

extension View {
    /// Square white instrument panel with a bold ink outline.
    func settingsCard(border: Color = SettingsStyle.ink, padding: CGFloat = SettingsStyle.pad) -> some View {
        self.padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SettingsStyle.card, in: RoundedRectangle(cornerRadius: SettingsStyle.radius))
            .overlay(RoundedRectangle(cornerRadius: SettingsStyle.radius).stroke(border, lineWidth: SettingsStyle.border))
    }


}

/// Cream and blue pixel horizon for the settings sheet. No green, yellow, or orange.
struct SettingsSkyHeader: View {
    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height
            let step: CGFloat = 8
            func snap(_ v: CGFloat) -> CGFloat { (v / step).rounded(.down) * step }
            context.fill(Path(CGRect(x: 0, y: 0, width: w, height: h)), with: .color(SettingsStyle.trim))
            context.fill(Path(CGRect(x: 0, y: 0, width: w, height: h * 0.36)), with: .color(SettingsStyle.blue.opacity(0.28)))
            context.fill(Path(CGRect(x: 0, y: h * 0.36, width: w, height: h * 0.14)), with: .color(SettingsStyle.blue.opacity(0.12)))
            let stars: [(CGFloat, CGFloat)] = [(0.06, 0.14), (0.2, 0.26), (0.38, 0.1), (0.58, 0.22), (0.74, 0.12), (0.9, 0.24)]
            for s in stars {
                let r = CGRect(x: snap(s.0 * w), y: snap(s.1 * h), width: 3, height: 3)
                context.fill(Path(r), with: .color(SettingsStyle.ink))
            }
            func ridge(_ levels: [CGFloat], color: Color) {
                var path = Path()
                path.move(to: CGPoint(x: 0, y: h))
                var x: CGFloat = 0
                while x <= w {
                    let t = min(1, x / max(w, 1))
                    let idx = min(levels.count - 1, Int((t * CGFloat(levels.count - 1)).rounded(.down)))
                    path.addLine(to: CGPoint(x: x, y: snap(h * levels[idx])))
                    x += step
                }
                path.addLine(to: CGPoint(x: w, y: h))
                path.closeSubpath()
                context.fill(path, with: .color(color))
            }
            ridge([0.62, 0.48, 0.66, 0.42, 0.58, 0.7, 0.5, 0.38, 0.56, 0.46, 0.64], color: SettingsStyle.blue)
            ridge([0.82, 0.72, 0.86, 0.74, 0.9, 0.78, 0.7, 0.84, 0.76], color: SettingsStyle.ink)
            let px = snap(w * 0.5)
            context.fill(Path(CGRect(x: px - 16, y: h - 10, width: 32, height: 6)), with: .color(SettingsStyle.card))
            context.fill(Path(CGRect(x: px - 3, y: h - 28, width: 6, height: 18)), with: .color(SettingsStyle.card))
            var nose = Path()
            nose.move(to: CGPoint(x: px - 3, y: h - 28))
            nose.addLine(to: CGPoint(x: px, y: h - 38))
            nose.addLine(to: CGPoint(x: px + 3, y: h - 28))
            nose.closeSubpath()
            context.fill(nose, with: .color(SettingsStyle.ink))
        }
        .frame(maxWidth: .infinity)
        .frame(height: 88)
        .accessibilityHidden(true)
    }
}

/// Uppercase instrument heading.
struct SettingsHeading: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(AppFont.display(14)).tracking(14 * 0.14).foregroundStyle(SettingsStyle.ink)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Bold mixed-case card title over a slate uppercase status line.
struct SettingsRowText: View {
    let title: String
    let status: String
    var titleColor: Color = SettingsStyle.ink
    var statusColor: Color = SettingsStyle.muted
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(AppFont.display(16, "Bold")).foregroundStyle(titleColor)
            Text(status.uppercased()).font(AppFont.display(14, "Bold")).tracking(14 * 0.08).foregroundStyle(statusColor)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// Right-pointing pixel stair used on action buttons.
struct SettingsPlay: View {
    var color: Color = SettingsStyle.blue
    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array([2, 4, 6, 8, 6, 4, 2].enumerated()), id: \.offset) { _, w in
                Rectangle().fill(color).frame(width: CGFloat(w) * 1.25, height: 2).frame(width: 10, alignment: .leading)
            }
        }.frame(width: 10, height: 14)
    }
}

/// Uppercase blue action with a 44pt target.
struct SettingsButton: View {
    let title: String
    var color: Color = SettingsStyle.blue
    var solid = false
    var enabled = true
    var fill = false
    var compact = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            let fg: Color = solid ? SettingsStyle.card : (enabled ? color : SettingsStyle.muted)
            HStack(spacing: 8) {
                SettingsPlay(color: fg)
                Text(title.uppercased()).font(AppFont.display(14)).tracking(14 * 0.08).foregroundStyle(fg)
            }
            .padding(.horizontal, compact ? 16 : 20).frame(minWidth: compact ? 52 : 88, maxWidth: fill ? .infinity : nil, minHeight: 52)
            .background(solid ? color : SettingsStyle.card, in: RoundedRectangle(cornerRadius: SettingsStyle.radius))
            .overlay(RoundedRectangle(cornerRadius: SettingsStyle.radius).stroke(enabled ? color : SettingsStyle.ink, lineWidth: SettingsStyle.border))
            .contentShape(Rectangle())
        }.buttonStyle(.plain).disabled(!enabled)
    }
}

/// Square selectors; the active option is blue with white text.
struct SettingsSegment: View {
    let options: [String]
    let selected: Int
    let onSelect: (Int) -> Void
    var body: some View {
        HStack(spacing: 8) {
            ForEach(Array(options.enumerated()), id: \.offset) { i, title in
                let on = i == selected
                Button { onSelect(i) } label: {
                    Text(title.uppercased()).font(AppFont.display(14)).tracking(14 * 0.08)
                        .foregroundStyle(on ? SettingsStyle.card : SettingsStyle.ink)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(on ? SettingsStyle.blue : SettingsStyle.card, in: RoundedRectangle(cornerRadius: 2))
                        .overlay(RoundedRectangle(cornerRadius: 2).stroke(SettingsStyle.ink, lineWidth: SettingsStyle.border))
                        .contentShape(RoundedRectangle(cornerRadius: 2))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(title)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
}
