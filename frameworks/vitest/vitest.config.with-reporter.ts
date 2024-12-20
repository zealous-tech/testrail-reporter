import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./tests/child_tests/?(*.)+(spec|test).+(ts|js)'],
    hookTimeout: 20000,
    teardownTimeout: 20000,
    watch: false,
    pool: 'threads',
    testTimeout: 2500,
    reporters: ['default',  "../../index.js"]
  },
  
})