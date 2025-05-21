import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./tests/?(*.)+(spec|test).+(ts|js)'],
    hookTimeout: 2000,
    teardownTimeout: 20000,
    watch: false,
    testTimeout: 25000,
    reporters: ['default']
  },
})