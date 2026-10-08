import SwiftUI
import LandnamCore

/// Loads the shared science pools once per launch (and on retry) for the instrument screens.
@MainActor @Observable
final class FeedModel {
    enum Phase: Equatable { case idle, loading, ready, failed }

    private let feed: SharedFeed
    var tess: [TessCandidate] = []
    private(set) var tessPhase = Phase.idle
    private(set) var asteroids: [AsteroidCandidate] = []
    private(set) var asteroidPhase = Phase.idle
    private(set) var saturn: [SaturnCandidate] = []
    private(set) var saturnPhase = Phase.idle

    init(feed: SharedFeed) { self.feed = feed }

    func loadTess(force: Bool = false) async {
        guard force || tessPhase == .idle || tessPhase == .failed else { return }
        tessPhase = .loading
        do { tess = try await feed.tess(); tessPhase = .ready } catch { tessPhase = .failed }
    }
    func loadAsteroids(force: Bool = false) async {
        guard force || asteroidPhase == .idle || asteroidPhase == .failed else { return }
        asteroidPhase = .loading
        do { asteroids = try await feed.asteroids(); asteroidPhase = .ready } catch { asteroidPhase = .failed }
    }
    /// Never fails: the static seed stands in when the pool is unreachable.
    func loadSaturn() async {
        guard saturnPhase == .idle else { return }
        saturnPhase = .loading
        saturn = await feed.saturn(); saturnPhase = .ready
    }

    /// Polls the global last-confirmed signal while signed in; cancelled with the owning view's task.
    /// A failed poll is silent and retried next interval.
    func pollConfirmed(store: GameStore) async {
        while !Task.isCancelled {
            if let found = try? await feed.lastConfirmed() { store.noteConfirmedDiscovery(found.lastConfirmedAt) }
            try? await Task.sleep(for: .seconds(ConfirmedDiscovery.pollSeconds))
        }
    }
}
