---
title: Codebase Health Audit
description: Comprehensive audit of stale and duplicate code
createdAt: '2026-05-14T00:25:08.424Z'
updatedAt: '2026-05-14T00:46:23.079Z'
tags:
  - project-landnam
  - audit
  - tech-debt
---

# Codebase Health Audit

## Findings Summary

### 1. Instruction & Config Redundancy
- **Files**: `AGENTS.md` and `CLAUDE.md` in root are ~99% identical.
- **Web Duplication**: `web/AGENTS.md` is a subset of the root version but uses different terminology (CLI vs MCP), leading to documentation drift.
- **Skills**: `.agent/skills/` and `.claude/skills/` appear to duplicate logic for different agents.

### 2. Code Duplication (Ingestion Scripts)
- **Files**: `scripts/ingest-active-asteroids.mjs`, `scripts/ingest-cloudspotting-mars.mjs`, `scripts/ingest-gaia-variables.mjs`, `scripts/ingest-rubin-comet-catchers.mjs`.
- **Issue**: These scripts share ~90% of their logic (argument parsing, fetching from Panoptes, normalization loops, upserting). They should be refactored into a single configuration-driven script.

### 3. Stale & Transient Files
- **Files**:
  - `anomalies_rows.csv` (Root)
  - `anomaly_lightkurve_map.csv` (Root)
  - `tour-output.log` (Root)
- **Recommendation**: These appear to be one-off artifacts and should be removed or moved to a gitignored `data/` folder.

### 4. Legacy/Unused Directories
- **Paths**: `stitch/`, `web/stitch-designs/`.
- **Observation**: These contain static HTML/PNG exports from design tools. If they are no longer needed for reference, they should be archived.

### 5. Architectural & Dependency Notes
- **Supabase**: Version mismatch between root (`^2.39.0`) and web (`^2.95.3`).
- **Tooling**: Root uses `node-fetch`, while Web uses Next.js native fetch. Consolidation could simplify the environment.
