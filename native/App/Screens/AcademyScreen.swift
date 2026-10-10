import SwiftUI
import LandnamCore

/// Astronaut Academy (mirrors web AcademyScreen): roster, training, hiring, staffing and partners.
struct AcademyScreen: View {
    enum Tab: String, CaseIterable { case roster = "Roster", training = "Train", hire = "Hire", staffing = "Staff", partners = "Partners" }
    @Environment(GameStore.self) private var store
    @State private var tab = Tab.roster
    @State private var branch = "mining"
    var at: Double?

    var body: some View {
        let p = store.player
        ScreenFrame(title: "Astronaut Academy", back: { store.go(.hub) }) {
            TimelineView(.periodic(from: .now, by: 1)) { ctx in
                let now = at ?? max(store.now, ctx.date.timeIntervalSince1970 * 1000)
                VStack(alignment: .leading, spacing: 12) {
                    Eyebrow(text: "Base · Crew")
                    if !p.placed.contains("astronaut-academy") { locked(p) } else { managed(p, now: now) }
                }
            }
        }
        .task { store.openAcademy() }
    }

    // MARK: Locked

    private func locked(_ p: Player) -> some View {
        let unlocked = Academy.affinityUnlocked(p)
        return Panel(accent: Theme.blueBright) {
            VStack(alignment: .leading, spacing: 10) {
                Eyebrow(text: "Program task · Train the first astronaut")
                Text("Establish the Academy").font(AppFont.display(20))
                step(unlocked, "Build client experience", "Reach client level 2 with two clients.")
                step(p.academyResearched, "Research the Academy", "\(Academy.academyResearchXP) Research XP")
                step(false, "Build at Base", "\(Economy.format(francs: Economy.academyPrice)) · 24 aluminium · 12 silicon · 8 copper")
                if !unlocked {
                    Text("Client level progress: \(p.clientMissions.values.filter { Academy.affinityLevel($0) >= 2 }.count)/2 partner programmes").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                } else if !p.academyResearched {
                    PrimaryButton(title: "Research Academy", enabled: p.researchXP >= Academy.academyResearchXP) { store.researchAcademy() }
                } else {
                    PrimaryButton(title: "Open Build & Place") { store.go(.build) }
                }
            }
        }
    }

    private func step(_ done: Bool, _ title: String, _ body: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: done ? "checkmark.circle.fill" : "circle").foregroundStyle(done ? Theme.teal : Theme.textMuted)
            VStack(alignment: .leading, spacing: 2) { Text(title).font(AppFont.body(14, "SemiBold")); Text(body).font(AppFont.body(14)).foregroundStyle(Theme.textDim) }
        }
    }

    // MARK: Managed

    @ViewBuilder private func managed(_ p: Player, now: Double) -> some View {
        Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("ACADEMY L\(Academy.academyLevel(p))").font(AppFont.display(16))
                    Spacer()
                    Text(p.academyFunded ? "\(p.crewTraining.count)/\(Academy.trainingCapacity(p)) ACTIVE" : "FUNDING PAUSED").font(AppFont.display(14)).foregroundStyle(p.academyFunded ? Theme.teal : Theme.crimson)
                }
                Text("\(p.crew.count) rostered · \(Economy.format(francs: Academy.crewDailyUpkeep)) / astronaut / day").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                action(p.academyFunded ? "Funded · \(Economy.format(francs: Academy.academyDailyUpkeep))/day" : "Restore funding") { store.setAcademyFunding(!p.academyFunded) }
            }
        }
        chips
        switch tab {
        case .roster: roster(p)
        case .training: training(p, now: now)
        case .hire: hire(p, now: now)
        case .staffing: staffing(p)
        case .partners: partners(p)
        }
    }

    private var chips: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 3), spacing: 6) {
            ForEach(Tab.allCases, id: \.self) { t in
                Button { tab = t } label: {
                    Text(t.rawValue.uppercased()).font(AppFont.display(14)).tracking(0.6).lineLimit(1)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .foregroundStyle(tab == t ? Theme.onAccent : Theme.ink)
                        .background(tab == t ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                }.buttonStyle(.plain)
            }
        }
    }

    private func action(_ title: String, enabled: Bool = true, run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Text(title.uppercased()).font(AppFont.display(14)).tracking(1).multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 44).padding(.horizontal, 8)
                .foregroundStyle(Theme.ink).background(Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2)).opacity(enabled ? 1 : 0.45)
        }.buttonStyle(.plain).disabled(!enabled)
    }

    private func roster(_ p: Player) -> some View {
        ForEach(Academy.archetypes) { a in
            let members = p.crew.filter { $0.crewClass == a.id }
            VStack(alignment: .leading, spacing: 8) {
                HStack { Text(a.plural).font(AppFont.display(16)); Spacer(); Text("\(members.count)" + (a.rosterCap.map { "/\($0)" } ?? "")).font(AppFont.display(14)) }
                if members.isEmpty {
                    Panel { VStack(alignment: .leading, spacing: 6) {
                        Text("No \(a.plural.lowercased()) yet").font(AppFont.body(14, "SemiBold"))
                        Text(a.id == .astronaut ? "Train a candidate or hire one instantly." : a.description).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                        if a.id == .astronaut { action("Train") { tab = .training } }
                    } }
                }
                ForEach(members) { m in
                    let pr = Academy.progress(m.xp, Academy.crewCurve)
                    Panel(accent: m.condition == .fit ? Theme.teal : Theme.crimson) {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(m.name).font(AppFont.display(16)); Spacer()
                                if a.isPerson { Text(m.condition.rawValue.uppercased()).font(AppFont.display(14)).foregroundStyle(m.condition == .fit ? Theme.teal : Theme.crimson) }
                            }
                            Text("L\(pr.level) · \(m.selfTrained ? "PROGRAM TRAINED" : "HIRED")").font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
                            Bar(value: Double(pr.xpIntoLevel) / Double(max(1, pr.xpIntoLevel + (pr.xpToNextLevel ?? 0))))
                            Text(m.specialisations.isEmpty ? "No specialisation yet" : m.specialisations.map { "\($0.branch) T\($0.tier)" }.joined(separator: " · "))
                                .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                        }
                    }
                }
            }
        }
    }

    private func training(_ p: Player, now: Double) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Day-long sessions · \(Academy.usageToday(p, now: now))/\(Academy.sessionsPerDay) started today · \(p.crewTraining.count)/\(Academy.trainingCapacity(p)) bays occupied")
                .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
            ForEach(p.crewTraining) { s in
                let done = now >= s.completesAt
                Panel { VStack(alignment: .leading, spacing: 6) {
                    Text(s.candidateName ?? p.crew.first { $0.id == s.crewId }?.name ?? "Crew").font(AppFont.display(16))
                    Text("\(s.branch) training · \(done ? "ready" : countdown(s.completesAt - now))").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    action(done ? "Collect" : "In progress", enabled: done) { store.collectTraining(s.id) }
                } }
            }
            branchPicker
            PrimaryButton(title: "Train new candidate · Level 1", enabled: Academy.canStartTraining(p, now: now)) { store.trainCandidate(branch: branch) }
            ForEach(p.crew.filter { $0.crewClass == .astronaut && $0.condition == .fit }) { m in
                action("Advance \(m.name) in \(branch)", enabled: Academy.canStartTraining(p, now: now)) { store.trainCrew(m.id, branch: branch) }
            }
        }
    }

    private var branchPicker: some View {
        HStack(spacing: 6) {
            ForEach(Academy.branches, id: \.self) { b in
                Button { branch = b } label: {
                    Text(b.uppercased()).font(AppFont.display(14)).lineLimit(1).minimumScaleFactor(0.6).frame(maxWidth: .infinity, minHeight: 44)
                        .foregroundStyle(branch == b ? Theme.onAccent : Theme.ink)
                        .background(branch == b ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                }.buttonStyle(.plain)
            }
        }
    }

    private func countdown(_ ms: Double) -> String {
        let s = max(0, Int(ms / 1000)); return String(format: "%02d:%02d:%02d", s / 3600, s / 60 % 60, s % 60)
    }

    private func hire(_ p: Player, now: Double) -> some View {
        let used = p.crewHireWeek == Academy.weekKey(now) ? p.crewHiresThisWeek : 0
        return VStack(alignment: .leading, spacing: 10) {
            Text("Instant level 3 hires · this week \(used)/\(Academy.weeklyHireCap) · next \(Economy.format(francs: Academy.hireCost(p)))").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
            ForEach(Academy.sources(for: p)) { src in
                let block = Academy.hireBlock(p, sourceId: src.id, now: now)
                Panel { VStack(alignment: .leading, spacing: 6) {
                    Text(src.name).font(AppFont.display(16))
                    Text("\(src.isAgency ? "REAL AGENCY" : "TRUSTED CLIENT") · \(src.description)").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    action(block == nil ? "Hire" : (block?.rawValue ?? ""), enabled: block == nil) { store.hireCrew(src.id) }
                } }
            }
            ForEach(p.formerCrew, id: \.member.id) { o in
                Panel { VStack(alignment: .leading, spacing: 6) {
                    Text(o.member.name).font(AppFont.display(16))
                    Text("Re-hire at mortgage value · \(Economy.format(francs: o.rehireCost))").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    action("Re-hire", enabled: p.francs >= o.rehireCost) { store.rehireCrew(o.member.id) }
                } }
            }
        }
    }

    private func staffing(_ p: Player) -> some View {
        let fit = p.crew.filter { $0.crewClass == .astronaut && $0.condition == .fit }
        return VStack(alignment: .leading, spacing: 10) {
            ForEach([("refinery", "Refinery", "25% faster processing"), ("diplomacy", "Diplomacy Desk", "More valuable trusted-client contracts")], id: \.0) { id, name, effect in
                Panel { VStack(alignment: .leading, spacing: 6) {
                    Text(name).font(AppFont.display(16))
                    Text(effect).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    Menu {
                        Button("Unstaffed") { store.assignCrew(id, crewId: nil) }
                        ForEach(fit) { m in Button(m.name) { store.assignCrew(id, crewId: m.id) } }
                    } label: {
                        Text((p.structureCrewAssignments[id].flatMap { cid in p.crew.first { $0.id == cid }?.name } ?? "Unstaffed").uppercased())
                            .font(AppFont.display(14)).frame(maxWidth: .infinity, minHeight: 44)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                    }
                } }
            }
        }
    }

    private func partners(_ p: Player) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if !p.crewModuleResearched {
                Panel { VStack(alignment: .leading, spacing: 6) {
                    Text("Crew Quarters T1").font(AppFont.display(16))
                    Text("Research a two-seat module, then purchase and fit it to a larger hull in the Hangar.").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    PrimaryButton(title: "Research · \(Academy.crewModuleResearchXP) XP", enabled: p.researchXP >= Academy.crewModuleResearchXP) { store.researchCrewModule() }
                } }
            } else {
                PrimaryButton(title: "Fit Crew Quarters in Hangar") { store.go(.hangar) }
            }
            ForEach(Clients.all.filter(\.suppliesCrew)) { c in
                Panel { VStack(alignment: .leading, spacing: 6) {
                    Text(c.name).font(AppFont.display(16))
                    Text("Client level L\(Academy.affinityLevel(p.clientMissions[c.id] ?? 0)) · \(p.sharedChartsByClient[c.id] ?? 0) charts shared").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                } }
            }
        }
    }
}
