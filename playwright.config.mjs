import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    repeatEach: 2,
    timeout: 90000,
    expect: { timeout: 10000 },
    reporter: [['list'], ['json', { outputFile: '.local-test/playwright-results.json' }]],
    outputDir: '.local-test/playwright-artifacts',
    use: {
        baseURL: 'http://127.0.0.1:15179',
        channel: 'chrome',
        viewport: { width: 1366, height: 768 },
        timezoneId: 'Asia/Colombo',
        serviceWorkers: 'block',
        trace: 'retain-on-failure', screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 15179 --strictPort',
        url: 'http://127.0.0.1:15179',
        env: { VITE_USE_EMULATORS: 'true' },
        reuseExistingServer: false,
    },
});
