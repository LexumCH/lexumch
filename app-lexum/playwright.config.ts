import { defineConfig, devices } from '@playwright/test';

// Percorsi dell'app nel browser (npm run test:e2e). Playwright avvia da solo
// «expo start --web» sulla porta 8082. La prima volta: npx playwright install chromium.
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8082',
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: 'npx expo start --web --port 8082',
    url: 'http://localhost:8082',
    reuseExistingServer: true,
    timeout: 240_000,
    env: { BROWSER: 'none', CI: '1', EXPO_OFFLINE: '1' },
  },
});
