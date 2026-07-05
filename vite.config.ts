import tailwindcss from '@tailwindcss/vite'
import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tailwindcss(), solid()],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['**/rynk-kle/**'],
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
})
