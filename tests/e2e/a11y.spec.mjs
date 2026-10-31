import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openPage, ui, wrapperMajor, showPreferences, standaloneConfig, cmpConfig } from './helpers.mjs';

// Layout combinations offered by the GTM template.
const CONSENT_LAYOUTS = [
    { layout: 'box', position: 'bottom center' },
    { layout: 'box', position: 'middle center' },
    { layout: 'cloud', position: 'bottom center' },
    { layout: 'bar', position: 'bottom center' },
];
const SETTINGS_LAYOUTS = [{ layout: 'box' }, { layout: 'bar', position: 'left' }, { layout: 'bar', position: 'right' }];

const report = {};

async function axe(page, selector) {
    const results = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();

    return results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
}

const blocking = (violations) => violations.filter(v => v.impact === 'serious' || v.impact === 'critical');

test.describe('axe', () => {
    // serial: the report is collected in one worker
    test.describe.configure({ mode: 'serial' });
    // one browser is enough for axe; the report is written by Chromium only
    test.skip(({ browserName }) => browserName !== 'chromium');

    for (const cm of CONSENT_LAYOUTS) {
        test(`consent modal ${cm.layout} ${cm.position}`, async ({ page }) => {
            await openPage(page, standaloneConfig({ consent_modal_options: { ...cm, show_third_button: true } }));
            await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();
            const violations = await axe(page, await ui(page, 'consentModal'));
            report[`consent ${cm.layout} ${cm.position}`] = violations;

            if (await wrapperMajor(page) >= 2) {
                expect(blocking(violations)).toEqual([]);
            }
        });
    }

    for (const sm of SETTINGS_LAYOUTS) {
        test(`settings modal ${sm.layout} ${sm.position || ''}`, async ({ page }) => {
            await openPage(page, cmpConfig({ settings_modal_options: sm }));
            await showPreferences(page);
            await page.waitForTimeout(400);
            const violations = await axe(page, await ui(page, 'preferencesModal'));
            report[`settings ${sm.layout} ${sm.position || ''}`.trim()] = violations;

            if (await wrapperMajor(page) >= 2) {
                expect(blocking(violations)).toEqual([]);
            }
        });
    }

    test.afterAll(() => {
        if (process.env.A11Y_REPORT) {
            fs.writeFileSync(process.env.A11Y_REPORT, JSON.stringify(Object.fromEntries(Object.entries(report).sort()), null, 2) + '\n');
        }
    });
});

test.describe('keyboard', () => {
    const focusedInside = (selector) => (sel) => !!document.activeElement && !!document.activeElement.closest(sel);

    test('focus moves into the consent modal and Tab stays inside', async ({ page, browserName }) => {
        test.skip(browserName === 'webkit', 'WebKit does not move focus to buttons with Tab by default');
        await openPage(page, standaloneConfig({ consent_modal_options: { show_third_button: true } }));
        const modal = await ui(page, 'consentModal');
        await expect(page.locator(modal)).toBeVisible();
        // the plugin moves the focus after the opening animation, which takes longer under parallel load
        await expect.poll(() => page.evaluate(focusedInside(modal), modal), { timeout: 15000 }).toBe(true);

        for (let i = 0; i < 8; i++) {
            await page.keyboard.press('Tab');
            expect(await page.evaluate(focusedInside(modal), modal)).toBe(true);
        }
        for (let i = 0; i < 8; i++) {
            await page.keyboard.press('Shift+Tab');
            expect(await page.evaluate(focusedInside(modal), modal)).toBe(true);
        }
    });

    test('settings modal: Tab stays inside, Escape closes it and returns focus to the trigger', async ({ page, browserName }) => {
        test.skip(browserName === 'webkit', 'WebKit does not move focus to buttons with Tab by default');
        await openPage(page, standaloneConfig({ plugin_options: { autorun: false }, settings_modal_options: { modal_trigger_selector: 'footer .footer-item' } }));
        const trigger = page.locator('footer a[href="#cookie-settings"]');
        await trigger.focus();
        await page.keyboard.press('Enter');
        const modal = await ui(page, 'preferencesModal');
        await expect(page.locator(modal)).toBeVisible();
        // the plugin moves the focus after the opening animation, which takes longer under parallel load
        await expect.poll(() => page.evaluate(focusedInside(modal), modal), { timeout: 15000 }).toBe(true);

        for (let i = 0; i < 15; i++) {
            await page.keyboard.press('Tab');
            expect(await page.evaluate(focusedInside(modal), modal)).toBe(true);
        }

        await page.keyboard.press('Escape');
        await expect(page.locator(modal)).toBeHidden();
        await expect.poll(() => page.evaluate(() => document.activeElement && document.activeElement.getAttribute('href'))).toBe('#cookie-settings');
    });

    test('changing the language keeps the focus inside the open modal', async ({ page, browserName }) => {
        test.skip(browserName === 'webkit', 'WebKit does not move focus to buttons with Tab by default');
        await openPage(page, standaloneConfig({ locales: ['cs', 'en'], consent_modal_options: { show_third_button: true } }));
        const modal = await ui(page, 'consentModal');
        // the plugin moves the focus after the opening animation, which takes longer under parallel load
        await expect.poll(() => page.evaluate(focusedInside(modal), modal), { timeout: 15000 }).toBe(true);

        await page.evaluate(() => window.CookieConsentWrapper.changeLocale('en', true));
        await expect(page.locator(await ui(page, 'consentTitle'))).toHaveText('We use cookies!');
        // the plugin moves the focus after the opening animation, which takes longer under parallel load
        await expect.poll(() => page.evaluate(focusedInside(modal), modal), { timeout: 15000 }).toBe(true);
    });
});
