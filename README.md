# Landnám

![Spec Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/YOUR_USERNAME/YOUR_GIST_ID/raw/spec-coverage.json)

A hybrid resource management game and citizen science platform where players explore the solar system, conduct mining missions to real astronomical targets, and contribute to actual scientific discovery.

## 🎮 Game Overview

Landnám combines economic progression with authentic data from space telescopes. In the current release path, players scan the cosmos using real TESS-style planet-candidate data, select targets for resource extraction missions, and analyze celestial objects in a planet-hunting loop that mirrors real astronomical research workflows.

## 📋 Spec-Driven Development

This project follows spec-driven development practices. All features are documented in formal specifications before implementation:

- **Mission System**: [specs/mission-system-specification](/.knowns/docs/specs/mission-system-specification.md)
- **User Flow**: [specs/user-flow-and-citizen-science-specification](/.knowns/docs/specs/user-flow-and-citizen-science-specification.md)
- **Level Progression**: [specs/level-progression-and-unlocks-specification](/.knowns/docs/specs/level-progression-and-unlocks-specification.md)
- **Mining Minigame**: [specs/mining-minigame-system-specification](/.knowns/docs/specs/mining-minigame-system-specification.md)

See [Specifications Index](/.knowns/docs/specs/specifications-index.md) for complete documentation.

## 🚀 Quick Start

### Prerequisites

- Godot 4.5+
- Node.js 18+
- Supabase (local or remote)

### Setup

```bash
# Install dependencies
npm install

# Start Supabase (local)
supabase start

# Export Godot project
./export_godot.sh --target ./build --project ./scene --name game --preset Web --platform web

# Run development server
npm run dev
```

## 📚 Documentation

- **Development**: [.knowns/docs/dev/](/.knowns/docs/dev/)
- **Game Design**: [.knowns/docs/game-design/](/.knowns/docs/game-design/)
- **Specifications**: [.knowns/docs/specs/](/.knowns/docs/specs/)

## 🧪 Testing

```bash
# Run Godot tests
godot --headless --path ./scene --script scene/tests/run_experience_tests.gd

# Run mining tests
godot --headless --path ./scene --script scene/tests/run_mining_tests.gd
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

- [Godot Integration Guide](/.knowns/docs/dev/godot-integration-guide.md)
- [Docker Setup](/.knowns/docs/dev/docker-setup-guide.md)
- [Mission Improvement Plan](/.knowns/docs/game-design/mission-improvement-plan.md)

## 📄 License

[Add license information]
