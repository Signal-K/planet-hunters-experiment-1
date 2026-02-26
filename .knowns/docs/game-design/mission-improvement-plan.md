---
title: Mission Improvement Plan
createdAt: '2026-02-25T08:23:40.138Z'
updatedAt: '2026-02-26T01:53:33.631Z'
description: >-
  Comprehensive plan to improve mission onboarding, documentation, and
  spec-driven development
tags:
  - missions
  - planning
  - spec
  - onboarding
---
# Mission System Improvement Plan

## Overview

This document outlines the comprehensive plan to improve mission onboarding, documentation, and spec-driven development for Planet Hunters' 5-mission progression system.

## ✅ Completed

### 1. Mission Design Specification Document
**Task**: task-k1naxd  
**Status**: Done  
**Location**: @doc/game-design/mission-system-specification

Created comprehensive spec document covering:
- All 5 missions with objectives, mechanics, requirements, and rewards
- Cross-mission systems (rocket progression, target types, gating)
- Tutorial progression mapped to mission stages
- Implementation references (code files, tests, related tasks)
- Economic balance and reward ratios
- Future enhancement proposals

**Impact**: Single source of truth for mission design and implementation

---

## 🎯 High Priority Tasks

### 2. Mission Onboarding Overlays
**Task**: task-7xdhgi  
**Priority**: High  
**Purpose**: Replace wall-of-text with step-by-step guidance

**Deliverables**:
- Overlay system that triggers on mission start
- M1: Build → Launch → Mine → Return → Debrief
- M2: Unlock L2 → Launch → Higher yield
- M3: Build scanner → Scan → Select → Launch
- M4: Unlock L3 → Toggle planets → Select → Launch
- M5: Review contractors → Accept → Mine minerals

**User Benefit**: Clear, digestible mission objectives at each stage

### 3. Mission Spec Validation Tests
**Task**: task-r3wjy5  
**Priority**: High  
**Purpose**: Ensure implementation matches spec

**Deliverables**:
- Test M1: predefined target, 1.2x reward, SR1 requirement
- Test M2: predefined target, 1.3x reward, SR2 requirement
- Test M3: scanner unlock, 2B cost, 5 asteroids with 1 reachable
- Test M4: planet toggle, SR3 requirement, 1.4x reward
- Test M5: contractor offers, payout cap, affinity system

**Developer Benefit**: Automated validation against spec document

---

## 📋 Medium Priority Tasks

### 4. Refactor Tutorial System
**Task**: task-bzx127  
**Priority**: Medium  
**Purpose**: Make tutorial mission-contextual

**Deliverables**:
- Tutorial steps grouped by mission stage
- Show only relevant steps for current mission
- Adapt instruction text based on scene and mission
- Per-mission dismissal (not global)

**User Benefit**: Relevant guidance without overwhelming information

### 5. Mission Briefing Screen
**Task**: task-r7f35q  
**Priority**: Medium  
**Purpose**: Pre-launch mission summary

**Deliverables**:
- Briefing before first launch of each mission
- Mission number, objective, key mechanics
- Required rocket level and target type
- Expected reward ratio and new unlocks
- Skippable after first viewing

**User Benefit**: Clear understanding before committing to mission

### 6. Align Mission Constants with Spec
**Task**: task-w0j1ov  
**Priority**: Medium  
**Purpose**: Code matches spec exactly

**Deliverables**:
- Verify reward ratios (1.2x, 1.3x, 1.3x, 1.4x, 1.1x)
- Verify rocket costs (1B, 1.3B, 4B)
- Verify scanner cost (2B)
- Verify M5 payout cap (1.4B)
- Add code comments referencing spec sections

**Developer Benefit**: Single source of truth for all mission parameters

---

## 🎨 Low Priority Tasks

### 7. Mission Progress Tracker UI
**Task**: task-tpl2om  
**Priority**: Low  
**Purpose**: Persistent mission status display

**Deliverables**:
- Shows current mission number and stage
- Displays current objective
- Completion percentage or checklist
- Real-time updates
- Collapsible to save space

**User Benefit**: Always know where you are in progression

### 8. Mission Flowchart Diagrams
**Task**: task-32sidu  
**Priority**: Low  
**Purpose**: Visual mission flow documentation

**Deliverables**:
- M1: Linear tutorial flow
- M2: Upgrade decision path
- M3: Scanner unlock and target selection
- M4: Planet toggle and exploration
- M5: Contractor choice and effects

**Designer Benefit**: At-a-glance understanding of mission flow

---

## 📊 Mission System Overview

### Mission Progression
```
M1: First Launch
├─ Objective: Learn basic loop
├─ Rocket: Starter Rocket 1 (L1, 1B F)
├─ Target: Training Asteroid A (predefined, 3 AU)
├─ Reward: 1.2x (~1.2B F)
└─ Unlocks: M2, SR2

M2: Upgrade Path
├─ Objective: Demonstrate rocket progression
├─ Rocket: Starter Rocket 2 (L2, 1.3B F)
├─ Target: Training Asteroid B (predefined, 12 AU)
├─ Reward: 1.3x (~1.69B F)
└─ Unlocks: M3, Scanner Station

M3: Scanner Unlock
├─ Objective: Introduce scanning and player choice
├─ Rocket: Starter Rocket 2 (L2)
├─ Target: Player-selected asteroid (5 options, 1 reachable)
├─ Cost: 2B F (scanner build)
├─ Reward: 1.3x
└─ Unlocks: M4, SR3, Planet scanning

M4: Planetary Exploration
├─ Objective: Long-range exploration, rare minerals
├─ Rocket: Starter Rocket 3 (L3, 4B F)
├─ Target: Exoplanet Kepler-442b (predefined, 120 AU)
├─ Reward: 1.4x (~5.6B F)
└─ Unlocks: M5, Contractor system

M5: Contractor Missions
├─ Objective: Strategic choice and affinity
├─ Rocket: Any L1+ (recommended SR1/SR2)
├─ Target: Contract Asteroid C (recommended, 8 AU)
├─ Contractors: Rocketlab (20% discount) vs Astroforge (1.15x payout)
├─ Reward: 1.1x base (capped at 1.4B F)
└─ Unlocks: Affinity system
```

### Related Completed Tasks
- task-hcaynf: Gate scanner to M3
- task-x48i3q: Mission selector progression (M1-M3)
- task-srnf59: Create mission 3
- task-vergrc: Create mission 4
- task-jom58m: Create mission 5
- task-4r0j05: Mission progression updates

---

## 🎯 Spec-Driven Development Achieved

### Before
- Mission logic scattered across multiple files
- No single source of truth for mission design
- Tutorial not aligned with mission progression
- Players confused by wall-of-text instructions
- Testing not validated against design spec

### After
- Comprehensive spec document as single source of truth
- All missions documented with clear objectives and flows
- Tutorial system being refactored to be mission-contextual
- Onboarding overlays planned for step-by-step guidance
- Validation tests planned to ensure spec compliance
- Mission constants aligned with spec
- Visual flowcharts planned for designer reference

---

## 📈 Success Metrics

### Developer Experience
- [ ] All mission parameters reference spec document
- [ ] Tests validate against spec automatically
- [ ] New developers can understand mission system from spec alone
- [ ] Code comments link to relevant spec sections

### Player Experience
- [ ] Players understand mission objectives before starting
- [ ] Step-by-step guidance replaces overwhelming text
- [ ] Progress tracker shows current mission status
- [ ] Tutorial adapts to current mission context
- [ ] Briefing screens explain new mechanics clearly

### Design Iteration
- [ ] Spec document updated before implementation
- [ ] Changes validated through automated tests
- [ ] Visual flowcharts aid in design discussions
- [ ] Economic balance documented and testable

---

## 🚀 Implementation Order

1. **Phase 1: Foundation** (Completed)
   - ✅ Create mission spec document

2. **Phase 2: Validation** (High Priority)
   - Add spec validation tests
   - Align mission constants with spec

3. **Phase 3: Onboarding** (High Priority)
   - Create mission onboarding overlays
   - Add mission briefing screens

4. **Phase 4: Tutorial** (Medium Priority)
   - Refactor tutorial to be mission-contextual

5. **Phase 5: Polish** (Low Priority)
   - Add mission progress tracker UI
   - Create mission flowchart diagrams

---

## 📝 Notes

- All tasks created in knowns with appropriate priorities
- Spec document verified against actual code (RocketsManager.gd, RocketSpecs.gd)
- Rocket costs corrected in spec (SR1: 1B, SR2: 1.3B, SR3: 4B)
- Mission reward ratios documented and validated
- Tutorial progression mapped to mission stages
- Future enhancements documented for roadmap planning

---

## 🔗 Quick Links

- **Spec Document**: `.knowns/docs/game-design/mission-system-specification.md`
- **Mission Code**: `scene/Scripts/Utils/RocketsManager.gd`
- **Tutorial Code**: `scene/Scripts/UI/TutorialCoachOverlay.gd`
- **Tests**: `scene/tests/run_experience_tests.gd`

---

**Created**: 2026-02-25  
**Status**: Plan complete, implementation in progress  
**Owner**: @me
