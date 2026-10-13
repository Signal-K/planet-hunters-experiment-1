import SwiftUI
import LandnamCore

/// Mining steering pad, bottom-left, in the rover d-pad style (SSL-536).
/// Up/down hold altitude, left/right hold speed. Mirrors web `MiningDPad`.
struct MiningDPad: View {
    var onAltitude: (Double) -> Void
    var onSpeed: (Double) -> Void
    var tile: CGFloat = 52
    private static let ink = Theme.hex(0x1A2A3C)
    private static let paper = Theme.hex(0xF4F1EA)
    private static let pressed = Theme.hex(0xD7E6F7)

    var body: some View {
        VStack(spacing: 0) {
            pad("chevron.up", "Climb", corners: [.topLeading, .topTrailing]) { onAltitude($0 ? -1 : 0) }
            HStack(spacing: 0) {
                pad("chevron.left", "Slow down", corners: [.topLeading, .bottomLeading]) { onSpeed($0 ? -1 : 0) }
                Rectangle().fill(Self.paper).frame(width: tile, height: tile)
                    .overlay(VStack { Rectangle().fill(Self.ink).frame(height: 2); Spacer(); Rectangle().fill(Self.ink).frame(height: 2) })
                pad("chevron.right", "Speed up", corners: [.topTrailing, .bottomTrailing]) { onSpeed($0 ? 1 : 0) }
            }
            pad("chevron.down", "Descend", corners: [.bottomLeading, .bottomTrailing]) { onAltitude($0 ? 1 : 0) }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Steer")
    }

    private func pad(_ icon: String, _ label: String, corners: Set<Corner>, _ hold: @escaping (Bool) -> Void) -> some View {
        HoldPad(icon: icon, tile: tile, corners: corners, hold: hold)
            .accessibilityLabel(label)
    }

    enum Corner { case topLeading, topTrailing, bottomLeading, bottomTrailing }

    private struct HoldPad: View {
        let icon: String
        let tile: CGFloat
        let corners: Set<Corner>
        let hold: (Bool) -> Void
        @State private var down = false

        var body: some View {
            let shape = UnevenRoundedRectangle(
                topLeadingRadius: corners.contains(.topLeading) ? 14 : 0,
                bottomLeadingRadius: corners.contains(.bottomLeading) ? 14 : 0,
                bottomTrailingRadius: corners.contains(.bottomTrailing) ? 14 : 0,
                topTrailingRadius: corners.contains(.topTrailing) ? 14 : 0)
            Image(systemName: icon)
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(down ? Theme.hex(0x2F6FA8) : MiningDPad.ink)
                .frame(width: tile, height: tile)
                .background(shape.fill(down ? MiningDPad.pressed : MiningDPad.paper))
                .overlay(shape.stroke(MiningDPad.ink, lineWidth: 2))
                .contentShape(shape)
                .gesture(DragGesture(minimumDistance: 0)
                    .onChanged { _ in if !down { down = true; hold(true) } }
                    .onEnded { _ in down = false; hold(false) })
        }
    }
}

/// Laser capacity gauge near the fire button: live drain, brick-red low warning (no orange). Mirrors web `LaserGauge`.
struct LaserGauge: View {
    let charge: Int
    let cap: Int
    var charging = false
    var width: CGFloat = 260
    @State private var sweep: CGFloat = -1
    private var pct: Double { cap > 0 ? max(0, min(1, Double(charge) / Double(cap))) : 0 }
    private var low: Bool { pct <= 0.25 }
    private static let ink = Theme.hex(0x1A2A3C)
    private static let brick = Theme.hex(0x9B3B32)

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("LASER").font(AppFont.display(14)).tracking(1.1)
                Spacer()
                Text("\(charge)/\(cap)").font(AppFont.display(14)).monospacedDigit()
            }
            .foregroundStyle(Self.ink)
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.hex(0xC9D3DE))
                    Capsule()
                        .fill(low ? AnyShapeStyle(Self.brick) : AnyShapeStyle(LinearGradient(colors: [Theme.hex(0x2F6FA8), Theme.hex(0x3FB6C4)], startPoint: .leading, endPoint: .trailing)))
                        .frame(width: g.size.width * pct)
                        .animation(.linear(duration: 0.16), value: pct)
                    if charging {
                        LinearGradient(colors: [.clear, .white.opacity(0.75), .clear], startPoint: .leading, endPoint: .trailing)
                            .frame(width: g.size.width * 0.4)
                            .offset(x: sweep * g.size.width)
                            .onAppear {
                                sweep = -0.4
                                withAnimation(.linear(duration: 0.42).repeatForever(autoreverses: false)) { sweep = 1 }
                            }
                    }
                }
                .clipShape(Capsule())
            }
            .frame(height: 12)
            if low {
                Text(charge <= 0 ? "DEPLETED" : "LOW CHARGE").font(AppFont.display(14)).foregroundStyle(Self.brick)
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .frame(width: width)
        .background(RoundedRectangle(cornerRadius: 14).fill(Theme.hex(0xF4F1EA, 0.94)))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(low ? Self.brick : Self.ink, lineWidth: 2))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Laser capacity \(charge) of \(cap)")
    }
}
