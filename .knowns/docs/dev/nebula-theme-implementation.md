---
title: Nebula Theme Implementation
createdAt: '2026-02-25T08:23:18.694Z'
updatedAt: '2026-02-26T02:06:58.109Z'
description: Complete UI/visual redesign with nebula space backgrounds and sci-fi styling
spec: true
tags:
  - ui
  - theme
  - design
  - nebula
---
# Nebula Sci-Fi Theme Implementation

## Overview
Complete UI/visual redesign based on reference images featuring nebula space backgrounds and alien desert landscapes.

## Theme Resource
**File:** `scene/Resources/NebulaSciTheme.gd`

### Color Palette
- **Nebula Colors:** Deep purple, purple, pink, orange, cyan gradients
- **UI Colors:** Dark translucent panels with bright white outlines
- **Accents:** Bright green and cyan blue for interactive elements

### Style Functions
- `create_panel_style()` - Panels with 3px white borders, 12px rounded corners
- `create_button_style()` - Buttons with 2px borders, 8px rounded corners
- `create_segmented_bar()` - Icon-based progress bars (like reference image 1)
- `create_nebula_gradient()` - Purple→Pink→Orange gradient for backgrounds

## Updated Files

### Core Theme System
1. **PanelStyle.gd** - Updated to use NebulaSciTheme colors
   - Thicker borders (3px panels, 2px buttons)
   - Nebula color palette
   - Brighter text colors

### Space Backgrounds
2. **SpaceMap.gd** - Nebula gradient background instead of solid black
   - 4-layer gradient rendering
   - Brighter orbit lines with theme colors
   - Enhanced text visibility

3. **AsteroidPreview.gd** - Nebula environment lighting
   - Purple ambient background
   - Pink ambient lighting
   - `_add_nebula_environment()` function

### Mining Scene (Alien Desert)
4. **SidescrollMining.gd** - Alien desert landscape
   - Orange-brown terrain (Color(0.65, 0.35, 0.25))
   - Orange desert outline (Color(0.85, 0.55, 0.35))
   - Nebula sky background with gradient
   - `_add_nebula_sky()` function

### UI Components
5. **NebulaBackground.gd** - Reusable background component
   - Gradient texture with star particles
   - Can be added to any scene

## Visual Changes

### Panels
- Background: Dark translucent (0.05, 0.05, 0.08, 0.85)
- Border: Bright white/pink (0.95, 0.85, 0.95)
- Border width: 3px (was 1px)
- Corner radius: 12px
- Stronger shadows

### Buttons
- Normal: Dark background with white border
- Primary: Cyan blue background
- Hover: Lighter purple
- Border width: 2px
- Corner radius: 8px

### Backgrounds
- Space scenes: Purple→Pink→Orange nebula gradient
- Mining scene: Orange desert ground with nebula sky
- Atmospheric depth with gradient layers

### Text
- Primary: Bright white (0.95, 0.95, 0.98)
- Muted: Light gray (0.7, 0.7, 0.75)
- High contrast for readability

## Next Steps (Optional Enhancements)

1. **Icon-based resource display** - Convert mineral/resource lists to icon grid (like reference image 1)
2. **Segmented progress bars** - Replace standard bars with block segments
3. **Alien rock formations** - Add tall spire-like rocks to mining background
4. **Multiple moons** - Add celestial bodies to mining sky
5. **Atmospheric haze** - Add depth fog to mining scene
6. **Glow effects** - Add bloom/glow to UI elements and minerals

## Testing
Run any scene to see the new theme:
- Space Map: Nebula gradient background
- Asteroid Preview: Purple ambient lighting
- Mining Scene: Orange desert with nebula sky
- All UI: White-outlined panels and buttons


## Shared UI Style Usage (2026-02-26)

Use `PanelStyle.gd` as the default source for runtime-created UI visuals.

- Use `PanelStyle.create_card_style()` or `create_list_item_style()` for `PanelContainer` cards instead of building `StyleBoxFlat` from scratch.
- Use `PanelStyle` text tokens (`TEXT_PRIMARY`, `TEXT_MUTED`, `ACCENT`) for runtime label colors.
- Use `PanelStyle.apply_progress_bar()` for progress bars.
- Use `Logger.d`/`Logger.w` instead of `print()` in UI scripts.

Intentional opt-outs are allowed for tutorial guidance overlays where stronger highlight affordance is required.
When opting out, keep an inline comment in code that explains why shared defaults are not used.
