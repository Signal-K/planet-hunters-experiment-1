import SwiftUI
import LandnamCore

/// Step coach strip (mirrors web FlightPlan): "MINING OPS · STEP 1/3", the current objective and, when the
/// step lives on another screen, a button that goes there. Sits in layout flow above the dock, never over a control.
struct CoachStrip: View {
    @Environment(GameStore.self) private var store
    let coach: FlightPlan.Coach

    var body: some View {
        HStack(spacing: 12) {
            opsBadge
            VStack(alignment: .leading, spacing: 2) {
                Text(coach.kicker).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.teal)
                Text(coach.objective).font(AppFont.body(14, "SemiBold")).foregroundStyle(Theme.ink)
                    .lineLimit(2).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            if let go = coach.go {
                Button { store.go(go.screen) } label: {
                    Text(go.label).font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.ink)
                        .padding(.horizontal, 12).frame(minHeight: 44)
                        .background(Theme.paper).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 8)
        .frame(maxWidth: .infinity, minHeight: 56)
        .background(Theme.hudPanel)
        .overlay(alignment: .top) { Rectangle().fill(Theme.hudInk).frame(height: 1) }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(coach.kicker). \(coach.objective). \(coach.radio)")
    }
}

extension CoachStrip {
    /// Ops call-sign badge (mirrors web .ops-badge): square pixel tile with three signal bars.
    var opsBadge: some View {
        HStack(spacing: 4) {
            Text("OPS").font(AppFont.display(14)).tracking(1.2).foregroundStyle(Theme.ink)
            HStack(alignment: .bottom, spacing: 2) {
                ForEach([6, 10, 14], id: \.self) { h in Rectangle().fill(Theme.teal).frame(width: 3, height: CGFloat(h)) }
            }
        }
        .padding(.horizontal, 8).frame(minHeight: 44)
        .background(Theme.paper).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
        .accessibilityHidden(true)
    }
}

/// Hangar build config (mirrors web ShipInteriorPreview): the pad rocket sprite as a blueprint, one stage at a time
/// with progress dots, full-width part cards and Next pinned at the bottom. The last stage's primary is Confirm,
/// which completes the part training try.
struct HangarModulesPanel: View {
    @Environment(GameStore.self) private var store
    @State private var picks: [String: String] = [:]
    @State private var step = 0
    var onClose: (() -> Void)?

    private static let stageNames = ["engine": "Engine", "booster": "Boosters", "cockpit": "Cockpit", "payload": "Payload"]

    var body: some View {
        GeometryReader { geo in
            let wide = geo.size.width > geo.size.height
            VStack(spacing: 0) {
                if onClose != nil { SetHeader(back: onClose) }
                if wide {
                    HStack(alignment: .top, spacing: SetStyle.gap) {
                        blueprint.frame(width: geo.size.width * 0.3)
                        controls
                    }.padding(.horizontal, 16).padding(.top, 16)
                } else {
                    VStack(spacing: 16) {
                        blueprint.frame(height: geo.size.height * 0.4)
                        controls
                    }.padding(.horizontal, 16).padding(.top, 16).setColumn()
                }
                footer.setColumn(wide: wide)
            }
        }
        .background(SetStyle.bg.ignoresSafeArea())
        .foregroundStyle(SetStyle.ink)
    }

    private var kinds: [String] { FlightPlan.moduleKinds }
    private var kind: String { kinds[step] }
    private func pick(_ k: String) -> String? { picks[k] ?? store.player.shipCustomizerParts[k] }
    private var allFitted: Bool { kinds.allSatisfy { pick($0) != nil } }
    private var isLast: Bool { step == kinds.count - 1 }

    /// The same pad rocket sprite the base and flight scenes use, drawn grey on a pale blue sheet.
    private var blueprint: some View {
        Art.view("base/kit/pad-rocket.png").resizable().interpolation(.none).scaledToFit()
            .grayscale(1).brightness(0.1).opacity(0.72)
            .padding(16)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.mix(0.14), in: RoundedRectangle(cornerRadius: SetStyle.radius))
            .overlay(RoundedRectangle(cornerRadius: SetStyle.radius).stroke(SetStyle.ink, lineWidth: SetStyle.border))
            .accessibilityHidden(true)
    }

    private var controls: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                Button { step = max(0, step - 1) } label: {
                    Image(systemName: "chevron.left").font(.system(size: 18, weight: .heavy))
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }.buttonStyle(.plain).disabled(step == 0).opacity(step == 0 ? 0.35 : 1).accessibilityLabel("Previous stage")
                Text("\(Self.stageNames[kind] ?? kind) \(step + 1)/\(kinds.count)".uppercased())
                    .font(AppFont.display(14)).tracking(14 * 0.14)
                Spacer(minLength: 0)
                HStack(spacing: 8) {
                    ForEach(Array(kinds.enumerated()), id: \.offset) { i, k in
                        Rectangle().fill(i == step ? SetStyle.ink : (pick(k) != nil ? SetStyle.muted : SetStyle.card))
                            .frame(width: 12, height: 12).overlay(Rectangle().stroke(SetStyle.ink, lineWidth: 2))
                    }
                }.accessibilityHidden(true)
            }
            VStack(spacing: 16) {
                ForEach(FlightPlan.modules[kind] ?? [], id: \.id) { m in
                    let on = pick(kind) == m.id
                    Button { picks[kind] = m.id } label: {
                        SetRowText(title: m.name, status: on ? "Installed" : "Tap to fit", titleColor: on ? SetStyle.card : SetStyle.ink, statusColor: on ? SetStyle.card : SetStyle.muted)
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .padding(SetStyle.pad)
                            .background(on ? SetStyle.ink : SetStyle.card, in: RoundedRectangle(cornerRadius: SetStyle.radius))
                            .overlay(RoundedRectangle(cornerRadius: SetStyle.radius).stroke(SetStyle.ink, lineWidth: SetStyle.border))
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(kind) \(m.name)\(on ? ", selected" : "")")
                }
            }
            Spacer(minLength: 0)
        }.frame(maxHeight: .infinity, alignment: .top)
    }

    private var footer: some View {
        SetButton(title: isLast ? "Confirm" : "Next", solid: true, enabled: isLast ? allFitted : true, fill: true) {
            if isLast {
                store.fitHangarModules(Dictionary(uniqueKeysWithValues: kinds.compactMap { k in pick(k).map { (k, $0) } }))
                onClose?()
            } else { step += 1 }
        }
        .padding(16)
    }
}
