import { test, expect } from '@playwright/test';
import {
    openPage, ui, wrapperMajor, showPreferences, cookieValue, settledDataLayer, events, cmpRequests, cookieNames, addCookies,
    cmpConfig, standaloneConfig,
} from './helpers.mjs';

// The "services" preferences mode (providers inside categories), 2.0 only.

const SERVICES_CONFIG = (overrides = {}) => cmpConfig({
    plugin_options: { autorun: false, page_scripts: true },
    settings_modal_options: { preferences_mode: 'services' },
    storage_pool: [
        { name: 'functionality_storage', enabled_by_default: true, display_in_widget: true, readonly: true },
        { name: 'personalization_storage', display_in_widget: true },
        { name: 'ad_storage', display_in_widget: true, services: [{ name: 'sklik', label: 'Seznam Sklik' }] },
        { name: 'ad_user_data', sync_consent_with: 'ad_storage' },
        { name: 'analytics_storage', display_in_widget: true },
    ],
    ...overrides,
});

const serviceToggle = (category, service) => `#cc-main .pm input[name="cc-${category}-${service}"]`;
const updates = (entries) => entries.filter(e => Array.isArray(e) && e[1] === 'update').map(e => e[2]);

test.beforeEach(async ({ page }) => {
    await openPage(page, standaloneConfig({ plugin_options: { autorun: false } }));
    test.skip(await wrapperMajor(page) < 2, '2.0 only');
    await page.context().clearCookies();
});

test('services come from the configuration and from the CMP providers', async ({ page }) => {
    await openPage(page, SERVICES_CONFIG());
    await showPreferences(page);
    await page.locator(await ui(page, 'sectionToggle', 'ad_storage')).click();

    const ad = page.locator('#cc-main .pm__section--toggle:has(input[value="ad_storage"])');
    await expect(ad.locator('.pm__service-title')).toHaveText(['Seznam Sklik', 'Google Ads', 'Meta']);
    await expect(ad.locator('.pm__service-counter')).toHaveText('3 služby');
    // the cookie table stays in the services mode
    await expect(ad.getByText('_fbp', { exact: true })).toBeAttached();
    // providers were loaded before the plugin started (one request)
    expect(await cmpRequests(page, 'cookies')).toHaveLength(1);
});

test('consent per service: cookie, events, CMP payload; gtag stays per category', async ({ page }) => {
    await openPage(page, SERVICES_CONFIG());
    await showPreferences(page);
    await page.locator(await ui(page, 'sectionToggle', 'ad_storage')).click();
    await page.locator(serviceToggle('ad_storage', 'meta')).click({ force: true });
    await page.locator(await ui(page, 'prefsSave')).click();

    await expect.poll(async () => (await cookieValue(page))?.services?.ad_storage).toEqual(['meta']);
    expect((await cookieValue(page)).categories).toContain('ad_storage');
    // a category with an accepted service is granted for Google Consent Mode
    expect(updates(await settledDataLayer(page)).at(-1)).toMatchObject({ ad_storage: 'granted', ad_user_data: 'granted', analytics_storage: 'denied' });

    await expect.poll(async () => (await cmpRequests(page, 'consent')).length).toBe(1);
    // readonly categories accept all their services (the first-party provider of the CMP)
    expect((await cmpRequests(page, 'consent'))[0].body.services).toEqual({ ad_storage: ['meta'], functionality_storage: ['example_project'] });
    expect((await events(page)).filter(e => e.name === 'services:changed').map(e => e.args[0])).toEqual([{ ad_storage: ['meta'], functionality_storage: ['example_project'] }]);

    // enabling another service: consent:changed carries the changed services, gtag stays "granted"
    await showPreferences(page);
    await page.locator(await ui(page, 'sectionToggle', 'ad_storage')).click();
    await page.locator(serviceToggle('ad_storage', 'google_ads')).click({ force: true });
    await page.locator(await ui(page, 'prefsSave')).click();

    await expect.poll(async () => (await cmpRequests(page, 'consent')).length).toBe(2);
    expect((await cmpRequests(page, 'consent'))[1].body.services).toEqual({ ad_storage: ['google_ads', 'meta'], functionality_storage: ['example_project'] });
    const changed = (await events(page)).filter(e => e.name === 'consent:changed').at(-1);
    expect(changed.args[1]).toEqual([]);
    expect(changed.args[2]).toMatchObject({ ad_storage: ['google_ads'] });
    expect(updates(await settledDataLayer(page)).at(-1)).toMatchObject({ ad_storage: 'granted' });
});

test('rejecting a category rejects all its services', async ({ page }) => {
    await openPage(page, SERVICES_CONFIG());
    await showPreferences(page);
    await page.locator(await ui(page, 'prefsAcceptAll')).click();
    await expect.poll(async () => (await cookieValue(page))?.services?.ad_storage?.length).toBe(3);

    await showPreferences(page);
    await page.locator(await ui(page, 'toggle', 'ad_storage')).click();
    await page.locator(await ui(page, 'prefsSave')).click();

    await expect.poll(async () => (await cookieValue(page))?.services?.ad_storage).toEqual([]);
    expect(updates(await settledDataLayer(page)).at(-1)).toMatchObject({ ad_storage: 'denied', analytics_storage: 'granted' });
    await expect.poll(async () => (await cmpRequests(page, 'consent')).at(-1)?.body?.services).toEqual({ analytics_storage: ['google_analytics'], functionality_storage: ['example_project'], personalization_storage: ['example_cdp'] });
});

test('data-service scripts run only with their service', async ({ page }) => {
    await openPage(page, SERVICES_CONFIG(), {
        bodyHtml: '<script type="text/plain" data-cookiecategory="ad_storage" data-service="meta">window.__meta = true;</script>'
            + '<script type="text/plain" data-cookiecategory="ad_storage" data-service="google_ads">window.__ads = true;</script>',
    });
    await showPreferences(page);
    await page.locator(await ui(page, 'sectionToggle', 'ad_storage')).click();
    await page.locator(serviceToggle('ad_storage', 'meta')).click({ force: true });
    await page.locator(await ui(page, 'prefsSave')).click();

    await expect.poll(() => page.evaluate(() => window.__meta)).toBe(true);
    expect(await page.evaluate(() => window.__ads)).toBeUndefined();
});

test('cookie_tables auto clear removes cookies of a rejected service', async ({ page }) => {
    await addCookies(page, ['_fbp', '_gcl_au', 'other']);
    await openPage(page, SERVICES_CONFIG({ auto_clear_options: { enabled: true, strategy: 'cookie_tables' } }));
    await showPreferences(page);
    await page.locator(await ui(page, 'prefsAcceptAll')).click();
    await settledDataLayer(page);

    await showPreferences(page);
    await page.locator(await ui(page, 'sectionToggle', 'ad_storage')).click();
    await page.locator(serviceToggle('ad_storage', 'meta')).click({ force: true });
    await page.locator(await ui(page, 'prefsSave')).click();

    await expect.poll(() => cookieNames(page)).toEqual(['_gcl_au', 'cc-settings', 'other']);
});

test('without the CMP the services mode uses the configured services only', async ({ page }) => {
    await openPage(page, SERVICES_CONFIG({ cmp_api_options: {} }));
    await showPreferences(page);
    await page.locator(await ui(page, 'sectionToggle', 'ad_storage')).click();

    await expect(page.locator('#cc-main .pm__section--toggle:has(input[value="ad_storage"]) .pm__service-title')).toHaveText(['Seznam Sklik']);
    await expect(page.locator('#cc-main .pm__section--toggle:has(input[value="analytics_storage"]) .pm__service')).toHaveCount(0);
});
