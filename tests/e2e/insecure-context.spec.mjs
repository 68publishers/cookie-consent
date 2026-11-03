import { test, expect } from '@playwright/test';
import { openPage, ui, wrapperMajor, cmpConfig } from './helpers.mjs';

// HTTPS is a prerequisite of 2.0 (WebCrypto). On http:// the widget works, but no consent is sent to the CMP.
// localhost is a secure context, so the chromium project maps *.cc.test to it.

test('on http:// the consent is saved, the CMP gets nothing and a warning is logged', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'host resolver rules are a Chromium flag');
    const warnings = [];
    page.on('console', m => m.type() === 'warning' && warnings.push(m.text()));
    const base = `http://www.cc.test:${Number(process.env.CC_PORT || 4173)}`;

    await openPage(page, cmpConfig(), { path: `${base}/tests/fixtures/page.html` });
    test.skip(await wrapperMajor(page) < 2, 'HTTPS is required since 2.0');
    expect(await page.evaluate(() => window.isSecureContext)).toBe(false);

    await page.locator(await ui(page, 'acceptAll')).click();
    await expect.poll(async () => (await page.context().cookies(base)).some(c => c.name === 'cc-settings')).toBe(true);
    await expect.poll(() => warnings.some(w => w.includes('not sent into the CMP'))).toBe(true);
    expect(await page.evaluate(() => (window.__cmpRequests || []).filter(r => r.endpoint === 'consent'))).toEqual([]);
});
