# Build mode hides the HUD and holds rearranging (2026-11-13)

Liam, on the iPad notes of 13 November (SSL-834): "Remove all UI if the build menu is selected. That's the point. If user is building, ui should be gone."

- While the player is in Build on the Base, every piece of HUD is hidden: the clock, the francs and sync/offline chips, the inbox bell, the data-ready and event chips, and the bottom bar.
- Outside Build the HUD stays exactly as it is.
- Build is a single row on the edge of the screen. It names the structure the player has tapped, and has Move left and right, Upgrade where the structure can be upgraded, and Done. Done leaves Build and brings the HUD back.
- Rearranging the Base happens inside Build. There is no separate Rearrange item in the Command menu.
