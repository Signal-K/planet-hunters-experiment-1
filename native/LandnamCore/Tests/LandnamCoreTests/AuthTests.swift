import Testing
import Foundation
@testable import LandnamCore

final class StubProtocol: URLProtocol, @unchecked Sendable {
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

@Suite(.serialized) struct AuthTests {
    private func api() -> AuthAPI {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.protocolClasses = [StubProtocol.self]
        return AuthAPI(baseURL: URL(string: "http://pb.test")!, session: URLSession(configuration: cfg))
    }

    @Test func appleSignInPostsTokenAndNonceAndStoresSession() async throws {
        StubProtocol.handler = { req in
            let body = try! JSONSerialization.jsonObject(with: req.bodyStreamData()) as! [String: String]
            #expect(body["identityToken"] == "jwt" && body["nonce"] == "n1")
            if req.url?.path == "/auth/apple-exchange" {
                return (200, Data(#"{"token":"SHARED","record":{"id":"s1"}}"#.utf8))
            }
            #expect(req.url?.path == "/api/landnam-auth/apple")
            return (200, Data(#"{"token":"T","record":{"id":"u1","email":"a@b.co","displayName":""}}"#.utf8))
        }
        let store = InMemorySessionStore()
        let model = await AuthModel(api: api(), store: store)
        await model.completeApple(identityToken: "jwt", nonce: "n1", fullName: nil)
        let session = await model.session
        #expect(session == AuthSession(token: "T", userId: "u1", email: "a@b.co", displayName: nil, sharedToken: "SHARED", sharedUserId: "s1"))
        #expect(store.load() == session)
    }

    @Test func appleSignInStillWorksWhenSharedExchangeFails() async {
        StubProtocol.handler = { req in
            if req.url?.path == "/auth/apple-exchange" { return (502, Data()) }
            return (200, Data(#"{"token":"T","record":{"id":"u1"}}"#.utf8))
        }
        let model = await AuthModel(api: api(), store: InMemorySessionStore())
        await model.completeApple(identityToken: "jwt", nonce: "n1", fullName: nil)
        #expect(await model.session == AuthSession(token: "T", userId: "u1"))
    }

    @Test func passwordSignInAuthsSharedThenExchanges() async {
        StubProtocol.handler = { req in
            if req.url?.path == "/api/collections/users/auth-with-password" {
                let body = try! JSONSerialization.jsonObject(with: req.bodyStreamData()) as! [String: String]
                #expect(body["identity"] == "a@b.co" && body["password"] == "pw")
                return (200, Data(#"{"token":"SHARED","record":{"id":"s1"}}"#.utf8))
            }
            #expect(req.url?.path == "/api/landnam-auth/exchange")
            #expect(req.value(forHTTPHeaderField: "Authorization") == "Bearer SHARED")
            return (200, Data(#"{"token":"L","record":{"id":"u1","email":"a@b.co"}}"#.utf8))
        }
        let store = InMemorySessionStore()
        let model = await AuthModel(api: api(), store: store)
        await model.signInWithPassword(email: " a@b.co ", password: "pw")
        #expect(await model.session == AuthSession(token: "L", userId: "u1", email: "a@b.co", displayName: nil, sharedToken: "SHARED", sharedUserId: "s1"))
    }

    @Test func wrongPasswordShowsMessageAndStaysSignedOut() async {
        StubProtocol.handler = { _ in (400, Data(#"{"message":"Failed to authenticate."}"#.utf8)) }
        let model = await AuthModel(api: api(), store: InMemorySessionStore())
        await model.signInWithPassword(email: "a@b.co", password: "bad")
        #expect(await model.session == nil)
        #expect(await model.errorMessage == "Email or password is incorrect.")
    }

    @Test func rejectedTokenLeavesPlayerSignedOut() async {
        StubProtocol.handler = { _ in (401, Data(#"{"error":"x"}"#.utf8)) }
        let model = await AuthModel(api: api(), store: InMemorySessionStore())
        await model.completeApple(identityToken: "bad", nonce: "n", fullName: nil)
        #expect(await model.session == nil)
        #expect(await model.errorMessage != nil)
    }

    @Test func restoresSessionFromStoreAndSignOutClearsIt() async {
        let saved = AuthSession(token: "T", userId: "u1")
        let store = InMemorySessionStore(saved)
        let model = await AuthModel(api: api(), store: store)
        #expect(await model.session == saved)
        await model.signOut()
        #expect(await model.session == nil && store.load() == nil)
    }

    @Test func expiredLandnamTokenIsRenewedQuietlyThroughTheSharedLogin() async {
        StubProtocol.handler = { req in
            if req.url?.path == "/api/collections/users/auth-refresh" {
                #expect(req.value(forHTTPHeaderField: "Authorization") == "OLD-SHARED")
                return (200, Data(#"{"token":"NEW-SHARED","record":{"id":"s1"}}"#.utf8))
            }
            #expect(req.url?.path == "/api/landnam-auth/exchange")
            #expect(req.value(forHTTPHeaderField: "Authorization") == "Bearer NEW-SHARED")
            return (200, Data(#"{"token":"NEW","record":{"id":"u1"}}"#.utf8))
        }
        let old = AuthSession(token: "OLD", userId: "u1", email: "a@b.co", sharedToken: "OLD-SHARED", sharedUserId: "s1")
        let store = InMemorySessionStore(old)
        let model = await AuthModel(api: api(), store: store)
        #expect(await model.refreshSession())
        let now = await model.session
        #expect(now?.token == "NEW" && now?.sharedToken == "NEW-SHARED" && now?.email == "a@b.co")
        #expect(store.load() == now)
    }

    @Test func unrenewableSessionSignsOutWithAMessageAndKeepsNothingSecret() async {
        StubProtocol.handler = { _ in (401, Data()) }
        let store = InMemorySessionStore(AuthSession(token: "OLD", userId: "u1", sharedToken: "OLD-SHARED"))
        let model = await AuthModel(api: api(), store: store)
        #expect(await model.refreshSession() == false)
        #expect(await model.session == nil && store.load() == nil)
        #expect(await model.errorMessage?.contains("expired") == true)
    }

    @Test func offlineDuringRefreshKeepsTheSession() async {
        StubProtocol.handler = { _ in (503, Data()) }
        let model = await AuthModel(api: api(), store: InMemorySessionStore(AuthSession(token: "OLD", userId: "u1", sharedToken: "S")))
        #expect(await model.refreshSession())
        #expect(await model.session?.token == "OLD")
    }
}

extension URLRequest {
    func bodyStreamData() -> Data {
        if let httpBody { return httpBody }
        guard let s = httpBodyStream else { return Data() }
        s.open(); defer { s.close() }
        var out = Data(); var buf = [UInt8](repeating: 0, count: 1024)
        while s.hasBytesAvailable { let n = s.read(&buf, maxLength: buf.count); if n <= 0 { break }; out.append(buf, count: n) }
        return out
    }
}
