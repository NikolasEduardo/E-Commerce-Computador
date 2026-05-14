const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: "{insira seu projectId do cypress aqui}",
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    defaultCommandTimeout: 15000,
    requestTimeout: 30000,
    responseTimeout: 60000,
    viewportWidth: 1366,
    viewportHeight: 768,
    video: false
  }
});
