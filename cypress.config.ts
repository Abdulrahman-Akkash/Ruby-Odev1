import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 760,
    defaultCommandTimeout: 15000,
  },
  // Demo videosu: npm run demo:record → cypress/videos/demo.cy.ts.mp4
  video: true,
  videoCompression: 28,
  screenshotOnRunFailure: true,
})
