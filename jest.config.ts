module.exports = {
  testMatch: ["**/tests/**/*.spec.js"],

  // Timeout similar to Playwright globalTimeout
  testTimeout: 60 * 60 * 1000,

  // Reporters
  reporters: [
    "default", // similar to "list"
    ["@zealteam/testrail-reporter"]
  ],

  // Run tests in parallel (default in Jest)
  // maxWorkers: "50%",

  // Collect coverage (optional)
  // collectCoverage: true,

  // Verbose output (similar to list reporter feel)
  verbose: true,
};