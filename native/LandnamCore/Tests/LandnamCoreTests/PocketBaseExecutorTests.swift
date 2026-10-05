import Testing
import Foundation
@testable import LandnamCore

@Suite struct PocketBaseExecutorTests {
    @Test func classifiesLikeWeb() {
        let c = PocketBaseExecutor.classify
        #expect(c(204, nil, false) == nil)
        for s in [0, 401, 403, 408, 429, 502, 503] { #expect(c(s, nil, false) == .offline) }
        #expect(c(400, nil, false) == .invalid("400 "))
        #expect(c(404, nil, false) == .rejected("404 "))
        let dup = Data(#"{"data":{"id":{"code":"validation_not_unique"}}}"#.utf8)
        #expect(c(400, dup, true) == .alreadyApplied)
        #expect(c(400, dup, false) == .invalid("400 " + String(data: dup, encoding: .utf8)!))
    }

    @Test func fileStoreRoundTripsAndToleratesGarbage() async throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("ob-\(UUID().uuidString)/outbox.json")
        let store = FileOutboxStore(url: url)
        #expect(await store.load().isEmpty)
        let item = OutboxItem(id: "a", op: .create(collection: "x", id: "abc", data: ["k": .number(1)]),
                              createdAt: 1, attempts: 0, nextAttemptAt: 0, failed: false, lastError: nil)
        await store.save([item])
        #expect(await FileOutboxStore(url: url).load() == [item])
        try Data("nope".utf8).write(to: url)
        #expect(await store.load().isEmpty)
    }
}
