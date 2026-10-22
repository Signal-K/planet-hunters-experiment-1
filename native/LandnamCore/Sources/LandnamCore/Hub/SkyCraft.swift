import Foundation

/// A craft that needs a tap on the Earth surface sky (storyboard 2026-09-24:
/// "rockets with status appear in sky when they need a tap"). Mirrors the
/// web HubScreen `skyCraft` control.
public struct SkyCraft: Equatable, Sendable {
    public enum State: String, Sendable { case transit, mining, arrived, waiting }
    public let state: State
    public let label: String
    public let accessibilityLabel: String
    public let opens: Screen

    /// The screen that resumes the in-progress mission step.
    public static func resumeScreen(_ player: Player) -> Screen {
        switch player.missionPhase ?? .transit {
        case .transit: return .transit
        case .landing: return .landing
        case .survey: return .roverSurvey
        case .mining: return .mining
        case .delivery: return .delivery
        case .debrief: return .debrief
        }
    }

    public static func current(for player: Player, now: Double) -> SkyCraft? {
        if let active = player.activeMission {
            let resume = resumeScreen(player)
            let phase = player.missionPhase ?? .transit
            let arrived = phase == .transit && (player.arrivalAt.map { now >= $0 } ?? false)
            let state: State = phase == .mining ? .mining : (arrived || phase != .transit) ? .arrived : .transit
            let label: String
            switch state {
            case .mining: label = "MINING CRAFT"
            case .arrived: label = "CRAFT ARRIVED"
            case .transit: label = "CRAFT IN TRANSIT"
            case .waiting: label = "CRAFT ON PAD"
            }
            return SkyCraft(state: state, label: label, accessibilityLabel: "Resume \(active.label)", opens: resume)
        }
        if let selectedId = player.selectedStagedRocketId,
           let vehicle = player.stagedRockets.first(where: { $0.id == selectedId }) {
            if vehicle.location == .launchpad {
                return SkyCraft(state: .waiting, label: "CRAFT ON PAD", accessibilityLabel: "Open Launchpad: craft waiting on the pad", opens: .launchpad)
            }
            return SkyCraft(state: .waiting, label: "CRAFT IN HANGAR", accessibilityLabel: "Open Hangar: vehicle assigned to the mission", opens: .fab)
        }
        return nil
    }
}
