import { test, expect } from '@playwright/test';
import { openPage, ui } from './helpers.mjs';

test('the wrapper initializes and shows the consent modal', async ({ page }) => {
    await openPage(page, {
        locales: ['en'],
        storage_pool: [{ name: 'functionality_storage', enabled_by_default: true, display_in_widget: true, readonly: true }],
    });

    await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();
    expect(await page.evaluate(() => window.__ccEvents.map(e => e.name))).toContain('init');
});
