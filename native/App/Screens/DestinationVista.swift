import SwiftUI
import LandnamCore

/// Cream used by the debrief and mission cards. Matches web `--ln-world-hull-lit`.
enum RecordCream {
    static let paper = Theme.hex(0xFAF7F0)
}

/// Peaceful sky and ground colours. Mirrors `web/lib/mining/destinationVista.ts`:
/// orange, yellow, green and purple shift toward blueprint blue.
enum Peaceful {
    static func channels(_ n: UInt32) -> (Int, Int, Int) {
        (Int((n >> 16) & 255), Int((n >> 8) & 255), Int(n & 255))
    }

    static func mix(_ a: UInt32, _ b: UInt32, _ t: Double) -> UInt32 {
        let k = max(0, min(1, t))
        func ch(_ n: UInt32, _ shift: UInt32) -> Double { Double((n >> shift) & 255) }
        func lerp(_ ca: Double, _ cb: Double) -> UInt32 { UInt32((ca + (cb - ca) * k).rounded()) }
        return lerp(ch(a, 16), ch(b, 16)) << 16 | lerp(ch(a, 8), ch(b, 8)) << 8 | lerp(ch(a, 0), ch(b, 0))
    }

    static func forbidden(_ n: UInt32) -> Bool {
        let (r, g, b) = channels(n)
        let green = g > r + 10 && g > b + 10 && g > 70
        let orange = r - b > 60 && g > b + 20 && r > 140
        let yellow = r > 180 && g > 150 && b < 130
        let purple = Double(b) > Double(r) * 0.85 && b > g + 18 && r > g - 5 && b > 70 && g < 180
        return green || orange || yellow || purple
    }

    static func color(_ n: UInt32) -> UInt32 { forbidden(n) ? mix(n, 0x31425B, 0.72) : n }

    static func sky(_ n: UInt32) -> UInt32 {
        let p = color(n)
        let (r, g, b) = channels(p)
        if Double(r + g + b) / 3 < 28 { return mix(p, 0x2A3C52, 0.62) }
        return p
    }

    static func ground(_ tint: UInt32) -> UInt32 { mix(color(tint), 0x1A2836, 0.28) }

    static func surface(width: CGFloat, height: CGFloat, card: Bool) -> CGFloat {
        if card { return 0.64 }
        if height > width { return 0.36 }
        if height < 520 { return 0.62 }
        return 0.72
    }
}

@MainActor
enum CrateArt {
    private static var cache: [String: PlatformImage] = [:]

    static func file(for mineral: String) -> String {
        let id = mineral.lowercased()
        let pairs = [
            ("platin", "exchange-crate-4-platinum.png"),
            ("silver", "exchange-crate-5-silver.png"),
            ("ice", "exchange-crate-6-ice.png"),
            ("water", "exchange-crate-6-ice.png"),
            ("ammonia", "exchange-crate-6-ice.png"),
            ("nickel", "exchange-crate-2-nickel.png"),
            ("iron", "exchange-crate-1-iron.png"),
            ("hematite", "exchange-crate-1-iron.png"),
            ("regolith", "exchange-crate-1-iron.png"),
            ("cobalt", "exchange-crate-3-steel-blue.png"),
            ("steel", "exchange-crate-3-steel-blue.png"),
        ]
        return pairs.first { id.contains($0.0) }?.1 ?? "exchange-crate-3-steel-blue.png"
    }

    static func image(_ file: String) -> PlatformImage? {
        if let hit = cache[file] { return hit }
        guard let src = Art.image("exchange/\(file)") else { return nil }
        let painted = recolor(src) ?? src
        cache[file] = painted
        return painted
    }

    /// Yellow, orange and green label pixels become blueprint blue or cool grey.
    private static func recolor(_ src: PlatformImage) -> PlatformImage? {
        #if canImport(UIKit)
        guard let cg = src.cgImage else { return src }
        #else
        guard let cg = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return src }
        #endif
        let w = cg.width, h = cg.height
        var bytes = [UInt8](repeating: 0, count: w * h * 4)
        guard let ctx = CGContext(
            data: &bytes, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return src }
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
        for i in stride(from: 0, to: bytes.count, by: 4) {
            let r = Int(bytes[i]), g = Int(bytes[i + 1]), b = Int(bytes[i + 2])
            let yellow = r > 180 && g > 150 && b < 130
            let orange = r - b > 60 && g > b + 20 && r > 140
            let green = g > r + 15 && g > b + 15 && g > 80
            let purple = Double(b) > Double(r) * 0.85 && b > g + 18 && r > g - 5 && b > 70 && g < 180
            if yellow || orange || purple {
                bytes[i] = 0x1F; bytes[i + 1] = 0x78; bytes[i + 2] = 0xC1
            } else if green {
                bytes[i] = 0x8A; bytes[i + 1] = 0x9A; bytes[i + 2] = 0xAA
            }
        }
        guard let out = ctx.makeImage() else { return src }
        #if canImport(UIKit)
        return UIImage(cgImage: out)
        #else
        return NSImage(cgImage: out, size: NSSize(width: w, height: h))
        #endif
    }
}

/// Destination landscape from the shared laser-palette layout, plus cargo crates on the debrief.
struct DestinationVista: View {
    var targetId: String
    var type: TargetType
    var archetype: TargetArchetype?
    var crates: [(file: String, count: Int)] = []
    var card = false

    var body: some View {
        let palette = LaserPalette.resolve(id: targetId, type: type, archetype: archetype)
        let layout = Landscape.layout(palette.landscape, key: targetId)
        let skyTop = Peaceful.sky(palette.skyTop)
        let skyHorizon = Peaceful.sky(palette.skyHorizon)
        let ground = Peaceful.ground(layout.tint)
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let surface = h * Peaceful.surface(width: w, height: h, card: card)
            let scale = card ? max(0.34, w / 920) : max(0.55, min(1.15, w / 1100))
            let period = CGFloat(layout.period) * scale
            let copies = Int((w / max(period, 1)).rounded(.up)) + 1
            ZStack(alignment: .topLeading) {
                LinearGradient(colors: [Theme.hex(skyTop), Theme.hex(skyHorizon)], startPoint: .top, endPoint: .bottom)
                Rectangle()
                    .fill(Theme.hex(ground))
                    .frame(height: max(0, h - surface))
                    .position(x: w / 2, y: surface + (h - surface) / 2)
                ForEach(0..<min(card ? 10 : 22, 22), id: \.self) { i in
                    Rectangle()
                        .fill(Theme.hex(0xD5E4F2).opacity(0.35 + Double(i % 3) * 0.18))
                        .frame(width: i % 5 == 0 ? 2 : 1, height: i % 5 == 0 ? 2 : 1)
                        .position(x: CGFloat((i * 97) % 1000) / 1000 * w, y: CGFloat((i * 53) % 700) / 1000 * surface)
                }
                ForEach(0..<copies, id: \.self) { copy in
                    ForEach(Array(layout.pieces.enumerated()), id: \.offset) { _, piece in
                        terrain(piece, copy: copy, period: period, scale: scale, surface: surface, tint: layout.tint)
                    }
                }
                if !card { crateRow(width: w, surface: surface) }
            }
        }
        .accessibilityHidden(true)
    }

    @ViewBuilder private func terrain(_ piece: Landscape.Piece, copy: Int, period: CGFloat, scale: CGFloat, surface: CGFloat, tint: UInt32) -> some View {
        let size = pieceSize(piece.kind)
        let dw = size.0 * scale * CGFloat(piece.scale)
        let dh = size.1 * scale * CGFloat(piece.scale)
        let x = CGFloat(copy) * period + CGFloat(piece.x) * scale
        if let img = Art.image("mining/terrain_\(piece.kind).png") {
            Image(platform: img)
                .interpolation(.none)
                .resizable()
                .frame(width: dw, height: dh)
                .colorMultiply(Theme.hex(tint))
                .scaleEffect(x: piece.flip ? -1 : 1, y: 1)
                .position(x: x, y: surface - dh / 2 + 4)
        }
    }

    private func pieceSize(_ kind: String) -> (CGFloat, CGFloat) {
        switch kind {
        case "mountain": (128, 112)
        case "strata": (128, 56)
        default: (128, 48)
        }
    }

    @ViewBuilder private func crateRow(width: CGFloat, surface: CGFloat) -> some View {
        let crateH = min(128, max(84, surface * 0.55))
        let start = width > 520 ? width * 0.08 : width * 0.1
        let placed = placedCrates(start: start, height: crateH)
        ForEach(Array(placed.enumerated()), id: \.offset) { _, item in
            if let img = CrateArt.image(item.file) {
                Image(platform: img)
                    .interpolation(.none)
                    .resizable()
                    .frame(width: item.w, height: crateH)
                    .position(x: item.x, y: surface - crateH / 2 + 8 - CGFloat(item.index) * 3)
            }
        }
    }

    private func placedCrates(start: CGFloat, height: CGFloat) -> [(file: String, x: CGFloat, w: CGFloat, index: Int)] {
        var x = start
        var out: [(file: String, x: CGFloat, w: CGFloat, index: Int)] = []
        for stack in crates.prefix(4) {
            let img = CrateArt.image(stack.file)
            let aspect = (img?.size.width ?? 64) / max(img?.size.height ?? 48, 1)
            let cw = height * aspect
            let count = min(5, max(1, stack.count))
            for i in 0..<count {
                out.append((stack.file, x + CGFloat(i) * cw * 0.34 + cw / 2, cw, i))
            }
            x += cw + max(cw * 0.35, 18) + CGFloat(count) * cw * 0.18
        }
        return out
    }
}

struct CreamCard<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 16) { content }
            .padding(28)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RecordCream.paper)
            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
            .overlay(alignment: .top) { Rectangle().fill(Theme.blue).frame(height: 6) }
    }
}

/// Counts a payout up once. Reduced motion shows the final figure immediately.
struct AnimatedFrancs: View {
    let value: Int
    @State private var shown = 0
    @Environment(\.accessibilityReduceMotion) private var reduce

    var body: some View {
        Text((shown < 0 ? "−" : "+") + Economy.format(francs: abs(shown)))
            .font(AppFont.display(32))
            .foregroundStyle(value < 0 ? Theme.crimson : Theme.blue)
            .onAppear(perform: run)
            .onChange(of: value) { _, _ in run() }
    }

    private func run() {
        if reduce || value == 0 { shown = value; return }
        shown = 0
        let steps = 24
        for step in 1...steps {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(step) * 0.04) {
                let t = Double(step) / Double(steps)
                let eased = 1 - pow(1 - t, 3)
                shown = Int((Double(value) * eased).rounded())
            }
        }
    }
}
