import Testing
import Foundation
@testable import LandnamCore

final class FriendsStubProtocol: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var handler: ((URLRequest) -> (Int, Data))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let (code, data) = Self.handler!(request)
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: code, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

@Suite(.serialized) struct FriendsTests {
    private func api() -> FriendsAPI {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [FriendsStubProtocol.self]
        return FriendsAPI(baseURL: URL(string: "http://pb.test")!, token: "token", session: URLSession(configuration: config))
    }

    @Test func friendsListUsesTheAuthenticatedServerRoute() async throws {
        FriendsStubProtocol.handler = { request in
            #expect(request.url?.path == "/api/friends/list")
            #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer token")
            return (200, Data(#"{"me":{"id":"me","username":"pilot"},"friends":[{"id":"you","username":"navigator","friendshipId":"pair","giftSentToday":false}],"incoming":[],"outgoing":[]}"#.utf8))
        }
        let friends = try await api().list()
        #expect(friends.me.username == "pilot")
        #expect(friends.friends.first?.userId == "you")
        #expect(friends.friends.first?.giftSentToday == false)
    }

    @MainActor @Test func claimingAGiftPersistsItsRewardOnce() {
        let store = GameStore()
        let startingFrancs = store.player.francs
        store.receiveFriendGift(kind: .currency, payload: FriendGiftPayload(amount: 120, mineral: nil, slug: nil))
        #expect(store.player.francs == startingFrancs + 120)
        store.receiveFriendGift(kind: .resource, payload: FriendGiftPayload(amount: 3, mineral: "iron", slug: nil))
        #expect(store.player.stash["iron"] == 3)
        store.receiveFriendGift(kind: .blueprint, payload: FriendGiftPayload(amount: nil, mineral: nil, slug: "garage"))
        if case .array(let ids)? = store.player.extras["unlockedBlueprints"] { #expect(ids == [.string("garage")]) }
        else { Issue.record("blueprint gift was not stored") }
    }
}
