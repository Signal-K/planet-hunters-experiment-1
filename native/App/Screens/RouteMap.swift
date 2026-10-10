import SwiftUI
import LandnamCore

/// Minimal route map for Launch review (mirrors web PixiGalaxyMap in the review, SSL-426):
/// orbit rings, the bodies this contract can reach, the picked one highlighted.
/// Each reachable body is a 44pt tap target that switches the destination.
struct RouteMap: View {
    let targets: [Target]
    let pickedId: String
    let maxOrbit: Int
    let onPick: (String) -> Void

    private static let angles: [String: Double] = [
        "mercury": 200, "venus": 320, "earth": 70, "mars": 140,
        "eros": 45, "bennu": 170, "itokawa": 10, "ryugu": 230, "vesta": 310, "psyche": 85,
        "ceres": 190, "lutetia": 285, "jupiter": 30, "saturn": 340, "neptune": 120,
    ]
    private let rings = 8

    private func angle(_ id: String) -> Double {
        Self.angles[id] ?? Double(id.unicodeScalars.reduce(7) { ($0 &* 31 &+ Int($1.value)) % 360 })
    }

    private func point(_ t: Target, in size: CGSize) -> CGPoint {
        let c = CGPoint(x: size.width / 2, y: size.height / 2)
        let r = radius(t.orbit, in: size)
        let a = angle(t.id) * .pi / 180
        return CGPoint(x: c.x + r * cos(a), y: c.y + r * sin(a))
    }

    private func radius(_ orbit: Int, in size: CGSize) -> CGFloat {
        let outer = min(size.width, size.height) / 2 - 14
        return outer * CGFloat(orbit) / CGFloat(rings)
    }

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            ZStack {
                Canvas { ctx, size in
                    let c = CGPoint(x: size.width / 2, y: size.height / 2)
                    ctx.fill(Path(ellipseIn: CGRect(x: c.x - 6, y: c.y - 6, width: 12, height: 12)), with: .color(Theme.blueBright))
                    for orbit in 1...rings {
                        let r = radius(orbit, in: size)
                        let reachable = orbit <= maxOrbit
                        ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)),
                                   with: .color(reachable ? Theme.blue.opacity(0.55) : Theme.ink.opacity(0.14)),
                                   lineWidth: reachable ? 1.5 : 1)
                    }
                }
                ForEach(targets) { t in
                    let picked = t.id == pickedId
                    let p = point(t, in: size)
                    Button { onPick(t.id) } label: {
                        VStack(spacing: 2) {
                            Circle().fill(picked ? Theme.blue : Theme.paper)
                                .frame(width: picked ? 16 : 12, height: picked ? 16 : 12)
                                .overlay(Circle().stroke(Theme.ink, lineWidth: 2))
                            if picked { Text(t.name.uppercased()).font(AppFont.display(14)).tracking(0.8).foregroundStyle(Theme.ink)
                                .padding(.horizontal, 6).background(Theme.paper.opacity(0.9), in: Capsule()) }
                        }
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Destination \(t.name)")
                    .position(x: p.x, y: min(max(p.y, 22), size.height - 22))
                }
            }
        }
        .frame(height: 200)
        .background(Theme.paper)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 2))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
