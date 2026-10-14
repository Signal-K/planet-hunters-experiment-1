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
    static let pad: CGFloat = 20
    static let gap: CGFloat = 24
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
            .padding(.horizontal, compact ? 12 : 16).frame(minWidth: compact ? 0 : 88, maxWidth: fill ? .infinity : nil, minHeight: 44)
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
                        .frame(maxWidth: .infinity, minHeight: 44)
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

