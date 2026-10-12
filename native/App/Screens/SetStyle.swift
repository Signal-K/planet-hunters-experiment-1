import SwiftUI

/// Shared panel style (docs/settings-style.md): pale blue-grey page, white cards with a 2px black border, no shadow.
/// Mirrors the web `--set-*` tokens. Used by Settings, the mining controls guide, the Exchange and the hangar build config.
enum SetStyle {
    static let bg = Theme.hex(0xEEF2F6)
    static let card = Color.white
    static let ink = Color.black
    static let muted = Theme.hex(0x4A5568)
    static let danger = Theme.hex(0xC8293E)
    static let radius: CGFloat = 10
    static let pad: CGFloat = 20
    static let gap: CGFloat = 24
    static let maxWidth: CGFloat = 640
    static let border: CGFloat = 2
}

extension View {
    /// White card, 2px black border, 10pt radius, 20pt padding, no shadow.
    func setCard(border: Color = SetStyle.ink, padding: CGFloat = SetStyle.pad) -> some View {
        self.padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SetStyle.card, in: RoundedRectangle(cornerRadius: SetStyle.radius))
            .overlay(RoundedRectangle(cornerRadius: SetStyle.radius).stroke(border, lineWidth: SetStyle.border))
    }

    /// Centred content column, 640pt max.
    func setColumn(wide: Bool = false) -> some View {
        frame(maxWidth: wide ? .infinity : SetStyle.maxWidth).frame(maxWidth: .infinity)
    }
}

/// Black uppercase wide-tracked heading.
struct SetHeading: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(AppFont.display(14)).tracking(14 * 0.14).foregroundStyle(SetStyle.ink)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Bold mixed-case card title over a slate uppercase status line.
struct SetRowText: View {
    let title: String
    let status: String
    var titleColor: Color = SetStyle.ink
    var statusColor: Color = SetStyle.muted
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(AppFont.display(16, "Bold")).foregroundStyle(titleColor)
            Text(status.uppercased()).font(AppFont.display(14, "Bold")).tracking(14 * 0.08).foregroundStyle(statusColor)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// Right-pointing black triangle drawn as a pixel stair, used on action buttons.
struct SetPlay: View {
    var color: Color = SetStyle.ink
    var body: some View {
        VStack(spacing: 0) {
            ForEach([2, 4, 6, 8, 6, 4, 2], id: \.self) { w in
                Rectangle().fill(color).frame(width: CGFloat(w) * 1.25, height: 2).frame(width: 10, alignment: .leading)
            }
        }.frame(width: 10, height: 14)
    }
}

/// Uppercase action: 2px border, 10pt radius, 44pt target, play triangle. `solid` fills it black.
struct SetButton: View {
    let title: String
    var color: Color = SetStyle.ink
    var solid = false
    var enabled = true
    var fill = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            let fg: Color = solid ? SetStyle.card : (enabled ? color : SetStyle.muted)
            HStack(spacing: 8) {
                SetPlay(color: fg)
                Text(title.uppercased()).font(AppFont.display(14)).tracking(14 * 0.08).foregroundStyle(fg)
            }
            .padding(.horizontal, 16).frame(minWidth: 88, maxWidth: fill ? .infinity : nil, minHeight: 44)
            .background(solid ? color : SetStyle.card, in: RoundedRectangle(cornerRadius: SetStyle.radius))
            .overlay(RoundedRectangle(cornerRadius: SetStyle.radius).stroke(enabled ? color : SetStyle.ink, lineWidth: SetStyle.border))
            .contentShape(Rectangle())
        }.buttonStyle(.plain).disabled(!enabled)
    }
}

/// Outlined pills; the selected one is solid black with white text.
struct SetSegment: View {
    let options: [String]
    let selected: Int
    let onSelect: (Int) -> Void
    var body: some View {
        HStack(spacing: 8) {
            ForEach(Array(options.enumerated()), id: \.offset) { i, title in
                let on = i == selected
                Button { onSelect(i) } label: {
                    Text(title.uppercased()).font(AppFont.display(14)).tracking(14 * 0.08)
                        .foregroundStyle(on ? SetStyle.card : SetStyle.ink)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(on ? SetStyle.ink : SetStyle.card, in: Capsule())
                        .overlay(Capsule().stroke(SetStyle.ink, lineWidth: SetStyle.border))
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(title)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
}

/// Full-bleed screen header: 44pt square back chevron and a trailing balance.
struct SetHeader: View {
    var back: (() -> Void)?
    var trailing: String?
    var body: some View {
        HStack(spacing: 8) {
            if let back {
                Button(action: back) {
                    Image(systemName: "chevron.left").font(.system(size: 20, weight: .heavy)).foregroundStyle(SetStyle.ink)
                        .frame(width: 44, height: 44)
                        .background(SetStyle.card, in: RoundedRectangle(cornerRadius: SetStyle.radius))
                        .overlay(RoundedRectangle(cornerRadius: SetStyle.radius).stroke(SetStyle.ink, lineWidth: SetStyle.border))
                }.buttonStyle(.plain).accessibilityLabel("Back")
            }
            Spacer(minLength: 0)
            if let trailing { Text(trailing).font(AppFont.display(18)).foregroundStyle(SetStyle.ink) }
        }
        .padding(.horizontal, 16).padding(.vertical, 8).frame(minHeight: 60)
        .background(SetStyle.bg)
        .overlay(alignment: .bottom) { Rectangle().fill(SetStyle.ink).frame(height: SetStyle.border) }
    }
}
