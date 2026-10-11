# Shared sources

`shared/tokens/tokens.json` is the source for the generated web palette block and `native/App/Theme.generated.swift`.

Generated files are never hand-edited. Run `npm run sync:shared` from `web/`, and use `npm run sync:shared -- --check` to confirm they are current. Native assets are intentionally triaged rather than bulk-overwritten; run `npm run sync:native-assets` to refresh the review list.
