import { test, expect } from '@playwright/test';
import {
    openPage, openGtmPage, loadFixture, ui, wrapperMajor, showPreferences, cookieValue, settledDataLayer, events,
    standaloneConfig, legacyConsentCookie, setConsentCookie,
} from './helpers.mjs';

// a visitor with a valid consent never sees the widget again because of the upgrade or a rollback.

const CATEGORIES = ['functionality_storage', 'analytics_storage'];



test.describe('upgrade: cookie of 1.x read by 2.0', () => {
    test.beforeEach(async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { autorun: false } }));
        test.skip(await wrapperMajor(page) < 2, 'migration exists in 2.0 only');
        await page.context().clearCookies();
    });

    const cases = [
        { name: 'cookie of 1.6.0', cookie: () => legacyConsentCookie(CATEGORIES) },
        { name: 'cookie of 1.6.0 with RFC encoding (GTM default)', cookie: () => legacyConsentCookie(CATEGORIES, { rfc: true }) },
        { name: 'cookie of an older 1.x without consent_uuid', cookie: () => legacyConsentCookie(CATEGORIES, { withUuid: false }) },
    ];

    for (const c of cases) {
        test(`standalone: ${c.name} keeps the consent, no widget`, async ({ page }) => {
            await setConsentCookie(page, c.cookie());
            await openPage(page, standaloneConfig());
            await page.waitForTimeout(300);

            await expect(page.locator(await ui(page, 'consentModal'))).toHaveCount(0);
            expect(await page.evaluate(() => window.CookieConsentWrapper.allowedCategory('analytics_storage'))).toBe(true);
            expect(await page.evaluate(() => window.CookieConsentWrapper.allowedCategory('ad_storage'))).toBe(false);
            expect((await events(page)).map(e => e.name)).toEqual(['init', 'consent:accepted']);

            const value = await cookieValue(page);
            expect(value.categories).toEqual(CATEGORIES);
            expect(value.consentId).toBeTruthy();
            expect(value.data.last_action_date).toBeTruthy();
            if (c.name === 'cookie of 1.6.0') {
                expect(value.consentId).toBe('7c5d1a2b-0c3e-4f5a-9b8c-1d2e3f4a5b6c');
                expect(value.consentTimestamp).toBe('2026-09-01T10:00:00.000Z');
            }
        });
    }

    test('GTM (Example Project): cookie of 1.6.0 keeps the consent, no widget', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(CATEGORIES, { rfc: true }));
        await openGtmPage(page, loadFixture('gtm/example-project.json').data);
        await page.waitForTimeout(800); // longer than the delay of the tag (500 ms)

        await expect(page.locator(await ui(page, 'consentModal'))).toHaveCount(0);
        expect(await page.evaluate(() => window.CookieConsentWrapper.allowedCategory('analytics_storage'))).toBe(true);
    });

    test('a different revision shows the widget again', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(CATEGORIES, { revision: 1 }));
        await openPage(page, standaloneConfig({ plugin_options: { revision: 2 } }));

        await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();
    });

    test('the same non-zero revision keeps the consent', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(CATEGORIES, { revision: 3 }));
        await openPage(page, standaloneConfig({ plugin_options: { revision: 3 } }));
        await page.waitForTimeout(300);

        await expect(page.locator(await ui(page, 'consentModal'))).toHaveCount(0);
    });
});

test.describe('rollback: cookie of 2.0 read by 1.6.0', () => {
    async function rollback(page, context) {
        const legacy = await context.newPage();
        await openPage(legacy, standaloneConfig(), { pkg: '/ref/' });
        expect(await wrapperMajor(legacy)).toBe(1);
        await legacy.waitForTimeout(300);
        return legacy;
    }

    test.beforeEach(async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { autorun: false } }));
        test.skip(await wrapperMajor(page) < 2, 'the 2.0 cookie exists in 2.0 only');
        await page.context().clearCookies();
    });

    test('after the first consent', async ({ page, context }) => {
        await openPage(page, standaloneConfig());
        await showPreferences(page);
        await page.locator(await ui(page, 'toggle', 'analytics_storage')).click();
        await page.locator(await ui(page, 'prefsSave')).click();
        await settledDataLayer(page);
        await expect.poll(async () => (await cookieValue(page))?.data?.last_action_date).toBeTruthy();

        const legacy = await rollback(page, context);
        await expect(legacy.locator('#cm')).toBeHidden();
        expect(await legacy.evaluate(() => window.CookieConsentWrapper.allowedCategory('analytics_storage'))).toBe(true);
        expect(await legacy.evaluate(() => window.CookieConsentWrapper.allowedCategory('ad_storage'))).toBe(false);
    });

    test('after a change of the preferences of a migrated cookie', async ({ page, context }) => {
        await setConsentCookie(page, legacyConsentCookie(CATEGORIES));
        await openPage(page, standaloneConfig());
        await showPreferences(page);
        await page.locator(await ui(page, 'toggle', 'ad_storage')).click();
        await page.locator(await ui(page, 'prefsSave')).click();
        await settledDataLayer(page);

        const legacy = await rollback(page, context);
        await expect(legacy.locator('#cm')).toBeHidden();
        expect(await legacy.evaluate(() => window.CookieConsentWrapper.allowedCategory('ad_storage'))).toBe(true);
    });
});
