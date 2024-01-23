import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        hookTimeout: 20000,
        teardownTimeout: 200000,
        reporters: ['default', '@zealteam/testrail-reporter'],
    },
});
