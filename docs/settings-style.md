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

- Settings is a centered instrument card over the live scene. The scene and the shared HUD stay visible. The card caps at 640px, with a pixel sky header (cream and blue only) and a sticky Settings title.
- Display is the first card. On a narrow card the orientation choices stack full width so Landscape is never clipped. When the card is wide enough they sit in one row. Training is one row, Replay tutorials, which starts again from mining. Patch notes is a text link, not a card. Account and reset stay their own cards. The Debug preset list is hidden unless the page is opened with `?dev=1` on a dev or staging build.
- Cards are white, 2px solid `--set-ink`, square corners, 24px padding, with space between them.
- A row is the title and status on the left and the action on the right. On a narrow card the action drops under the title and spans the row.
- Actions are uppercase, at least 52px tall, with a play triangle. Fill is white, border is 2px ink.
- Segmented controls are square (2px ink). The selected choice is solid blueprint blue with white text.
- Reset progress is its own card. Border and label use `--set-danger`. Reset still takes two taps. The confirm phrase stays visible before the action runs.
