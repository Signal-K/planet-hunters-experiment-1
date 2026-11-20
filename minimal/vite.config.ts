// Landnam Minimal: the simple, no-context version of Landnam (SSL-864).
// Its own module and build, served by Landnam's site at /minimal/. It imports
// Landnam's real data and rules (@landnam = web/, @shared = shared/) instead of
// copying them, and takes React from web/node_modules so there is one copy.
import { createReadStream, statSync } from 'node:fs'
import { extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { UserConfig } from 'vite' // type only: vite lives in web/node_modules

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const webModules = here('../web/node_modules/')
const webPublic = here('../web/public')

const TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' }

/**
 * Landnam's static art and fonts straight from web/public, so the dev server
 * draws them without Landnam's own dev server running (the proxy below only
 * answers what is not a file there, e.g. generated scene data).
 */
const landnamPublic = {
  name: 'landnam-public',
  configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      const url = (req.url ?? '').split('?')[0]
      if (!url.startsWith('/fonts/') && !url.startsWith('/game/assets/')) return next()
      const file = normalize(webPublic + decodeURIComponent(url))
      if (!file.startsWith(webPublic)) return next()
      try {
        if (!statSync(file).isFile()) return next()
      } catch {
        return next()
      }
      res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream')
      createReadStream(file).pipe(res as unknown as NodeJS.WritableStream)
    })
  },
}

const config: UserConfig = {
  root: here('.'),
  base: '/minimal/',
  publicDir: false,
  plugins: [landnamPublic],
  resolve: {
    alias: [
      { find: /^@landnam\//, replacement: here('../web/') },
      { find: /^@shared\//, replacement: here('../shared/') },
      // Landnam's own files import each other as @/… (web/tsconfig paths).
      { find: /^@\//, replacement: here('../web/') },
      { find: /^react$/, replacement: `${webModules}react/index.js` },
      { find: /^react\/jsx-runtime$/, replacement: `${webModules}react/jsx-runtime.js` },
      { find: /^react\/jsx-dev-runtime$/, replacement: `${webModules}react/jsx-dev-runtime.js` },
      { find: /^react-dom\/client$/, replacement: `${webModules}react-dom/client.js` },
    ],
  },
  oxc: { jsx: { runtime: 'automatic' } },
  // Landnam's globals.css is Tailwind v4 through PostCSS: use Landnam's config.
  css: { postcss: here('../web') },
  // Landnam code reads Next's public env (PocketBase URLs, deploy env). Inline the
  // same NEXT_PUBLIC_* values Next would, from the build's environment (the deploy
  // workflow sets them for build:minimal too). Nothing else from process.env leaks.
  define: {
    'process.env': JSON.stringify(
      Object.fromEntries(Object.entries(process.env).filter(([name]) => name.startsWith('NEXT_PUBLIC_'))),
    ),
  },
  server: {
    port: 4330,
    strictPort: true,
    fs: { allow: [here('..')] },
    // Fonts and art are served from web/public (landnamPublic); anything else under
    // /game comes from Landnam's dev server. In production Minimal is served by the
    // same site, so the paths resolve there.
    proxy: { '/fonts': 'http://localhost:4320', '/game': 'http://localhost:4320' },
  },
  build: {
    outDir: here('../web/public/minimal'),
    emptyOutDir: true,
  },
}

export default config
