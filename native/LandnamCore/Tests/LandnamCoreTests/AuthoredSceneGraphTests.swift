import Foundation
import Testing
@testable import LandnamCore

@Suite struct AuthoredSceneGraphTests {
    static let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../")

    @Test func generatedDeclarationIsTheSharedEngineFile() throws {
        let data = try Data(contentsOf: Self.repo.appendingPathComponent("shared/engine/authored-scenes.json").standardized)
        let shared = String(decoding: data, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
        #expect(AuthoredSceneDeclarations.json == shared)
        #expect(AuthoredSceneGraph.scenes.count == 24)
        #expect(AuthoredSceneGraph.scenes.allSatisfy { !$0.objects.isEmpty })
        #expect(AuthoredSceneGraph.scenes.flatMap(\.objects).allSatisfy { !($0.mechanics ?? []).isEmpty })
        #expect(Set(AuthoredSceneGraph.mechanics.map(\.id)).count == AuthoredSceneGraph.mechanics.count)
        #expect(AuthoredSceneGraph.mechanics.contains { $0.id == "community-research" })
        #expect(Set(AuthoredSceneGraph.scenes.map(\.route)).subtracting(Screen.allCases.map(\.rawValue)) == ["refinery"])
    }

    @Test(arguments: [(390.0, 844.0), (926.0, 428.0), (1440.0, 900.0)])
    func launchpadGeometryMatchesTheSharedContract(size: (Double, Double)) throws {
        let scene = try #require(AuthoredSceneGraph.scene("launchpad"))
        let objects = AuthoredSceneGraph.resolve(scene, width: size.0, height: size.1)
        let launch = try #require(objects.first { $0.object.id == "launch-action" })
        #expect(launch.frame == SceneRect(x: size.0 * 0.62, y: size.1 * 0.82, w: size.0 * 0.36, h: size.1 * 0.14))
        #expect(launch.layer == "controls")
        let back = try #require(objects.first { $0.object.id == "back-control" })
        #expect(back.frame == SceneRect(x: size.0 * 0.03, y: size.1 * 0.025, w: size.0 * 0.22, h: size.1 * 0.07))
        let tower = try #require(objects.first { $0.object.id == "service-tower" })
        #expect(tower.depth == 2 && tower.layer == "world")
    }

    @Test func safeAreaInsetsAreAppliedBeforeNormalizedLayout() throws {
        let scene = try #require(AuthoredSceneGraph.scene("launchpad"))
        let objects = AuthoredSceneGraph.resolve(scene, width: 390, height: 844, insets: SceneInsets(top: 47, bottom: 34))
        let launch = try #require(objects.first { $0.object.id == "launch-action" })
        #expect(abs(launch.frame.x - 241.8) < 0.000_001)
        #expect(abs(launch.frame.y - 672.66) < 0.000_001)
        #expect(abs(launch.frame.w - 140.4) < 0.000_001)
        #expect(abs(launch.frame.h - 106.82) < 0.000_001)
    }

    @Test func prefabLocalGeometryKeepsTheRocketOnTheMount() throws {
        let scene = try #require(AuthoredSceneGraph.scene("launchpad"))
        let parts = AuthoredSceneGraph.resolve(scene, width: 1104, height: 865, prefabRoot: "launchpad-complex")
        let rocket = try #require(parts.first { $0.object.id == "staged-rocket" })
        #expect(abs(rocket.frame.x + rocket.frame.w / 2 - 359.904) < 0.000_001)
        #expect(abs(rocket.frame.y + rocket.frame.h - 785.42) < 0.000_001)
        #expect(parts.first { $0.object.id == "launch-control" }?.object.action == "choose-mission")
        #expect(!parts.contains { $0.object.id == "mission-selector" })
    }
}
