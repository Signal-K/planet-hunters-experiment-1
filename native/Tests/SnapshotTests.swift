import Testing
import SwiftUI
import SpriteKit
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

    /// Renders every scene in SceneCatalog, or only the comma-separated ids in $SCENE.
    /// Scenes are fixtures, so this needs no loop, save file or network.
    @Test func catalog() throws {
        let only = ProcessInfo.processInfo.environment["SCENE"].map { Set($0.split(separator: ",").map(String.init)) }
        let scenes = SceneCatalog.all.filter { only?.contains($0.id) ?? true }
        try #require(!scenes.isEmpty, "no scene matches $SCENE")
        for s in scenes { try render(s.make(), size: s.size, name: s.id) }
    }
}

@MainActor
struct SceneSnapshotTests {
    private func write(_ scene: SKScene, name: String) throws {
        let view = SKView(frame: CGRect(origin: .zero, size: scene.size))
        view.presentScene(scene)
        let tex = try #require(view.texture(from: scene))
        let cg = tex.cgImage()
        #if canImport(UIKit)
        let data = UIImage(cgImage: cg).pngData()
        #else
        let data = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])
        #endif
        let dir = ProcessInfo.processInfo.environment["SNAPSHOT_DIR"] ?? NSTemporaryDirectory()
        try #require(data).write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }

    @Test func miningScene() throws {
        AppFont.register()
        let t = Targets.all.first { $0.type == .asteroid }!
        let f = MiningField(target: t, required: ["iron": 2, "silicon": 1], cargoCapacity: 6, laserTier: 1, seed: 3)
        let scene = MiningScene(field: f, size: CGSize(width: 402, height: 780))
        let view = SKView(frame: CGRect(origin: .zero, size: scene.size))
        view.presentScene(scene)
        scene.fire(at: CGPoint(x: 5, y: 5))
        try write(scene, name: "mining-phone")
    }

    @Test func flightScene() throws {
        AppFont.register()
        let scene = FlightScene(size: CGSize(width: 402, height: 780), returning: false, targetName: "Ceres")
        let view = SKView(frame: CGRect(origin: .zero, size: scene.size))
        view.presentScene(scene)
        scene.progress = 0.45
        try write(scene, name: "flight-phone")
    }
}

@MainActor
struct LaunchSnapshotTests {
    @Test func launchBeats() throws {
        AppFont.register()
        for (name, t) in [("launch-ignition", 3.2), ("launch-liftoff", 5.5), ("launch-separation", 7.0), ("launch-space", 11.5)] {
            let scene = LaunchScene(size: CGSize(width: 402, height: 780))
            let view = SKView(frame: CGRect(origin: .zero, size: scene.size))
            view.presentScene(scene)
            scene.seek(to: t)
            let tex = try #require(view.texture(from: scene))
            let cg = tex.cgImage()
            #if canImport(UIKit)
            let data = UIImage(cgImage: cg).pngData()
            #else
            let data = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])
            #endif
            let dir = ProcessInfo.processInfo.environment["SNAPSHOT_DIR"] ?? NSTemporaryDirectory()
            try #require(data).write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name)-phone.png"))
        }
    }
}

/// Structures must never stand in front of background rock, and the dock must float over empty foreground.
@MainActor
struct BaseClearanceTests {
    @Test func structuresAndDockClearOutcrops() throws {
        let sizes: [(CGSize, EdgeInsets)] = [
            (CGSize(width: 402, height: 874), EdgeInsets(top: 62, leading: 0, bottom: 34, trailing: 0)),
            (CGSize(width: 874, height: 402), EdgeInsets(top: 0, leading: 62, bottom: 21, trailing: 62)),
            (CGSize(width: 1000, height: 680), EdgeInsets()),
        ]
        for (size, insets) in sizes {
            var layout = BaseLayout(size: size, insets: insets, zones: .standard)
            layout.hasPlaced = true
            let roadBottom = size.height * (1 - CGFloat(layout.ground) + 0.045) + 11
            #expect(roadBottom <= layout.dockRect.minY, "dock covers the road at \(size)")
            for biome in EarthBiome.allCases {
                let bl = BiomeLayout(biome: biome, size: size, roadY: layout.roadY, exclusions: layout.exclusions)
                #expect(bl.groundFrame.maxY >= size.height - 0.5, "\(biome) ground stops short of the bottom at \(size)")
                for f in bl.props.map(\.frame) {
                    for i in BaseLayout.slots.indices { #expect(!layout.footprint(i).intersects(f), "\(biome) prop overlaps structure \(i) at \(size)") }
                    #expect(!layout.dockRect.intersects(f), "\(biome) prop behind dock at \(size)")
                }
            }
        }
    }
}
