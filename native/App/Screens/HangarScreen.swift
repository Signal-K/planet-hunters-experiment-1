import SwiftUI
import LandnamCore

/// The fleet workshop stays over the same base world and uses its shared instruments.
/// Inventory and actions are supplied by GameStore and its PocketBase outbox.
struct HangarScreen: View {
    @Environment(GameStore.self) private var store
    @State private var camera = BaseCamera()
    @State private var showSettings = false
    @State private var configuring = false
    @State private var launching = false
    private let zones = HUDZones.standard
    private let paper = Theme.hex(0xFAF7F0)
    private var rocket: RocketModel {
        Rockets.models.last { !$0.locked && store.player.missionsDone >= $0.missionsRequired } ?? Rockets.models[0]
    }
    private var available: Int { Rockets.models.filter { !$0.locked && store.player.missionsDone >= $0.missionsRequired }.count }
    private var variant: String { rocket.id == "prospector" ? "prospector" : "explorer" }

    var body: some View {
        if launching {
            LaunchSequenceScreen(variant: variant) { store.launch() }
        } else {
            GeometryReader { geo in
                let portrait = geo.size.height > geo.size.width
                ZStack(alignment: .top) {
                    BaseWorldScene(placed: store.player.placed, plots: store.player.placementPlots,
                                   levels: store.player.buildingLevels, camera: camera,
                                   onStructure: { _ in }, onShaft: {}, onBuildSilo: {})
                        .saturation(0).colorMultiply(Theme.mix(0.12)).allowsHitTesting(false)
                    workshop(portrait: portrait)
                        .frame(maxWidth: 1040)
                        .padding(.horizontal, portrait ? 16 : 56)
                        .padding(.top, portrait ? 88 : 64)
                        .padding(.bottom, portrait ? 88 : 72)
                    HStack(alignment: .top) {
                        HudGearClock(onSettings: { showSettings = true })
                        Spacer(minLength: 8)
                        HudChips(francs: store.player.francs)
                    }.padding(16)
                    BaseDock(tile: 44, zones: zones.dock)
                        .padding(.bottom, 8)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                }
                .foregroundStyle(Theme.ink)
            }
            .sheet(isPresented: $showSettings) { SettingsSheet(onClose: { showSettings = false }) }
        }
    }

    private func workshop(portrait: Bool) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Text("VEHICLE WORKSHOP").font(AppFont.mono(portrait ? 18 : 22, "ExtraBold")).tracking(1.5)
                Spacer(minLength: 0)
                Button { if configuring { configuring = false } else { store.go(.hub) } } label: {
                    Image(systemName: "xmark").font(.system(size: 18, weight: .bold)).frame(width: 44, height: 44)
                        .background(paper).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                }.buttonStyle(.plain).accessibilityLabel("Close hangar")
            }
            .padding(8).background(Theme.paper2)
            Rectangle().fill(Theme.ink).frame(height: 3)
            if configuring {
                HangarModulesPanel(onClose: { configuring = false })
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(alignment: .top, spacing: 8) {
                            Text("Receive client-built shipments, assemble staged vehicles, inspect their rooms and payload, then transfer them to the pad.")
                                .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                            Spacer(minLength: 0)
                            VStack(alignment: .trailing, spacing: 8) {
                                label("CLEARED FLEET")
                                Text("\(available)/\(Rockets.models.count)").font(AppFont.mono(22))
                            }.padding(8).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                        }
                        Button { configuring = true } label: {
                            HStack(spacing: 16) {
                                Image(systemName: "cube").font(.system(size: 24))
                                VStack(alignment: .leading, spacing: 8) {
                                    label("CUSTOMISER ONLINE")
                                    Text("Configure Explorer room modules").font(AppFont.body(14)).foregroundStyle(Theme.textDim)
                                }
                                Spacer(minLength: 0)
                                Image(systemName: "arrow.right")
                            }.padding(16).frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
                                .background(paper).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                                .overlay(alignment: .leading) { Rectangle().fill(Theme.bluePress).frame(width: 8) }
                        }.buttonStyle(.plain).accessibilityIdentifier("open-ship-customizer")
                        assembly(portrait: portrait)
                        stagedActions
                        HStack { label("VEHICLE REGISTRY"); Spacer(); Text("5 REGISTRY ENTRIES").font(AppFont.mono(14)) }
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: portrait ? 1 : 3), spacing: 16) {
                            ForEach(Rockets.models, id: \.id) { model in registry(model) }
                        }
                    }.padding(16)
                }
            }
        }
        .background(paper)
        .overlay(Rectangle().stroke(Theme.ink, lineWidth: 3))
        .background(Theme.bluePress.offset(x: 6, y: 6))
    }

    private func label(_ text: String) -> some View {
        Text(text).font(AppFont.mono(14, "ExtraBold")).tracking(1.2).foregroundStyle(Theme.bluePress)
    }

    private func assembly(portrait: Bool) -> some View {
        let layout = portrait ? AnyLayout(VStackLayout(spacing: 16)) : AnyLayout(HStackLayout(spacing: 16))
        return layout {
            if portrait { assemblyArt }
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    label("CLIENT DELIVERY")
                    label("SEALED SHIPMENT")
                    Text("HULL · BOOSTERS · PAYLOAD").font(AppFont.mono(14))
                }.padding(8).background(paper)
                label("BUILD BAY 01 · ASSEMBLY IN PROGRESS")
                Text(rocket.name.uppercased()).font(AppFont.mono(18))
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach([("SHIPMENT", "RECEIVED"), ("STAGE", "FITTED"), ("PAYLOAD", "SECURED"), ("PAD", "QUEUED")], id: \.0) { step in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(step.0).font(AppFont.mono(14)).foregroundStyle(Theme.textDim)
                            label(step.1)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(8).background(paper)
                    }
                }
            }.frame(maxWidth: .infinity, alignment: .leading)
            if !portrait { assemblyArt.frame(maxWidth: 320) }
        }.padding(16).background(Theme.paper2).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
    }

    private var assemblyArt: some View {
        TimelineView(.animation(minimumInterval: 0.1)) { ctx in
            ZStack {
                HStack(alignment: .top) {
                    ForEach(0..<3) { index in
                        Rectangle().fill(Theme.bluePress).frame(width: 2, height: 32 + 24 * (1 + sin(ctx.date.timeIntervalSince1970 * 2 + Double(index))))
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    }
                }.padding(16)
                Art.view(rocket.id == "prospector" ? "ships/ship_sr2.png" : "ships/ship_sr1.png")
                    .resizable().interpolation(.none).scaledToFit().padding(24)
            }.frame(height: 176).frame(maxWidth: .infinity)
                .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
        }.accessibilityLabel("Vehicle assembly crane")
    }

    @ViewBuilder private var stagedActions: some View {
        ForEach(store.player.stagedRockets) { vehicle in
            VStack(alignment: .leading, spacing: 8) {
                label(vehicle.rocketId.uppercased())
                if vehicle.location == .hangar { PrimaryButton(title: "Roll out to pad") { store.rollOutToPad() } }
            }
        }
        if store.mission != nil || !store.player.stagedRockets.isEmpty {
            PrimaryButton(title: "Launch", enabled: store.player.stagedRockets.contains { $0.location == .launchpad }) { launching = true }
            Button("ABANDON CONTRACT", role: .destructive) { store.abandonMission() }.frame(minHeight: 44)
        }
    }

    private func registry(_ model: RocketModel) -> some View {
        let unlocked = !model.locked && store.player.missionsDone >= model.missionsRequired
        return VStack(alignment: .leading, spacing: 16) {
            HStack { label("TIER \(model.tier)"); Spacer(); if !unlocked { label("LOCKED") } }
            if unlocked {
                Art.view(model.id == "prospector" ? "ships/ship_sr2.png" : "ships/ship_sr1.png")
                    .resizable().interpolation(.none).scaledToFit().frame(height: 80)
            } else { Text("CLASSIFIED").font(AppFont.mono(18)).frame(height: 80) }
            Text(model.name.uppercased()).font(AppFont.mono(16))
            Text(unlocked ? "Cargo \(model.cargo) · Orbit \(model.maxOrbit) · Drill T\(model.drillTier)" : model.unlockHint)
                .font(AppFont.body(14)).foregroundStyle(Theme.textDim)
        }.frame(maxWidth: .infinity, alignment: .leading).padding(16)
            .background(Theme.paper2).overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
    }
}
