import { test, expect } from '@playwright/test';
import { openPage, ui, cmpConfig, cmpRequests, showPreferences } from './helpers.mjs';

test.describe('CMP integration (mocked API v1)', () => {
    test('first action sends the consent and missing consent settings', async ({ page }) => {
        await page.addInitScript(() => { window.__CMP_MOCK__ = { consentSettingsExists: false }; });
        await openPage(page, cmpConfig());
        await page.locator(await ui(page, 'acceptAll')).click();

        await expect.poll(async () => (await cmpRequests(page, 'consent-settings')).length).toBe(1);

        const [consent] = await cmpRequests(page, 'consent');
        expect(consent.method).toBe('PUT');
        expect(consent.path).toBe('demo/test-user');
        expect(consent.body.settingsChecksum).toMatch(/^[0-9a-f]{64}$/);
        expect(consent.body).toEqual({
            settingsChecksum: consent.body.settingsChecksum,
            consents: {
                functionality_storage: true,
                personalization_storage: true,
                security_storage: true,
                ad_storage: true,
                ad_user_data: true,
                ad_personalization: true,
                analytics_storage: true,
            },
            attributes: { email: 'test@example.com' },
            environment: 'default',
        });

        const [settings] = await cmpRequests(page, 'consent-settings');
        expect(settings.method).toBe('PUT');
        expect(settings.path).toBe(`demo/${consent.body.settingsChecksum}`);
        expect(Object.keys(settings.body).sort()).toEqual(['config', 'dictionary', 'storages', 'version']);
    });

    test('existing consent settings are not sent again', async ({ page }) => {
        await openPage(page, cmpConfig());
        await page.locator(await ui(page, 'acceptAll')).click();

        await expect.poll(async () => (await cmpRequests(page, 'consent')).length).toBe(1);
        await page.waitForTimeout(200);
        expect(await cmpRequests(page, 'consent-settings')).toHaveLength(0);
    });

    test('cookies API fills the cookie tables of the categories', async ({ page }) => {
        await openPage(page, cmpConfig());

        const [cookies] = await cmpRequests(page, 'cookies');
        expect(cookies.method).toBe('GET');
        expect(cookies.path).toBe('demo');
        expect(cookies.query).toEqual({ locale: 'cs', environment: 'default' });

        await showPreferences(page);
        const modal = page.locator(await ui(page, 'preferencesModal'));

        await expect(modal.getByText('_gcl_au', { exact: true }).first()).toBeAttached();
        await expect(modal.getByText('Google Analytics').first()).toBeAttached();
    });

    test('a cookie without a provider keeps the other rows', async ({ page }) => {
        await page.addInitScript(() => {
            window.__CMP_MOCK__ = { cookies: [
                { name: 'no_provider', purpose: 'Unknown.', processingTime: 'session', cookieProvider: null, category: { name: 'Analytics', code: 'analytics_storage' } },
                { name: '_ga', purpose: 'Distinguishes users.', processingTime: '2 years', cookieProvider: { code: 'google_analytics', name: 'Google Analytics', type: '3rd_party', link: '' }, category: { name: 'Analytics', code: 'analytics_storage' } },
            ] };
        });
        await openPage(page, cmpConfig());
        await showPreferences(page);
        const modal = page.locator(await ui(page, 'preferencesModal'));

        await expect(modal.getByText('no_provider', { exact: true }).first()).toBeAttached();
        await expect(modal.getByText('_ga', { exact: true }).first()).toBeAttached();
    });

    test('a CMP failure does not break the widget', async ({ page }) => {
        await page.addInitScript(() => { window.__CMP_MOCK__ = { fail: true }; });
        await openPage(page, cmpConfig());
        await page.locator(await ui(page, 'acceptAll')).click();

        await expect.poll(async () => (await cmpRequests(page, 'consent')).length).toBe(1);
        await expect(page.locator(await ui(page, 'consentModal'))).toBeHidden();
    });
});
