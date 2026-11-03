import { test, expect } from '@playwright/test';
import { openGtmPage, loadFixture, legacyConsentCookie, setConsentCookie, cookieValue, ui, wrapperMajor } from './helpers.mjs';

// The GTM template 2.0 (gtm_template.tpl) against the template 1.6.0 (var/perf-ref/gtm_template.tpl, npm run ref).

const exampleProject = loadFixture('gtm/example-project.json').data;
const TEMPLATE_16 = 'var/perf-ref/gtm_template.tpl';
const afterTemplate = (page) => page.evaluate(() => window.__afterTemplate);
const injected = (page) => page.evaluate(() => window.__gtmInjected.map(u => new URL(u).pathname));

test.describe('the same default consent and triggers as the template 1.6.0', () => {
    for (const visitor of ['new', 'returning']) {
        test(`${visitor} visitor (Example Project configuration)`, async ({ browser }) => {
            const run = async (templateFile) => {
                const context = await browser.newContext();
                const page = await context.newPage();
                if ('returning' === visitor) {
                    await setConsentCookie(page, legacyConsentCookie(['functionality_storage', 'ad_storage'], { rfc: true }));
                }
                await openGtmPage(page, { ...exampleProject, push_consent_to_data_layer: true, consent_data_layer_event_name: '68publishers_consent' }, { templateFile, waitForInit: false });
                const pushed = await afterTemplate(page);
                await context.close();
                return pushed;
            };

            const v16 = await run(TEMPLATE_16);
            const v20 = await run(null);
            expect(v20).toEqual(v16);
            expect(v20.length).toBeGreaterThan(1);
        });
    }
});

test('default event name for a tag saved before 1.6.0', async ({ page }) => {
    const data = { ...exampleProject, push_consent_to_data_layer: true };
    delete data.consent_data_layer_event_name;
    await openGtmPage(page, data, { waitForInit: false });

    expect((await afterTemplate(page)).find(e => e && e.consent_status === 'default').event).toBe('68publishers_consent');
});

test.describe('locales injected by the template', () => {
    test('only the current locale when "Current locale" is set', async ({ page }) => {
        await openGtmPage(page, { ...exampleProject, locales: ['cs', 'en', 'de'], current_locale: 'cs' });
        expect(await injected(page)).toEqual(['/pkg/translations/cs.json.js', '/pkg/cookie-consent.min.js']);
    });

    test('all locales when the current one is unknown, the widget still requests nothing more', async ({ page }) => {
        const requests = [];
        page.on('request', r => r.url().includes('/translations/') && requests.push(new URL(r.url()).pathname));
        await openGtmPage(page, { ...exampleProject, locales: ['cs', 'en'] });
        await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible({ timeout: 3000 });

        expect(await injected(page)).toEqual(['/pkg/translations/cs.json.js', '/pkg/translations/en.json.js', '/pkg/cookie-consent.min.js']);
        expect(requests.filter(r => r.endsWith('.json'))).toEqual([]);
    });
});

test.describe('Global Privacy Control in the template', () => {
    const data = {
        ...exampleProject,
        delay: 0,
        // personalization enabled by default to see the effect of GPC
        personalization_storage_visibility: 'visible_enabled',
        personalization_storage_event_trigger: '68publishers_personalization_storage',
    };
    const defaultOf = async (page) => (await afterTemplate(page)).find(e => Array.isArray(e) && e[1] === 'default')[2];
    const triggersOf = async (page) => (await afterTemplate(page)).filter(e => Array.isArray(e) && e[0] === 'event').map(e => e[1]);

    for (const gpc of [true, false]) {
        for (const field of [true, false]) {
            for (const cookie of [false, true]) {
                test(`GPC ${gpc ? 'on' : 'off'}, field ${field ? 'on' : 'off'}, ${cookie ? 'returning' : 'new'} visitor`, async ({ page }) => {
                    if (gpc) {
                        await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true }));
                    }
                    if (cookie) {
                        await setConsentCookie(page, legacyConsentCookie(['functionality_storage', 'personalization_storage'], { rfc: true }));
                    }
                    // the field "Global Privacy Control signal" holds a variable reading navigator.globalPrivacyControl
                    await openGtmPage(page, { ...data, respect_gpc: field, gpc_signal: gpc });
                    await page.waitForTimeout(300);

                    const optOut = gpc && field && !cookie;
                    const expected = optOut ? 'denied' : 'granted';

                    expect(await defaultOf(page)).toMatchObject({ functionality_storage: 'granted', personalization_storage: expected });
                    expect((await triggersOf(page)).includes('68publishers_personalization_storage')).toBe(!optOut);

                    // the widget agrees: no modal and no consent update for an opted-out new visitor
                    if (await wrapperMajor(page) >= 2 && optOut) {
                        await expect(page.locator(await ui(page, 'consentModal'))).toHaveCount(0);
                        expect(await cookieValue(page)).toBeNull();
                        expect(await page.evaluate(() => window.CookieConsentWrapper.allowedCategory('personalization_storage'))).toBe(false);
                    }
                });
            }
        }
    }
});
