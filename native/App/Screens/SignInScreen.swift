import SwiftUI
import AuthenticationServices
import LandnamCore

/// Shown until a verified Apple identity is exchanged for a Landnam session.
/// There is no guest or account-free path.
struct SignInScreen: View {
    @Environment(AuthModel.self) private var auth
    @State private var nonce = Self.makeNonce()
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        GeometryReader { geometry in
            let landscape = geometry.size.width > geometry.size.height && geometry.size.height < 560
            ZStack {
                SignInBlueprintBackdrop().ignoresSafeArea()
                Group {
                    if landscape {
                        landscapeCard
                    } else {
                        portraitCard
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(landscape ? 18 : 20)
            }
        }
    }

    private var portraitCard: some View {
        VStack(spacing: 22) {
            identityBlock(alignment: .center)
            Rectangle().fill(Theme.border).frame(height: 1.5)
            accessForm(compact: false)
        }
        .padding(24)
        .frame(maxWidth: 430)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink, lineWidth: 2))
        .background(RoundedRectangle(cornerRadius: 16).fill(Theme.blue).offset(x: 5, y: 5))
        .padding(.trailing, 5).padding(.bottom, 5)
    }

    private var landscapeCard: some View {
        HStack(spacing: 0) {
            identityBlock(alignment: .leading)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .padding(.horizontal, 28)
            Rectangle().fill(Theme.border).frame(width: 1.5).padding(.vertical, 24)
            VStack(alignment: .leading, spacing: 14) {
                Text("SIGN IN")
                    .font(AppFont.display(22))
                    .tracking(1.2)
                    .foregroundStyle(Theme.ink)
                accessForm(compact: true)
            }
            .frame(maxWidth: 390, maxHeight: .infinity, alignment: .center)
            .padding(.horizontal, 26)
        }
        .frame(maxWidth: 900, maxHeight: 356)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.ink, lineWidth: 2))
        .background(RoundedRectangle(cornerRadius: 16).fill(Theme.blue).offset(x: 5, y: 5))
        .padding(.trailing, 5).padding(.bottom, 5)
    }

    private func identityBlock(alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 12) {
            Text("LANDNAM")
                .font(AppFont.display(32))
                .tracking(1.3)
                .foregroundStyle(Theme.ink)
            Text("SPACE AGENCY")
                .font(AppFont.display(14, "Bold"))
                .tracking(2.2)
                .foregroundStyle(Theme.blue)
            Rectangle().fill(Theme.blue.opacity(0.4)).frame(width: alignment == .center ? 88 : 72, height: 2)
                .frame(maxWidth: alignment == .center ? .infinity : nil, alignment: alignment == .center ? .center : .leading)
            Text("Run a small space agency. Take contracts, mine, return, get paid.")
                .font(AppFont.body(15))
                .foregroundStyle(Theme.textDim)
                .multilineTextAlignment(alignment == .center ? .center : .leading)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 320, alignment: alignment == .center ? .center : .leading)
        }
        .frame(maxWidth: .infinity, alignment: alignment == .center ? .center : .leading)
        .accessibilityElement(children: .combine)
    }

    private func accessForm(compact: Bool) -> some View {
        VStack(spacing: compact ? 8 : 12) {
            SignInWithAppleButton(.continue) { request in
                request.requestedScopes = [.fullName, .email]
                request.nonce = nonce
            } onCompletion: { result in
                handle(result)
            }
            .signInWithAppleButtonStyle(.whiteOutline)
            .frame(height: 48)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 1.5))
            .disabled(auth.isWorking)

            HStack(spacing: 10) {
                Rectangle().fill(Theme.border).frame(height: 1)
                Text("OR USE EMAIL")
                    .font(AppFont.display(14, "Bold"))
                    .tracking(1.2)
                    .foregroundStyle(Theme.textDim)
                    .fixedSize()
                Rectangle().fill(Theme.border).frame(height: 1)
            }

            TextField("Email", text: $email, prompt: Text("Email").foregroundColor(Theme.textDim))
                .textContentType(.username).autocorrectionDisabled()
                #if os(iOS)
                .keyboardType(.emailAddress).textInputAutocapitalization(.never)
                #endif
                .textFieldStyle(.plain)
                .signInFieldStyle()

            SecureField("Password", text: $password, prompt: Text("Password").foregroundColor(Theme.textDim))
                .textContentType(.password)
                .textFieldStyle(.plain)
                .signInFieldStyle()
                .onSubmit(submitPassword)

            signInButton

            if let message = auth.errorMessage {
                Text(message).font(AppFont.body(14)).foregroundStyle(Theme.crimson).multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityLabel("\(Strings.Scene.base) sign in")
    }

    private func submitPassword() {
        guard !email.isEmpty, !password.isEmpty else { return }
        let e = email, p = password
        Task { await auth.signInWithPassword(email: e, password: p) }
    }

    private var signInButton: some View {
        let enabled = !auth.isWorking && !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !password.isEmpty
        return Button(action: submitPassword) {
            Text("SIGN IN")
                .font(AppFont.display(14))
                .tracking(1.4)
                .foregroundStyle(enabled ? Color.white : Theme.ink)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(enabled ? Theme.blue : Theme.paper2, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 1.5))
        }
        .buttonStyle(SignInActionButtonStyle())
        .disabled(!enabled)
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

private struct SignInActionButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.opacity(configuration.isPressed ? 0.76 : 1)
    }
}

private struct SignInBlueprintBackdrop: View {
    var body: some View {
        GeometryReader { geometry in
            Canvas { context, size in
                var grid = Path()
                for x in stride(from: CGFloat.zero, through: size.width, by: 32) {
                    grid.move(to: CGPoint(x: x, y: 0))
                    grid.addLine(to: CGPoint(x: x, y: size.height))
                }
                for y in stride(from: CGFloat.zero, through: size.height, by: 32) {
                    grid.move(to: CGPoint(x: 0, y: y))
                    grid.addLine(to: CGPoint(x: size.width, y: y))
                }
                context.stroke(grid, with: .color(Theme.blue.opacity(0.08)), lineWidth: 1)

                let ringSize = min(size.width, size.height) * 0.72
                let ring = Path(ellipseIn: CGRect(x: size.width - ringSize * 0.65, y: -ringSize * 0.28, width: ringSize, height: ringSize))
                context.stroke(ring, with: .color(Theme.blue.opacity(0.12)), lineWidth: 1.5)
            }
            .background(LinearGradient(colors: [Theme.paper2, Theme.paper], startPoint: .topLeading, endPoint: .bottomTrailing))
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
    }
}

private extension View {
    func signInFieldStyle() -> some View {
        self
            .font(AppFont.body(16))
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
    }
}
