import Foundation

/// Pure state transitions for the mission loop. Each function mirrors a web
/// `apply*` system (MiningSystem, DeliverySystem, LandingSystem, EconomySystem)
/// and returns the input unchanged when its guard fails.
public enum Transitions {
    // MARK: progress helpers

    public static func progress(startedAt: Double?, now: Double, durationMs: Double) -> Double {
        guard let startedAt, startedAt.isFinite, durationMs > 0 else { return 0 }
        return max(0, min(1, (now - startedAt) / durationMs))
    }

    // MARK: onboarding

    public static let legacyFreeOpsMissionsDone = 3
    public static func freeOperationsUnlocked(_ p: Player) -> Bool {
        p.missionsDone >= legacyFreeOpsMissionsDone || p.flightPlan.isComplete
    }

    // MARK: return leg

    /// Shared by laser mining, rover mining and lander redock completion.
    public static func startReturnLeg(_ s: GameState, cargo: Cargo, arrivalAt: Double?, transitStartedAt: Double?, now: Double) -> GameState {
        var n = s
        let hasDelivery = s.deliveryTargetId != nil
        n.lastCargo = cargo
        n.deliveredCargo = nil
        n.player.arrivalAt = arrivalAt
        n.player.transitStartedAt = transitStartedAt ?? (arrivalAt != nil ? now : nil)
        n.player.missionPhase = .transit
        n.player.miningCargoInProgress = nil
        n.player.landingReturnStartedAt = nil
        n.player.headingToDelivery = hasDelivery
        n.player.debriefPending = !hasDelivery
        n.player.returningToEarth = !hasDelivery
        n.player.shipDestroyed = false
        n.screen = .transit
        return n
    }

    public static func applyMiningDone(_ s: GameState, cargo: Cargo, arrivalAt: Double?, transitStartedAt: Double?, now: Double) -> GameState {
        guard s.screen == .mining, s.missionId != nil, s.targetId != nil else { return s }
        return startReturnLeg(s, cargo: cargo, arrivalAt: arrivalAt, transitStartedAt: transitStartedAt, now: now)
    }

    public static func applyRoverMiningDone(_ s: GameState, cargo: Cargo, arrivalAt: Double?, transitStartedAt: Double?, now: Double) -> GameState {
        guard s.screen == .roverMining, s.missionId != nil, s.targetId != nil else { return s }
        return startReturnLeg(s, cargo: cargo, arrivalAt: arrivalAt, transitStartedAt: transitStartedAt, now: now)
    }

    /// Cargo lands in Earth storage and the run moves to Debrief.
    public static func applyReturnArrived(_ s: GameState) -> GameState {
        guard s.player.debriefPending, let cargo = s.lastCargo else { return s }
        var n = s
        if !s.player.cargoSettledOffworld {
            for (id, amount) in cargo { n.player.stash[id, default: 0] += amount }
        }
        n.deliveryTargetId = nil
        n.player.arrivalAt = nil
        n.player.transitStartedAt = nil
        n.player.missionPhase = .debrief
        n.player.debriefPending = false
        n.player.returningToEarth = false
        n.player.shipDestroyed = false
        n.screen = .debrief
        n.doneSteps["6"] = true
        return n
    }

    // MARK: delivery

    public static func applyDeliveryArrived(_ s: GameState, now: Double) -> GameState {
        guard s.screen == .transit, s.player.headingToDelivery, s.deliveryTargetId != nil, s.lastCargo != nil else { return s }
        var n = s
        n.screen = .delivery
        n.player.arrivalAt = nil
        n.player.transitStartedAt = nil
        n.player.missionPhase = .delivery
        n.player.deliveryUnloadStartedAt = now
        n.player.debriefPending = false
        n.player.returningToEarth = false
        return n
    }

    public static func applyDeliveryUnloadComplete(_ s: GameState, arrivalAt: Double?, now: Double) -> GameState {
        guard s.screen == .delivery, s.player.headingToDelivery, s.deliveryTargetId != nil, let cargo = s.lastCargo else { return s }
        var n = s
        n.lastCargo = [:]
        n.deliveredCargo = cargo
        n.screen = .transit
        n.player.arrivalAt = arrivalAt
        n.player.transitStartedAt = arrivalAt != nil ? now : nil
        n.player.missionPhase = .transit
        n.player.deliveryUnloadStartedAt = nil
        n.player.headingToDelivery = false
        n.player.debriefPending = true
        n.player.returningToEarth = true
        return n
    }

    // MARK: landing

    public static let landingResearchMissionsDone = 2
    public static let landingResearchXPCost = 100

    public static func applyResearchLanding(_ s: GameState) -> GameState {
        guard !s.player.landingResearched, s.player.missionsDone >= landingResearchMissionsDone,
              s.player.researchXP >= landingResearchXPCost else { return s }
        var n = s
        n.player.researchXP -= landingResearchXPCost
        n.player.landingResearched = true
        return n
    }

    public static func applyLandingTouchdown(_ s: GameState) -> GameState {
        guard s.screen == .landing, s.player.landingStartedAt != nil else { return s }
        var n = s
        n.screen = .mining
        n.player.missionPhase = .mining
        n.player.landingStartedAt = nil
        n.player.hasLanded = true
        return n
    }

    public static func applyRedockComplete(_ s: GameState, cargo: Cargo, arrivalAt: Double?, transitStartedAt: Double?, now: Double) -> GameState {
        guard s.screen == .landing, s.player.landingReturnStartedAt != nil, s.missionId != nil, s.targetId != nil else { return s }
        return startReturnLeg(s, cargo: cargo, arrivalAt: arrivalAt, transitStartedAt: transitStartedAt, now: now)
    }
}
