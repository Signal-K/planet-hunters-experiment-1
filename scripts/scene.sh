#!/usr/bin/env bash
# View or check individual scenes without playing the game.
#   scripts/scene.sh list                      every web preset with its hint
#   scripts/scene.sh cp-mid                    screenshot + checks at phone, landscape, desktop -> /tmp/landnam-scenes/
#   scripts/scene.sh cp-mid ui-market ph       several presets, optional last arg ph|ls|dk
#   scripts/scene.sh all                       the whole matrix (about 4 min)
#   scripts/scene.sh native hub-phone          native SceneCatalog snapshot (needs a booted simulator)
# Checkpoints jump to a point in the hour: cp-early (~15 min), cp-mid (~35), cp-late (~55).
# Tweak state in a browser: http://localhost:4320/game/stage?preset=cp-mid&patch={"francs":0}
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT=/tmp/landnam-scenes; mkdir -p "$OUT"
cd "$ROOT/web"
if [ "${1:-}" = native ]; then shift; exec "$ROOT/scripts/native-shots.sh" "$@"; fi
if [ "${1:-}" = list ]; then
  node --input-type=module -e "
    import { readFileSync } from 'node:fs'
    const s = readFileSync('lib/devPresets.ts','utf8')
    for (const m of s.matchAll(/key: '([^']+)', label: '[^']*', hint: '([^']*)'/g)) console.log(m[1].padEnd(24), m[2])"
  exit 0
fi
VP=""; ARGS=("$@")
case "${ARGS[${#ARGS[@]}-1]:-}" in ph) VP=phone;; ls) VP=landscape;; dk) VP=desktop;; esac
[ -n "$VP" ] && unset 'ARGS[${#ARGS[@]}-1]'
if [ "${ARGS[0]:-all}" = all ]; then GREP="${VP:-.}"; else GREP="${VP:-(phone|landscape|desktop)}.*($(IFS='|'; echo "${ARGS[*]}")) is sound"; fi
rm -rf tests/.out/screens-*
SCENES_CHANNEL="${SCENES_CHANNEL:-chrome}" npx playwright test screens.spec.ts --grep "$GREP" --reporter=line 2>&1 | grep -vE 'Deprecation|trace-deprecation|pid=' | tail -25 || true
for f in tests/.out/screens-*/*.png; do [ -f "$f" ] && cp "$f" "$OUT/"; done
echo "Screenshots: $OUT"; ls "$OUT" | head -40
