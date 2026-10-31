import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import {
    openPage, openGtmPage, loadFixture, ui, wrapperMajor, showPreferences, settledDataLayer, snapshotJson, events,
    standaloneConfig, legacyConsentCookie, setConsentCookie,
} from './helpers.mjs';

const snapshot = (name) => JSON.parse(fs.readFileSync(new URL(`./__snapshots__/datalayer.spec.mjs/${name}`, import.meta.url), 'utf8'));

// 2.0: a returning visitor gets no consent event from the page load, gtag "update" stays
const withoutPageLoadConsentEvent = (entries) => entries.filter(e => !(e && e.event === '68publishers_consent' && e.consent_status === 'update'));

async function expectReturningVisitor(page, entries, name) {
    if (await wrapperMajor(page) === 1) {
        expect(snapshotJson(entries)).toMatchSnapshot(name);
    } else {
        expect(entries).toEqual(withoutPageLoadConsentEvent(snapshot(name)));
    }
}

// events of 1.x; 2.0 adds "consent:saved" after every action in the widget
const legacyEvents = (list) => list.map(e => e.name).filter(name => name !== 'consent:saved');

// Characterization of the data layer sequence of wrapper 1.6.0. The same snapshots must hold for 2.0
// (the only planned difference is the duplicated consent event of a returning visitor).

const RETURNING = ['functionality_storage', 'analytics_storage'];

test.describe('data layer: standalone integration', () => {
    test('new visitor: nothing before the first action, accept all', async ({ page }) => {
        await openPage(page, standaloneConfig());
        expect(await settledDataLayer(page)).toEqual([]);

        await page.locator(await ui(page, 'acceptAll')).click();
        expect(snapshotJson(await settledDataLayer(page))).toMatchSnapshot('new-visitor-accept-all.json');
        expect(legacyEvents(await events(page))).toEqual(['init', 'consent:first-action', 'consent:accepted']);
    });

    test('new visitor: accept necessary', async ({ page }) => {
        await openPage(page, standaloneConfig({ consent_modal_options: { secondary_button_role: 'accept_necessary' } }));
        await page.locator(await ui(page, 'consentSecondary')).click();

        expect(snapshotJson(await settledDataLayer(page))).toMatchSnapshot('new-visitor-accept-necessary.json');
    });

    test('returning visitor: consent update on every page', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(RETURNING));
        await openPage(page, standaloneConfig());

        await expectReturningVisitor(page, await settledDataLayer(page), 'returning-visitor.json');
        expect((await events(page)).map(e => e.name)).toEqual(['init', 'consent:accepted']);
        await expect(page.locator(await ui(page, 'consentModal'))).toBeHidden();
    });

    test('returning visitor changes the preferences', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(RETURNING));
        await openPage(page, standaloneConfig());
        await settledDataLayer(page);
        await page.evaluate(() => { window.dataLayer.length = 0; });

        await showPreferences(page);
        await page.locator(await ui(page, 'toggle', 'analytics_storage')).click();
        await page.locator(await ui(page, 'toggle', 'ad_storage')).click();
        await page.locator(await ui(page, 'prefsSave')).click();

        expect(snapshotJson(await settledDataLayer(page))).toMatchSnapshot('returning-visitor-change.json');
        const changed = (await events(page)).find(e => e.name === 'consent:changed');
        expect(changed.args[1].sort()).toEqual(['ad_storage', 'analytics_storage']);
    });

    test('revision change shows the modal again and keeps the data layer empty until the action', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(RETURNING, { revision: 1 }));
        await openPage(page, standaloneConfig({ plugin_options: { revision: 2 } }));

        await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();
        expect(await settledDataLayer(page)).toEqual([]);

        await page.locator(await ui(page, 'acceptAll')).click();
        expect(snapshotJson(await settledDataLayer(page))).toMatchSnapshot('revision-change-accept-all.json');
    });

    test('push_consent disabled: only gtag commands and triggers', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(RETURNING));
        await openPage(page, standaloneConfig({ data_layer_options: { push_consent: false } }));

        const entries = await settledDataLayer(page);
        expect(entries.every(e => Array.isArray(e))).toBe(true);
        expect(snapshotJson(entries)).toMatchSnapshot('returning-visitor-without-push.json');
    });
});

test.describe('data layer: GTM integration (Example Project configuration)', () => {
    const exampleProject = loadFixture('gtm/example-project.json').data;

    test('new visitor: template default, then accept all', async ({ page }) => {
        await openGtmPage(page, { ...exampleProject, push_consent_to_data_layer: true, consent_data_layer_event_name: '68publishers_consent' });
        expect(snapshotJson(await settledDataLayer(page))).toMatchSnapshot('gtm-new-visitor-load.json');

        await page.locator(await ui(page, 'acceptAll')).click();
        expect(snapshotJson(await settledDataLayer(page))).toMatchSnapshot('gtm-new-visitor-accept-all.json');
    });

    test('returning visitor: template default and wrapper update', async ({ page }) => {
        await setConsentCookie(page, legacyConsentCookie(['functionality_storage', 'analytics_storage'], { rfc: true }));
        await openGtmPage(page, { ...exampleProject, push_consent_to_data_layer: true, consent_data_layer_event_name: '68publishers_consent' });

        await expectReturningVisitor(page, await settledDataLayer(page), 'gtm-returning-visitor.json');
    });
});
