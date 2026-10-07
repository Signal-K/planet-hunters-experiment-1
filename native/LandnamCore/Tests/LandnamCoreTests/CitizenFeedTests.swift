import Testing
import Foundation
@testable import LandnamCore

@Suite struct CitizenFeedTests {
    @Test func syntheticCurveIsDeterministicAndDips() {
        let c = TessCandidate(id: "abc123", toi: "TOI 1", periodDays: 3, transitEpoch: 0.7, depthPpm: 8000)
        let a = Tess.lightcurve(c), b = Tess.lightcurve(c)
        #expect(a == b && a.count == 1100)
        let atTransit = a.min { abs($0.x - 0.7) < abs($1.x - 0.7) }!
        let baseline = a.min { abs($0.x - 2.2) < abs($1.x - 2.2) }!
        #expect(atTransit.y < baseline.y - 0.004)
    }

    @Test func sectorsParseRangesAndLists() {
        #expect(Tess.sectorList("Sectors 1-3") == ["1", "2", "3"])
        #expect(Tess.sectorList("Sector 7, Sector 9, 7") == ["7", "9"])
        let pts = (0..<40).map { LightcurvePoint(x: Double($0), y: 1) }
        let w = Tess.sectorWindows(pts, sectorText: "14,15")
        #expect(w.map(\.label) == ["SECTOR 14", "SECTOR 15"] && w.allSatisfy { $0.points.count == 20 })
        #expect(Tess.sectorWindows(pts, sectorText: "TESS sector").first?.label == "FULL RANGE")
    }

    @Test func periodAndDepthComeFromTheMarks() {
        let marks = [TransitRange(x1: 1, x2: 2), TransitRange(x1: 4, x2: 5), TransitRange(x1: 7, x2: 8)]
        #expect(Tess.periodFromRanges(marks) == 3)
        #expect(Tess.periodFromRanges([marks[0]]) == nil)
        let pts = [LightcurvePoint(x: 1.5, y: 0.99), LightcurvePoint(x: 3, y: 1)]
        let d = Tess.depthFromRanges(pts, [marks[0]])!
        #expect(abs(d - 0.01) < 1e-9)
    }

    @Test func reviewableSubjectsFollowTheWebFilter() {
        func rec(_ f: [String: JSONValue]) -> [String: JSONValue] { ["subject_type": .string("transit")].merging(f) { $1 } }
        #expect(TessCandidate.isReviewable(rec([:])))
        #expect(!TessCandidate.isReviewable(rec(["consensus": .string("planet")])))
        #expect(TessCandidate.isReviewable(rec(["consensus": .string("unsure")])))
        #expect(!TessCandidate.isReviewable(rec(["tfopwg_disp": .string("FP")])))
        #expect(!TessCandidate.isReviewable(["subject_type": .string("other")]))
    }

    @Test func recordsMapToCandidates() {
        let t = TessCandidate(record: ["id": .string("r1"), "toi_id": .string("1234.01"), "tic_id": .number(77), "period_days": .number(4.5),
                                       "lightcurve_points": .string(#"[{"x":0,"y":1},{"x":1,"y":0.99}]"#)])
        #expect(t.toi == "TOI 1234.01" && t.ticId == "TIC 77" && t.host == "TOI-1234.01" || t.host == "TOI 1234")
        #expect(t.lightcurve?.count == 2 && t.periodDays == 4.5)
        let a = AsteroidCandidate(record: ["id": .string("a1"), "temp_desig": .string("P21abc"), "ra": .number(12), "decl": .number(0)])
        #expect(a.tempDesig == "P21abc")
        let p = Asteroid.plot(a)
        #expect(p.x == 0.5 && p.y == 0.5)
    }

    @Test func dailyPickSkipsClassified() {
        var player = Player()
        let pool = (0..<5).map { AsteroidCandidate(id: "a\($0)", tempDesig: "T\($0)", ra: 1, decl: 1, vMag: 20) }
        let first = Asteroid.today(candidates: pool, player: player, dateKey: "2026-10-07")!
        #expect(Asteroid.today(candidates: pool, player: player, dateKey: "2026-10-07") == first)
        player.asteroidClassifications[first.id] = AsteroidClassification(candidateId: first.id, verdict: .unsure, submittedAt: 0)
        #expect(Asteroid.today(candidates: pool, player: player, dateKey: "2026-10-07")?.id != first.id)
        #expect(Asteroid.today(candidates: [], player: player, dateKey: "x") == nil)
    }

    @Test func uploadsUseTheSharedCollectionShapes() {
        let tess = SharedClassification.tess(subject: "s1", verdict: .planet, ranges: [TransitRange(x1: 1, x2: 2)]).op(sharedUserId: "u", id: "id1")
        #expect(tess == .create(collection: "subject_classifications", id: "id1",
                                data: ["user": .string("u"), "subject": .string("s1"), "verdict": .string("planet"), "dip_markers": .array([.number(1.5)])]))
        #expect(SharedClassification.tess(subject: "training-1", verdict: .planet, ranges: []).op(sharedUserId: "u") == nil)
        #expect(SharedClassification.saturn(frame: "saturn-1", verdict: .yes).op(sharedUserId: "u") == nil)
        #expect(SharedClassification.saturn(frame: "pbrec1", verdict: .maybe).op(sharedUserId: "u", id: "i") == .create(
            collection: "ss_saturn_storm_classifications", id: "i", data: ["user": .string("u"), "frame": .string("pbrec1"), "answer": .string("maybe")]))
        #expect(SharedClassification.asteroid(candidate: "a1", verdict: .likelyReal).op(sharedUserId: "u", id: "i") == .create(
            collection: "asteroid_classifications", id: "i", data: ["user": .string("u"), "candidate": .string("a1"), "verdict": .string("likely_real")]))
    }

    @Test @MainActor func storeClassifiesOnceAndReportsUpload() {
        let store = GameStore()
        var seen: [SharedClassification] = []
        store.onClassified = { seen.append($0) }
        store.classifyTess("s1", verdict: .planet, ranges: [TransitRange(x1: 2, x2: 3), TransitRange(x1: 0.12345, x2: 1)])
        store.classifyTess("s1", verdict: .notPlanet, ranges: [])
        store.classifyAsteroid("a1", verdict: .unsure)
        #expect(seen.count == 2)
        #expect(store.player.tessClassifications["s1"]?.verdict == .planet)
        #expect(store.player.tessClassifications["s1"]?.ranges.first == TransitRange(x1: 0.123, x2: 1))
        #expect(store.player.researchAnnotations == 2 && store.player.researchXP == 30)
    }

    @Test func classificationsSurviveSaveRoundTrip() throws {
        var s = GameState()
        s.player.tessClassifications["s1"] = TessClassification(subjectId: "s1", verdict: .unsure, ranges: [], submittedAt: 5)
        s.player.asteroidClassifications["a1"] = AsteroidClassification(candidateId: "a1", verdict: .likelyArtifact, submittedAt: 6)
        let back = try JSONDecoder().decode(GameState.self, from: JSONEncoder().encode(s))
        #expect(back.player.tessClassifications == s.player.tessClassifications && back.player.asteroidClassifications == s.player.asteroidClassifications)
    }
}
