import SwiftUI
import LandnamCore

/// Release survey queue (mirrors web lib/surveys.ts + SurveySheet): each key shows once per install,
/// one at a time, and answers go to the web app's `/api/surveys` (which forwards to PostHog).
/// Like web, surveys are off in debug builds unless `LANDNAM_SURVEYS=1`.
@MainActor @Observable
final class SurveyCenter {
    private(set) var current: SurveyDef?
    private var queue: [SurveyDef] = []
    private let defaults: UserDefaults
    private let shownKey = "landnam-surveys-shown"
    private let distinctKey = "landnam-survey-distinct-id"
    private let siteURL: URL

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        siteURL = URL(string: ProcessInfo.processInfo.environment["LANDNAM_WEB_URL"] ?? "https://playlandnam.space")!
    }

    private var enabled: Bool {
        #if DEBUG
        ProcessInfo.processInfo.environment["LANDNAM_SURVEYS"] == "1"
        #else
        true
        #endif
    }

    func enqueue(_ key: String, delay: Double = 1.8) {
        guard enabled, let def = Surveys.def(key) else { return }
        var shown = Set(defaults.stringArray(forKey: shownKey) ?? [])
        guard !shown.contains(key) else { return }
        shown.insert(key)
        defaults.set(Array(shown), forKey: shownKey)
        queue.append(def)
        Task { try? await Task.sleep(for: .seconds(delay)); next() }
    }

    func observe(old: GameState, new: GameState) {
        for key in Surveys.triggers(from: old, to: new) { enqueue(key) }
    }

    func dismiss() { current = nil; Task { try? await Task.sleep(for: .seconds(60)); next() } }

    func submit(_ answer: String) {
        guard let def = current else { return }
        current = nil
        let distinct = defaults.string(forKey: distinctKey) ?? UUID().uuidString.lowercased()
        defaults.set(distinct, forKey: distinctKey)
        if let body = try? Surveys.submissionBody(def, answer: answer, distinctId: distinct) {
            var req = URLRequest(url: siteURL.appendingPathComponent("api/surveys"))
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = body
            Task { _ = try? await URLSession.shared.data(for: req) }
        }
        Task { try? await Task.sleep(for: .seconds(60)); next() }
    }

    private func next() {
        guard current == nil, !queue.isEmpty else { return }
        current = queue.removeFirst()
    }
}

struct SurveySheet: View {
    let def: SurveyDef
    let submit: (String) -> Void
    let dismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Eyebrow(text: "Quick question")
            Text(def.question.text).font(AppFont.display(16)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            if def.question.kind == .rating {
                HStack(spacing: 8) {
                    ForEach(1...def.question.scale, id: \.self) { n in
                        Button { submit(String(n)) } label: {
                            Text("\(n)").font(AppFont.display(16)).frame(maxWidth: .infinity, minHeight: 44)
                                .foregroundStyle(Theme.ink).background(Theme.paper2, in: RoundedRectangle(cornerRadius: 8))
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
                        }.buttonStyle(.plain)
                    }
                }
            } else {
                ForEach(def.question.choices, id: \.self) { choice in
                    Button { submit(choice) } label: {
                        Text(choice).font(AppFont.body(14)).multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).padding(.horizontal, 12)
                            .foregroundStyle(Theme.ink).background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1.5))
                    }.buttonStyle(.plain)
                }
            }
            Button(action: dismiss) {
                Text("SKIP").font(AppFont.display(14)).tracking(1.4).foregroundStyle(Theme.bluePress)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }.buttonStyle(.plain)
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Theme.bg)
        .presentationDetents([.medium, .large])
    }
}
