/**
 * Pure public-treasury domain transitions.
 *
 * The treasury is deliberately independent from a player's balance and game
 * state. Integration code applies the returned player credit/debit alongside
 * these persisted records, which keeps every public inflow and outflow
 * inspectable in one ledger.
 */

export type TreasuryLedgerKind =
  | 'site-deed-revenue'
  | 'citizen-science-reward'
  | 'bankruptcy-loan-issued'
  | 'bankruptcy-loan-repayment'

export interface TreasuryLedgerEntry {
  id: string
  kind: TreasuryLedgerKind
  referenceId: string
  occurredAt: number
  /** Always a positive amount; direction determines whether it is added or spent. */
  amountFrancs: number
  direction: 'credit' | 'debit'
  balanceAfterFrancs: number
  description: string
}

export interface TreasuryLoan {
  id: string
  playerId: string
  principalFrancs: number
  outstandingFrancs: number
  issuedAt: number
  status: 'open' | 'repaid'
  repaidAt?: number
}

export interface TreasuryState {
  balanceFrancs: number
  ledger: TreasuryLedgerEntry[]
  loans: Record<string, TreasuryLoan>
}

export interface SiteDeedRevenue {
  entryId: string
  siteRightId: string
  playerId: string
  siteId: string
  clientId: string
  amountFrancs: number
  occurredAt: number
}

export interface CitizenScienceReward {
  entryId: string
  contributionId: string
  contributorId: string
  amountFrancs: number
  occurredAt: number
}

export interface BankruptcyLoanIssue {
  entryId: string
  loanId: string
  playerId: string
  principalFrancs: number
  issuedAt: number
}

export interface BankruptcyLoanRepayment {
  entryId: string
  loanId: string
  playerId: string
  amountFrancs: number
  repaidAt: number
}

export interface TreasuryPayoutResult {
  treasury: TreasuryState
  playerCreditFrancs: number
  paid: boolean
}

export interface TreasuryLoanResult {
  treasury: TreasuryState
  playerCreditFrancs: number
  playerDebitFrancs: number
  changed: boolean
}

export function createTreasuryState(initialBalanceFrancs: number = 0): TreasuryState {
  return {
    balanceFrancs: positiveInteger(initialBalanceFrancs) ? initialBalanceFrancs : 0,
    ledger: [],
    loans: {},
  }
}

export function treasuryHasEntry(
  treasury: TreasuryState,
  kind: TreasuryLedgerKind,
  referenceId: string
): boolean {
  return treasury.ledger.some(entry => entry.kind === kind && entry.referenceId === referenceId)
}

export function loanOutstanding(treasury: TreasuryState, playerId: string): number {
  return Object.values(treasury.loans)
    .filter(loan => loan.playerId === playerId && loan.status === 'open')
    .reduce((total, loan) => total + loan.outstandingFrancs, 0)
}

export function recordSiteDeedRevenue(
  treasury: TreasuryState,
  revenue: SiteDeedRevenue
): TreasuryState {
  if (
    !validId(revenue.entryId)
    || !validId(revenue.siteRightId)
    || !validId(revenue.playerId)
    || !validId(revenue.siteId)
    || !validId(revenue.clientId)
    || !positiveInteger(revenue.amountFrancs)
    || !validTimestamp(revenue.occurredAt)
    || treasuryHasEntry(treasury, 'site-deed-revenue', revenue.siteRightId)
  ) return treasury

  return appendEntry(treasury, {
    id: revenue.entryId,
    kind: 'site-deed-revenue',
    referenceId: revenue.siteRightId,
    occurredAt: revenue.occurredAt,
    amountFrancs: revenue.amountFrancs,
    direction: 'credit',
    description: `Site deed for ${revenue.siteId} in ${revenue.clientId} territory.`,
  })
}

/**
 * Pays a verified real-data contribution. This contract deliberately contains
 * no crew, mission, client, or XP fields: citizen science is its own activity.
 */
export function payCitizenScienceReward(
  treasury: TreasuryState,
  reward: CitizenScienceReward
): TreasuryPayoutResult {
  if (
    !validId(reward.entryId)
    || !validId(reward.contributionId)
    || !validId(reward.contributorId)
    || !positiveInteger(reward.amountFrancs)
    || !validTimestamp(reward.occurredAt)
    || treasury.balanceFrancs < reward.amountFrancs
    || treasuryHasEntry(treasury, 'citizen-science-reward', reward.contributionId)
  ) return { treasury, playerCreditFrancs: 0, paid: false }

  const next = appendEntry(treasury, {
    id: reward.entryId,
    kind: 'citizen-science-reward',
    referenceId: reward.contributionId,
    occurredAt: reward.occurredAt,
    amountFrancs: reward.amountFrancs,
    direction: 'debit',
    description: `Citizen-science contribution reward for ${reward.contributorId}.`,
  })
  return { treasury: next, playerCreditFrancs: reward.amountFrancs, paid: true }
}

/**
 * Issues one transparent, no-interest emergency loan per player at a time.
 * The calling flow owns bankruptcy eligibility; this domain guarantees that
 * the public treasury never lends more than it holds.
 */
export function issueBankruptcyLoan(
  treasury: TreasuryState,
  loan: BankruptcyLoanIssue
): TreasuryLoanResult {
  if (
    !validId(loan.entryId)
    || !validId(loan.loanId)
    || !validId(loan.playerId)
    || !positiveInteger(loan.principalFrancs)
    || !validTimestamp(loan.issuedAt)
    || treasury.loans[loan.loanId]
    || loanOutstanding(treasury, loan.playerId) > 0
    || treasury.balanceFrancs < loan.principalFrancs
  ) return { treasury, playerCreditFrancs: 0, playerDebitFrancs: 0, changed: false }

  const nextTreasury = appendEntry(treasury, {
    id: loan.entryId,
    kind: 'bankruptcy-loan-issued',
    referenceId: loan.loanId,
    occurredAt: loan.issuedAt,
    amountFrancs: loan.principalFrancs,
    direction: 'debit',
    description: `Bankruptcy loan issued to ${loan.playerId}.`,
  })
  return {
    treasury: {
      ...nextTreasury,
      loans: {
        ...nextTreasury.loans,
        [loan.loanId]: {
          id: loan.loanId,
          playerId: loan.playerId,
          principalFrancs: loan.principalFrancs,
          outstandingFrancs: loan.principalFrancs,
          issuedAt: loan.issuedAt,
          status: 'open',
        },
      },
    },
    playerCreditFrancs: loan.principalFrancs,
    playerDebitFrancs: 0,
    changed: true,
  }
}

export function repayBankruptcyLoan(
  treasury: TreasuryState,
  repayment: BankruptcyLoanRepayment
): TreasuryLoanResult {
  const loan = treasury.loans[repayment.loanId]
  if (
    !validId(repayment.entryId)
    || !validId(repayment.loanId)
    || !validId(repayment.playerId)
    || !positiveInteger(repayment.amountFrancs)
    || !validTimestamp(repayment.repaidAt)
    || !loan
    || loan.playerId !== repayment.playerId
    || loan.status !== 'open'
    || repayment.amountFrancs > loan.outstandingFrancs
    || treasuryHasEntry(treasury, 'bankruptcy-loan-repayment', repayment.entryId)
  ) return { treasury, playerCreditFrancs: 0, playerDebitFrancs: 0, changed: false }

  const nextOutstanding = loan.outstandingFrancs - repayment.amountFrancs
  const nextTreasury = appendEntry(treasury, {
    id: repayment.entryId,
    kind: 'bankruptcy-loan-repayment',
    referenceId: repayment.entryId,
    occurredAt: repayment.repaidAt,
    amountFrancs: repayment.amountFrancs,
    direction: 'credit',
    description: `Bankruptcy loan repayment from ${repayment.playerId}.`,
  })
  return {
    treasury: {
      ...nextTreasury,
      loans: {
        ...nextTreasury.loans,
        [loan.id]: {
          ...loan,
          outstandingFrancs: nextOutstanding,
          status: nextOutstanding === 0 ? 'repaid' : 'open',
          ...(nextOutstanding === 0 ? { repaidAt: repayment.repaidAt } : {}),
        },
      },
    },
    playerCreditFrancs: 0,
    playerDebitFrancs: repayment.amountFrancs,
    changed: true,
  }
}

function appendEntry(
  treasury: TreasuryState,
  entry: Omit<TreasuryLedgerEntry, 'balanceAfterFrancs'>
): TreasuryState {
  if (treasury.ledger.some(existing => existing.id === entry.id)) return treasury
  const balanceFrancs = entry.direction === 'credit'
    ? treasury.balanceFrancs + entry.amountFrancs
    : treasury.balanceFrancs - entry.amountFrancs
  return {
    ...treasury,
    balanceFrancs,
    ledger: [...treasury.ledger, { ...entry, balanceAfterFrancs: balanceFrancs }],
  }
}

function validId(value: string): boolean {
  return value.trim().length > 0
}

function positiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0
}

function validTimestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}
