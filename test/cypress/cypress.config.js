const { defineConfig } = require("cypress");

module.exports = defineConfig({

  e2e: {
    specPattern: "tests/e2e/**/*.cy.ts", 
    supportFile: false, // This stops Cypress from looking for the file
    setupNodeEvents(on, config) {
     
    },
  },

  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'mocha-junit-reporter, ../../index.js ',
    mochaJunitReporterReporterOptions: {
      mochaFile: 'cypress/results/test-results.xml',
    },
  },
  
  // Global settings
  viewportWidth: 1280,
  viewportHeight: 720,
  video: false,                // Disable video to speed up CI runs
  screenshotOnRunFailure: true,
  defaultCommandTimeout: 6000, // Wait time for commands to complete
  retries: 2,  
  allowCypressEnv: false,                // Number of times to rerun failed tests
  
});