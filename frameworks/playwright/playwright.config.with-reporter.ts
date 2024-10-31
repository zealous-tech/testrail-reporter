import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/child_tests",
    reporter: [
        ["list"],
        ["../../index.js"]
    ],
    use: {
        screenshot: 'on',
        video: 'retain-on-failure',
    },

});

