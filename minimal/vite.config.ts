// Landnam Minimal: the simple, no-context version of Landnam (SSL-864).
// Its own module and build, served by Landnam's site at /minimal/. It imports
// Landnam's real data and rules (@landnam = web/, @shared = shared/) instead of
// copying them, and takes React from web/node_modules so there is one copy.
import { fileURLToPath } from 'node:url'
import type { UserConfig } from 'vite' // type only: vite lives in web/node_modules

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const webModules = here('../web/node_modules/')

const config: UserConfig = {
  root: here('.'),
  base: '/minimal/',
  publicDir: false,
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
  server: {
    port: 4330,
    strictPort: true,
    fs: { allow: [here('..')] },
    // Landnam's fonts and art are served by Landnam's own dev server.
    proxy: { '/fonts': 'http://localhost:4320', '/game/assets': 'http://localhost:4320' },
  },
  build: {
    outDir: here('../web/public/minimal'),
    emptyOutDir: true,
  },
}

export default config
