import Testing
import Foundation
@testable import LandnamCore

@Suite struct MarketplaceTests {
    let now: Double = 1_760_000_000_000
    func state(placed: [String] = ["launchpad", "market", "surface-silo"], francs: Int = 50_000_000) -> GameState {
        var s = GameState(); s.player.placed = placed; s.player.francs = francs; s.player.stash = [:]; return s
    }

    @Test func askIsAlwaysAboveTheSpot() {
        var s = state(); s.player.stash = ["iron": 3]
        let board = Marketplace.board(s.player, now: now)
        #expect(board.count > 3)
        #expect(board.first { $0.id == "iron" }?.held == 3)
        for q in board { #expect(q.ask > q.spot) }
    }

    @Test func buyingCostsTheAskAndNeverProfitsOnResale() {
        let s = state()
        let ask = Marketplace.buyUnitPrice("iron", player: s.player, now: now)
        let n = Marketplace.applyBuy(s, mineralId: "iron", amount: 2, now: now)
        #expect(n.player.francs == 50_000_000 - ask * 2)
        #expect(n.player.stash["iron"] == 2)
        #expect(Marketplace.spot("iron", player: n.player, now: now) * 2 < ask * 2)
    }

    @Test func buyIsRefusedWithoutExchangeSiloOrFrancs() {
        #expect(Marketplace.buyBlocker(state(placed: ["launchpad", "surface-silo"]).player, "iron", now: now) == "Build the Exchange to buy")
        #expect(Marketplace.buyBlocker(state(placed: ["launchpad", "market"]).player, "iron", now: now) == "Build a silo to store ore")
        #expect(Marketplace.buyBlocker(state(francs: 1).player, "iron", now: now) == "Not enough francs")
        let poor = state(francs: 1)
        #expect(Marketplace.applyBuy(poor, mineralId: "iron", amount: 1, now: now) == poor)
    }

    @Test func openMarketSellingIsDiscountedUntilTheExchangeIsBuilt() {
        let open = state(placed: ["launchpad"])
        let exchange = state(placed: ["launchpad", "market"])
        let openQuote = Marketplace.spot("iron", player: open.player, now: now)
        let exchangeQuote = Marketplace.spot("iron", player: exchange.player, now: now)
        #expect(openQuote < exchangeQuote)
        #expect(openQuote == Int((Double(exchangeQuote) * Economy.openMarketSellRate).rounded()))
    }

    @Test func alertsNeedTheExchangeAndFireOnceAtTheTarget() {
        let s = state()
        let spot = Marketplace.spot("iron", player: s.player, now: now)
        #expect(Marketplace.applySetAlert(state(placed: ["launchpad"]), mineralId: "iron", target: spot).player.priceAlerts.isEmpty)
        let high = Marketplace.applySetAlert(s, mineralId: "iron", target: spot + 100)
        #expect(Marketplace.dueAlerts(high.player, now: now).isEmpty)
        #expect(Marketplace.applyFireDue(high, now: now) == high)
        let moved = Marketplace.applySetAlert(high, mineralId: "iron", target: spot)
        #expect(moved.player.priceAlerts.count == 1)
        let fired = Marketplace.applyFireDue(moved, now: 1234)
        #expect(fired.player.priceAlerts.first?.firedAt == 1234)
        #expect(Marketplace.dueAlerts(fired.player, now: now).isEmpty)
        #expect(Marketplace.firedCount(fired.player) == 1)
        #expect(Marketplace.applyRemoveAlert(fired, alertId: "alert-iron").player.priceAlerts.isEmpty)
    }

    @Test func alertsRoundTripThroughTheSave() throws {
        var s = state(); s.player.priceAlerts = [PriceAlert(id: "alert-iron", mineralId: "iron", target: 99, firedAt: 5)]
        let back = try JSONDecoder().decode(GameState.self, from: JSONEncoder().encode(s))
        #expect(back.player.priceAlerts == s.player.priceAlerts)
    }
}
