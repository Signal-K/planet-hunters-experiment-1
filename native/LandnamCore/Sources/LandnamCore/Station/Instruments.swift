import Foundation

/// Instrument launch missions, discovered exoplanet targets and their survey flights
/// (port of `buildRuntimeCatalog` in `runtimeCatalog.ts` and `tessCandidateToExoplanetTarget`).
public enum Instruments {
    public static let transitTargetId = "earth-orbit-transit-telescope", transitMissionId = "story-transit-telescope-launch"
    public static let deepSpaceTargetId = "earth-orbit-deep-space-telescope", deepSpaceMissionId = "story-deep-space-telescope-survey"
    public static let saturnTargetId = "earth-orbit-saturn-imager", saturnMissionId = "story-saturn-imager-launch"

    private static func orbitTarget(_ id: String, _ brief: String) -> Target {
        Target(id: id, name: "Earth Orbit", type: .planet, orbit: 1, difficulty: "L1", brief: brief, minerals: [])
    }
    public static let transitTarget = orbitTarget(transitTargetId, "Low Earth orbit deployment lane for a transit telescope monitored from Base operations.")
    public static let deepSpaceTarget = orbitTarget(deepSpaceTargetId, "High-orbit survey lane for calibrating a long-baseline instrument against the Minor Planet Center feed.")
    public static let saturnTarget = orbitTarget(saturnTargetId, "Orbital lane for a Saturn imager that downlinks archived Cassini frames for storm-cloud review.")

    private static func launch(_ id: String, _ title: String, _ brief: String, target: String, name: String, instrument: String, outcome: String, sequence: Int) -> Mission {
        Mission(id: id, title: title, brief: brief, client: nil, tag: "STORY", difficulty: "L1", locked: false, sequence: sequence,
                unlockAt: "Reach Free Operations", targetId: target, deliveryTargetId: nil,
                requires: MissionRequirements(minerals: [:], cargoMin: 0, drillTier: 1, maxOrbit: 1), payout: MissionPayout(francs: 0, affinity: 0),
                construction: nil, payload: MissionPayload(type: .satellite, name: name, cargoCost: 0, instrumentId: instrument),
                programReward: ProgramReward(researchXP: 0, outcome: outcome))
    }

    /// The runtime view of the catalog for this player: instrument launches while offered or active, plus discovery surveys.
    public static func runtime(_ base: Catalog, player p: Player, missionId: String?, targetId: String?) -> Catalog {
        var c = base
        let seq = p.missionsDone + 1
        let ids = Set(base.targets.map(\.id)), missionIds = Set(base.missions.map(\.id))
        func add(_ t: Target) { if !ids.contains(t.id) && !c.targets.contains(where: { $0.id == t.id }) { c.targets.append(t) } }
        func add(_ m: Mission) { if !missionIds.contains(m.id) { c.missions.append(m) } }

        if p.freeOperations && p.transitSatelliteLaunchedAt == nil || missionId == transitMissionId || targetId == transitTargetId {
            add(transitTarget)
            add(launch(transitMissionId, "Launch Transit Telescope", "Deploy your own TESS-class telescope into Earth orbit. Its daily instrument feed becomes available for classification.",
                       target: transitTargetId, name: "Transit Telescope", instrument: "transit-telescope", outcome: "Transit telescope online · daily instrument feed unlocked", sequence: seq))
        }
        if p.freeOperations && p.deepSpaceTelescopeLaunchedAt == nil && !p.deepSpaceTelescopeBuilt && !p.placed.contains("deep-space-telescope")
            || missionId == deepSpaceMissionId || targetId == deepSpaceTargetId {
            add(deepSpaceTarget)
            add(launch(deepSpaceMissionId, "Launch Deep Space Telescope", "Deploy the Deep Space Telescope into Earth orbit. Its independent instrument feed opens asteroid-discovery classification.",
                       target: deepSpaceTargetId, name: "Deep Space Telescope", instrument: "deep-space-telescope", outcome: "Deep Space Telescope online · asteroid discovery unlocked", sequence: seq))
        }
        if p.freeOperations && p.saturnImagerLaunchedAt == nil || missionId == saturnMissionId || targetId == saturnTargetId {
            add(saturnTarget)
            add(launch(saturnMissionId, "Launch Saturn Imager", "Deploy a Saturn imager into Earth orbit. Its daily feed delivers real Cassini frames to check for storm clouds.",
                       target: saturnTargetId, name: "Saturn Imager", instrument: "saturn-imager", outcome: "Saturn imager online · Cassini storm-cloud feed unlocked", sequence: seq))
        }
        for t in p.discoveredExoplanetTargets.values.sorted(by: { $0.id < $1.id }) {
            add(t)
            add(Mission(id: "exo-survey-\(t.id)", title: "\(t.name) survey flight",
                        brief: "Follow up your satellite discovery with an owned survey flight to \(t.name). The readings expand your target intelligence.",
                        client: nil, tag: "SCIENCE", difficulty: t.difficulty, locked: false, sequence: seq, unlockAt: "Classify a satellite candidate",
                        targetId: t.id, deliveryTargetId: nil, requires: MissionRequirements(minerals: [:], cargoMin: 0, drillTier: 1, maxOrbit: t.orbit),
                        payout: MissionPayout(francs: 0, affinity: 0), construction: nil, payload: nil,
                        programReward: ProgramReward(researchXP: 25, outcome: "\(t.name) target intelligence expanded")))
        }
        return c
    }

    /// True when this flight ends at arrival: an instrument deployment or an exoplanet survey has nothing to mine.
    public static func isOrbitalOnly(mission: Mission?, target: Target?) -> Bool {
        mission?.payload?.type == .satellite || mission?.payload?.type == .deepSpaceSurvey || target?.type == .exoplanet
    }

    // MARK: discovery

    static let closeOrbitDays = 10.0, longOrbitDays = 200.0, sunTeffK = 5772.0

    public static func archetype(periodDays: Double, starTeffK: Double) -> TargetArchetype {
        let hot = starTeffK >= 6000
        if periodDays <= closeOrbitDays { return hot ? .M : .C }
        if periodDays >= longOrbitDays { return hot ? .gasGiant : .icy }
        return hot ? .S : .icy
    }

    public static func exoplanetTarget(_ c: TessCandidate, measuredPeriodDays: Double?) -> Target {
        let safe = String(c.id.map { $0.isLetter && $0.isASCII || $0.isNumber && $0.isASCII || $0 == "_" || $0 == "-" ? $0 : "-" }).lowercased()
        let period = measuredPeriodDays ?? c.periodDays, teff = c.starTeffK ?? sunTeffK
        let arch = archetype(periodDays: period, starTeffK: teff)
        return Target(id: "exo-\(safe)", name: c.toi, type: .exoplanet, orbit: 5, difficulty: c.signalToNoise >= 15 ? "L2" : "L3",
                      brief: "\(c.host) candidate in \(c.constellation). Added from satellite lightcurve review; plot in the star map, not the solar system.",
                      minerals: Archetypes.minerals(for: arch, orbit: 5), archetype: arch, recommended: nil,
                      planetRadiusEarth: c.planetRadiusEarth, periodDays: period, starTeffK: teff)
    }

    /// Deterministic sky position per candidate (the shared schema has no RA/Dec), -1...1 on both axes.
    public static func skyPosition(_ id: String) -> (x: Double, y: Double) {
        var h: UInt32 = 2166136261
        for u in id.utf16 { h ^= UInt32(u); h = h &* 16777619 }
        // FNV barely moves the low bits when ids differ in the last character, so mix before splitting into x and y.
        h ^= h >> 16; h = h &* 0x7feb352d; h ^= h >> 15; h = h &* 0x846ca68b; h ^= h >> 16
        return (Double(h & 0xffff) / 65535 * 2 - 1, Double((h >> 16) & 0xffff) / 65535 * 2 - 1)
    }
}
