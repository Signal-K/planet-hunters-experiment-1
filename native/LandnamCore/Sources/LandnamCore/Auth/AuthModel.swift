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

    public func signInWithPassword(email: String, password: String) async {
        isWorking = true; errorMessage = nil
        defer { isWorking = false }
        do {
            let s = try await api.signInWithPassword(email: email.trimmingCharacters(in: .whitespaces), password: password)
            store.save(s); session = s
        } catch AuthError.rejected {
            errorMessage = "Email or password is incorrect."
        } catch {
            errorMessage = "Could not reach Landnam. Check your connection and try again."
        }
    }

    public func fail(_ message: String) { errorMessage = message }

    /// Signs out. The local save stays on the device for the same account to resume.
    public func signOut(message: String? = nil) { store.clear(); session = nil; errorMessage = message }

    private var refreshing = false

    /// Called when the server refuses the saved token. Renews quietly; if that is impossible the player signs in again
    /// (their progress is kept locally and syncs afterwards). Returns whether the session is usable.
    @discardableResult
    public func refreshSession() async -> Bool {
        guard let current = session, !refreshing else { return session != nil }
        refreshing = true; defer { refreshing = false }
        do {
            let fresh = try await api.refresh(current)
            store.save(fresh); session = fresh
            return true
        } catch AuthError.rejected {
            signOut(message: "Your session expired. Sign in again; your progress is saved on this device.")
            return false
        } catch {
            return true   // offline or server trouble: keep playing, try again on the next 401
        }
    }
}
