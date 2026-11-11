import Foundation

/// SSL-828 (web lib/offline/scienceImages.ts + sw.js science cache): Saturn frames are downloaded ahead of time so the
/// satellite works offline. The week's frames are kept on disk in Caches; the last frame pool seen is kept too, so an
/// offline launch opens the player's own frame rather than a static seed frame.
public enum SaturnFrameStore {
    /// Days of frames to keep ahead of today.
    public static let daysAhead = 7
    /// Never keep more than this many frames on disk.
    static let maxFrames = 120
    static let poolKey = "ln-saturn-pool"

    static var folder: URL? {
        guard let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else { return nil }
        let dir = caches.appendingPathComponent("saturn-frames", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static func file(for url: URL) -> URL? {
        folder?.appendingPathComponent(String(Saturn.hash(url.absoluteString), radix: 16) + ".img")
    }

    /// The frame image on disk, if it was downloaded.
    public static func cached(_ url: URL) -> Data? {
        guard let file = file(for: url) else { return nil }
        return try? Data(contentsOf: file)
    }

    /// The frame from disk, else from the network (and then kept on disk).
    public static func load(_ url: URL, session: URLSession = .shared) async -> Data? {
        if let data = cached(url) { return data }
        guard let (data, resp) = try? await session.data(from: url),
              let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode), !data.isEmpty else { return nil }
        if let file = file(for: url) { try? data.write(to: file, options: .atomic) }
        return data
    }

    /// The frames the player opens over the next week: today's frame and each following day's.
    public static func upcoming(_ candidates: [SaturnCandidate], player: Player, nowMs: Double) -> [URL] {
        var out: [URL] = []
        for day in 0...daysAhead {
            let url = Saturn.today(candidates: candidates, player: player, nowMs: nowMs + Double(day) * 86_400_000)?.imageURL
            if let url, !out.contains(url) { out.append(url) }
        }
        return out
    }

    /// Downloads whatever of these is missing, then trims the oldest files past the cap.
    public static func prefetch(_ urls: [URL], session: URLSession = .shared) async {
        for url in urls where cached(url) == nil { _ = await load(url, session: session) }
        trim()
    }

    static func trim() {
        guard let dir = folder,
              let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey]) else { return }
        guard files.count > maxFrames else { return }
        let dated = files.map { f in (f, (try? f.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) }
        for (f, _) in dated.sorted(by: { $0.1 < $1.1 }).prefix(files.count - maxFrames) { try? FileManager.default.removeItem(at: f) }
    }

    /// Keeps the frame pool for an offline launch.
    public static func savePool(_ pool: [SaturnCandidate], defaults: UserDefaults = .standard) {
        let rows = pool.map { ["id": $0.id, "subjectId": $0.subjectId, "opusId": $0.opusId, "imageURL": $0.imageURL?.absoluteString ?? ""] }
        defaults.set(rows, forKey: poolKey)
    }

    /// The last pool this device saw, or empty.
    public static func savedPool(defaults: UserDefaults = .standard) -> [SaturnCandidate] {
        guard let rows = defaults.array(forKey: poolKey) as? [[String: String]] else { return [] }
        return rows.compactMap { r in
            guard let id = r["id"], let subject = r["subjectId"], let url = r["imageURL"].flatMap(URL.init(string:)) else { return nil }
            return SaturnCandidate(id: id, subjectId: subject, opusId: r["opusId"] ?? "", imageURL: url)
        }
    }
}
