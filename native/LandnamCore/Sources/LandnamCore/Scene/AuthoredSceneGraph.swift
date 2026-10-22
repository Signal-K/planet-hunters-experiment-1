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
    public let space: String?
    public let layout: String?
    public let mechanics: [String]?
    public let action: String?
    public let prefab: String?
    public let asset: String?
    public let nativeAsset: String?
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

public struct AuthoredMechanic: Codable, Equatable, Sendable {
    public let id: String
    public let name: String
    public let web: [String]
    public let native: [String]
    public let components: [String]
    public let note: String
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
    let mechanics: [AuthoredMechanic]
}

public enum AuthoredSceneGraph {
    private static let file: AuthoredSceneFile = {
        do { return try JSONDecoder().decode(AuthoredSceneFile.self, from: Data(AuthoredSceneDeclarations.json.utf8)) }
        catch { preconditionFailure("AuthoredSceneDeclarations.json is not valid: \(error)") }
    }()

    public static var scenes: [AuthoredScene] { file.scenes }
    public static var mechanics: [AuthoredMechanic] { file.mechanics }
    public static func scene(_ id: String) -> AuthoredScene? { file.scenes.first { $0.id == id } }

    public static func resolve(
        _ scene: AuthoredScene,
        width: Double,
        height: Double,
        insets: SceneInsets = SceneInsets(),
        prefabRoot: String? = nil
    ) -> [ResolvedSceneObject] {
        let safe = SceneRect(
            x: insets.left,
            y: insets.top,
            w: width - insets.left - insets.right,
            h: height - insets.top - insets.bottom
        )
        func pixels(_ rect: SceneRect, in bounds: SceneRect) -> SceneRect {
            SceneRect(x: bounds.x + rect.x * bounds.w, y: bounds.y + rect.y * bounds.h, w: rect.w * bounds.w, h: rect.h * bounds.h)
        }

        var ids = Set(scene.objects.map(\.id))
        if let root = prefabRoot {
            precondition(ids.contains(root), "Missing prefab root \(root)")
            ids = [root]
            var count = 0
            while count != ids.count {
                count = ids.count
                for object in scene.objects where object.parent.map({ ids.contains($0) }) == true { ids.insert(object.id) }
            }
        }

        var resolved: [String: ResolvedSceneObject] = [:]
        var pending = scene.objects.filter { ids.contains($0.id) }
        while !pending.isEmpty {
            let before = pending.count
            for index in pending.indices.reversed() {
                let object = pending[index]
                let parent = object.parent.flatMap { resolved[$0] }
                let isRoot = object.id == prefabRoot
                if !isRoot && object.parent != nil && parent == nil { continue }
                let slot = object.slot.flatMap { file.slots[$0] }
                let bounds = object.space == "parent" ? parent?.frame ?? safe : safe
                let frame = isRoot ? safe : object.rect.map { pixels($0, in: bounds) } ?? slot.map { pixels($0.rect, in: safe) } ?? parent?.frame ?? safe
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
