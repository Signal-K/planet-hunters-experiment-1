import { describe, expect, it } from 'vitest'
import {
  createTreasuryState,
  issueBankruptcyLoan,
  loanOutstanding,
  payCitizenScienceReward,
  recordSiteDeedRevenue,
  repayBankruptcyLoan,
} from './TreasurySystem'

const NOW = 1_000_000

describe('public treasury ledger', () => {
  it('records deed revenue once with a transparent credit entry', () => {
    const initial = createTreasuryState(100)
    const funded = recordSiteDeedRevenue(initial, {
      entryId: 'ledger-deed-1',
      siteRightId: 'right-1',
      playerId: 'player-1',
      siteId: 'mars-arcadia-a',
      clientId: 'helios',
      amountFrancs: 500,
      occurredAt: NOW,
    })
    const duplicate = recordSiteDeedRevenue(funded, {
      entryId: 'ledger-deed-2',
      siteRightId: 'right-1',
      playerId: 'player-1',
      siteId: 'mars-arcadia-a',
      clientId: 'helios',
      amountFrancs: 500,
      occurredAt: NOW + 1,
    })

    expect(funded.balanceFrancs).toBe(600)
    expect(funded.ledger).toEqual([expect.objectContaining({
      kind: 'site-deed-revenue',
      direction: 'credit',
      referenceId: 'right-1',
      balanceAfterFrancs: 600,
    })])
    expect(duplicate).toBe(funded)
  })

  it('pays a science contribution from available public funds exactly once', () => {
    const treasury = createTreasuryState(500)
    const paid = payCitizenScienceReward(treasury, {
      entryId: 'ledger-science-1',
      contributionId: 'classification-1',
      contributorId: 'player-1',
      amountFrancs: 200,
      occurredAt: NOW,
    })
    const duplicate = payCitizenScienceReward(paid.treasury, {
      entryId: 'ledger-science-2',
      contributionId: 'classification-1',
      contributorId: 'player-1',
      amountFrancs: 200,
      occurredAt: NOW + 1,
    })

    expect(paid).toMatchObject({ playerCreditFrancs: 200, paid: true })
    expect(paid.treasury.balanceFrancs).toBe(300)
    expect(paid.treasury.ledger[0]).toMatchObject({
      kind: 'citizen-science-reward', direction: 'debit', balanceAfterFrancs: 300,
    })
    expect(duplicate).toEqual({ treasury: paid.treasury, playerCreditFrancs: 0, paid: false })
  })

  it('refuses a science reward that the treasury cannot cover', () => {
    const treasury = createTreasuryState(50)
    const result = payCitizenScienceReward(treasury, {
      entryId: 'ledger-science-1',
      contributionId: 'classification-1',
      contributorId: 'player-1',
      amountFrancs: 51,
      occurredAt: NOW,
    })
    expect(result).toEqual({ treasury, playerCreditFrancs: 0, paid: false })
  })
})

describe('public bankruptcy loans', () => {
  it('issues a treasury-funded loan and records repayment without hidden deductions', () => {
    const initial = createTreasuryState(1_000)
    const issued = issueBankruptcyLoan(initial, {
      entryId: 'ledger-loan-issue-1',
      loanId: 'loan-1',
      playerId: 'player-1',
      principalFrancs: 400,
      issuedAt: NOW,
    })
    const repaid = repayBankruptcyLoan(issued.treasury, {
      entryId: 'ledger-loan-repay-1',
      loanId: 'loan-1',
      playerId: 'player-1',
      amountFrancs: 400,
      repaidAt: NOW + 1,
    })

    expect(issued).toMatchObject({ playerCreditFrancs: 400, changed: true })
    expect(issued.treasury.balanceFrancs).toBe(600)
    expect(loanOutstanding(issued.treasury, 'player-1')).toBe(400)
    expect(repaid).toMatchObject({ playerDebitFrancs: 400, changed: true })
    expect(repaid.treasury.balanceFrancs).toBe(1_000)
    expect(repaid.treasury.loans['loan-1']).toMatchObject({ status: 'repaid', outstandingFrancs: 0 })
    expect(repaid.treasury.ledger.map(entry => entry.kind)).toEqual([
      'bankruptcy-loan-issued', 'bankruptcy-loan-repayment',
    ])
  })

  it('permits only one open emergency loan per player and never overdraws the treasury', () => {
    const treasury = createTreasuryState(300)
    const issued = issueBankruptcyLoan(treasury, {
      entryId: 'ledger-loan-issue-1', loanId: 'loan-1', playerId: 'player-1', principalFrancs: 200, issuedAt: NOW,
    })
    const second = issueBankruptcyLoan(issued.treasury, {
      entryId: 'ledger-loan-issue-2', loanId: 'loan-2', playerId: 'player-1', principalFrancs: 100, issuedAt: NOW + 1,
    })
    const tooLarge = issueBankruptcyLoan(treasury, {
      entryId: 'ledger-loan-issue-3', loanId: 'loan-3', playerId: 'player-2', principalFrancs: 301, issuedAt: NOW,
    })

    expect(second).toEqual({ treasury: issued.treasury, playerCreditFrancs: 0, playerDebitFrancs: 0, changed: false })
    expect(tooLarge).toEqual({ treasury, playerCreditFrancs: 0, playerDebitFrancs: 0, changed: false })
  })
})
