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

    static func view(_ path: String) -> Image {
        image(path).map(Image.init(platform:)) ?? Image(systemName: "questionmark.square")
    }
}
