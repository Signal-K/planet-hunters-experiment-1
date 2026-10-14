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
    @State private var passwordConfirmation = ""
    @State private var creatingAccount = false
    @State private var formError: String?

    var body: some View {
        GeometryReader { geometry in
            let landscape = geometry.size.width > geometry.size.height && geometry.size.height < 560
            ZStack {
                SignInBlueprintBackdrop().ignoresSafeArea()
                Group {
                    if landscape {
                        landscapeCard
                    } else {
                        ScrollView {
                            portraitCard
                                .frame(minHeight: max(0, geometry.size.height - 40))
                                .frame(maxWidth: .infinity)
                        }
                        .scrollDismissesKeyboard(.interactively)
                        .scrollIndicators(.hidden)
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
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(creatingAccount ? "START YOUR PROGRAM" : "AGENCY LINK")
                        .font(AppFont.display(22))
                        .tracking(1.2)
                        .foregroundStyle(Theme.ink)
                    accessForm(compact: true)
                }
            }
            .frame(maxWidth: 390, maxHeight: .infinity, alignment: .center)
            .scrollIndicators(.hidden)
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
            Text("Choose a landing site, build your launchpad, and grow your space program one mission at a time.")
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

            HStack(spacing: 8) {
                accountModeButton("SIGN IN", selected: !creatingAccount) { setMode(false) }
                accountModeButton("SIGN UP", selected: creatingAccount) { setMode(true) }
            }

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

            SecureField(creatingAccount ? "Create password" : "Password", text: $password, prompt: Text(creatingAccount ? "Create password" : "Password").foregroundColor(Theme.textDim))
                .textContentType(creatingAccount ? .newPassword : .password)
                .textFieldStyle(.plain)
                .signInFieldStyle()
                .submitLabel(.go)
                .onSubmit(submitForm)

            if creatingAccount {
                SecureField("Confirm password", text: $passwordConfirmation, prompt: Text("Confirm password").foregroundColor(Theme.textDim))
                    .textContentType(.newPassword)
                    .textFieldStyle(.plain)
                    .signInFieldStyle()
                    .submitLabel(.go)
                    .onSubmit(submitForm)
            }

            if let message = formError ?? auth.errorMessage {
                Text(message).font(AppFont.body(14)).foregroundStyle(Theme.crimson).multilineTextAlignment(.center)
            }

            accessButton
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .contain)
    }

    private func setMode(_ create: Bool) {
        creatingAccount = create
        password = ""
        passwordConfirmation = ""
        formError = nil
        auth.clearError()
    }

    private func submitForm() {
        guard !email.isEmpty, !password.isEmpty else { return }
        if creatingAccount && password != passwordConfirmation {
            formError = "Passwords do not match."
            return
        }
        formError = nil
        let e = email, p = password
        Task {
            if creatingAccount { await auth.createAccountWithPassword(email: e, password: p) }
            else { await auth.signInWithPassword(email: e, password: p) }
        }
    }

    private func accountModeButton(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(AppFont.display(14, "Bold")).tracking(0.8)
                .foregroundStyle(Theme.ink)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(selected ? Theme.paper2 : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(selected ? Theme.blue : Theme.border, lineWidth: selected ? 2 : 1.5))
        }
        .buttonStyle(SignInActionButtonStyle())
        .accessibilityIdentifier(title == "SIGN UP" ? "auth-signup" : "auth-signin")
        .disabled(auth.isWorking)
    }

    private var accessButton: some View {
        let enabled = !auth.isWorking && !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !password.isEmpty && (!creatingAccount || !passwordConfirmation.isEmpty)
        return Button(action: submitForm) {
            Text(creatingAccount ? "START PROGRAM" : "RETURN TO BASE")
                .font(AppFont.display(14))
                .tracking(1.4)
                .foregroundStyle(enabled ? Color.white : Theme.ink)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(enabled ? Theme.blue : Theme.paper2, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 1.5))
        }
        .buttonStyle(SignInActionButtonStyle())
        .accessibilityIdentifier("auth-submit")
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
