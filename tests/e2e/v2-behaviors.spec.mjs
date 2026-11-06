import { test, expect } from '@playwright/test';
import {
    openPage, ui, wrapperMajor, showPreferences, cookieValue, events,
    standaloneConfig,
} from './helpers.mjs';

// Behaviors added in 2.0.

test.beforeEach(async ({ page }) => {
    await openPage(page, standaloneConfig({ plugin_options: { autorun: false } }));
    test.skip(await wrapperMajor(page) < 2, '2.0 only');
    await page.context().clearCookies();
});

test.describe('lazy locales', () => {
    test('only the current locale is loaded before the widget, others on changeLocale()', async ({ page }) => {
        const requests = [];
        page.on('request', r => r.url().includes('/translations/') && requests.push(new URL(r.url()).pathname));
        await openPage(page, standaloneConfig({ locales: ['cs', 'en', 'de'] }));
        await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();

        expect(requests).toEqual(['/pkg/translations/cs.json']);

        await page.evaluate(() => window.CookieConsentWrapper.changeLocale('de', true));
        await expect(page.locator(await ui(page, 'consentTitle'))).toHaveText('Wir verwenden Cookies!');
        expect(requests).toEqual(['/pkg/translations/cs.json', '/pkg/translations/de.json']);
    });
});

test.describe('consent:saved and an unclosable settings modal', () => {
    test('consent:saved after accept all, save without a change and reject', async ({ page }) => {
        await openPage(page, standaloneConfig());
        const saved = async () => (await events(page)).filter(e => e.name === 'consent:saved');

        await page.locator(await ui(page, 'acceptAll')).click();
        await expect.poll(async () => (await saved(page)).length).toBe(1);

        await showPreferences(page);
        await page.locator(await ui(page, 'prefsSave')).click();
        await expect.poll(async () => (await saved(page)).length).toBe(2);

        await showPreferences(page);
        await page.locator(await ui(page, 'prefsRejectAll')).click();
        await expect.poll(async () => (await saved(page)).length).toBe(3);

        const last = (await saved(page))[2].args[0];
        expect(last.functionality_storage).toBe('granted');
        expect(last.analytics_storage).toBe('denied');
        // only the third action changes the consent (the first one is the first consent); consent:saved comes after consent:changed
        const names = (await events(page)).map(e => e.name).filter(n => n !== 'consent:accepted');
        expect(names).toEqual(['init', 'consent:first-action', 'consent:saved', 'consent:saved', 'consent:changed', 'consent:saved']);
    });

    test('setSettingsModalClosable(false): no close icon, Escape and the overlay do nothing, the modal re-opens after saving', async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { autorun: false } }));
        await page.evaluate(() => window.CookieConsentWrapper.setSettingsModalClosable(false));
        await showPreferences(page);
        const modal = page.locator(await ui(page, 'preferencesModal'));

        await expect(page.locator(await ui(page, 'prefsClose'))).toBeHidden();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(modal).toBeVisible();

        await page.locator('#cc-main .pm-overlay').click({ position: { x: 5, y: 5 }, force: true });
        await page.waitForTimeout(300);
        await expect(modal).toBeVisible();

        await page.locator(await ui(page, 'prefsAcceptAll')).click();
        await expect.poll(async () => (await cookieValue(page))?.categories?.length).toBe(4);
        await page.waitForTimeout(600);
        await expect(modal).toBeVisible();

        await page.evaluate(() => window.CookieConsentWrapper.setSettingsModalClosable(true));
        await page.locator(await ui(page, 'prefsClose')).click();
        await expect(modal).toBeHidden();
    });

    test('the mobile app tag of 1.x (hideSettings replaced) works unchanged', async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { autorun: false } }));
        await page.evaluate(() => {
            const plugin = window.CookieConsentWrapper.unwrap();
            plugin.hideSettings = function () {};
            plugin.showSettings(0);
        });
        const modal = page.locator(await ui(page, 'preferencesModal'));
        await expect(modal).toBeVisible();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(modal).toBeVisible();
    });
});

// GPC is not supported (the same as 1.6.0); upstream respectGpc must stay off
test('the Global Privacy Control signal is ignored', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true });
    });
    await openPage(page, standaloneConfig());

    await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();
});
