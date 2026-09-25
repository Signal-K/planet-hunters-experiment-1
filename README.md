# Landnám

A resource management game where players build a launchpad, select single-use Explorer and Prospector vessels, accept client jobs, fly to nearby targets, mine minerals, sell cargo, and reinvest.

> **Migration complete:** Landnam is now 100% Next.js/React — no Godot dependencies. The legacy Godot project (`scene/`) is excluded from the repository and is not used in any build or development workflow.

## 🎮 Game Overview

Landnám’s current release path is focused on the onboarding mining loop. M1 teaches launchpad, mission, target, preflight, mining, and debrief. M2 teaches the Prospector purchase flow with a larger single-use vessel. M3 is not yet fully described and should not be implemented or documented from older plans.

## 📋 Project workflow

Landnam uses **Linear** (Kestloome project) for issue state. Durable product and technical decisions live in the parent Navigation workspace’s ZenNotes; Craft is planning context only. This repository intentionally has no local `.knowns` store or snapshot.

## 🚀 Quick Start

### Prerequisites

- Node.js 24+

### Setup

```bash
cd web
npm ci
npm run dev
```

## 📚 Documentation

- `AGENTS.md` — repository workflow and technical conventions
- Parent Navigation workspace ZenNotes — canonical decisions and specifications
- Craft — planning, research, and feedback context linked from Linear issues

## 🧪 Testing

```bash
cd web
npm run test:unit
npm run test:e2e
```

### Staging / test deployment

Every push to any branch deploys to the staging Worker via CI. To deploy a test build manually:

```bash
cd web
npm run deploy:cf
```

Test URL: https://landnam-web.liam-55d.workers.dev

## 🤝 Contributing

1. Resolve or create the relevant Linear issue.
2. Read the applicable ZenNotes decision or specification in the parent Navigation workspace.
3. Implement and validate the scoped change.
4. Attach implementation evidence to the Linear issue.

## 📊 Project Status

- **Mission System**: active onboarding data is M1-M2
- **M3**: pending new product direction
- **Platforms**: Web/PWA

## 📄 License

[Add license information]
