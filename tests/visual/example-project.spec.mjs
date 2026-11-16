import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openGtmPage, loadFixture, ui, showPreferences } from '../e2e/helpers.mjs';

// The Example Project with its branding: 2.0 with branding.v2.css is a visual reference,
// 1.6.0 with the 1.x CSS is captured for the gallery only (EXAMPLE_PROJECT_REF=1), never compared.

const v2Css = fs.readFileSync(new URL('../fixtures/clients/example-project/branding.v2.css', import.meta.url), 'utf8');
const exampleProject = loadFixture('gtm/example-project.json').data;
const REF = !!process.env.EXAMPLE_PROJECT_REF;

const SCENARIOS = [
    { name: 'consent', viewport: { width: 1280, height: 800 } },
    { name: 'consent-mobile', viewport: { width: 390, height: 844 } },
    { name: 'preferences', viewport: { width: 1280, height: 800 }, preferences: true },
    { name: 'preferences-expanded', viewport: { width: 1280, height: 800 }, preferences: true, expand: 'analytics_storage' },
    { name: 'preferences-mobile', viewport: { width: 390, height: 844 }, preferences: true },
];

for (const scenario of SCENARIOS) {
    test(`Example Project ${scenario.name}${REF ? ' (1.6.0 reference)' : ''}`, async ({ page }) => {
        await page.setViewportSize(scenario.viewport);
        await openGtmPage(page, REF ? { ...exampleProject, delay: 0 } : { ...exampleProject, delay: 0, internal_stylesheets: v2Css }, { pkg: REF ? '/ref/' : null });
        await page.addStyleTag({ content: '#cc-main, #cc-main .cm, #cc-main .pm { --cc-modal-transition-duration: 0s !important; } .c--anim #cm, .c--anim #s-inr, #cm-ov, #cs-ov { transition: none !important; }' });
        await expect(page.locator(await ui(page, 'consentModal'))).toBeVisible();

        if (scenario.preferences) {
            await showPreferences(page);
        }
        if (scenario.expand) {
            await page.locator(await ui(page, 'sectionToggle', scenario.expand)).click();
        }
        await page.waitForTimeout(400);

        if (REF) {
            fs.mkdirSync(new URL('../../var/visual/example-project-1.6.0/', import.meta.url), { recursive: true });
            await page.screenshot({ path: new URL(`../../var/visual/example-project-1.6.0/example-project-${scenario.name}.png`, import.meta.url).pathname });
        } else {
            await expect(page).toHaveScreenshot(`example-project-${scenario.name}.png`);
        }
    });
}
