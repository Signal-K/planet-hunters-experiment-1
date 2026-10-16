import SwiftUI
import ImageIO

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
        guard let src = UIImage(contentsOfFile: url.path) else { return nil }
        return decode(url).map { UIImage(cgImage: $0, scale: src.scale, orientation: .up) } ?? src
        #else
        guard let src = NSImage(contentsOf: url) else { return nil }
        return decode(url).map { NSImage(cgImage: $0, size: src.size) } ?? src
        #endif
    }

    /// Decodes once into the renderer's native premultiplied BGRA bitmap. A lazily decoded PNG/JPEG is re-decoded
    /// and channel-swizzled on every draw, which made the 60 fps base Canvas burn CPU on JPEG decode every frame.
    private static func decode(_ url: URL) -> CGImage? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let raw = CGImageSourceCreateImageAtIndex(source, 0, [kCGImageSourceShouldCacheImmediately: true] as CFDictionary),
              let ctx = CGContext(data: nil, width: raw.width, height: raw.height, bitsPerComponent: 8, bytesPerRow: 0,
                                  space: CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue)
        else { return nil }
        ctx.interpolationQuality = .none
        ctx.draw(raw, in: CGRect(x: 0, y: 0, width: raw.width, height: raw.height))
        return ctx.makeImage()
    }

    private static var drawCache: [String: Image] = [:]

    /// A decoded sprite as a SwiftUI `Image`, built once, for drawing many times a second in a `Canvas`.
    static func drawable(_ path: String) -> Image? {
        if let hit = drawCache[path] { return hit }
        guard let img = image(path) else { return nil }
        #if canImport(UIKit)
        let cg = img.cgImage
        #else
        let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil)
        #endif
        let out = cg.map { Image(decorative: $0, scale: 1) } ?? Image(platform: img)
        drawCache[path] = out
        return out
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
