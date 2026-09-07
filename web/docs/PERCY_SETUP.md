# Percy Visual Regression Testing

Percy is configured for automated screenshot comparison to catch visual regressions.

## Setup

1. **Install Percy CLI** (CI only, not needed locally):
   ```bash
   npm install --save-dev @percy/cli @percy/cypress
   ```

2. **Set Percy token** in CI environment:
   ```bash
   export PERCY_TOKEN=<your-token-here>
   ```

3. **Run visual regression tests**:
   ```bash
   # Local (builds baselines for new features)
   npm run percy

   # CI (compares against baselines)
   PERCY_TOKEN=$PERCY_TOKEN npm run percy
   ```

## How It Works

- `.percyrc.yml` configures snapshot widths: mobile (390px), tablet (768px), desktop (1440px)
- `responsive/critical-screens-matrix.cy.ts` defines which screens to snapshot
- Percy automatically compares new screenshots against approved baselines
- Failed comparisons block CI until reviewed and approved

## Screenshot Locations

- **Baseline**: `https://percy.io/landnam-web/...`
- **CI builds**: Automatic on every PR
- **Local builds**: `npm run percy` for manual baseline creation

## Disabling Dynamic Content

Timers, ETAs, and other dynamic content are hidden via `percyCSS` in `.percyrc.yml`:
- `[data-testid="mining-timer"]`
- `[data-testid="transit-eta"]`
- `[data-testid="current-time"]`

Add more selectors if content varies between runs.

## CI Integration

Add to GitHub Actions / CI pipeline:

```yaml
- name: Visual Regression Tests
  run: |
    npm install -g @percy/cli
    npm run percy
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

## Local Development

To generate new baselines locally:
```bash
PERCY_TOKEN=<local-token> npm run percy
```

All screenshots are compared, new baselines are auto-created on first run.
