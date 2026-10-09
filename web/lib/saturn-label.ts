/**
 * The Saturn instrument is a "Saturn satellite" everywhere (SSL-492). Saves from
 * before the rename stored "Saturn Imager" in mission titles and history, so
 * every label is normalised on load and on display.
 */
export function canonicalSaturnLabel(label: string): string {
  return label.replace(/saturn[\s-]+imager/gi, 'Saturn satellite')
}
