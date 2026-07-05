import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [tailwindcss(), solid()],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['**/rynk-kle/**'],
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
})
