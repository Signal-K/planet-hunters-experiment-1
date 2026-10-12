# Settings style

Shared panel style for web Settings, the mining controls guide, the Exchange, and the hangar build config. Native should use the same tokens.

Colours live as custom properties on `:root` in `web/app/globals.css`. Components do not hardcode hex. There is no shadow and no grey border.

| Token | Value | Use |
| --- | --- | --- |
| `--set-bg` | `#eef2f6` | Pale blue-grey page |
| `--set-card` | `#ffffff` | Card and control fill |
| `--set-ink` | `#000000` | 2px card border, headings, selected segment fill |
| `--set-muted` | `#4a5568` | Slate status line |
| `--set-line` | `#000000` | Same black as `--set-ink`, for borders |
| `--set-danger` | `#c8293e` | Reset card and scrub. Same red as `:root` `--ln-crimson`. |
| `--set-radius` | `10px` | Cards and square controls |
| `--set-pad` | `20px` | Card padding and page inset |
| `--set-gap` | `24px` | Space between stacked cards |
| `--set-max` | `640px` | Content column, centred |

## Type and targets

- Headings use `var(--ln-font-display)`, 800, black, uppercase, letter-spacing `0.14em`.
- Card titles are 16px / 700, mixed case, black, same display font.
- The line under a title is 14px / 700, slate, uppercase, letter-spacing `0.08em`. Longer explanations stay 16px sentence case in the same slate.
- Body text stays at least 14px. Tap targets stay at least 44px.

## Layout

- The page is a full-bleed flat scroll. No shadow.
- On a phone the column is 92% of the viewport, centred. On desktop it caps at 720px. Landscape and desktop lay the cards in two columns. Patch notes and Account share one row. Reset stays a full-width card.
- Cards are white, 2px solid `--set-ink`, 10px radius, 20px padding.
- A row is the title and status on the left, the action on the right.
- Actions are uppercase, right-aligned, with a black play triangle. Fill is white, border is 2px black, radius 10px.
- Segmented controls are outlined pills (2px black, radius 999px). The selected pill is solid black with white text.
- Reset progress is its own card. Border and label use `--set-danger`.
- Skip training and reset progress still take two taps. The confirm phrase stays visible before the action runs.
