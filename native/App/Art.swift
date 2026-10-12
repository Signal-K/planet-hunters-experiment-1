import SwiftUI

#if canImport(UIKit)
import UIKit
typealias PlatformImage = UIImage
extension Image { init(platform: PlatformImage) { self.init(uiImage: platform) } }
#else
import AppKit
typealias PlatformImage = NSImage
extension Image { init(platform: PlatformImage) { self.init(nsImage: platform) } }
#endif

/// Loads bundled web art from `Resources/Art/<path>` (copied from `web/public`).
@MainActor
enum Art {
    private static var cache: [String: PlatformImage] = [:]

    static func image(_ path: String) -> PlatformImage? {
        if let hit = cache[path] { return hit }
        let ns = path as NSString
        let name = (ns.lastPathComponent as NSString).deletingPathExtension
        let ext = ns.pathExtension.isEmpty ? "png" : ns.pathExtension
        let dir = ns.deletingLastPathComponent
        guard let url = Bundle.main.url(forResource: name, withExtension: ext, subdirectory: dir.isEmpty ? "Art" : "Art/\(dir)"),
              let img = Self.load(url) else { return nil }
        cache[path] = img
        return img
    }

    private static func load(_ url: URL) -> PlatformImage? {
        #if canImport(UIKit)
        UIImage(contentsOfFile: url.path)
        #else
        NSImage(contentsOf: url)
        #endif
    }

    private static var tileCache: [String: Image] = [:]

    /// A tileable sprite whose point size is `scale` times its pixel size, for `.resizable(resizingMode: .tile)` at a whole-number pixel scale.
    static func tiled(_ path: String, scale: CGFloat) -> Image {
        let key = "\(path)@\(scale)"
        if let hit = tileCache[key] { return hit }
        #if canImport(UIKit)
        guard let src = image(path), let cg = src.cgImage else { return view(path) }
        let img = Image(platform: UIImage(cgImage: cg, scale: 1 / scale, orientation: .up))
        tileCache[key] = img
        return img
        #else
        return view(path)
        #endif
    }

    static func view(_ path: String) -> Image {
        image(path).map(Image.init(platform:)) ?? Image(systemName: "questionmark.square")
    }
}
