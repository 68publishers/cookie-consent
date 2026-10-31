import { test, expect } from '@playwright/test';
import { ui, waitForInitEvent } from './helpers.mjs';

for (const demo of ['standalone', 'gtm', 'cmp']) {
    test(`demo/${demo}.html shows the consent modal`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(() => {
            window.__ccEvents = [];
            window.cookieConsentWrapperEvents = [['init', () => window.__ccEvents.push({ name: 'init' })]];
        });
        await page.goto(`/demo/${demo}.html`);
        await waitForInitEvent(page);

        await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();
        expect(errors).toEqual([]);
    });
}
