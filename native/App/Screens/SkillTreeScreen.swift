import SwiftUI
import LandnamCore

/// Skill tree and flight licence (mirrors web SkillTreeScreen).
struct SkillTreeScreen: View {
    @Environment(GameStore.self) private var store
    @State private var selected = Skills.nodes[0].id

    private static let branches: [String: (label: String, short: String, detail: String)] = [
        "mining": ("Mining Systems", "MIN", "Laser output and field yield"),
        "cargo": ("Cargo Systems", "CAR", "Hold capacity and handling"),
        "range": ("Range Systems", "RNG", "Travel time and target reach"),
        "engineering": ("Engineering", "ENG", "Ship configuration and rooms"),
    ]

    var body: some View {
        let p = store.player
        let node = Skills.nodes.first { $0.id == selected } ?? Skills.nodes[0]
        let unlocked = Skills.has(p.unlockedSkillNodes, node.id)
        ScreenFrame(title: "Skill Tree", back: { store.go(.hub) }) {
            Eyebrow(text: "Base · Academy")
            Panel(accent: Theme.blueBright) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack { Text("Build the next capability.").font(AppFont.display(18)); Spacer(minLength: 0) }
                    Text("Permanent upgrades for the flight program.").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    Text(String(format: "%02d SP AVAILABLE", p.skillPoints)).font(AppFont.display(16)).tracking(1)
                }
            }
            Eyebrow(text: "Skill nodes · \(p.unlockedSkillNodes.count) of \(Skills.nodes.count) installed")
            ForEach(Skills.nodes, id: \.id) { n in nodeCard(n, p) }
            inspector(node, unlocked: unlocked, p)
            licence(p)
            firsts(Progression.firsts(p))
        }
    }

    private func nodeCard(_ n: Skills.Node, _ p: Player) -> some View {
        let on = Skills.has(p.unlockedSkillNodes, n.id), b = Self.branches[n.branch]!
        return Button { selected = n.id } label: {
            Panel(accent: selected == n.id ? Theme.teal : Theme.blueBright) {
                HStack(spacing: 12) {
                    Text(b.short).font(AppFont.display(14)).frame(width: 44, height: 44)
                        .background(on ? Theme.teal.opacity(0.2) : Theme.paper2, in: Circle()).overlay(Circle().stroke(Theme.ink, lineWidth: 2))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(n.name).font(AppFont.display(16))
                        Text(b.label).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    }
                    Spacer(minLength: 0)
                    Text(on ? "UNLOCKED" : "\(n.cost) SP").font(AppFont.display(14)).foregroundStyle(on ? Theme.teal : Theme.ink)
                }
            }
        }.buttonStyle(.plain).frame(minHeight: 44).accessibilityLabel("Inspect \(n.name)")
    }

    private func inspector(_ n: Skills.Node, unlocked: Bool, _ p: Player) -> some View {
        let can = Progression.canUnlock(n.id, player: p), b = Self.branches[n.branch]!
        return Panel(accent: unlocked ? Theme.teal : Theme.blueBright) {
            VStack(alignment: .leading, spacing: 8) {
                HStack { Eyebrow(text: "Node inspector · \(b.short)"); Spacer(); Text(unlocked ? "ONLINE" : "LOCKED").font(AppFont.display(14)).foregroundStyle(unlocked ? Theme.teal : Theme.crimson) }
                Text(n.name).font(AppFont.display(20))
                Text(n.summary).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                Text("BRANCH  \(b.label)").font(AppFont.mono(14))
                Text("INSTALL COST  \(unlocked ? "PAID" : "\(n.cost) SP")").font(AppFont.mono(14))
                if !unlocked { PrimaryButton(title: can ? "Install upgrade" : "Insufficient SP", enabled: can) { store.unlockSkill(n.id) } }
                else { Text("SYSTEM UPGRADE INSTALLED").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.teal) }
            }
        }
    }

    private func licence(_ p: Player) -> some View {
        let next = Progression.nextGrade(p.licenseGrade), idx = Progression.gradeOrder.firstIndex(of: p.licenseGrade) ?? 0
        return Panel(accent: Theme.blueBright) {
            VStack(alignment: .leading, spacing: 8) {
                HStack { Eyebrow(text: "Flight authority"); Spacer(); Text(p.licenseGrade.rawValue).font(AppFont.display(14)) }
                HStack(spacing: 6) {
                    ForEach(Array(Progression.gradeOrder.enumerated()), id: \.offset) { i, _ in
                        Capsule().fill(i <= idx ? Theme.blue : Theme.paper2).frame(height: 8).overlay(Capsule().stroke(Theme.ink, lineWidth: 1.5))
                    }
                }
                Text("\(p.researchXP) RESEARCH XP · " + (next.map { "\(Progression.xpGates[$0] ?? 0) XP TO \($0.rawValue.uppercased())" } ?? "MAX GRADE REACHED"))
                    .font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
                if let next { PrimaryButton(title: "Upgrade to \(next.rawValue)", enabled: Progression.canUpgrade(p)) { store.upgradeLicense(to: next) } }
            }
        }
    }

    private func firsts(_ f: Progression.Firsts) -> some View {
        Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "Program milestones · Firsts")
                ForEach([("First mission complete", f.mission), ("First satellite launch", f.satellite), ("First TESS classification", f.tess),
                         ("First blueprint unlocked", f.blueprint), ("Refinery built", f.refinery), ("Launchpad upgraded", f.launchpad)], id: \.0) { label, done in
                    HStack {
                        Image(systemName: done ? "checkmark.circle.fill" : "circle").foregroundStyle(done ? Theme.teal : Theme.textMuted)
                        Text(label).font(AppFont.body(14))
                        Spacer(minLength: 0)
                        Text(done ? "DONE" : "PENDING").font(AppFont.display(14)).foregroundStyle(done ? Theme.teal : Theme.textMuted)
                    }
                }
            }
        }
    }
}
