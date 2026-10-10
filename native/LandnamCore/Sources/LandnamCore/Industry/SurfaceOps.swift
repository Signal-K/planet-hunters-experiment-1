import Foundation

public struct SettlementLaunchpadRecord: Codable, Equatable, Sendable { public var pad: Int; public var startedAt: Double; public var completesAt: Double }

public struct SettlementFerryRecord: Codable, Equatable, Sendable {
    public enum Status: String, Codable, Sendable { case inFlight = "in-flight", delivered, failed }
    public var id: String
    public var status: Status
    public var manifest: Cargo
    public var dispatchedAt: Double
    public var arrivesAt: Double
    public var attempts: Int
    public var deliveredAt: Double?
    public var reconciledAt: Double?
    public var failureReason: String?
}

public struct SurfaceSiteProgress: Codable, Equatable, Sendable {
    public var siteAccessPurchasedAt: Double?
    public var launchpad: SettlementLaunchpadRecord?
    public var storage: Cargo = [:]
    public var ferry: SettlementFerryRecord?
    /// The web field operation (TakeOn rover assembly); kept verbatim so a native save never drops it.
    public var fieldOperation: JSONValue?
    public init() {}
}

public struct SurfaceOpsState: Codable, Equatable, Sendable {
    public var sites: [String: SurfaceSiteProgress] = [:]
    public init() {}
}

public struct SurfaceSite: Equatable, Sendable, Identifiable {
    public let id, bodyId, name, region: String
    public let orbitBand: Int
    public let demand: String
    public let accessFee: Int
    public let available: Bool
    public let unlockHint, summary: String
}

/// Client territory logistics (port of `SurfaceOpsSystem.ts` and `data/surface-ops.ts`).
public enum SurfaceOps {
    public static let sites: [SurfaceSite] = [
        SurfaceSite(id: "moon-south-pole", bodyId: "moon", name: "Lunar South Pole", region: "Shackleton Rim", orbitBand: 1, demand: "baseline", accessFee: 4_000_000,
                    available: true, unlockHint: "Free Operations", summary: "Near-Earth logistics corridor with surveyed illumination and ice access."),
        SurfaceSite(id: "mars-arcadia", bodyId: "mars", name: "Mars · Arcadia", region: "Arcadia Planitia", orbitBand: 4, demand: "elevated", accessFee: 5_500_000,
                    available: false, unlockHint: "Interplanetary construction kit required", summary: "High-demand settlement terrain with shallow subsurface ice."),
        SurfaceSite(id: "europa-chaos", bodyId: "europa", name: "Europa · Conamara", region: "Conamara Chaos", orbitBand: 6, demand: "high", accessFee: 7_500_000,
                    available: false, unlockHint: "Outer-system construction kit required", summary: "Remote high-value terrain with severe radiation and logistics constraints."),
    ]
    public static func site(_ id: String) -> SurfaceSite? { sites.first { $0.id == id } }

    public static let padCost = 6_000_000
    public static let padMaterials: [String: Int] = ["aluminium": 4, "silicon": 6]
    public static let padBuildMs = 20.0 * 60 * 1000
    public static let padCount = 3
    public static let storageCapacity = 20
    public static let ferryMs = 10.0 * 60 * 1000

    public enum PadStatus: String, Sendable { case unavailable, locked, building, ready }

    public static func progress(_ p: Player, _ siteId: String) -> SurfaceSiteProgress { p.surfaceOps.sites[siteId] ?? SurfaceSiteProgress() }
    public static func storageTotal(_ s: SurfaceSiteProgress) -> Int { s.storage.values.reduce(0, +) }
    public static func cargoReady(_ s: SurfaceSiteProgress) -> Bool { storageTotal(s) >= storageCapacity }
    public static func hasSettlement(_ p: Player) -> Bool { p.surfaceOps.sites.values.contains { $0.siteAccessPurchasedAt != nil } }

    public static func padStatus(_ p: Player, _ siteId: String, now: Double) -> PadStatus {
        guard let d = site(siteId), d.available, p.freeOperations else { return .unavailable }
        let s = progress(p, siteId)
        guard s.siteAccessPurchasedAt != nil, let pad = s.launchpad else { return .locked }
        return now >= pad.completesAt ? .ready : .building
    }

    private static func update(_ s: GameState, _ siteId: String, _ f: (inout SurfaceSiteProgress) -> Void) -> GameState {
        var n = s; var site = progress(s.player, siteId); f(&site); n.player.surfaceOps.sites[siteId] = site; return n
    }

    public static func canBuyAccess(_ p: Player, _ siteId: String) -> Bool {
        guard let d = site(siteId) else { return false }
        return d.available && p.freeOperations && progress(p, siteId).siteAccessPurchasedAt == nil && p.francs >= d.accessFee
    }
    public static func applyPurchaseAccess(_ s: GameState, _ siteId: String, now: Double) -> GameState {
        guard canBuyAccess(s.player, siteId), let d = site(siteId) else { return s }
        var n = update(s, siteId) { $0.siteAccessPurchasedAt = now }
        n.player.francs -= d.accessFee
        return n
    }

    public static func canBuildPad(_ p: Player, _ siteId: String) -> Bool {
        let s = progress(p, siteId)
        return s.siteAccessPurchasedAt != nil && s.launchpad == nil && p.freeOperations && p.francs >= padCost
            && padMaterials.allSatisfy { (p.stash[$0.key] ?? 0) >= $0.value }
    }
    public static func applyBuildPad(_ s: GameState, _ siteId: String, pad: Int, now: Double) -> GameState {
        guard canBuildPad(s.player, siteId), (0..<padCount).contains(pad) else { return s }
        var n = update(s, siteId) { $0.launchpad = SettlementLaunchpadRecord(pad: pad, startedAt: now, completesAt: now + padBuildMs) }
        for (id, c) in padMaterials { n.player.stash[id] = max(0, (n.player.stash[id] ?? 0) - c); if n.player.stash[id] == 0 { n.player.stash[id] = nil } }
        n.player.francs -= padCost
        return n
    }

    public static func applyMined(_ s: GameState, _ siteId: String, mineral: String, amount: Int) -> GameState {
        let site = progress(s.player, siteId)
        guard site.siteAccessPurchasedAt != nil, amount > 0 else { return s }
        let accepted = min(max(0, storageCapacity - storageTotal(site)), amount)
        guard accepted > 0 else { return s }
        return update(s, siteId) { $0.storage[mineral, default: 0] += accepted }
    }

    public static func applyDispatch(_ s: GameState, _ siteId: String, now: Double) -> GameState {
        let site = progress(s.player, siteId)
        guard padStatus(s.player, siteId, now: now) == .ready, cargoReady(site), site.ferry == nil else { return s }
        return update(s, siteId) {
            $0.ferry = SettlementFerryRecord(id: "surface-\(siteId)-\(Int(now))", status: .inFlight, manifest: site.storage, dispatchedAt: now,
                                             arrivesAt: now + ferryMs, attempts: 1, deliveredAt: nil, reconciledAt: nil, failureReason: nil)
            $0.storage = [:]
        }
    }

    public static func applyFail(_ s: GameState, _ siteId: String, ferryId: String, reason: String) -> GameState {
        guard let f = progress(s.player, siteId).ferry, f.id == ferryId, f.status == .inFlight else { return s }
        return update(s, siteId) { $0.ferry?.status = .failed; $0.ferry?.failureReason = reason }
    }

    public static func applyRetry(_ s: GameState, _ siteId: String, now: Double) -> GameState {
        guard let f = progress(s.player, siteId).ferry, f.status == .failed else { return s }
        return update(s, siteId) {
            $0.ferry?.status = .inFlight; $0.ferry?.dispatchedAt = now; $0.ferry?.arrivesAt = now + ferryMs
            $0.ferry?.attempts = f.attempts + 1; $0.ferry?.failureReason = nil
        }
    }

    public static func applyReconcile(_ s: GameState, _ siteId: String, now: Double) -> GameState {
        guard let f = progress(s.player, siteId).ferry, f.status == .inFlight, now >= f.arrivesAt, f.reconciledAt == nil else { return s }
        var n = update(s, siteId) { $0.ferry?.status = .delivered; $0.ferry?.deliveredAt = now; $0.ferry?.reconciledAt = now }
        for (id, c) in f.manifest { n.player.stash[id, default: 0] += c }
        return n
    }

    public static func applyAcknowledge(_ s: GameState, _ siteId: String) -> GameState {
        guard progress(s.player, siteId).ferry?.status == .delivered else { return s }
        return update(s, siteId) { $0.ferry = nil }
    }
}
