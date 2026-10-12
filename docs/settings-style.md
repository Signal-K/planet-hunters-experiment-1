# Settings style

Web Settings (`web/components/game/SettingsSheet.tsx`) is the screen this look was written for. The mining controls guide reuses the same tokens as a full-screen page: flat grey ground, separate white cards, and the same button treatment. It matches a light admin dashboard: white cards on a grey page, quiet controls, a separate danger card for reset. Native should use the same tokens when Settings is restyled there.

Colours live as custom properties on `.ops-settings` in `web/app/globals.css`. Components do not hardcode hex.

| Token | Value | Use |
| --- | --- | --- |
| `--set-bg` | `#f3f4f6` | Page background |
| `--set-card` | `#ffffff` | Card and control fill |
| `--set-line` | `#e5e7eb` | 1px card, row, and button borders |
| `--set-ink` | `#111827` | Titles, row names, switch-on track |
| `--set-muted` | `#4b5563` | Section labels, subtitles, note body |
| `--set-danger` | `#c8293e` | Danger card mix and the reset button. Same red as `:root` `--ln-crimson`. |
| `--set-radius` | `8px` | Cards, buttons, close control |
| `--set-pad` | `20px` | Card padding and page inset |
| `--set-gap` | `16px` | Space between stacked cards and notes |
| `--set-max` | `640px` | Content column, centred |

## Type and targets

- Font is `system-ui, sans-serif` on this screen only.
- Page title is 20px / 600, sentence case.
- Section labels are 14px / 600, uppercase, letter-spacing `0.08em`, muted, with 24px of space above (8px under the page title).
- Row titles are 14px / 600, sentence case. Subtitles are 14px / 400, muted.
- Body text stays at least 14px. Tap targets stay at least 44px.

## Layout

- The page is a full-bleed grey scroll. It is not a centred modal.
- The column is `min(640px, 100%)`, centred, with 20px side inset and 32px below the last card.
- Cards are white, 1px `--set-line`, 8px radius, 20px horizontal padding.
- Rows are space-between, 16px vertical padding, hairline between rows, no hairline on the last row.
- Controls sit on the right: outline button (white fill, 1px grey border, 8px radius, sentence case) or a switch.
- The switch hit area is 64×44. The pill is 28px tall, full width of the hit area, radius 999px. Off track is `--set-line` with a white 22px knob. On track is `--set-ink`.
- Reset progress is its own card under Game. Border is `color-mix(in srgb, var(--set-danger) 45%, var(--set-line))`. The button uses a `--set-danger` outline and label.
- Skip training and reset progress still take two taps. The confirm phrase stays visible before the action runs.
