# Landnám

![Spec Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/YOUR_USERNAME/YOUR_GIST_ID/raw/spec-coverage.json)

A hybrid resource management game and citizen science platform where players explore the solar system, conduct mining missions to real astronomical targets, and contribute to actual scientific discovery.

> **Migration complete:** Landnam is now 100% Next.js/React — no Godot dependencies. The legacy Godot project (`scene/`) is excluded from the repository and is not used in any build or development workflow.

## 🎮 Game Overview

Landnám combines economic progression with authentic data from space telescopes. In the current release path, players scan the cosmos using real TESS-style planet-candidate data, select targets for resource extraction missions, and analyze celestial objects in a planet-hunting loop that mirrors real astronomical research workflows.

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
- Supabase (local or remote)

### Setup

```bash
# Install dependencies
npm install

# Start Supabase (local)
supabase start

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

## 🤝 Contributing

1. Read relevant specification documents in `.knowns/docs/specs/`
2. Create tasks with spec references using `@doc/specs/...`
3. Implement features according to spec
4. Validate implementation against spec with tests

## 📊 Project Status

- **Mission System**: 5 missions implemented (M1-M5)
- **Citizen Science**: Integration planned
- **Platforms**: Web, Desktop (Electron)

## 🔗 Links

- [Docker Setup](/.knowns/docs/dev/docker-setup-guide.md)
- [Mission Improvement Plan](/.knowns/docs/game-design/mission-improvement-plan.md)

## 📄 License

[Add license information]
