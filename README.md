# Landnám

![Spec Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/YOUR_USERNAME/YOUR_GIST_ID/raw/spec-coverage.json)

A resource management game where players build a launchpad, buy single-use starter rockets, accept contractor jobs, fly to nearby targets, mine minerals, sell cargo, and reinvest.

> **Migration complete:** Landnam is now 100% Next.js/React — no Godot dependencies. The legacy Godot project (`scene/`) is excluded from the repository and is not used in any build or development workflow.

## 🎮 Game Overview

Landnám’s current release path is focused on the onboarding mining loop. M1 teaches launchpad, mission, target, preflight, mining, and debrief. M2 teaches the newer SR2 purchase flow with a larger single-use starter rocket. M3 is not yet fully described and should not be implemented or documented from older plans.

## 📋 Spec-Driven Development

This project follows spec-driven development practices. All features are documented in formal specifications before implementation:

- **Mission System**: [specs/mission-system-specification](/.knowns/docs/specs/mission-system-specification.md)
- **User Flow**: [specs/user-flow-and-citizen-science-specification](/.knowns/docs/specs/user-flow-and-citizen-science-specification.md)
- **Level Progression**: [specs/level-progression-and-unlocks-specification](/.knowns/docs/specs/level-progression-and-unlocks-specification.md)
- **Mining Minigame**: [specs/mining-minigame-system-specification](/.knowns/docs/specs/mining-minigame-system-specification.md)

See [Specifications Index](/.knowns/docs/specs/specifications-index.md) for complete documentation.

## Backend Credentials

### PocketBase Superuser (both instances)

| Instance | URL | Email | Password |
|----------|-----|-------|----------|
| Shared backend (`~/Navigation/backend/`) | `http://localhost:8090/_/` | `liam@skinetics.tech` | `ThisIsATestPassword` |
| Landnam backend (`~/Navigation/Landnam/pocketbase/`) | `http://localhost:8091/_/` | `liam@skinetics.tech` | `ThisIsATestPassword` |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Node.js 18+

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## 📚 Documentation

- **Development**: [.knowns/docs/dev/](/.knowns/docs/dev/)
- **Game Design**: [.knowns/docs/game-design/](/.knowns/docs/game-design/)
- **Specifications**: [.knowns/docs/specs/](/.knowns/docs/specs/)

## 🧪 Testing

```bash
# Run web tests
npm test

# Run Cypress e2e tests
npx cypress run
```

### Staging / test deployment

Deploy test builds to the stable test origin (separate from production):

```bash
cd web
npm run deploy:test
```

Test URL: https://landnam-test.vercel.app

## 🤝 Contributing

1. Read relevant specification documents in `.knowns/docs/specs/`
2. Create tasks with spec references using `@doc/specs/...`
3. Implement features according to spec
4. Validate implementation against spec with tests

## 📊 Project Status

- **Mission System**: active onboarding data is M1-M2
- **M3**: pending new product direction
- **Platforms**: Web/PWA

## 🔗 Links

- [Docker Setup](/.knowns/docs/dev/docker-setup-guide.md)
- [Mission Improvement Plan](/.knowns/docs/game-design/mission-improvement-plan.md)

## 📄 License

[Add license information]
