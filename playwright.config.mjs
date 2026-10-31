import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.CC_PORT || 4173);

export default defineConfig({
    testDir: 'tests',
    testMatch: 'e2e/**/*.spec.mjs',
    outputDir: 'test-results',
    // text snapshots are shared by all browsers and platforms; screenshots get their own template
    snapshotPathTemplate: '{testDir}/e2e/__snapshots__/{testFileName}/{arg}{ext}',
    expect: {
        toHaveScreenshot: {
            pathTemplate: '{testDir}/visual/__screenshots__/{arg}-{platform}{ext}',
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.01,
        },
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
    use: {
        baseURL: `http://localhost:${port}`,
        locale: 'cs-CZ',
        timezoneId: 'Europe/Prague',
    },
    webServer: {
        command: 'node tests/server.mjs',
        url: `http://localhost:${port}/tests/fixtures/page.html`,
        reuseExistingServer: !process.env.CI,
        env: { CC_TARGET: process.env.CC_TARGET || 'var/build', CC_PORT: String(port) },
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        // visual snapshots: Chromium on macOS only (references are platform specific)
        ...(process.platform === 'darwin' && !process.env.CC_NO_VISUAL ? [{
            name: 'visual',
            testMatch: 'visual/**/*.spec.mjs',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
        }] : []),
    ],
});
