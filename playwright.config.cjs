const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', testMatch: '**/*.spec.cjs', timeout: 30000, workers: 1, reporter: 'list',
  use: { baseURL: 'http://localhost:3000', headless: true, channel: 'chrome', serviceWorkers: 'block', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'python -m http.server 3000 --directory dist', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 15000 }
});
