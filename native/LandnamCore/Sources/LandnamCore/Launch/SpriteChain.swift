import Foundation

/// Stateless playback of back-to-back sprite animations (`ignition` then `burn`), the Swift
/// twin of web `ChainPlayer`. Only the final animation loops; a finished final one holds.
public enum SpriteChain {
    public struct Frame: Equatable, Sendable {
        public let anim: String
        public let index: Int
    }

    public static let fps = 24.0

    /// `row`: e.g. "booster-l"; `names`: ["ignition","burn"]; `counts`: frames per full anim key;
    /// `loops`: full anim keys that loop. `t`: seconds since the chain started.
    public static func frame(row: String, names: [String], counts: [String: Int], loops: Set<String>, t: Double) -> Frame? {
        guard !names.isEmpty, t >= 0 else { return nil }
        var f = Int(t * fps)
        for (i, name) in names.enumerated() {
            let key = "\(row)/\(name)"
            let n = max(1, counts[key] ?? 1)
            let last = i == names.count - 1
            if f < n { return Frame(anim: key, index: f) }
            if last { return Frame(anim: key, index: loops.contains(key) ? f % n : n - 1) }
            f -= n
        }
        return nil
    }
}
