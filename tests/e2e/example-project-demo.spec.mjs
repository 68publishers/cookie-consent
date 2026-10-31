import { test, expect } from '@playwright/test';
import { legacyConsentCookie, setConsentCookie } from './helpers.mjs';

// Example Project demo: the same steps in 1.6.0 (reference) and 2.0 must give the same dataLayer, events,
// click triggers, cookie and CMP bodies. Intended differences of 2.0: the consent:saved event (new)
// and the configuration checksum in the CMP body (another format of the configuration export).

const VERSIONS = ['1.6.0', '2.0'];
const SELECTORS = {
    '1.6.0': { consent: '#cm', preferences: '#s-inr', overlay: '#cs-ov' },
    '2.0': { consent: '#cc-main .cm', preferences: '#cc-main .pm', overlay: '#cc-main .pm-overlay' },
};

async function open(page, version, query = '') {
    await page.goto(`/demo/example-project.html?version=${version}${query}`);
    await page.waitForFunction(() => (window.__ccEvents || []).some(e => e.name === 'init'));
}

const button = (page, name) => page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();

async function settled(page) {
    // the consent callbacks of v3 run after the next rendering, sending into the CMP waits for SHA-256
    await page.waitForTimeout(1000);

    return page.evaluate(() => ({
        dataLayer: window.dataLayer.map(e => JSON.parse(JSON.stringify(typeof e === 'object' && e !== null && typeof e.length === 'number' && !Array.isArray(e) ? Array.prototype.slice.call(e) : e))),
        events: (window.__ccEvents || []).filter(e => 'consent:saved' !== e.name).map(e => [e.name, e.args[0] || null]),
        triggers: window.__firedTriggers,
        cmp: (window.__cmpRequests || []).map((r) => {
            const body = r.body ? (typeof r.body === 'string' ? JSON.parse(r.body) : r.body) : null;
            body && delete body.settingsChecksum;
            return [r.method, r.path.replace(/[0-9a-f]{32}/, '{id}'), body];
        }),
    }));
}

async function consentCategories(page) {
    const cookie = (await page.context().cookies()).find(c => 'cc-settings' === c.name);
    if (!cookie) {
        return null;
    }
    const value = cookie.value.startsWith('%') ? decodeURIComponent(cookie.value) : cookie.value;

    return JSON.parse(value).categories;
}

const FLOWS = {
    'accept all': async (page) => {
        await button(page, 'Agree and continue').click();
    },
    'reject optional': async (page) => {
        await button(page, 'Reject optional cookies').click();
    },
    'save selection': async (page) => {
        await button(page, 'Detailed cookie settings').click();
        await page.locator('input[value="analytics_storage"]').filter({ visible: true }).click({ force: true });
        await button(page, 'Save detailed cookie settings').click();
    },
    'returning visitor': async (page, version) => {
        await button(page, 'Agree and continue').click();
        await page.waitForTimeout(800);
        await page.reload();
        await page.waitForFunction(() => (window.__ccEvents || []).some(e => e.name === 'init'));
        await page.waitForTimeout(800);
        await expect(page.locator(SELECTORS[version].consent)).toBeHidden();
    },
    'settings from the footer': async (page, version) => {
        await button(page, 'Agree and continue').click();
        await page.waitForTimeout(500);
        await page.locator('footer .footer-item a').last().click();
        await expect(page.locator(SELECTORS[version].preferences)).toBeVisible();
        await page.locator('input[value="personalization_storage"]').filter({ visible: true }).click({ force: true });
        await button(page, 'Save detailed cookie settings').click();
    },
};

test.describe('Example Project demo: 2.0 behaves like 1.6.0', () => {
    for (const [name, flow] of Object.entries(FLOWS)) {
        test(name, async ({ browser }) => {
            const results = {};

            for (const version of VERSIONS) {
                const context = await browser.newContext({ locale: 'en-US' });
                const page = await context.newPage();
                await open(page, version);
                await expect(page.locator(SELECTORS[version].consent)).toBeVisible();
                await flow(page, version);
                results[version] = { ...await settled(page), categories: await consentCategories(page) };
                await context.close();
            }

            expect(results['2.0']).toEqual(results['1.6.0']);
        });
    }

    for (const version of VERSIONS) {
        test(`${version}: the bar appears after the delay of 500 ms`, async ({ page }) => {
            await page.addInitScript(() => {
                window.cookieConsentWrapperEvents = window.cookieConsentWrapperEvents || [];
                window.cookieConsentWrapperEvents.push(['init', () => { window.__initAt = performance.now(); }]);
                // <html> does not exist yet, the class is watched on every frame
                const watch = () => {
                    if (document.documentElement && document.documentElement.classList.contains('show--consent')) {
                        window.__shownAt = performance.now();
                        return;
                    }
                    requestAnimationFrame(watch);
                };
                setTimeout(watch, 0);
            });
            await open(page, version);
            await page.waitForFunction(() => window.__shownAt);
            const delay = await page.evaluate(() => window.__shownAt - window.__initAt);
            expect(delay).toBeGreaterThan(400);
            expect(delay).toBeLessThan(900);
        });

        test(`${version}: Escape and a click outside close the settings, the bar stays`, async ({ page }) => {
            await open(page, version);
            await expect(page.locator(SELECTORS[version].consent)).toBeVisible();
            await button(page, 'Detailed cookie settings').click();
            await expect(page.locator(SELECTORS[version].preferences)).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(page.locator(SELECTORS[version].preferences)).toBeHidden();
            await expect(page.locator(SELECTORS[version].consent)).toBeVisible();

            await button(page, 'Detailed cookie settings').click();
            await expect(page.locator(SELECTORS[version].preferences)).toBeVisible();
            await page.mouse.click(40, 700);
            await expect(page.locator(SELECTORS[version].preferences)).toBeHidden();
            await expect(page.locator(SELECTORS[version].consent)).toBeVisible();
        });

        test(`${version}: "Back" closes the settings and the technical consent is always active`, async ({ page }) => {
            await open(page, version);
            await button(page, 'Detailed cookie settings').click();
            await expect(page.locator('.cc-always-active').filter({ visible: true })).toHaveCount(1);
            await expect(page.locator('input[value="functionality_storage"]').filter({ visible: true })).toHaveCount(0);
            await page.locator('.cc-back-button').filter({ visible: true }).click();
            await expect(page.locator(SELECTORS[version].preferences)).toBeHidden();
            await expect(page.locator(SELECTORS[version].consent)).toBeVisible();
        });

        for (const [days, shown] of [[100, true], [10, false]]) {
            test(`${version}: rejected analytics ${days} days ago ${shown ? 'opens' : 'does not open'} the settings again`, async ({ page }) => {
                const date = new Date(Date.now() - days * 86400000).toISOString();
                await setConsentCookie(page, legacyConsentCookie(['functionality_storage'], { date, data: { last_action_date: date } }));
                await open(page, version);
                await page.waitForTimeout(1200);
                await expect(page.locator(SELECTORS[version].preferences)).toBeVisible({ visible: shown });
                await expect(page.locator(SELECTORS[version].consent)).toBeHidden();
            });
        }
    }

    test('Tab goes through the same elements in the same order and wraps inside the modal', async ({ browser, browserName }) => {
        test.skip(browserName === 'webkit', 'WebKit does not move focus to buttons with Tab by default');
        const results = {};

        for (const version of VERSIONS) {
            const context = await browser.newContext({ locale: 'en-US' });
            const page = await context.newPage();
            const focused = () => page.evaluate(() => {
                const el = document.activeElement;
                return (el.value && 'checkbox' === el.type ? el.value : el.textContent.trim().split(/\s+/).slice(0, 2).join(' '));
            });
            const tab = async (count) => {
                const seq = [await focused()];
                for (let i = 0; i < count; i++) {
                    await page.keyboard.press('Tab');
                    seq.push(await focused());
                }
                return seq;
            };
            await open(page, version);
            await expect(page.locator(SELECTORS[version].consent)).toBeVisible();
            await page.waitForTimeout(500);
            const consent = await tab(5);
            await button(page, 'Detailed cookie settings').click();
            await page.waitForTimeout(700);
            results[version] = { consent, preferences: await tab(13) };
            await context.close();
        }

        expect(results['2.0']).toEqual(results['1.6.0']);
        expect(results['2.0'].preferences).toContain('Reject optional');
    });

    for (const [from, to] of [['1.6.0', '2.0'], ['2.0', '1.6.0']]) {
        test(`consent given in ${from} is kept by ${to} without the bar`, async ({ page }) => {
            await open(page, from);
            await button(page, 'Reject optional cookies').click();
            await page.waitForTimeout(800);
            await open(page, to);
            await page.waitForTimeout(1200);
            await expect(page.locator(SELECTORS[to].consent)).toBeHidden();
            expect(await consentCategories(page)).toEqual(['functionality_storage']);
        });
    }
});
