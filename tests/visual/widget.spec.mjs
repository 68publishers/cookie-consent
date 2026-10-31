import { test, expect } from '@playwright/test';
import { openPage, ui, showPreferences, cmpConfig, standaloneConfig, STORAGES_ALL_VISIBLE } from '../e2e/helpers.mjs';

// Visual references of the 2.0 widget. Update only with `npm run test:visual -- --update-snapshots=all`
// in a task that changes the look, and review every new image before the commit.

const POSITIONS = ['top left', 'top center', 'top right', 'middle left', 'middle center', 'middle right', 'bottom left', 'bottom center', 'bottom right'];
const CONSENT = [
    ...POSITIONS.map(position => ({ layout: 'box', position })),
    ...POSITIONS.map(position => ({ layout: 'cloud', position })),
    { layout: 'bar', position: 'top center' },
    { layout: 'bar', position: 'bottom center' },
];
const PREFERENCES = [{ layout: 'box' }, { layout: 'bar', position: 'left' }, { layout: 'bar', position: 'right' }];
const slug = (...parts) => parts.join('-').replace(/\s+/g, '-');

async function stable(page) {
    await page.addStyleTag({ content: '#cc-main, #cc-main .cm, #cc-main .pm { --cc-modal-transition-duration: 0s !important; }' });
    await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ page }) => {
    // no delay, a fixed CMP dataset (mocked) and Czech texts
    await page.addInitScript(() => { window.__CMP_MOCK__ = {}; });
});

for (const cm of CONSENT) {
    test(`consent modal ${cm.layout} ${cm.position}`, async ({ page }) => {
        await openPage(page, standaloneConfig({ consent_modal_options: { ...cm, show_third_button: true } }));
        await stable(page);
        await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();

        await expect(page).toHaveScreenshot(`${slug('consent', cm.layout, cm.position)}.png`);
    });
}

for (const viewport of [{ name: 'mobile', width: 390, height: 844 }]) {
    for (const layout of ['box', 'cloud', 'bar']) {
        test(`consent modal ${layout} on ${viewport.name}`, async ({ page }) => {
            await page.setViewportSize(viewport);
            await openPage(page, standaloneConfig({ consent_modal_options: { layout, position: 'bottom center', show_third_button: true } }));
            await stable(page);
            await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();

            await expect(page).toHaveScreenshot(`${slug('consent', layout, viewport.name)}.png`);
        });
    }
}

for (const pm of PREFERENCES) {
    test(`preferences modal ${pm.layout} ${pm.position || ''}`, async ({ page }) => {
        await openPage(page, cmpConfig({ plugin_options: { autorun: false }, settings_modal_options: pm }));
        await stable(page);
        await showPreferences(page);

        await expect(page).toHaveScreenshot(`${slug('preferences', pm.layout, pm.position || 'default')}.png`);
    });
}

test('preferences modal with an expanded cookie table and a readonly-disabled storage', async ({ page }) => {
    await openPage(page, cmpConfig({
        plugin_options: { autorun: false },
        storage_pool: STORAGES_ALL_VISIBLE.map(s => s.name === 'personalization_storage' ? { ...s, readonly: true } : s),
    }));
    await stable(page);
    await showPreferences(page);
    await page.locator(await ui(page, 'sectionToggle', 'analytics_storage')).click();
    await expect(page.locator(await ui(page, 'expandedSection'))).toHaveCount(1);
    await page.locator('#cc-main .pm__section--expandable.is-expanded').scrollIntoViewIfNeeded();

    await expect(page).toHaveScreenshot('preferences-cookie-table-readonly-disabled.png');
});

test('preferences modal on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPage(page, cmpConfig({ plugin_options: { autorun: false } }));
    await stable(page);
    await showPreferences(page);

    await expect(page).toHaveScreenshot('preferences-box-mobile.png');
});

test('preferences modal in the services mode with an expanded category', async ({ page }) => {
    await openPage(page, cmpConfig({
        plugin_options: { autorun: false },
        settings_modal_options: { preferences_mode: 'services' },
        storage_pool: STORAGES_ALL_VISIBLE.map(s => s.name === 'ad_storage' ? { ...s, services: [{ name: 'sklik', label: 'Seznam Sklik' }] } : s),
    }));
    await stable(page);
    await showPreferences(page);
    await page.locator(await ui(page, 'sectionToggle', 'ad_storage')).click();
    await page.locator('#cc-main .pm__section--expandable.is-expanded').scrollIntoViewIfNeeded();

    await expect(page).toHaveScreenshot('preferences-services-expanded.png');
});
