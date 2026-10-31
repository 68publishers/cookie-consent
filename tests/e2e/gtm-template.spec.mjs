import { test, expect } from '@playwright/test';
import { openGtmPage, loadFixture, dataLayer, consentCommands, gtagEvents, legacyConsentCookie, setConsentCookie } from './helpers.mjs';

const exampleProject = loadFixture('gtm/example-project.json').data;

const ALL_DENIED_EXCEPT_FUNCTIONALITY = {
    functionality_storage: 'granted',
    security_storage: 'denied',
    personalization_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
};

test.describe('GTM template (Example Project configuration)', () => {
    test('new visitor: default consent from visibility settings, triggers only for granted storages', async ({ page }) => {
        await openGtmPage(page, exampleProject);

        const entries = await dataLayer(page);
        const commands = consentCommands(entries);

        expect(commands[0]).toEqual(['consent', 'default', ALL_DENIED_EXCEPT_FUNCTIONALITY]);
        // the template fires the trigger of the granted storage before the wrapper loads
        expect(gtagEvents(entries)).toEqual(['68publishers_functionality_storage']);
        expect(await page.evaluate(() => window.__gtmResult.failure)).toBe(0);
        expect(await page.evaluate(() => window.__gtmInjected.map(u => new URL(u).pathname))).toEqual(['/pkg/translations/en.json.js', '/pkg/cookie-consent.min.js']);
    });

    test('returning visitor: default consent from the cookie, synchronized storages follow ad_storage', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(['functionality_storage', 'ad_storage', 'analytics_storage'], { rfc: true }));
        await openGtmPage(page, exampleProject);

        const entries = await dataLayer(page);

        expect(consentCommands(entries)[0]).toEqual(['consent', 'default', {
            ...ALL_DENIED_EXCEPT_FUNCTIONALITY,
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
            analytics_storage: 'granted',
        }]);

        const events = gtagEvents(entries);
        // every trigger fires at most once per page, in the storage order of the template
        expect(events.slice(0, 5)).toEqual([
            '68publishers_functionality_storage',
            '68publishers_ad_storage',
            '68publishers_ad_user_data',
            '68publishers_ad_personalization',
            '68publishers_analytics_storage',
        ]);
        expect(new Set(events).size).toBe(events.length);
    });
});
