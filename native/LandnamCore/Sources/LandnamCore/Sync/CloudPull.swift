import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Reads the account's `game_states` record (written by web or native) so a player who
/// started on the web keeps missions, structures and money on mobile.
public enum CloudPull {
    public enum Result: Sendable, Equatable {
        case found(GameState)
        case none          // reachable, and the account has no cloud save yet
        case unavailable   // offline, signed out, or server trouble: try again later
    }

    /// Set on adoption; the app shows the mobile welcome until the player finishes it.
    public static let welcomeKey = "nativeWelcomePending"

    public static func fetch(baseURL: URL, token: String, userId: String, session: URLSession = .shared) async -> Result {
        var comps = URLComponents(url: baseURL.appendingPathComponent("api/collections/game_states/records"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [.init(name: "filter", value: "user = \"\(userId)\""), .init(name: "perPage", value: "1")]
        var req = URLRequest(url: comps.url!)
        req.setValue(token, forHTTPHeaderField: "Authorization")
        req.timeoutInterval = 15
        guard let (data, resp) = try? await session.data(for: req), let http = resp as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else { return .unavailable }
        return decode(data)
    }

    public static func decode(_ data: Data) -> Result {
        guard case .object(let root)? = try? JSONDecoder().decode(JSONValue.self, from: data),
              case .array(let items)? = root["items"] else { return .unavailable }
        guard case .object(let first)? = items.first, let stateJSON = first["state"] else { return .none }
        guard let raw = try? JSONEncoder().encode(stateJSON), let state = try? JSONDecoder().decode(GameState.self, from: raw) else { return .unavailable }
        return .found(state)
    }

    /// True when the player has done anything worth protecting from an overwrite.
    public static func hasProgress(_ s: GameState) -> Bool {
        s.player.missionsDone > 0 || !s.player.placed.isEmpty || !s.player.completedMissions.isEmpty
    }

    /// Remote replaces local only when it is strictly further along (web `mergeRemoteState`
    /// guards the same way: never let a stale or empty side clobber real progress).
    public static func shouldAdopt(local: GameState, remote: GameState) -> Bool {
        guard hasProgress(remote) else { return false }
        if !hasProgress(local) { return true }
        if remote.player.missionsDone != local.player.missionsDone { return remote.player.missionsDone > local.player.missionsDone }
        if remote.player.placed.count != local.player.placed.count { return remote.player.placed.count > local.player.placed.count }
        return false
    }
}
