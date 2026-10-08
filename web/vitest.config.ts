import { configDefaults, defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // tests/ holds Playwright scene specs; they run under `npm run test:scenes`.
    exclude: [...configDefaults.exclude, 'tests/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
