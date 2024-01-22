import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        watch:false,
        hookTimeout: 20000,
        teardownTimeout: 200000,
        reporters: ['default', 'testrail-reporter'],
    },
});
