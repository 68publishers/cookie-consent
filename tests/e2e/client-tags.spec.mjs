import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openGtmPage, loadFixture, ui, wrapperMajor, cookieValue, settledDataLayer } from './helpers.mjs';

// Custom HTML tags, variables and click triggers of the Example Project, taken verbatim from the GTM container.
// Rule: they must work with 2.0 without changing the scripts; only CSS selectors may be rewritten.

const fixture = (name) => fs.readFileSync(new URL(`../fixtures/clients/example-project/${name}`, import.meta.url), 'utf8');
const exampleProject = loadFixture('gtm/example-project.json').data;
const exampleProjectApp = { ...exampleProject, modal_trigger_selector: '', cmp_api_environment_code: 'mobile' };
const clickTriggers = JSON.parse(fixture('click-triggers.json'));
const persCookieState = fixture('pers-cookie-state.js');

// Selector map 2.9 -> 3.x for the CSS of client tags (the only part of a tag a client must rewrite).
const CSS_SELECTORS_V2 = [
    ['#cc_div #cm', '#cc-main .cm'],
    ['#cc--main', '#cc-main'],
    ['#s-inr', '#cc-main .pm'],
    ['.cc-back-button', '#cc-main .cc-back-button'],
];

// Runs a Custom HTML tag: inserts its <style> and executes its <script> like GTM does.
// For 2.0 only the CSS selectors are rewritten, the scripts stay verbatim.
async function runTag(page, html) {
    if (await wrapperMajor(page) >= 2) {
        html = html.replace(/<style>[\s\S]*?<\/style>/g, css => CSS_SELECTORS_V2.reduce((acc, [from, to]) => acc.split(from).join(to), css));
    }

    await page.evaluate((source) => {
        const container = document.createElement('div');
        container.innerHTML = source;
        container.querySelectorAll('style').forEach(style => document.head.appendChild(style));
        container.querySelectorAll('script').forEach((script) => {
            const s = document.createElement('script');
            s.textContent = script.textContent;
            document.body.appendChild(s);
        });
    }, html);
}

async function installClickTriggers(page, userAgent) {
    await page.addInitScript(([triggers, persSource, ua]) => {
        window.__CLICK_TRIGGERS__ = triggers;
        window.__GTM_VARIABLES__ = {
            'js.pers_cookie_state': (0, eval)(persSource),
            'js.navigator.userAgent': () => ua,
        };
    }, [clickTriggers, persCookieState, userAgent]);
}

test.describe('Example Project custom tags', () => {
    test('domain fix: duplicated consent cookie is removed through unwrap()', async ({ page }) => {
        // the same cookie on two paths stands in for www.example.com vs .example.com (localhost has one domain only)
        await page.context().addCookies([
            { name: 'cc-settings', value: 'x', domain: 'localhost', path: '/' },
            { name: 'cc-settings', value: 'y', domain: 'localhost', path: '/tests' },
        ]);
        await openGtmPage(page, exampleProject);
        await runTag(page, fixture('domain-fix.html').replace("'www.example.com'", "'localhost'"));

        await expect.poll(async () => (await page.context().cookies()).filter(c => c.name === 'cc-settings').length).toBe(1);
        expect(await page.evaluate(() => window.CookieConsentWrapper.unwrap().getConfig('cookie_name'))).toBe('cc-settings');
    });

    test('mobile app settings: settings modal cannot be closed and every action posts the consent to the app', async ({ page }) => {
        await page.addInitScript(() => {
            window.__messages = [];
            window.ReactNativeWebView = { postMessage: (m) => window.__messages.push(JSON.parse(m)) };
        });
        await openGtmPage(page, exampleProjectApp);
        await runTag(page, fixture('app-settings.html'));

        await expect(page.locator(await ui(page, 'preferencesModal'))).toBeVisible();
        await page.waitForTimeout(700); // the tag configuration has a delay of 500 ms
        await expect(page.locator(await ui(page, 'consentModal'))).toBeHidden();

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await expect(page.locator(await ui(page, 'preferencesModal'))).toBeVisible();

        await page.locator(await ui(page, 'prefsAcceptAll')).click();
        await expect.poll(() => page.evaluate(() => window.__messages.length)).toBe(1);
        const [message] = await page.evaluate(() => window.__messages);
        expect(message.source).toBe('default');
        expect(message.consent.categories.slice().sort()).toEqual(['ad_storage', 'analytics_storage', 'functionality_storage', 'personalization_storage']);
        await expect(page.locator(await ui(page, 'preferencesModal'))).toBeVisible();

        await page.locator(await ui(page, 'prefsRejectAll')).click();
        await expect.poll(() => page.evaluate(() => window.__messages.length)).toBe(2);
        expect((await page.evaluate(() => window.__messages))[1].consent.categories).toEqual(['functionality_storage']);
    });

    test('mobile app webview: missing consent is posted to the app and the widget is hidden', async ({ page }) => {
        await page.addInitScript(() => {
            window.__messages = [];
            window.ReactNativeWebView = { postMessage: (m) => window.__messages.push(JSON.parse(m)) };
        });
        await openGtmPage(page, exampleProjectApp);
        await runTag(page, fixture('app-webview.html'));

        await expect.poll(() => page.evaluate(() => window.__messages)).toEqual([{ consent: null, source: null }]);
        await page.waitForTimeout(700);
        await expect(page.locator(await ui(page, 'consentModal'))).toBeHidden();
    });
});

test.describe('Example Project click triggers and variables', () => {
    test('accept buttons fire the accept triggers (web)', async ({ page }) => {
        await installClickTriggers(page, 'Mozilla/5.0');
        await openGtmPage(page, exampleProject);
        await page.locator(await ui(page, 'acceptAll')).click();

        expect(await page.evaluate(() => window.__firedTriggers)).toEqual(['click.cookies_accept_btns_web']);
    });

    test('third button (accept necessary) fires the reject trigger (web)', async ({ page }) => {
        await installClickTriggers(page, 'Mozilla/5.0');
        await openGtmPage(page, exampleProject);
        await page.locator(await ui(page, 'consentThird')).click();

        expect(await page.evaluate(() => window.__firedTriggers)).toEqual(['click.cookies_reject_btns_web']);
    });

    test('settings: save with personalization on fires the accept triggers, js.pers_cookie_state reads the toggle', async ({ page }) => {
        await installClickTriggers(page, 'Mozilla/5.0 ExampleApp/4.2');
        await openGtmPage(page, exampleProject);
        await page.locator(await ui(page, 'consentSecondary')).click();
        await expect(page.locator(await ui(page, 'preferencesModal'))).toBeVisible();

        await page.locator(await ui(page, 'toggle', 'personalization_storage')).click();
        expect(await page.evaluate(() => window.__GTM_VARIABLES__['js.pers_cookie_state']())).toBe(true);
        await page.locator(await ui(page, 'prefsSave')).click();
        await expect.poll(async () => (await cookieValue(page))?.categories).toContain('personalization_storage');

        expect(await page.evaluate(() => window.__firedTriggers)).toEqual(['click.cookies_accept_pers_webview', 'click.cookies_accept_pers_web']);
    });

    test('68publishers_* events reach the data layer for the consent function tag', async ({ page }) => {
        await openGtmPage(page, exampleProject);
        await page.locator(await ui(page, 'acceptAll')).click();
        const events = (await settledDataLayer(page)).filter(e => Array.isArray(e) && e[0] === 'event').map(e => e[1]);

        // tag "Cookie consent (consent function)" fires on these three
        expect(events).toEqual(expect.arrayContaining(['68publishers_analytics_storage', '68publishers_personalization_storage', '68publishers_ad_storage']));
        expect(await wrapperMajor(page)).toBeGreaterThan(0);
    });
});
