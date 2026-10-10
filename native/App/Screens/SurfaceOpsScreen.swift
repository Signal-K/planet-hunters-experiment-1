import SwiftUI
import LandnamCore

/// Surface Operations (mirrors web SurfaceOpsScreen): client sites, the settlement pad, the mining buffer
/// and the cargo ferry, plus a field view that mines the site's outcrops into the buffer.
struct SurfaceOpsScreen: View {
    private enum View_: String, CaseIterable { case logistics = "Logistics", field = "Field" }
    @Environment(GameStore.self) private var store
    @State private var siteId = SurfaceOps.sites[0].id
    @State private var pad = 0
    @State private var view = View_.logistics
    var at: Double?

    var body: some View {
        ScreenFrame(title: "Surface Operations", back: { store.go(.hub) }) {
            TimelineView(.periodic(from: .now, by: 1)) { ctx in
                let now = at ?? max(store.now, ctx.date.timeIntervalSince1970 * 1000)
                content(now: now)
                    .onChange(of: now >= (SurfaceOps.progress(store.player, siteId).ferry?.arrivesAt ?? .infinity)) { _, due in
                        if due { store.reconcileFerry(siteId) }
                    }
            }
        }
    }

    @ViewBuilder private func content(now: Double) -> some View {
        let p = store.player, site = SurfaceOps.site(siteId)!, prog = SurfaceOps.progress(p, siteId)
        let access = prog.siteAccessPurchasedAt != nil
        VStack(alignment: .leading, spacing: 12) {
            Eyebrow(text: "Surface ops · Client territory")
            sites(p)
            HStack(spacing: 8) {
                ForEach(View_.allCases, id: \.self) { v in
                    Button { if v == .logistics || access { view = v } } label: {
                        Text(v.rawValue.uppercased()).font(AppFont.display(14)).tracking(1.2).frame(maxWidth: .infinity, minHeight: 44)
                            .foregroundStyle(view == v ? Theme.onAccent : Theme.ink)
                            .background(view == v ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                            .opacity(v == .field && !access ? 0.45 : 1)
                    }.buttonStyle(.plain).disabled(v == .field && !access)
                }
            }
            if view == .field && access { field(site, prog) } else {
                siteHeader(site, access: access)
                accessPanel(site, p, access: access)
                padPanel(site, p, prog, access: access, now: now)
                bufferPanel(site, p, prog, now: now)
            }
        }
    }

    private func status(_ s: SurfaceSite, _ access: Bool) -> String { !s.available ? "EQUIPMENT LOCK" : access ? "ACCESS ACTIVE" : "ACCESS AVAILABLE" }

    private func sites(_ p: Player) -> some View {
        VStack(spacing: 8) {
            ForEach(SurfaceOps.sites) { s in
                Button { siteId = s.id; view = .logistics } label: {
                    Panel(accent: s.id == siteId ? Theme.teal : Theme.blueBright) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(s.name).font(AppFont.display(16))
                            Text(s.region).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                            Text("ORBIT \(s.orbitBand) · \(s.demand.uppercased()) DEMAND · \(status(s, SurfaceOps.progress(p, s.id).siteAccessPurchasedAt != nil))")
                                .font(AppFont.display(14)).tracking(0.4).foregroundStyle(s.available ? Theme.teal : Theme.crimson)
                        }
                    }
                }.buttonStyle(.plain).frame(minHeight: 44).accessibilityLabel("\(s.name), \(status(s, SurfaceOps.progress(p, s.id).siteAccessPurchasedAt != nil))")
            }
        }
    }

    private func siteHeader(_ s: SurfaceSite, access: Bool) -> some View {
        Panel(accent: Theme.blueBright) {
            VStack(alignment: .leading, spacing: 6) {
                Eyebrow(text: "Site · \(s.region)")
                Text(s.name).font(AppFont.display(20))
                Text(s.summary).font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                HStack(spacing: 8) {
                    ForEach(0..<SurfaceOps.padCount, id: \.self) { i in
                        Button { pad = i } label: {
                            Text("PAD \(i + 1)").font(AppFont.display(14)).frame(maxWidth: .infinity, minHeight: 44)
                                .foregroundStyle(pad == i ? Theme.onAccent : Theme.ink)
                                .background(pad == i ? Theme.blue : Theme.paper, in: RoundedRectangle(cornerRadius: 8))
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.ink, lineWidth: 2))
                        }.buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func accessPanel(_ s: SurfaceSite, _ p: Player, access: Bool) -> some View {
        Panel(accent: access ? Theme.teal : Theme.blueBright) {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "Client site right")
                Text("DEED PRICE  \(Economy.format(francs: s.accessFee))").font(AppFont.mono(14))
                Text("GRANT  BUILD + MINE · PERMANENT").font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
                if access { Text("CLIENT SITE RIGHT ACTIVE").font(AppFont.display(14)).tracking(1).foregroundStyle(Theme.teal) }
                else {
                    PrimaryButton(title: s.available ? "Acquire site right · \(Economy.format(francs: s.accessFee))" : s.unlockHint, enabled: SurfaceOps.canBuyAccess(p, s.id)) { store.purchaseSiteAccess(s.id) }
                }
            }
        }
    }

    private func padPanel(_ s: SurfaceSite, _ p: Player, _ prog: SurfaceSiteProgress, access: Bool, now: Double) -> some View {
        let st = SurfaceOps.padStatus(p, s.id, now: now)
        let mats = SurfaceOps.padMaterials.sorted { $0.key < $1.key }.map { "\($0.value) \($0.key)" }.joined(separator: " · ")
        return Panel(accent: st == .ready ? Theme.teal : Theme.blueBright) {
            VStack(alignment: .leading, spacing: 8) {
                HStack { Eyebrow(text: "Settlement launchpad"); Spacer(); Text(st.rawValue.uppercased()).font(AppFont.display(14)) }
                if !access { Text("Acquire a build right before placing infrastructure.").font(AppFont.body(14)).foregroundStyle(Theme.textDim) }
                else if let lp = prog.launchpad {
                    Text(st == .building ? "CONSTRUCTION ACTIVE · \(countdown(lp.completesAt - now))" : "LAUNCH CONTROL READY · PAD \(lp.pad + 1)").font(AppFont.display(14)).tracking(0.6)
                } else {
                    Text("Pad \(pad + 1) selected · \(Economy.format(francs: SurfaceOps.padCost)) · \(mats)").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                    PrimaryButton(title: "Build settlement pad", enabled: SurfaceOps.canBuildPad(p, s.id)) { store.buildSettlementPad(s.id, pad: pad) }
                }
            }
        }
    }

    private func bufferPanel(_ s: SurfaceSite, _ p: Player, _ prog: SurfaceSiteProgress, now: Double) -> some View {
        let total = SurfaceOps.storageTotal(prog)
        return Panel(accent: Theme.blueBright) {
            VStack(alignment: .leading, spacing: 8) {
                HStack { Eyebrow(text: "Mining station buffer"); Spacer(); Text("\(total)/\(SurfaceOps.storageCapacity) U").font(AppFont.display(14)) }
                Bar(value: Double(total) / Double(SurfaceOps.storageCapacity))
                manifest(prog.storage)
                if prog.ferry == nil {
                    PrimaryButton(title: "Dispatch cargo ferry", enabled: SurfaceOps.padStatus(p, s.id, now: now) == .ready && SurfaceOps.cargoReady(prog)) { store.dispatchFerry(s.id) }
                }
                if let f = prog.ferry {
                    switch f.status {
                    case .inFlight: Text("FERRY IN FLIGHT · \(countdown(f.arrivesAt - now))").font(AppFont.display(14)).tracking(0.6)
                    case .failed:
                        Text("DISPATCH FAILED · \(f.failureReason ?? "Telemetry fault")").font(AppFont.display(14)).foregroundStyle(Theme.crimson)
                        PrimaryButton(title: "Retry same manifest") { store.retryFerry(s.id) }
                    case .delivered:
                        Text("CARGO DELIVERED · EARTH INVENTORY RECONCILED").font(AppFont.display(14)).tracking(0.6).foregroundStyle(Theme.teal)
                        manifest(f.manifest)
                        PrimaryButton(title: "Clear delivery record") { store.acknowledgeFerry(s.id) }
                    }
                }
            }
        }
    }

    @ViewBuilder private func manifest(_ m: Cargo) -> some View {
        let rows = m.filter { $0.value > 0 }.sorted { $0.key < $1.key }
        if rows.isEmpty { Text("No cargo buffered.").font(AppFont.body(14)).foregroundStyle(Theme.textDim) }
        ForEach(rows, id: \.key) { id, n in
            HStack { Text(Minerals.byId[id]?.name ?? id).font(AppFont.body(14, "SemiBold")); Spacer(); Text("\(n) U").font(AppFont.mono(14)) }
        }
    }

    private func countdown(_ ms: Double) -> String {
        let s = max(0, Int(ms / 1000)); return String(format: "%02d:%02d:%02d", s / 3600, s / 60 % 60, s % 60)
    }

    // MARK: field

    /// Mines the site's outcrops straight into the buffer; the buffer, not the player, is what the ferry carries.
    private func field(_ s: SurfaceSite, _ prog: SurfaceSiteProgress) -> some View {
        let full = SurfaceOps.cargoReady(prog)
        return Panel(accent: Theme.teal) {
            VStack(alignment: .leading, spacing: 10) {
                HStack { Eyebrow(text: "Live field · \(s.region)"); Spacer(); Text("\(SurfaceOps.storageTotal(prog))/\(SurfaceOps.storageCapacity) U").font(AppFont.display(14)) }
                Text("The Prospector works this site. Each drill lands ore in the settlement buffer; return to Logistics when it is full.")
                    .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                ZStack {
                    RoverTerrain().clipShape(RoundedRectangle(cornerRadius: 10))
                    GeometryReader { geo in
                        ForEach(Prospecting.outcrops) { o in
                            Button { store.recordSurfaceMined(s.id, mineral: o.mineral, amount: 1) } label: {
                                VStack(spacing: 2) {
                                    Image(systemName: "triangle.fill").font(.system(size: 22, weight: .bold)).foregroundStyle(Theme.blue)
                                    Text("\(o.label) · \(o.mineral.uppercased())").font(AppFont.display(14)).tracking(0.4).foregroundStyle(Theme.ink)
                                        .padding(.horizontal, 6).background(Theme.paper, in: Capsule())
                                }.frame(minWidth: 44, minHeight: 44)
                            }.buttonStyle(.plain).disabled(full)
                            .position(x: o.x * geo.size.width, y: o.y * geo.size.height * 0.9)
                            .accessibilityLabel("Drill \(o.label), \(o.mineral)")
                        }
                    }
                }
                .frame(height: 260).overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.ink, lineWidth: 2.5))
                Text(full ? "BUFFER FULL · DISPATCH THE FERRY FROM LOGISTICS" : "TAP AN OUTCROP TO DRILL +1 U").font(AppFont.display(14)).tracking(0.8)
                    .foregroundStyle(full ? Theme.crimson : Theme.ink)
            }
        }
    }
}
