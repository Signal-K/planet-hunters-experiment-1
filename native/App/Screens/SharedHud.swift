import SwiftUI
import LandnamCore

/// Cog and clock chips shared by the base and flight scenes (top-left).
struct HudGearClock: View {
    let onSettings: () -> Void
    var body: some View {
        HStack(spacing: 8) {
            Button(action: onSettings) {
                Image(systemName: "gearshape.fill").font(.system(size: 18, weight: .black)).foregroundStyle(Theme.hudInk)
                    .frame(width: 36, height: 36).contentShape(Rectangle())
                    .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
            }
            .buttonStyle(.plain).accessibilityLabel("Settings")
            TimelineView(.periodic(from: .now, by: 30)) { ctx in
                HStack(spacing: 6) {
                    Image(systemName: "clock").font(.system(size: 16, weight: .bold))
                    Text(ctx.date.formatted(date: .omitted, time: .shortened)).font(AppFont.mono(14))
                }
                .foregroundStyle(Theme.hudInk)
                .padding(.horizontal, 8)
                .frame(minWidth: 44, minHeight: 36)
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
            }
            .accessibilityLabel("Clock")
        }
    }
}

/// Francs and cargo chips shared by the base and flight scenes (top-right).
struct HudChips: View {
    let francs: Int
    var body: some View {
        HStack(spacing: 8) {
            Text(Economy.format(francs: francs)).font(AppFont.mono(14)).foregroundStyle(Theme.hudInk)
                .padding(.horizontal, 8).frame(minWidth: 44, minHeight: 36)
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
                .accessibilityLabel("Francs")
            Image(systemName: "cube.fill").font(.system(size: 18, weight: .black)).foregroundStyle(Theme.hudInk)
                .frame(width: 36, height: 36)
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.hudPanel))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.hudInk, lineWidth: 1))
                .accessibilityLabel("Cargo")
        }
    }
}
