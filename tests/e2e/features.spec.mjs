import { test, expect } from '@playwright/test';
import {
    openPage, ui, wrapperMajor, showPreferences, settledDataLayer, events, cookieValue, cookieNames, addCookies,
    standaloneConfig, legacyConsentCookie, setConsentCookie, cmpConfig, STORAGES_ALL_VISIBLE,
} from './helpers.mjs';

// Characterization of the features the wrapper 1.6.0 adds over the plugin.

const ACCEPTED_ALL = ['ad_personalization', 'ad_storage', 'ad_user_data', 'analytics_storage', 'functionality_storage', 'personalization_storage', 'security_storage'];

test.describe('storages', () => {
    test('sync_consent_with: a hidden storage follows its master storage', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(['functionality_storage', 'ad_storage']));
        await openPage(page, standaloneConfig());
        const update = (await settledDataLayer(page)).find(e => Array.isArray(e) && e[1] === 'update')[2];

        expect(update).toMatchObject({ security_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied' });
    });

    test('show_modal_again_expiration: denied storage shows the settings again after N days', async ({ page }) => {
        const old = new Date(Date.now() - 31 * 86400000).toISOString();
        await setConsentCookie(page, legacyConsentCookie(['functionality_storage'], { data: { last_action_date: old } }));
        await openPage(page, standaloneConfig({
            storage_pool: STORAGES_ALL_VISIBLE.map(s => s.name === 'analytics_storage' ? { ...s, show_modal_again_expiration: 30 } : s),
        }));

        await expect(page.locator(await ui(page, 'preferencesModal'))).toBeVisible();
        const data = (await cookieValue(page)).data;
        expect(new Date(data.last_action_date).getTime()).toBeGreaterThan(Date.now() - 60000);
    });

    test('show_modal_again_expiration: not shown before N days', async ({ page }) => {
        const recent = new Date(Date.now() - 5 * 86400000).toISOString();
        await setConsentCookie(page, legacyConsentCookie(['functionality_storage'], { data: { last_action_date: recent } }));
        await openPage(page, standaloneConfig({
            storage_pool: STORAGES_ALL_VISIBLE.map(s => s.name === 'analytics_storage' ? { ...s, show_modal_again_expiration: 30 } : s),
        }));
        await page.waitForTimeout(300);

        await expect(page.locator(await ui(page, 'preferencesModal'))).toBeHidden();
    });

    test('visible, readonly, disabled storage: toggle disabled and never accepted', async ({ page }) => {
        await openPage(page, standaloneConfig({
            storage_pool: STORAGES_ALL_VISIBLE.map(s => s.name === 'ad_storage' ? { ...s, readonly: true } : s),
        }));
        await showPreferences(page);
        const toggle = page.locator(await ui(page, 'toggle', 'ad_storage'));

        await expect(toggle).toBeDisabled();
        await expect(toggle).not.toBeChecked();

        await page.locator(await ui(page, 'prefsAcceptAll')).click();
        await expect.poll(async () => (await cookieValue(page))?.categories?.includes('ad_storage')).toBe(false);
        expect((await cookieValue(page)).categories).toContain('analytics_storage');
    });
});

test.describe('visible, readonly, disabled storage', () => {
    test('accept all from the consent modal does not accept it either', async ({ page }) => {
        await openPage(page, standaloneConfig({
            storage_pool: STORAGES_ALL_VISIBLE.map(s => s.name === 'ad_storage' ? { ...s, readonly: true } : s),
        }));
        await page.locator(await ui(page, 'acceptAll')).click();

        await expect.poll(async () => (await cookieValue(page))?.categories?.slice().sort()).toEqual(['analytics_storage', 'functionality_storage', 'personalization_storage']);
        const update = (await settledDataLayer(page)).find(e => Array.isArray(e) && e[1] === 'update')[2];
        expect(update).toMatchObject({ ad_storage: 'denied', ad_user_data: 'denied', analytics_storage: 'granted' });
    });
});

test.describe('consent modal buttons', () => {
    test('third button: secondary opens the settings, third accepts necessary', async ({ page }) => {
        await openPage(page, standaloneConfig({ consent_modal_options: { secondary_button_role: 'settings', show_third_button: true } }));
        await expect(page.locator(await ui(page, 'consentThird'))).toBeVisible();

        await page.locator(await ui(page, 'consentThird')).click();
        await expect.poll(async () => (await cookieValue(page))?.categories).toEqual(['functionality_storage']);
    });

    test('third button: secondary accepts necessary, third opens the settings', async ({ page }) => {
        await openPage(page, standaloneConfig({ consent_modal_options: { secondary_button_role: 'accept_necessary', show_third_button: true } }));
        await page.locator(await ui(page, 'consentThird')).click();

        await expect(page.locator(await ui(page, 'preferencesModal'))).toBeVisible();
    });

    test('accept all from the consent modal accepts every storage', async ({ page }) => {
        await openPage(page, standaloneConfig());
        await page.locator(await ui(page, 'acceptAll')).click();

        await expect.poll(async () => (await cookieValue(page))?.categories?.slice().sort()).toEqual(['ad_storage', 'analytics_storage', 'functionality_storage', 'personalization_storage']);
        expect(await page.evaluate(() => window.CookieConsentWrapper.allowedCategory('analytics_storage'))).toBe(true);
        expect(ACCEPTED_ALL).toContain('analytics_storage');
    });
});

test.describe('start', () => {
    test('autorun false: the modal is not shown automatically', async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { autorun: false } }));
        await page.waitForTimeout(300);

        await expect(page.locator(await ui(page, 'consentModal'))).toBeHidden();
    });

    test('delay: the modal is shown after the delay', async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { delay: 1000 } }));

        await expect(page.locator(await ui(page, 'consentModal'))).toBeHidden();
        await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible({ timeout: 3000 });
    });

    test('force_consent: page interaction is blocked', async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { force_consent: true } }));
        await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();

        expect(await page.evaluate(() => document.documentElement.className)).toContain(await ui(page, 'forceConsentClass'));
    });

    test('init_after_dom_content_loaded: init waits for DOMContentLoaded', async ({ page }) => {
        await page.addInitScript(() => {
            window.__dcl = false;
            document.addEventListener('DOMContentLoaded', () => { window.__dcl = true; });
            window.cookieConsentWrapperEvents = [['init', () => { window.__dclAtInit = window.__dcl; }]];
        });
        await openPage(page, standaloneConfig({ plugin_options: { init_after_dom_content_loaded: true } }), { sync: true });

        expect(await page.evaluate(() => window.__dclAtInit)).toBe(true);
    });

    test('the widget is not initialized inside a same-origin iframe', async ({ page }) => {
        await openPage(page, standaloneConfig());
        await page.evaluate(() => {
            const frame = document.createElement('iframe');
            frame.src = '/tests/fixtures/page.html';
            frame.id = 'frame';
            document.body.appendChild(frame);
        });
        const frame = page.frameLocator('#frame');
        await page.waitForTimeout(1000);

        await expect(frame.locator('#content')).toBeVisible();
        expect(await page.frames()[1].evaluate(() => (window.__ccEvents || []).length)).toBe(0);
    });
});

test.describe('hide_from_bots', () => {
    test.use({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' });

    test('the modal is not shown to bots', async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { hide_from_bots: true } }));
        await page.waitForTimeout(300);

        await expect(page.locator(await ui(page, 'consentModal'))).toHaveCount(0);
    });
});

test.describe('page scripts', () => {
    const body = '<script type="text/plain" data-cookiecategory="analytics_storage">window.__analyticsRan = true;</script>'
        + '<script type="text/plain" data-cookiecategory="ad_storage">window.__adRan = true;</script>';

    test('blocked scripts run after the consent with their category', async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { page_scripts: true } }), { bodyHtml: body });
        expect(await page.evaluate(() => window.__analyticsRan)).toBeUndefined();

        await showPreferences(page);
        await page.locator(await ui(page, 'toggle', 'analytics_storage')).click();
        await page.locator(await ui(page, 'prefsSave')).click();

        await expect.poll(() => page.evaluate(() => window.__analyticsRan)).toBe(true);
        expect(await page.evaluate(() => window.__adRan)).toBeUndefined();
    });

    test('blocked scripts of a returning visitor run on load', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(['functionality_storage', 'ad_storage']));
        await openPage(page, standaloneConfig({ plugin_options: { page_scripts: true } }), { bodyHtml: body });

        await expect.poll(() => page.evaluate(() => window.__adRan)).toBe(true);
        expect(await page.evaluate(() => window.__analyticsRan)).toBeUndefined();
    });
});

test.describe('auto clear', () => {
    const OTHER = ['_ga', '_ga_ABC', 'keep_me', 'session_x'];

    test('clear_all_except_defined removes every cookie except the listed and the consent cookie', async ({ page }) => {
        await addCookies(page, OTHER);
        await openPage(page, standaloneConfig({
            consent_modal_options: { secondary_button_role: 'accept_necessary' },
            auto_clear_options: { enabled: true, strategy: 'clear_all_except_defined', cookie_names: ['keep_me'] },
        }));
        await page.locator(await ui(page, 'consentSecondary')).click();

        await expect.poll(() => cookieNames(page)).toEqual(['cc-settings', 'keep_me']);
    });

    test('clear_defined_only removes only the listed cookies', async ({ page }) => {
        await addCookies(page, OTHER);
        await openPage(page, standaloneConfig({
            consent_modal_options: { secondary_button_role: 'accept_necessary' },
            auto_clear_options: { enabled: true, strategy: 'clear_defined_only', cookie_names: ['_ga', 'session_x'] },
        }));
        await page.locator(await ui(page, 'consentSecondary')).click();

        await expect.poll(() => cookieNames(page)).toEqual(['_ga_ABC', 'cc-settings', 'keep_me']);
    });

    test('cookie_tables removes the cookies of rejected categories listed by the CMP', async ({ page }) => {
        await addCookies(page, OTHER);
        await openPage(page, cmpConfig({
            consent_modal_options: { secondary_button_role: 'accept_necessary' },
            auto_clear_options: { enabled: true, strategy: 'cookie_tables' },
        }));
        await expect.poll(() => page.evaluate(() => (window.__cmpRequests || []).length)).toBeGreaterThan(0);
        await page.waitForTimeout(300);
        await page.locator(await ui(page, 'consentSecondary')).click();

        await expect.poll(() => cookieNames(page)).toEqual(['cc-settings', 'keep_me', 'session_x']);
    });

    test('auto clear is skipped when everything is accepted', async ({ page }) => {
        await addCookies(page, OTHER);
        await openPage(page, standaloneConfig({ auto_clear_options: { enabled: true, strategy: 'clear_all_except_defined', cookie_names: [] } }));
        await page.locator(await ui(page, 'acceptAll')).click();
        await settledDataLayer(page);

        expect(await cookieNames(page)).toEqual(['_ga', '_ga_ABC', 'cc-settings', 'keep_me', 'session_x']);
    });
});

test.describe('settings modal trigger', () => {
    test('modal_trigger_selector clones the last matching item and opens the settings', async ({ page }) => {
        await openPage(page, standaloneConfig({ settings_modal_options: { modal_trigger_selector: 'footer .footer-item' } }));
        const trigger = page.locator('footer .footer-item a[href="#cookie-settings"]');

        await expect(trigger).toHaveText('Nastavení cookies');
        await expect(page.locator('footer .footer-item')).toHaveCount(2);
        await trigger.click();
        await expect(page.locator(await ui(page, 'preferencesModal'))).toBeVisible();
    });

    test('closing the settings collapses the expanded sections', async ({ page }) => {
        await openPage(page, cmpConfig());
        await showPreferences(page);
        await page.locator(await ui(page, 'sectionToggle', 'analytics_storage')).click();
        await expect(page.locator(await ui(page, 'expandedSection'))).toHaveCount(1);

        await page.locator(await ui(page, 'prefsClose')).click();
        await page.waitForTimeout(500);
        await expect(page.locator(await ui(page, 'expandedSection'))).toHaveCount(0);
    });
});

test.describe('translations', () => {
    test('locale files are fetched as JSON when no .json.js script is present (2.0: only the current one)', async ({ page }) => {
        const requests = [];
        page.on('request', r => r.url().includes('/translations/') && requests.push(new URL(r.url()).pathname));
        await openPage(page, standaloneConfig({ locales: ['cs', 'en'] }));

        // 2.0 loads only the current locale, others on changeLocale()
        expect(requests.sort()).toEqual(await wrapperMajor(page) === 1 ? ['/pkg/translations/cs.json', '/pkg/translations/en.json'] : ['/pkg/translations/cs.json']);
        await expect(page.locator(await ui(page, 'consentTitle'))).toHaveText('Používáme cookies!');
    });

    test('custom translations and placeholders [[user_identity]] and [[revision_message]]', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(['functionality_storage'], { revision: 1 }));
        await openPage(page, standaloneConfig({
            plugin_options: { revision: 2 },
            user_options: { identity: 'user-123' },
            translations: { cs: {
                consent_modal_title: 'Custom title',
                consent_modal_description: 'Your ID: [[user_identity]]. [[revision_message]]',
                consent_modal_revision_message: 'We changed the terms.',
            } },
        }));

        await expect(page.locator(await ui(page, 'consentTitle'))).toHaveText('Custom title');
        await expect(page.locator(await ui(page, 'consentDescription'))).toContainText('Your ID: user-123.');
        await expect(page.locator(await ui(page, 'consentDescription'))).toContainText('We changed the terms.');
    });

    test('changeLocale re-translates the widget and dispatches locale:change', async ({ page }) => {
        await openPage(page, standaloneConfig({ locales: ['cs', 'en'], consent_modal_options: { show_third_button: true } }));
        await page.evaluate(() => window.CookieConsentWrapper.changeLocale('en', true));

        await expect(page.locator(await ui(page, 'consentTitle'))).toHaveText('We use cookies!');
        await expect(page.locator(await ui(page, 'consentThird'))).toBeVisible();
        expect((await events(page)).filter(e => e.name === 'locale:change')).toEqual([{ name: 'locale:change', args: ['en'] }]);
    });
});

test.describe('public getters', () => {
    test('consentCookieData and consentCookieValue', async ({ page }) => {
        await openPage(page, standaloneConfig());
        expect(await page.evaluate(() => window.CookieConsentWrapper.consentCookieValue)).toBeNull();

        await page.locator(await ui(page, 'acceptAll')).click();
        await settledDataLayer(page);
        const data = await page.evaluate(() => window.CookieConsentWrapper.consentCookieData);

        expect(data.categories.slice().sort()).toEqual(['ad_storage', 'analytics_storage', 'functionality_storage', 'personalization_storage']);
        expect(typeof await page.evaluate(() => window.CookieConsentWrapper.consentCookieValue)).toBe('string');
        expect(typeof data.data.last_action_date).toBe('string');
    });
});

test.describe('stylesheets', () => {
    test('default, external and internal stylesheets are loaded', async ({ page }) => {
        await openPage(page, standaloneConfig({
            ui_options: { external_stylesheets: ['/tests/fixtures/extra.css'], internal_stylesheets: ['#content { color: rgb(1, 2, 3); }'] },
        }));

        const links = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l => new URL(l.href).pathname));
        expect(links).toEqual(['/pkg/cookie-consent.css', '/tests/fixtures/extra.css']);
        await expect(page.locator('#content')).toHaveCSS('color', 'rgb(1, 2, 3)');
    });

    test('include_default_stylesheets false skips the package stylesheet', async ({ page }) => {
        await openPage(page, standaloneConfig({ ui_options: { include_default_stylesheets: false } }));

        expect(await page.evaluate(() => document.querySelectorAll('link[rel=stylesheet]').length)).toBe(0);
    });
});

test.describe('user identity', () => {
    test('generated identity is a UUID stored in localStorage and reused', async ({ page }) => {
        await openPage(page, cmpConfig({ user_options: {} }));
        await page.locator(await ui(page, 'acceptAll')).click();
        await expect.poll(() => page.evaluate(() => (window.__cmpRequests || []).filter(r => r.endpoint === 'consent').length)).toBe(1);

        const stored = await page.evaluate(() => localStorage.getItem('cookie_consent__user_identity'));
        expect(stored).toMatch(/^[0-9a-f]{32}$/);
        const [consent] = await page.evaluate(() => window.__cmpRequests.filter(r => r.endpoint === 'consent'));
        expect(consent.path).toBe(`demo/${stored}`);
    });
});

test.describe('plugin options', () => {
    test('custom script_selector', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(['functionality_storage', 'analytics_storage']));
        await openPage(page, standaloneConfig({ plugin_options: { page_scripts: true, script_selector: 'data-consent' } }), {
            bodyHtml: '<script type="text/plain" data-consent="analytics_storage">window.__ran = true;</script>'
                + '<script type="text/plain" data-cookiecategory="analytics_storage">window.__ranDefault = true;</script>',
        });

        if (await wrapperMajor(page) === 1) {
            // 1.6.0: plugin 2.9 never reads script_selector from the user config, only the default attribute works
            await expect.poll(() => page.evaluate(() => window.__ranDefault)).toBe(true);
            expect(await page.evaluate(() => window.__ran)).toBeUndefined();
        } else {
            // 2.0 fixes it: the configured attribute is rewritten to data-category
            await expect.poll(() => page.evaluate(() => window.__ran)).toBe(true);
        }
    });

    test('cookie name, expiration and a foreign cookie_domain falling back to the current host', async ({ page }) => {
        await openPage(page, standaloneConfig({ plugin_options: { cookie_name: 'my-consent', cookie_expiration: 10, cookie_domain: '.example.com' } }));
        await page.locator(await ui(page, 'acceptAll')).click();
        await expect.poll(async () => (await page.context().cookies()).some(c => c.name === 'my-consent')).toBe(true);

        const cookie = (await page.context().cookies()).find(c => c.name === 'my-consent');
        expect(cookie.domain.replace(/^\./, '')).toBe('localhost');
        const days = (cookie.expires * 1000 - Date.now()) / 86400000;
        expect(days).toBeGreaterThan(9.9);
        expect(days).toBeLessThan(10.1);
    });
});
