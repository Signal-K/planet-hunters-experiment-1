---
id: 2vstrv
title: Loan system for bankruptcy protection
status: done
priority: medium
labels:
  - economy
  - balance
  - ui
createdAt: '2026-03-17T06:48:08.875Z'
updatedAt: '2026-03-18T14:15:55.344Z'
timeSpent: 390
assignee: '@me'
---
# Loan system for bankruptcy protection

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Low-interest loan system prevents softlock when player runs out of Francs. Auto-repaid from next mission payout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Loan available when Francs < cost of cheapest available rocket
- [x] #2 Loan amount covers one basic mission
- [x] #3 Very low interest rate (TBD in balance pass)
- [x] #4 Loan auto-repaid from next mission payout
- [x] #5 UI shows outstanding loan balance prominently
- [x] #6 Player cannot take a second loan while one is outstanding
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AppController: LOAN_AMOUNT=1.5B, LOAN_REPAY_MULT=1.03, take_loan/repay_loan_from_payout/can_take_loan/has_outstanding_loan. MissionDebrief: auto-repay on sell. earth_base_1: _maybe_offer_loan shows dialog when balance<SR1 cost and no outstanding loan. FrancBalance: loan label shows owed amount in red.
<!-- SECTION:NOTES:END -->

