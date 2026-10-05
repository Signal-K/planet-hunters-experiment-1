import Testing
import SwiftUI
import LandnamCore
@testable import Landnam

/// Headless render check: writes PNGs of the real screens so layout can be
/// reviewed without launching the app on anyone's desktop.
@MainActor
struct SnapshotTests {
    private func render<V: View>(_ view: V, size: CGSize, name: String) throws {
        AppFont.register()
        let renderer = ImageRenderer(content: view.frame(width: size.width, height: size.height))
        renderer.scale = 2
        #if canImport(UIKit)
        let data = renderer.uiImage?.pngData()
        #else
        let data = renderer.nsImage.flatMap { $0.tiffRepresentation }.flatMap { NSBitmapImageRep(data: $0)?.representation(using: .png, properties: [:]) }
        #endif
        let dir = ProcessInfo.processInfo.environment["SNAPSHOT_DIR"] ?? NSTemporaryDirectory()
        try #require(data).write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    private func store() -> GameStore {
        GameStore()
    }

    @Test func hubPhone() throws {
        try render(HubScreen().environment(store()), size: CGSize(width: 402, height: 874), name: "hub-phone")
    }

    @Test func hubDesktop() throws {
        try render(HubScreen().environment(store()), size: CGSize(width: 1000, height: 680), name: "hub-desktop")
    }
}
