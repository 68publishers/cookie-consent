import { test, expect } from '@playwright/test';
import { openPage, ui, wrapperMajor, showPreferences, cmpRequests, settledDataLayer } from './helpers.mjs';

// T5b.7: the wrapper against a real local CMP (CMP_REAL_URL, e.g. http://localhost:18081 running on the seeded "cmp_test"
// database, see consent-management-platform `make tests-api`) gives the same requests as against the mock.
const REAL = process.env.CMP_REAL_URL;

const config = (url) => ({
    locales: ['en'],
    plugin_options: { autorun: false, current_lang: 'en' },
    user_options: { identity: 'compare-user' },
    settings_modal_options: { preferences_mode: 'services' },
    storage_pool: [
        { name: 'functionality_storage', enabled_by_default: true, display_in_widget: true, readonly: true },
        { name: 'ad_storage', display_in_widget: true },
        { name: 'analytics_storage', display_in_widget: true },
    ],
    cmp_api_options: { url, project: 'test', consent_api_enabled: true, cookies_api_enabled: true, cookie_table_headers: ['name', 'purpose', 'provider'] },
});

// the cookies of the seed (consent-management-platform tests-api/seed.php) served by the mock
const SEEDED_COOKIES = [
    { name: '_fbp', purpose: '_fbp', processingTime: 'session', cookieProvider: { code: 'meta', name: 'Meta', type: '3rd_party', link: 'https://example.com/meta' }, category: { name: 'ad_storage', code: 'ad_storage' } },
    { name: '_gcl_au', purpose: '_gcl_au', processingTime: 'session', cookieProvider: { code: 'google_ads', name: 'Google Ads', type: '3rd_party', link: 'https://example.com/google_ads' }, category: { name: 'ad_storage', code: 'ad_storage' } },
    { name: 'PHPSESSID', purpose: 'PHPSESSID', processingTime: 'session', cookieProvider: { code: 'test', name: 'Test website', type: '1st_party', link: 'https://example.com/test' }, category: { name: 'functionality_storage', code: 'functionality_storage' } },
];

async function scenario(page, url, mock) {
    await page.addInitScript((m) => { window.__CMP_MOCK__ = m; }, mock);
    await openPage(page, config(url));
    await showPreferences(page);
    await page.locator(await ui(page, 'sectionToggle', 'ad_storage')).click();
    await page.locator('#cc-main .pm input[name="cc-ad_storage-meta"]').click({ force: true });
    await page.locator(await ui(page, 'prefsSave')).click();
    await settledDataLayer(page);
    await expect.poll(async () => (await cmpRequests(page, 'consent')).length).toBe(1);
    // passthrough records the responses asynchronously
    await expect.poll(() => page.evaluate(() => !window.__CMP_MOCK__.passthrough || window.__cmpRequests.every(r => 'status' in r))).toBe(true);

    return {
        all: await cmpRequests(page),
        services: await page.evaluate(() => Array.from(document.querySelectorAll('#cc-main .pm__service-title')).map(e => e.textContent)),
        consent: (await cmpRequests(page, 'consent'))[0],
        cookies: (await cmpRequests(page, 'cookies'))[0],
    };
}

test('the wrapper sends the same requests to the real CMP as to the mock', async ({ browser, browserName }) => {
    test.skip(!REAL, 'set CMP_REAL_URL to a running CMP with the seeded test database');
    test.skip(browserName !== 'chromium', 'one browser is enough for the API contract');

    const run = async (url, mock) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await openPage(page, config(url));
        test.skip(await wrapperMajor(page) < 2, 'services exist in 2.0 only');
        await context.clearCookies();
        const result = await scenario(page, url, mock);
        await context.close();
        return result;
    };

    const mocked = await run('https://cmp.test/', { consentSettingsExists: true, cookies: SEEDED_COOKIES });
    const real = await run(REAL, { passthrough: true });

    expect(real.all.map(r => `${r.method} ${r.endpoint} ${r.status}${r.error ? ' ' + r.error : ''}`)).toEqual([
        'GET cookies 200',
        'PUT consent 200',
        ...(real.all.length > 2 ? ['PUT consent-settings 200'] : []),
    ]);
    // the real API answers as the mock does
    expect(real.cookies.status).toBe(200);
    expect(real.cookies.response.data.cookies).toEqual(SEEDED_COOKIES);
    expect(Object.keys(real.cookies.response.data.providers[0]).sort()).toEqual(['code', 'link', 'name', 'purpose', 'type']);
    expect(real.consent.status).toBe(200);
    expect(real.consent.response).toEqual({ status: 'success', data: { consentSettingsExists: expect.any(Boolean) } });

    // and the wrapper renders and sends the same
    expect(real.services).toEqual(mocked.services);
    // the checksum covers the configuration, which contains the CMP URL
    expect({ ...real.consent.body, settingsChecksum: null }).toEqual({ ...mocked.consent.body, settingsChecksum: null });
    expect(real.consent.body.services).toEqual({ ad_storage: ['meta'], functionality_storage: ['test'] });
});
