extension GameStore {
    /// Web `returningScreen`: a mission screen whose mission (or target) is gone lands on the hub,
    /// never on an empty scene. Run on launch and after every cloud merge.
    @discardableResult public func leaveOrphanedMissionScreen() -> Bool {
        let s = state.screen
        if s == .debrief, state.player.homeDeliveryPending { return false }
        guard s.needsMissionContext, mission == nil || (s.needsTargetContext && target == nil) else { return false }
        go(.hub)
        return true
    }
}
