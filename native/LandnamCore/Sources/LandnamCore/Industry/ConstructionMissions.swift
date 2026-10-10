import Foundation

/// Off-world builds (web `ConstructionSystem`): a delivered kit becomes a structure record in the same
/// `clientStructures` shape the web writes, so the two games read each other's saves.
public enum ConstructionMissions {
    public static let ownProgramClientId = "mission-control"

    public struct Record: Equatable, Sendable {
        public var targetId: String, structureKind: String, state: String
    }

    public static func records(_ p: Player) -> [Record] {
        guard case .array(let items)? = p.extras["clientStructures"] else { return [] }
        return items.compactMap { item in
            guard case .object(let o) = item, case .string(let t)? = o["targetId"], case .string(let k)? = o["structureKind"] else { return nil }
            let state: String = { if case .string(let s)? = o["state"] { return s } else { return "under-construction" } }()
            return Record(targetId: t, structureKind: k, state: state)
        }
    }

    /// True once an own-programme structure of that kind is delivered or operational (web `ownProgramStructureDelivered`).
    public static func delivered(_ p: Player, kind: String, now: Double? = nil) -> Bool {
        guard case .array(let items)? = p.extras["clientStructures"] else { return false }
        return items.contains { item in
            guard case .object(let o) = item, case .string(let k)? = o["structureKind"], k == kind,
                  case .string(let c)? = o["clientId"], c == ownProgramClientId else { return false }
            if case .string(let s)? = o["state"], s == "delivered" || s == "operational" { return true }
            // An under-construction record becomes operational once its build time has passed.
            if let now, case .number(let at)? = o["startedAt"] { return now - at >= Double(AuthoredMissions.buildTimeMs) }
            return false
        }
    }

    public static func applyDelivery(_ s: GameState, plan: MissionConstructionPlan, targetId: String, now: Double) -> GameState {
        var n = s
        for (id, amount) in plan.requiredMaterials {
            let left = (n.player.stash[id] ?? 0) - amount
            n.player.stash[id] = left > 0 ? left : nil
        }
        var items: [JSONValue] = []
        if case .array(let existing)? = n.player.extras["clientStructures"] { items = existing }
        let alreadyThere = items.contains { item in
            guard case .object(let o) = item, case .string(let t)? = o["targetId"], case .string(let k)? = o["structureKind"] else { return false }
            return t == targetId && k == plan.structureKind
        }
        if !alreadyThere {
            items.append(.object(["targetId": .string(targetId), "structureKind": .string(plan.structureKind),
                                  "clientId": .string(ownProgramClientId), "state": .string("under-construction"),
                                  "startedAt": .number(now)]))
        }
        n.player.extras["clientStructures"] = .array(items)
        return n
    }
}
