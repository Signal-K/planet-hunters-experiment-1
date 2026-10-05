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
            #expect(req.url?.path == "/api/landnam-auth/apple")
            let body = try! JSONSerialization.jsonObject(with: req.bodyStreamData()) as! [String: String]
            #expect(body["identityToken"] == "jwt" && body["nonce"] == "n1")
            return (200, Data(#"{"token":"T","record":{"id":"u1","email":"a@b.co","displayName":""}}"#.utf8))
        }
        let store = InMemorySessionStore()
        let model = await AuthModel(api: api(), store: store)
        await model.completeApple(identityToken: "jwt", nonce: "n1", fullName: nil)
        let session = await model.session
        #expect(session == AuthSession(token: "T", userId: "u1", email: "a@b.co", displayName: nil))
        #expect(store.load() == session)
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
        #expect(await model.session == AuthSession(token: "L", userId: "u1", email: "a@b.co", displayName: nil))
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
