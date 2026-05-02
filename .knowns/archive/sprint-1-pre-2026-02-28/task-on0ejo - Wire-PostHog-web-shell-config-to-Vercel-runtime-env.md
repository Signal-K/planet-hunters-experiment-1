---
id: on0ejo
title: Wire PostHog web shell config to Vercel runtime env
status: done
priority: high
labels:
  - posthog
  - vercel
  - web
createdAt: '2026-02-27T06:08:06.460Z'
updatedAt: '2026-02-27T06:12:35.726Z'
timeSpent: 246
assignee: '@me'
---
# Wire PostHog web shell config to Vercel runtime env

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace hardcoded PostHog web shell values with runtime config loaded from Vercel env vars, while preserving safe fallbacks for local development.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 react-shell reads PostHog config from runtime endpoint with fallback defaults
- [x] #2 web/public/app.js reads PostHog config from runtime endpoint with fallback defaults
- [x] #3 No personal API token is exposed to browser runtime config
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add /api/runtime-config endpoint that exposes only safe public runtime config (PostHog project token/region/survey id + optional Supabase public keys), mapping current Vercel variable names.
2. Update react-shell.js to lazily load runtime config once and use it for PostHog/survey (with existing constants as fallback).
3. Update web/public/app.js with the same runtime config loading pattern for parity with local shell server usage.
4. Validate by static checks and summarize exact env names consumed; ensure personal token is not exposed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation: node syntax check passed for web/public/app.js and api/runtime-config.js. react-shell.js contains browser ESM imports so Node script check is not directly applicable.
<!-- SECTION:NOTES:END -->

