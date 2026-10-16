import Testing
import SwiftUI
import LandnamCore
@testable import Landnam

/// The intro's states, rendered headless: a new player on each landscape, and a returning player.
/// Also pins that the landscape copy loads from the shared `biome-pitch.json` the web screen reads.
@MainActor
struct IntroSnapshotTests {
    @Test func landscapeCopyComesFromTheSharedFile() throws {
        let pitch = try #require(BiomePitch.shared)
        #expect(pitch.heading == "Choose where to build")
        #expect(Set(pitch.biomes.keys) == ["mountains", "desert", "tundra", "coast"])
        #expect(pitch.biomes["mountains"]?.label == "Steppe")
        for entry in pitch.biomes.values { #expect(!entry.tagline.isEmpty && !entry.trait.isEmpty) }
        let text = pitch.biomes.values.map { "\($0.label) \($0.tagline) \($0.trait)" }.joined() + pitch.heading + pitch.lede + pitch.note
        #expect(!text.lowercased().contains("commander"))
    }

    @Test func rendersEveryState() throws {
        AppFont.register()
        let dir = ProcessInfo.processInfo.environment["SNAPSHOT_DIR"] ?? NSTemporaryDirectory()
        var returning = GameState(); returning.player.missionsDone = 3; returning.player.francs = 4200; returning.player.earthBiome = "tundra"
        let states: [(String, GameState, CGSize)] = [
            ("intro-new-phone", GameState(), CGSize(width: 402, height: 874)),
            ("intro-returning-phone", returning, CGSize(width: 402, height: 874)),
            ("intro-returning-landscape", returning, CGSize(width: 874, height: 402)),
        ]
        for (name, state, size) in states {
            let renderer = ImageRenderer(content: IntroScreen().environment(GameStore(state: state)).frame(width: size.width, height: size.height))
            renderer.scale = 2
            #if canImport(UIKit)
            let data = renderer.uiImage?.pngData()
            #else
            let data = renderer.nsImage.flatMap { $0.tiffRepresentation }.flatMap { NSBitmapImageRep(data: $0)?.representation(using: .png, properties: [:]) }
            #endif
            let png = try #require(data, "\(name) did not render")
            #expect(png.count > 10_000)
            try png.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
        }
    }
}
