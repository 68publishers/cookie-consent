import { test, expect } from '@playwright/test';
import { openPage, ui, wrapperMajor, standaloneConfig, legacyConsentCookie } from './helpers.mjs';

// two consent cookies on www.<domain> and .<domain>. The chromium project maps *.cc.test to localhost.

test('a copy of the consent cookie outside cookie_domain is removed before the plugin reads it', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'host resolver rules are a Chromium flag');
    const port = Number(process.env.CC_PORT || 4173);
    const base = `http://www.cc.test:${port}`;
    const stale = legacyConsentCookie(['functionality_storage'], { rfc: true, withUuid: false, revision: 7 });
    const valid = legacyConsentCookie(['functionality_storage', 'analytics_storage'], { rfc: true });

    await page.addInitScript(([s, v]) => {
        if (!sessionStorage.getItem('cookies-set')) {
            sessionStorage.setItem('cookies-set', '1');
            document.cookie = `cc-settings=${s}; path=/`; // host-only on www.cc.test
            document.cookie = `cc-settings=${v}; path=/; domain=cc.test`;
        }
    }, [stale, valid]);
    await openPage(page, standaloneConfig({ plugin_options: { cookie_domain: '.cc.test' } }), { path: `${base}/tests/fixtures/page.html` });
    test.skip(await wrapperMajor(page) < 2, 'clients solved this by a custom tag in 1.x');
    await page.waitForTimeout(300);

    const cookies = (await page.context().cookies(base)).filter(c => c.name === 'cc-settings');
    expect(cookies).toHaveLength(1);
    expect(cookies[0].domain).toBe('.cc.test');
    await expect(page.locator(await ui(page, 'consentModal'))).toHaveCount(0);
    expect(await page.evaluate(() => window.CookieConsentWrapper.allowedCategory('analytics_storage'))).toBe(true);
});
