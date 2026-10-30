import SwiftUI
import LandnamCore

/// A deliberately small companion to the web Crew Connections sheet: exact
/// callsign requests, accepting requests, and one server-limited daily gift.
/// It is an overlay rather than a routed game screen, so the Base remains the
/// player's current place when they close it.
struct FriendsSheet: View {
    @Environment(GameStore.self) private var store
    @Environment(Services.self) private var services: Services?
    let onClose: () -> Void

    @State private var data: FriendsList?
    @State private var inbox: [FriendGift] = []
    @State private var callsign = ""
    @State private var results: [FriendPublicUser] = []
    @State private var username = ""
    @State private var status: String?
    @State private var loading = true
    @State private var sendingTo: String?

    var body: some View {
        ZStack {
            Theme.bg.opacity(0.72).ignoresSafeArea()
            GeometryReader { proxy in
                let compact = proxy.size.height < 520 && proxy.size.width > proxy.size.height
                VStack(alignment: .leading, spacing: 0) {
                    header(compact: compact).padding(.horizontal, 20).padding(.top, compact ? 12 : 20).padding(.bottom, compact ? 8 : 14)
                    Divider().overlay(Theme.hudInk.opacity(0.22))
                    ScrollView {
                        VStack(alignment: .leading, spacing: 18) {
                            if loading { ProgressView().frame(maxWidth: .infinity, minHeight: 160) }
                            else { content }
                        }
                        .padding(20)
                    }
                }
                .frame(maxWidth: min(proxy.size.width - 24, 620), maxHeight: compact ? proxy.size.height - 24 : min(proxy.size.height - 24, 760), alignment: .top)
                .background(Theme.hudPanel, in: RoundedRectangle(cornerRadius: 16))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.hudInk, lineWidth: 2))
                .padding(12)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
        }
        .task { await reload() }
        .accessibilityIdentifier("friends-sheet")
    }

    private func header(compact: Bool) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("COMMS NETWORK").font(AppFont.display(14)).tracking(1.3).foregroundStyle(Theme.textMuted)
                Text("Friends").font(AppFont.display(24)).foregroundStyle(Theme.hudInk)
                if !compact {
                    Text("Connect by callsign and send one field gift to each friend every day.")
                        .font(AppFont.body(14)).foregroundStyle(Theme.hudInk)
                }
            }
            Spacer()
            Button("CLOSE", action: onClose).friendButton().accessibilityIdentifier("friends-close")
        }
    }

    @ViewBuilder private var content: some View {
        if let status { Text(status).font(AppFont.body(14)).foregroundStyle(Theme.hudInk).padding(10).hudPanel(radius: 8) }
        if data?.me.username == data?.me.id { usernameSetup }
        findFriend
        if !inbox.isEmpty { gifts }
        if let incoming = data?.incoming, !incoming.isEmpty { requests(incoming) }
        friends
    }

    private var usernameSetup: some View {
        VStack(alignment: .leading, spacing: 8) {
            label("YOUR CALLSIGN")
            Text("Choose a 3–24 character callsign so friends can find you.").font(AppFont.body(14)).foregroundStyle(Theme.textMuted)
            HStack { TextField("callsign", text: $username); Button("SAVE") { Task { await saveUsername() } }.friendButton() }
        }.friendCard()
    }

    private var findFriend: some View {
        VStack(alignment: .leading, spacing: 8) {
            label("ADD A FRIEND")
            Text("Enter their exact callsign. Players are never listed publicly.").font(AppFont.body(14)).foregroundStyle(Theme.textMuted)
            HStack { TextField("callsign", text: $callsign); Button("FIND") { Task { await search() } }.friendButton() }
            ForEach(results) { user in HStack { Text(user.username).font(AppFont.body(16)); Spacer(); Button("ADD") { Task { await sendRequest(user.username) } }.friendButton() } }
        }.friendCard()
    }

    private var gifts: some View {
        VStack(alignment: .leading, spacing: 8) {
            label("INCOMING GIFTS")
            ForEach(inbox) { gift in
                HStack { Text("FROM \(gift.from.uppercased())").font(AppFont.body(14)); Spacer(); Button("CLAIM") { Task { await claim(gift) } }.friendButton() }
            }
        }.friendCard()
    }

    private func requests(_ requests: [FriendEntry]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            label("REQUESTS")
            ForEach(requests) { request in HStack { Text(request.username).font(AppFont.body(16)); Spacer(); Button("ACCEPT") { Task { await respond(request, accept: true) } }.friendButton(); Button("DECLINE") { Task { await respond(request, accept: false) } }.friendButton() } }
        }.friendCard()
    }

    private var friends: some View {
        VStack(alignment: .leading, spacing: 8) {
            label("FRIENDS")
            if data?.friends.isEmpty != false { Text("No friends yet. Add a callsign above.").font(AppFont.body(14)).foregroundStyle(Theme.textMuted) }
            ForEach(data?.friends ?? []) { friend in
                HStack(alignment: .center, spacing: 10) {
                    Image(systemName: "person.crop.circle.fill").font(.system(size: 28)).foregroundStyle(Theme.accent)
                    Text(friend.username).font(AppFont.body(16))
                    Circle().fill(friend.online == true ? Theme.accent : Theme.textMuted).frame(width: 9, height: 9).accessibilityLabel(friend.online == true ? "Online" : "Offline")
                    Spacer()
                    if friend.giftSentToday == true { Text("GIFT SENT").font(AppFont.display(12)).tracking(0.8).foregroundStyle(Theme.textMuted) }
                    else { Menu { ForEach(FriendGiftKind.allCases, id: \.self) { kind in Button(kind.rawValue.capitalized) { Task { await sendGift(friend, kind: kind) } } } } label: { Text(sendingTo == friend.userId ? "SENDING" : "SEND GIFT") }.friendButton() }
                }
            }
        }.friendCard()
    }

    private func label(_ value: String) -> some View { Text(value).font(AppFont.display(14)).tracking(1.1).foregroundStyle(Theme.textMuted) }
    private func api() throws -> FriendsAPI { guard let api = services?.friendsAPI() else { throw FriendsAPIError.unavailable }; return api }
    private func reload() async { loading = true; defer { loading = false }; do { let api = try api(); async let friends = api.list(); async let gifts = api.inbox(); data = try await friends; inbox = try await gifts; status = nil } catch { status = error.localizedDescription } }
    private func search() async { guard callsign.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3 else { status = "Enter at least 3 characters."; return }; do { results = try await api().search(callsign: callsign.trimmingCharacters(in: .whitespacesAndNewlines)) } catch { status = error.localizedDescription } }
    private func saveUsername() async { do { try await api().setUsername(username.trimmingCharacters(in: .whitespacesAndNewlines)); await reload() } catch { status = error.localizedDescription } }
    private func sendRequest(_ name: String) async { do { try await api().sendRequest(to: name); results = []; status = "Request sent."; await reload() } catch { status = error.localizedDescription } }
    private func respond(_ request: FriendEntry, accept: Bool) async { do { try await api().respond(to: request.friendshipId, accept: accept); await reload() } catch { status = error.localizedDescription } }
    private func sendGift(_ friend: FriendEntry, kind: FriendGiftKind) async { sendingTo = friend.userId; defer { sendingTo = nil }; do { try await api().sendGift(to: friend.userId, kind: kind); status = "Gift sent."; await reload() } catch { status = error.localizedDescription } }
    private func claim(_ gift: FriendGift) async { do { let (kind, payload) = try await api().claim(gift.id); store.receiveFriendGift(kind: kind, payload: payload); inbox.removeAll { $0.id == gift.id }; status = "Gift claimed." } catch { status = error.localizedDescription } }
}

private extension View {
    func friendCard() -> some View { padding(14).frame(maxWidth: .infinity, alignment: .leading).background(Theme.bg.opacity(0.25), in: RoundedRectangle(cornerRadius: 10)).overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.hudInk.opacity(0.22), lineWidth: 1)) }
    func friendButton() -> some View { font(AppFont.display(12)).tracking(0.7).foregroundStyle(Theme.hudInk).padding(.horizontal, 10).frame(minHeight: 44).background(Theme.accent.opacity(0.24), in: RoundedRectangle(cornerRadius: 7)).overlay(RoundedRectangle(cornerRadius: 7).stroke(Theme.hudInk, lineWidth: 1)).buttonStyle(.plain) }
}
