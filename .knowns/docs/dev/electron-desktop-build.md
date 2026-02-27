---
title: Electron Desktop Build
createdAt: '2026-02-25T08:23:18.511Z'
updatedAt: '2026-02-25T08:23:32.817Z'
description: Running Godot game in desktop Node.js runtime via Electron
tags:
  - electron
  - desktop
  - build
  - deployment
---
# Electron Desktop Build

This project can run the Godot game in a desktop Node.js runtime via Electron.

## Prerequisites

- Node.js 18+
- Godot 4.5+ with Web export templates

If Godot is not in a default path, set:

```bash
export GODOT_EDITOR=/path/to/Godot
```

## Commands

```bash
npm install
npm run godot:export:desktop
npm run electron:dev
```

For packaged desktop output:

```bash
npm run electron:pack
```

For distributable artifacts:

```bash
npm run electron:dist
```

## Output Paths

- Godot web export: `electron-dist/godot-web`
- Electron packaged output: `dist/`

The Electron app hosts the exported Godot web files from a local HTTP server inside the Electron main process.
