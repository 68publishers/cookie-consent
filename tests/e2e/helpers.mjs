import fs from 'node:fs';
import { expect } from '@playwright/test';

// Selectors per plugin generation: 2.9 (wrapper 1.x) vs 3.x (wrapper 2.x).
const SELECTORS = {
    1: {
        consentModal: '#cm',
        acceptAll: '#c-p-bn',
        consentSecondary: '#c-s-bn',
        consentThird: '#c-t-bn',
        preferencesModal: '#s-inr',
        prefsAcceptAll: '#s-all-bn',
        prefsRejectAll: '#s-rall-bn',
        prefsSave: '#s-sv-bn',
        prefsClose: '#s-c-bn',
        toggle: (name) => `#s-bl input.c-tgl[value="${name}"]`,
        toggleLabel: (name) => `#s-bl input.c-tgl[value="${name}"] ~ .c-tg`,
        consentTitle: '#c-ttl',
        consentDescription: '#c-txt',
        forceConsentClass: 'force--consent',
        expandedSection: '#s-bl .b-tl.exp[aria-expanded="true"]',
        sectionToggle: (name) => `#s-bl .c-bl:has(input.c-tgl[value="${name}"]) .b-tl`,
    },
    2: {
        consentModal: '#cc-main .cm',
        acceptAll: '#cc-main .cm [data-role="all"]',
        consentSecondary: '#c-s-bn',
        consentThird: '#c-t-bn',
        preferencesModal: '#cc-main .pm',
        prefsAcceptAll: '#cc-main .pm [data-role="all"]',
        prefsRejectAll: '#cc-main .pm [data-role="necessary"]',
        prefsSave: '#cc-main .pm [data-role="save"]',
        prefsClose: '#cc-main .pm .pm__close-btn',
        toggle: (name) => `#cc-main .pm input.section__toggle[value="${name}"]`,
        toggleLabel: (name) => `#cc-main .pm input.section__toggle[value="${name}"] + .toggle__icon`,
        consentTitle: '#cc-main .cm__title',
        consentDescription: '#cc-main .cm__desc',
        forceConsentClass: 'disable--interaction',
        expandedSection: '#cc-main .pm__section--expandable.is-expanded',
        sectionToggle: (name) => `#cc-main .pm__section--toggle:has(input.section__toggle[value="${name}"]) .pm__section-title`,
    },
};

// The generation is detected by the API, not by the version: package.json keeps the last released version until the release.
export async function wrapperMajor(page) {
    await page.waitForFunction(() => window.CookieConsentWrapper && window.CookieConsentWrapper.version);

    return await page.evaluate(() => 'servicesMode' in window.CookieConsentWrapper) ? 2 : 1;
}

export async function ui(page, name, ...args) {
    const selector = SELECTORS[await wrapperMajor(page)][name];

    return typeof selector === 'function' ? selector(...args) : selector;
}

export async function openPage(page, config = {}, { path = '/tests/fixtures/page.html', init = null, waitForInit = true, bodyHtml = null, sync = false, pkg = null } = {}) {
    await page.addInitScript(([cfg, initSrc, html, isSync, pkgPath]) => {
        window.__CC_CONFIG__ = cfg;
        window.__CC_PKG__ = pkgPath;
        window.__CC_BODY_HTML__ = html;
        window.__CC_SYNC__ = isSync;
        if (initSrc) {
            (0, eval)(initSrc);
        }
    }, [config, init ? `(${init.toString()})()` : null, bodyHtml, sync, pkg]);
    await page.goto(path);

    if (waitForInit) {
        await waitForInitEvent(page);
    }
}

export async function waitForInitEvent(page) {
    await expect.poll(() => page.evaluate(() => (window.__ccEvents || []).some(e => e.name === 'init'))).toBe(true);
}

export async function dataLayer(page) {
    return page.evaluate(() => (window.dataLayer || []).map((entry) => {
        // gtag() pushes the Arguments object
        if (entry && typeof entry === 'object' && typeof entry.length === 'number' && !Array.isArray(entry)) {
            return Array.prototype.slice.call(entry);
        }
        return entry;
    }));
}

export async function events(page) {
    return page.evaluate(() => window.__ccEvents);
}

export async function cookieValue(page, name = 'cc-settings') {
    const cookie = (await page.context().cookies()).find(c => c.name === name);

    if (!cookie) {
        return null;
    }

    return JSON.parse(decodeURIComponent(cookie.value));
}

export function loadFixture(name) {
    return JSON.parse(fs.readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
}

export async function openGtmPage(page, data, { templateFile = null, waitForInit = true, init = null, pkg = null } = {}) {
    await page.addInitScript(([d, file, initSrc, pkgPath]) => {
        window.__GTM_DATA__ = d;
        window.__GTM_PKG__ = pkgPath;
        window.__GTM_TEMPLATE_FILE__ = file;
        if (initSrc) {
            (0, eval)(initSrc);
        }
    }, [data, templateFile, init ? `(${init.toString()})()` : null, pkg]);
    await page.goto('/tests/fixtures/gtm.html');

    if (waitForInit) {
        await waitForInitEvent(page);
    }
}

// Cookie written by plugin 2.9 (wrapper 1.x).
export function legacyConsentCookie(categories, { revision = 0, rfc = false, uuid = '7c5d1a2b-0c3e-4f5a-9b8c-1d2e3f4a5b6c', date = '2026-09-01T10:00:00.000Z', data = { last_action_date: '2026-09-01T10:00:00.000Z' }, withUuid = true } = {}) {
    const value = {
        categories,
        level: categories,
        revision,
        data,
        rfc_cookie: rfc,
        consent_date: date,
        last_consent_update: date,
    };

    if (withUuid) {
        value.consent_uuid = uuid;
    }

    const json = JSON.stringify(value);

    return rfc ? encodeURIComponent(json) : json;
}

export async function setConsentCookie(page, value, name = 'cc-settings') {
    await page.context().addCookies([{ name, value, domain: 'localhost', path: '/', sameSite: 'Lax' }]);
}

// Commands and events pushed into the data layer, normalized: gtag calls as arrays, events as objects.
export function consentCommands(entries) {
    return entries.filter(e => Array.isArray(e) && e[0] === 'consent');
}

export function gtagEvents(entries) {
    return entries.filter(e => Array.isArray(e) && e[0] === 'event').map(e => e[1]);
}

export async function showPreferences(page) {
    await page.evaluate(() => {
        const plugin = window.CookieConsentWrapper.unwrap();
        (plugin.showPreferences || plugin.showSettings).call(plugin, 0);
    });
    await expect(page.locator(await ui(page, 'preferencesModal'))).toBeVisible();
}

export async function cmpRequests(page, endpoint = null) {
    const requests = await page.evaluate(() => window.__cmpRequests || []);

    return endpoint ? requests.filter(r => r.endpoint === endpoint) : requests;
}

export const STORAGES_ALL_VISIBLE = [
    { name: 'functionality_storage', enabled_by_default: true, display_in_widget: true, readonly: true },
    { name: 'personalization_storage', display_in_widget: true },
    { name: 'security_storage', sync_consent_with: 'functionality_storage' },
    { name: 'ad_storage', display_in_widget: true },
    { name: 'ad_user_data', sync_consent_with: 'ad_storage' },
    { name: 'ad_personalization', sync_consent_with: 'ad_storage' },
    { name: 'analytics_storage', display_in_widget: true },
];

export function cmpConfig(overrides = {}) {
    return {
        locales: ['cs'],
        user_options: { identity: 'test-user', attributes: { email: 'test@example.com' } },
        storage_pool: STORAGES_ALL_VISIBLE,
        cmp_api_options: {
            url: 'https://cmp.test/',
            project: 'demo',
            environment: 'default',
            consent_api_enabled: true,
            cookies_api_enabled: true,
            cookie_table_headers: ['name', 'purpose', 'processing_time', 'provider'],
        },
        ...overrides,
    };
}

// Waits until the data layer stops growing (consent callbacks may run after the next paint in v3.2).
export async function settledDataLayer(page, quietMs = 300, timeoutMs = 5000) {
    const start = Date.now();
    let last = -1;
    let stableSince = Date.now();

    while (Date.now() - start < timeoutMs) {
        const length = await page.evaluate(() => (window.dataLayer || []).length);
        if (length !== last) {
            last = length;
            stableSince = Date.now();
        } else if (Date.now() - stableSince >= quietMs) {
            break;
        }
        await page.waitForTimeout(50);
    }

    return dataLayer(page);
}

export function snapshotJson(value) {
    return JSON.stringify(value, null, 2) + '\n';
}

export const EVENT_TRIGGERS = [
    { name: '68publishers_functionality_storage', storage_names: ['functionality_storage'], type: 'or' },
    { name: '68publishers_personalization_storage', storage_names: ['personalization_storage'], type: 'or' },
    { name: '68publishers_ad_storage', storage_names: ['ad_storage'], type: 'or' },
    { name: '68publishers_analytics_storage', storage_names: ['analytics_storage'], type: 'or' },
    { name: '68publishers_ad_and_analytics', storage_names: ['ad_storage', 'analytics_storage'], type: 'and' },
];

export function standaloneConfig(overrides = {}) {
    return {
        locales: ['cs'],
        storage_pool: STORAGES_ALL_VISIBLE,
        event_triggers: EVENT_TRIGGERS,
        data_layer_options: { push_consent: true },
        ...overrides,
    };
}

export async function cookieNames(page) {
    return (await page.context().cookies()).map(c => c.name).sort();
}

export async function addCookies(page, names) {
    await page.context().addCookies(names.map(name => ({ name, value: '1', domain: 'localhost', path: '/' })));
}
