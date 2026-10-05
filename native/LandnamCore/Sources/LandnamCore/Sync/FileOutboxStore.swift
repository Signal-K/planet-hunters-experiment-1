import Foundation

/// Durable outbox queue: one JSON file, replaced atomically so a kill
/// mid-write leaves the previous queue intact.
public actor FileOutboxStore: OutboxStore {
    private let url: URL

    public init(url: URL) { self.url = url }

    public static func defaultURL() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("Landnam", isDirectory: true).appendingPathComponent("outbox.json")
    }

    public func load() -> [OutboxItem] {
        guard let data = try? Data(contentsOf: url) else { return [] }
        return (try? JSONDecoder().decode([OutboxItem].self, from: data)) ?? []
    }

    public func save(_ items: [OutboxItem]) {
        guard let data = try? JSONEncoder().encode(items) else { return }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: url, options: .atomic)
    }
}
