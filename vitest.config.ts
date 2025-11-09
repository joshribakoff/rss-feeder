import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Vitest will run from the project root, not the client directory
    root: '.',
    // Include test files from the tests directory
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
})
