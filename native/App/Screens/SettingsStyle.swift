import SwiftUI

/// Settings is a quiet dusk instrument room, matching the web overlay.
enum SettingsStyle {
    static let bg = Theme.hex(0x0C1424)
    static let blue = Theme.teal
    static let trim = Theme.hex(0x152033)
    static let card = Theme.hex(0x152033)
    static let ink = Theme.hex(0xF7F4EE)
    static let muted = Theme.hex(0xB4B4BC)
    static let danger = Theme.hex(0xC8293E)
    static let radius: CGFloat = 12
    static let pad: CGFloat = 18
    static let gap: CGFloat = 24
    static let border: CGFloat = 1
}

extension View {
    /// Low-contrast dusk instrument panel with a thin readable edge.
    func settingsCard(border: Color = SettingsStyle.ink, padding: CGFloat = SettingsStyle.pad) -> some View {
        self.padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SettingsStyle.card, in: RoundedRectangle(cornerRadius: SettingsStyle.radius))
            .overlay(RoundedRectangle(cornerRadius: SettingsStyle.radius).stroke(border, lineWidth: SettingsStyle.border))
    }


}

/// Minimal star signal; settings no longer carries the retired blueprint skyline.
struct SettingsSkyHeader: View {
    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height
            let step: CGFloat = 8
            func snap(_ v: CGFloat) -> CGFloat { (v / step).rounded(.down) * step }
            context.fill(Path(CGRect(x: 0, y: 0, width: w, height: h)), with: .color(SettingsStyle.bg))
            let stars: [(CGFloat, CGFloat)] = [(0.06, 0.14), (0.2, 0.26), (0.38, 0.1), (0.58, 0.22), (0.74, 0.12), (0.9, 0.24)]
            for s in stars {
                let r = CGRect(x: snap(s.0 * w), y: snap(s.1 * h), width: 3, height: 3)
                context.fill(Path(r), with: .color(SettingsStyle.ink.opacity(0.42)))
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
            ridge([0.9, 0.84, 0.92, 0.82, 0.9, 0.94, 0.86, 0.8, 0.9, 0.84, 0.92], color: SettingsStyle.trim)
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

/// Dusk action with a 44pt target.
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
            let fg: Color = solid ? SettingsStyle.ink : (enabled ? SettingsStyle.ink : SettingsStyle.muted)
            HStack(spacing: 8) {
                SettingsPlay(color: fg)
                Text(title.uppercased()).font(AppFont.display(14)).tracking(14 * 0.08).foregroundStyle(fg)
            }
            .padding(.horizontal, compact ? 16 : 20).frame(minWidth: compact ? 52 : 88, maxWidth: fill ? .infinity : nil, minHeight: 52)
            .background(solid ? color : SettingsStyle.bg.opacity(0.7), in: RoundedRectangle(cornerRadius: SettingsStyle.radius))
            .overlay(RoundedRectangle(cornerRadius: SettingsStyle.radius).stroke(enabled ? SettingsStyle.ink.opacity(0.36) : SettingsStyle.ink.opacity(0.2), lineWidth: SettingsStyle.border))
            .contentShape(Rectangle())
        }.buttonStyle(.plain).disabled(!enabled)
    }
}

/// Dusk selectors with a teal active state.
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
                        .foregroundStyle(SettingsStyle.ink)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(on ? SettingsStyle.blue : SettingsStyle.bg.opacity(0.7), in: RoundedRectangle(cornerRadius: SettingsStyle.radius))
                        .overlay(RoundedRectangle(cornerRadius: SettingsStyle.radius).stroke(SettingsStyle.ink.opacity(0.32), lineWidth: SettingsStyle.border))
                        .contentShape(RoundedRectangle(cornerRadius: SettingsStyle.radius))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(title)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
}
