// one-off screenshots of the main combinations in Firefox and WebKit for the gallery (no references, not compared).
// Usage: node tests/visual/other-browsers.mjs (serves var/build on port 4390)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { firefox, webkit } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'var/visual/other-browsers');
const port = 4390;
const storages = [
    { name: 'functionality_storage', enabled_by_default: true, display_in_widget: true, readonly: true },
    { name: 'personalization_storage', display_in_widget: true },
    { name: 'ad_storage', display_in_widget: true, services: [{ name: 'sklik', label: 'Seznam Sklik' }] },
    { name: 'analytics_storage', display_in_widget: true },
];
const cmp = { url: 'https://cmp.test/', project: 'demo', consent_api_enabled: true, cookies_api_enabled: true, cookie_table_headers: ['name', 'purpose', 'processing_time', 'provider'] };
const SCENARIOS = [
    { name: 'consent-box', config: { locales: ['cs'], storage_pool: storages, consent_modal_options: { show_third_button: true } } },
    { name: 'consent-bar', config: { locales: ['cs'], storage_pool: storages, consent_modal_options: { layout: 'bar', show_third_button: true } } },
    { name: 'preferences-box', config: { locales: ['cs'], storage_pool: storages, cmp_api_options: cmp, plugin_options: { autorun: false } }, preferences: true },
    { name: 'preferences-services', config: { locales: ['cs'], storage_pool: storages, cmp_api_options: cmp, plugin_options: { autorun: false }, settings_modal_options: { preferences_mode: 'services' } }, preferences: true, expand: 'ad_storage' },
];

const server = spawn(process.execPath, [path.join(root, 'tests/server.mjs')], { env: { ...process.env, CC_TARGET: 'var/build', CC_PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(resolve => server.stdout.once('data', resolve));
fs.mkdirSync(out, { recursive: true });

try {
    for (const [name, type] of [['firefox', firefox], ['webkit', webkit]]) {
        const browser = await type.launch();
        for (const scenario of SCENARIOS) {
            const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'cs-CZ' });
            await page.addInitScript((c) => { window.__CC_CONFIG__ = c; }, scenario.config);
            await page.goto(`http://localhost:${port}/tests/fixtures/page.html`);
            await page.waitForFunction(() => (window.__ccEvents || []).some(e => e.name === 'init'));
            await page.addStyleTag({ content: '#cc-main, #cc-main .cm, #cc-main .pm { --cc-modal-transition-duration: 0s !important; }' });
            if (scenario.preferences) {
                await page.evaluate(() => window.CookieConsentWrapper.unwrap().showPreferences());
            }
            if (scenario.expand) {
                await page.click(`#cc-main .pm__section--toggle:has(input[value="${scenario.expand}"]) .pm__section-title`);
            }
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(out, `${scenario.name}-${name}.png`) });
            await page.close();
        }
        await browser.close();
    }
} finally {
    server.kill();
}
console.log(`written ${path.relative(root, out)}`);
