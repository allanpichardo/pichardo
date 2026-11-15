import {defineConfig, devices} from '@playwright/test';

const artistUrl = process.env.ARTIST_URL ?? 'http://127.0.0.1:3000';
const professionalUrl = process.env.PROFESSIONAL_URL ?? 'http://127.0.0.1:3001';
for (const url of [artistUrl, professionalUrl]) {
  if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
    throw new Error(
      'Browser smoke tests may run only against loopback origins.',
    );
  }
}
if (
  !process.env.E2E_EXTERNAL &&
  !new URL(process.env.DATABASE_URL ?? '').pathname.endsWith('_test')
) {
  throw new Error('Browser tests require a separate database ending in _test.');
}
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  throw new Error(
    'Bootstrap the test administrator and set ADMIN_EMAIL and ADMIN_PASSWORD.',
  );
}
const production = process.env.E2E_PRODUCTION === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/browser',
  timeout: 60000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_EXTERNAL
    ? undefined
    : [
        {
          command: `pnpm --filter @pichardo/artist ${production ? 'start' : 'dev'}`,
          url: `${artistUrl}/health`,
          timeout: 120000,
          env: {
            NODE_ENV: production ? 'production' : 'development',
            PAYLOAD_DB_PUSH: 'false',
          },
        },
        {
          command: `pnpm --filter @pichardo/professional ${production ? 'start' : 'dev'}`,
          url: `${professionalUrl}/health`,
          timeout: 120000,
          env: {NODE_ENV: production ? 'production' : 'development'},
        },
      ],
});
