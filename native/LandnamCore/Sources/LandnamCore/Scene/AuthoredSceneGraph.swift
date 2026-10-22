import Foundation

public struct SceneRect: Codable, Equatable, Sendable {
    public let x: Double
    public let y: Double
    public let w: Double
    public let h: Double
}

public struct SceneInsets: Equatable, Sendable {
    public var top: Double
    public var right: Double
    public var bottom: Double
    public var left: Double

    public init(top: Double = 0, right: Double = 0, bottom: Double = 0, left: Double = 0) {
        self.top = top
        self.right = right
        self.bottom = bottom
        self.left = left
    }
}

public struct AuthoredSceneObject: Codable, Equatable, Sendable {
    public let id: String
    public let kind: String
    public let parent: String?
    public let slot: String?
    public let rect: SceneRect?
    public let prefab: String?
    public let asset: String?
    public let components: [String]?
    public let label: String?
    public let status: String?
}

public struct AuthoredScene: Codable, Equatable, Sendable {
    public let id: String
    public let type: String
    public let route: String
    public let surface: String
    public let objects: [AuthoredSceneObject]
}

public struct ResolvedSceneObject: Equatable, Sendable {
    public let object: AuthoredSceneObject
    public let frame: SceneRect
    public let layer: String
    public let depth: Int
}

private struct SceneSlot: Codable {
    let x: Double
    let y: Double
    let w: Double
    let h: Double
    let layer: String

    var rect: SceneRect { SceneRect(x: x, y: y, w: w, h: h) }
}

private struct AuthoredSceneFile: Codable {
    let version: Int
    let coordinateSpace: String
    let slots: [String: SceneSlot]
    let scenes: [AuthoredScene]
}

public enum AuthoredSceneGraph {
    private static let file: AuthoredSceneFile = {
        do { return try JSONDecoder().decode(AuthoredSceneFile.self, from: Data(AuthoredSceneDeclarations.json.utf8)) }
        catch { preconditionFailure("AuthoredSceneDeclarations.json is not valid: \(error)") }
    }()

    public static var scenes: [AuthoredScene] { file.scenes }
    public static func scene(_ id: String) -> AuthoredScene? { file.scenes.first { $0.id == id } }

    public static func resolve(
        _ scene: AuthoredScene,
        width: Double,
        height: Double,
        insets: SceneInsets = SceneInsets()
    ) -> [ResolvedSceneObject] {
        let safe = SceneRect(
            x: insets.left,
            y: insets.top,
            w: width - insets.left - insets.right,
            h: height - insets.top - insets.bottom
        )
        func pixels(_ rect: SceneRect) -> SceneRect {
            SceneRect(x: safe.x + rect.x * safe.w, y: safe.y + rect.y * safe.h, w: rect.w * safe.w, h: rect.h * safe.h)
        }

        var resolved: [String: ResolvedSceneObject] = [:]
        var pending = scene.objects
        while !pending.isEmpty {
            let before = pending.count
            for index in pending.indices.reversed() {
                let object = pending[index]
                let parent = object.parent.flatMap { resolved[$0] }
                if object.parent != nil && parent == nil { continue }
                let slot = object.slot.flatMap { file.slots[$0] }
                let frame = object.rect.map(pixels) ?? slot.map { pixels($0.rect) } ?? parent?.frame ?? safe
                resolved[object.id] = ResolvedSceneObject(
                    object: object,
                    frame: frame,
                    layer: slot?.layer ?? parent?.layer ?? "world",
                    depth: parent.map { $0.depth + 1 } ?? 0
                )
                pending.remove(at: index)
            }
            precondition(pending.count < before, "Scene \(scene.id) contains an unresolved object hierarchy")
        }
        return scene.objects.compactMap { resolved[$0.id] }
    }
}
