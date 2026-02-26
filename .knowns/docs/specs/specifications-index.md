---
title: Specifications Index
createdAt: '2026-02-25T08:30:27.435Z'
updatedAt: '2026-02-26T01:53:31.426Z'
description: >-
  Index of all game specification documents - single source of truth for
  implementation
spec: true
tags:
  - spec
  - index
  - reference
---
# Specifications Index

## Overview

This folder contains all formal specification documents for Planet Hunters. These specs serve as the **single source of truth** for implementation, testing, and validation.

## Core Specifications

### 1. Mission System Specification
**Location**: @doc/specs/mission-system-specification  
**Purpose**: Complete specification for all 5 missions  
**Covers**:
- Mission objectives and mechanics
- Progression gating and unlocks
- Reward ratios and economic balance
- Tutorial integration
- Implementation references

**Related Tasks**:
- Mission spec validation tests (historical task id archived)
- Align mission constants with spec (historical task id archived)

### 2. User Flow and Citizen Science Specification
**Location**: @doc/specs/user-flow-and-citizen-science-specification  
**Purpose**: Complete user flow and citizen science integration  
**Covers**:
- Core gameplay loop
- Earth Base structure interactions
- Satellite Station scanning mechanics
- Citizen science touchpoints
- Classification and annotation systems

### 3. Level Progression and Unlocks Specification
**Location**: @doc/specs/level-progression-and-unlocks-specification  
**Purpose**: Player progression system  
**Covers**:
- Experience point system
- Level requirements and unlocks
- Rocket unlock progression
- Feature gating by level

### 4. Mining Minigame System Specification
**Location**: @doc/specs/mining-minigame-system-specification  
**Purpose**: Side-scrolling mining minigame mechanics  
**Covers**:
- Mining gameplay mechanics
- Obstacle systems
- Drone deployment
- Resource collection
- Progression and difficulty

---

## Using Specifications

### For Developers
1. **Before implementing**: Read relevant spec document
2. **During development**: Reference spec for requirements
3. **After implementation**: Validate against spec with tests
4. **Code comments**: Link to spec sections

### For Designers
1. **Design changes**: Update spec document first
2. **New features**: Create spec before implementation
3. **Balance changes**: Document in spec with rationale

### For QA/Testing
1. **Test cases**: Derive from spec acceptance criteria
2. **Validation**: Ensure implementation matches spec
3. **Bug reports**: Reference spec section for expected behavior

---

## Spec-Driven Development Workflow

```
1. Design Feature
   ↓
2. Write/Update Spec Document
   ↓
3. Review Spec with Team
   ↓
4. Create Implementation Tasks
   ↓
5. Implement Feature
   ↓
6. Write Validation Tests (against spec)
   ↓
7. Verify Implementation Matches Spec
   ↓
8. Update Spec if Needed
```

---

## Specification Format

All spec documents follow this structure:

### Required Sections
- **Overview**: High-level description
- **Requirements**: What must be implemented
- **Mechanics**: How systems work
- **Implementation References**: Code files, tasks, tests

### Optional Sections
- **Examples**: Usage examples
- **Edge Cases**: Special scenarios
- **Future Enhancements**: Planned improvements
- **Corrections**: Verified data corrections

---

## Maintenance

### When to Update Specs
- ✅ Before implementing new features
- ✅ When design requirements change
- ✅ When discovering implementation errors
- ✅ After validating against actual code

### When NOT to Update Specs
- ❌ During active implementation (finish first)
- ❌ For minor code refactors (unless behavior changes)
- ❌ For bug fixes (unless spec was wrong)

---

## Related Documentation

### Design Docs (game-design/)
- Mission Improvement Plan
- Sprint retrospectives
- Design explorations

### Dev Docs (dev/)
- Implementation guides
- Setup instructions
- Architecture decisions

**Key Difference**: Specs are **prescriptive** (what to build), design docs are **descriptive** (why and how we built it).

---

## Quick Reference

| Spec | Primary Use | Key Stakeholders |
|------|-------------|------------------|
| Mission System | Mission implementation | Developers, Designers |
| User Flow | UX and flow design | Designers, Product |
| Level Progression | Unlock systems | Developers, Balance |
| Mining Minigame | Minigame mechanics | Developers, Designers |

---

**Last Updated**: 2026-02-25  
**Maintained By**: @me


### 5. Mission Flowchart Diagrams
**Location**: @doc/specs/mission-flowchart-diagrams  
**Purpose**: Visual mission flow reference for M1-M5  
**Covers**:
- M1 linear tutorial flow
- M2 upgrade dependency path
- M3 scanner unlock + reachable target branch
- M4 planet toggle + range gate
- M5 contractor branching + payout cap/affinity


### 6. Spec Task Coverage Matrix
**Location**: @doc/specs/spec-task-coverage-matrix  
**Purpose**: Tracks end-to-end coverage between specs, tasks, and tests  
**Covers**:
- Mission/level/mining/user-flow spec requirement mapping
- Completed task linkage
- Validation test references
