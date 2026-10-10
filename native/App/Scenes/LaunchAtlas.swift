import SpriteKit
import LandnamCore

/// Parses a web sprite sheet (`*-launch-sheet.json` + png) into SpriteKit textures with the
/// per-frame baked anchors, so the native cinematic uses the exact same art as the web one.
@MainActor
final class LaunchAtlas {
    struct Entry { let texture: SKTexture; let pixelSize: CGSize; let anchor: CGPoint }

    private(set) var entries: [String: Entry] = [:]
    private(set) var counts: [String: Int] = [:]
    private(set) var loops: Set<String> = []
    private(set) var scale: CGFloat = 0.5            // spriteScaleForAuthorUnits
    private(set) var attach: [String: CGPoint] = [:] // row -> author-unit offset (y-down)

    init?(sheet: String, png: String) {
        guard let url = Bundle.main.url(forResource: sheet, withExtension: "json", subdirectory: "Art/rockets/launch"),
              let data = try? Data(contentsOf: url),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let frames = root["frames"] as? [String: [String: Any]],
              let meta = root["meta"] as? [String: Any], let sz = meta["size"] as? [String: Double],
              let image = Art.image("rockets/launch/\(png).png") else { return nil }
        let sheetTex = SKTexture(image: image)
        sheetTex.filteringMode = .linear
        let sw = sz["w"] ?? 1, sh = sz["h"] ?? 1
        for (name, f) in frames {
            guard let fr = f["frame"] as? [String: Double], let sss = f["spriteSourceSize"] as? [String: Double],
                  let ap = f["anchorPx"] as? [String: Double] else { continue }
            let w = fr["w"] ?? 1, h = fr["h"] ?? 1
            // Atlas is y-down; SKTexture rects are normalised with a bottom-left origin.
            let rect = CGRect(x: (fr["x"] ?? 0) / sw, y: 1 - ((fr["y"] ?? 0) + h) / sh, width: w / sw, height: h / sh)
            let anchor = CGPoint(x: ((ap["x"] ?? 0) - (sss["x"] ?? 0)) / w, y: 1 - ((ap["y"] ?? 0) - (sss["y"] ?? 0)) / h)
            entries[name] = Entry(texture: SKTexture(rect: rect, in: sheetTex), pixelSize: CGSize(width: w, height: h), anchor: anchor)
        }
        if let anims = root["animations"] as? [String: [String]] { for (k, v) in anims { counts[k] = v.count } }
        if let l = root["landnam"] as? [String: Any] {
            scale = CGFloat((l["spriteScaleForAuthorUnits"] as? Double) ?? 0.5)
            if let a = l["animations"] as? [String: [String: Any]] { loops = Set(a.filter { $0.value["loop"] as? Bool == true }.keys) }
            if let rows = l["rows"] as? [String: [String: Any]] {
                for (row, v) in rows { if let at = v["attachAuthor"] as? [String: Double] { attach[row] = CGPoint(x: at["x"] ?? 0, y: at["y"] ?? 0) } }
            }
        }
        if entries.isEmpty { return nil }
    }

    func entry(_ f: SpriteChain.Frame) -> Entry? { entries["\(f.anim)/" + String(format: "%02d", f.index)] }
    func fx(_ anim: String, index: Int) -> Entry? { entries["\(anim)/" + String(format: "%02d", index)] }
}
