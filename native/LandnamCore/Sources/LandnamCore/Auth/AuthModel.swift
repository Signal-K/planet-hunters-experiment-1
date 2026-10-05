import Foundation
import Observation

/// Observable sign-in state. `session == nil` means the sign-in screen shows;
/// there is no way to reach the game without a verified account.
@MainActor @Observable
public final class AuthModel {
    public private(set) var session: AuthSession?
    public private(set) var isWorking = false
    public private(set) var errorMessage: String?

    private let api: AuthAPI
    private let store: SessionStore

    public init(api: AuthAPI, store: SessionStore) {
        self.api = api; self.store = store
        self.session = store.load()
    }

    public func completeApple(identityToken: String, nonce: String, fullName: String?) async {
        isWorking = true; errorMessage = nil
        defer { isWorking = false }
        do {
            let s = try await api.signInWithApple(identityToken: identityToken, nonce: nonce, fullName: fullName)
            store.save(s); session = s
        } catch AuthError.rejected {
            errorMessage = "Apple sign-in was rejected. Try again."
        } catch {
            errorMessage = "Could not reach Landnam. Check your connection and try again."
        }
    }

    public func fail(_ message: String) { errorMessage = message }

    public func signOut() { store.clear(); session = nil }
}
