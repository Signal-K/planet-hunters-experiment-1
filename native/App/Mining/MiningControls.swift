import SwiftUI
import LandnamCore

/// Mining steering pad, bottom-left, in the rover d-pad style (SSL-536).
/// Up/down hold altitude, left/right slide the ship along the sky.
struct MiningDPad: View {
    var onAltitude: (Double) -> Void
    var onSteer: (Double) -> Void
    var obstacleAhead = false
    var tile: CGFloat = 52
    private static let ink = Theme.hex(0x1A2A3C)
    private static let paper = Theme.hex(0xF4F1EA)
    private static let pressed = Theme.hex(0xD7E6F7)

    var body: some View {
        VStack(spacing: 0) {
            pad("chevron.up", obstacleAhead ? "Climb, obstacle ahead" : "Climb", corners: [.topLeading, .topTrailing], emphasized: obstacleAhead) { onAltitude($0 ? -1 : 0) }
            HStack(spacing: 0) {
                pad("chevron.left", "Move left", corners: [.topLeading, .bottomLeading]) { onSteer($0 ? -1 : 0) }
                Color.clear.frame(width: tile, height: tile).accessibilityHidden(true)
                pad("chevron.right", "Move right", corners: [.topTrailing, .bottomTrailing]) { onSteer($0 ? 1 : 0) }
            }
            pad("chevron.down", "Descend", corners: [.bottomLeading, .bottomTrailing]) { onAltitude($0 ? 1 : 0) }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Steer")
    }

    private func pad(_ icon: String, _ label: String, corners: Set<Corner>, emphasized: Bool = false, _ hold: @escaping (Bool) -> Void) -> some View {
        HoldPad(icon: icon, tile: tile, corners: corners, emphasized: emphasized, hold: hold)
            .accessibilityLabel(label)
    }

    enum Corner { case topLeading, topTrailing, bottomLeading, bottomTrailing }

    private struct HoldPad: View {
        let icon: String
        let tile: CGFloat
        let corners: Set<Corner>
        var emphasized = false
        let hold: (Bool) -> Void
        @State private var down = false

        var body: some View {
            let shape = UnevenRoundedRectangle(
                topLeadingRadius: corners.contains(.topLeading) ? 6 : 0,
                bottomLeadingRadius: corners.contains(.bottomLeading) ? 6 : 0,
                bottomTrailingRadius: corners.contains(.bottomTrailing) ? 6 : 0,
                topTrailingRadius: corners.contains(.topTrailing) ? 6 : 0)
            Image(systemName: icon)
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(down || emphasized ? Glass.cyan : .white)
                .frame(width: tile, height: tile)
                .glowPanel(shape, active: down || emphasized)
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
            .foregroundStyle(Glass.ink)
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(.white.opacity(0.14))
                    Capsule()
                        .fill(low ? AnyShapeStyle(Self.brick) : AnyShapeStyle(Glass.cyan))
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
        .glowPanel(RoundedRectangle(cornerRadius: 6), active: low)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Laser capacity \(charge) of \(cap)")
    }
}


/// Cargo hold chip: tap to jettison ordinary ore picked up by mistake. Event rewards are protected.
struct CargoMenu: View {
    let field: MiningField
    let onJettison: (String, Bool) -> Void
    private static let ink = Theme.hex(0x1A2A3C)

    var body: some View {
        Menu {
            if field.cargo.isEmpty {
                Text("Hold empty")
            }
            ForEach(field.cargo.keys.sorted(), id: \.self) { id in
                let n = field.cargo[id, default: 0]
                let name = Minerals.byId[id]?.name ?? id
                if SkyEvents.protectedRewardIds.contains(id) {
                    Text("EVENT REWARD · \(name) · PROTECTED")
                } else {
                    Button("Jettison 1 \(name)") { onJettison(id, false) }
                    if n > 1 { Button("Jettison all \(name) (\(n))", role: .destructive) { onJettison(id, true) } }
                }
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "shippingbox.fill")
                Text("HOLD \(field.cargoUnits)/\(field.cargoCapacity)").tracking(1.1)
                Image(systemName: "arrow.down.to.line")
            }
            .font(AppFont.display(14))
            .foregroundStyle(field.isFull ? Glass.cyan : Glass.ink)
            .padding(.horizontal, 12).frame(minHeight: 44)
            .glowPanel(RoundedRectangle(cornerRadius: 6), active: field.isFull)
        }
        .accessibilityLabel("Cargo hold \(field.cargoUnits) of \(field.cargoCapacity). Jettison cargo.")
    }
}


/// Out There style panels for the mining HUD: near-black frosted fill, glowing white outline, no solid colour blocks.
private struct GlassHudKey: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    var glassHud: Bool {
        get { self[GlassHudKey.self] }
        set { self[GlassHudKey.self] = newValue }
    }
}

enum Glass {
    static let ink = Theme.hex(0xEEF2F6)
    static let cyan = Theme.hex(0x9FD6E4)
}

extension View {
    func glowPanel<S: InsettableShape>(_ shape: S, active: Bool = false) -> some View {
        self
            .background(shape.fill(LinearGradient(colors: [Theme.hex(0x0A101C, active ? 0.6 : 0.78), Theme.hex(0x04080F, 0.88)], startPoint: .topLeading, endPoint: .bottomTrailing)))
            .overlay(shape.stroke(.white.opacity(0.92), lineWidth: 1.5))
            .shadow(color: .white.opacity(active ? 0.7 : 0.3), radius: active ? 12 : 7)
    }
}

/// Top-left settings gear in the glass style (the mining screen has no clock or currency).
struct GlassGear: View {
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: "gearshape.fill").font(.system(size: 18, weight: .bold)).foregroundStyle(Glass.ink)
                .frame(width: 44, height: 44).contentShape(Rectangle())
                .glowPanel(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain).accessibilityLabel("Settings")
    }
}
