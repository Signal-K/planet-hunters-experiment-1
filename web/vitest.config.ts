import { configDefaults, defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Browser matrices are retired; colocated unit tests are the only Vitest input.
    exclude: [...configDefaults.exclude, 'tests/**', '.next/**', '.open-next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
