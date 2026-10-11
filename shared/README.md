# Shared sources

`shared/tokens/tokens.json` is the source for the generated web palette block and `native/App/Theme.generated.swift`.

Generated files are never hand-edited. Run `npm run sync:shared` from `web/`, and use `npm run sync:shared -- --check` to confirm they are current. That check is local only; it is not a CI job.

Native `Theme.teal` and `Theme.crimson` keep their pre-sync hex values. `Theme.hairline` and `Theme.border` stay derived from `ink`. The SSL-520 dusk scene rules at the bottom of `web/app/globals.css` stay outside the generated block.

Web `public/fonts/*.woff2` is the only font source. Native `.ttf` files are unpacked from those faces. A resave that changes only font timestamps is left untouched.

Native art is triaged rather than bulk-copied. `npm run sync:native-assets` refreshes `docs/native-asset-sync-triage.md` and does not write PNGs. Paths that differ, or that exist only on the web, stay out of the native bundle until there is a reviewed allow-list.
