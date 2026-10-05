import SwiftUI
import AuthenticationServices
import LandnamCore

/// Shown until a verified Apple identity is exchanged for a Landnam session.
/// There is no guest or account-free path.
struct SignInScreen: View {
    @Environment(AuthModel.self) private var auth
    @State private var nonce = Self.makeNonce()

    var body: some View {
        ZStack {
            TerrainScene(composition: .earthBasePad, ground: 0.28).ignoresSafeArea()
            VStack(spacing: 18) {
                Spacer()
                VStack(spacing: 6) {
                    Eyebrow(text: "Earth Base")
                    Text("Landnam").font(AppFont.display(36)).foregroundStyle(Theme.ink)
                    Text("Run a small space agency. Take contracts, mine, return, get paid.")
                        .font(AppFont.body(14)).foregroundStyle(Theme.textDim).multilineTextAlignment(.center)
                }
                SignInWithAppleButton(.continue) { request in
                    request.requestedScopes = [.fullName, .email]
                    request.nonce = nonce
                } onCompletion: { result in
                    handle(result)
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 48).frame(maxWidth: 320)
                .disabled(auth.isWorking)
                if let message = auth.errorMessage {
                    Text(message).font(AppFont.body(12)).foregroundStyle(Theme.crimson).multilineTextAlignment(.center)
                }
                Spacer().frame(height: 48)
            }
            .padding(24)
        }
    }

    private func handle(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .failure(let error):
            if (error as? ASAuthorizationError)?.code != .canceled { auth.fail("Apple sign-in failed. Try again.") }
        case .success(let authorization):
            guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = cred.identityToken, let token = String(data: tokenData, encoding: .utf8) else {
                auth.fail("Apple did not return an identity token."); return
            }
            let name = [cred.fullName?.givenName, cred.fullName?.familyName].compactMap { $0 }.joined(separator: " ")
            let sent = nonce
            nonce = Self.makeNonce()
            Task { await auth.completeApple(identityToken: token, nonce: sent, fullName: name) }
        }
    }

    private static func makeNonce() -> String { UUID().uuidString.replacingOccurrences(of: "-", with: "") + UUID().uuidString.replacingOccurrences(of: "-", with: "") }
}
