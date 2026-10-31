import fs from 'node:fs';
import { test, expect } from '@playwright/test';

// Example Project demo: the 2.0 widget with branding.v2.css is compared with a screenshot of 1.6.0
// with the 1.x CSS from the same page and the same run. Different pixels (channel deviation > 48) <= 1 %.

const MAX_DIFF_RATIO = 0.01;
const OUT = new URL('../../var/visual/parity/', import.meta.url);

const SCENARIOS = [
    { name: 'consent', viewport: { width: 1280, height: 800 } },
    { name: 'consent-mobile', viewport: { width: 390, height: 844 } },
    { name: 'preferences', viewport: { width: 1280, height: 800 }, preferences: true },
    { name: 'preferences-expanded', viewport: { width: 1280, height: 800 }, preferences: true, expand: 'analytics_storage', scroll: 150 },
    { name: 'preferences-bottom', viewport: { width: 1280, height: 800 }, preferences: true, scroll: 'bottom' },
    { name: 'preferences-mobile', viewport: { width: 390, height: 844 }, preferences: true },
    { name: 'preferences-mobile-bottom', viewport: { width: 390, height: 844 }, preferences: true, scroll: 'bottom' },
    { name: 'app-settings', viewport: { width: 390, height: 844 }, query: '&app=settings' },
    // the opening animation stopped in the middle of the transition (125 ms of 250 ms)
    { name: 'consent-opening', viewport: { width: 1280, height: 800 }, freeze: 'consent' },
    { name: 'consent-opening-mobile', viewport: { width: 390, height: 844 }, freeze: 'consent' },
    { name: 'preferences-opening', viewport: { width: 1280, height: 800 }, freeze: 'preferences' },
];

// Once the transition starts, all CSS transitions are stopped at the given time (Web Animations API).
const FREEZE_AT = 125;
// Waits for the transition of the modal (selector), then stops all running transitions of the widget.
const freezeOnStart = ([at, modal]) => new Promise((resolve) => {
    const inWidget = a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#cc-main, #cc--main');
    const check = () => {
        // only the opacity transition of the opening (other transitions run on the hidden modal after the CSS is inserted)
        // and only after the show class is added (a late CSS starts a transition to opacity 0 on the hidden modal)
        const shown = document.documentElement && /show--(consent|settings|preferences)/.test(document.documentElement.className);
        if (shown && document.getAnimations().some(a => inWidget(a) && a.effect.target.matches(modal) && 'opacity' === a.transitionProperty && 'running' === a.playState)) {
            document.getAnimations().filter(inWidget).forEach((a) => { a.pause(); a.currentTime = at; });
            requestAnimationFrame(() => requestAnimationFrame(resolve));
            return;
        }
        requestAnimationFrame(check);
    };
    check();
});

async function capture(page, version, scenario, attempt = 0) {
    await page.setViewportSize(scenario.viewport);
    if ('consent' === scenario.freeze && !attempt) {
        // watches the transitions from the start of the page load (init may come after the transition started)
        await page.addInitScript(`(${freezeOnStart.toString()})(${JSON.stringify([FREEZE_AT, '1.6.0' === version ? '#cm' : '#cc-main .cm'])}).then(() => { window.__frozen = true; })`);
    }
    await page.goto(`/demo/example-project.html?version=${version}${scenario.query || ''}`);
    await page.waitForFunction(() => (window.__ccEvents || []).some(e => e.name === 'init'));

    if ('consent' === scenario.freeze) {
        await page.waitForFunction(() => window.__frozen, null, { timeout: 10000 });
        return page.screenshot({ caret: 'hide', mask: [page.locator('.demo-header')] });
    }

    // cookie tables from the mocked CMP and the delay of the widget (500 ms) + the animation
    await page.waitForTimeout(1500);

    // 1.6.0 sometimes overwrites the empty title of the last block with "More information" from the locale file
    // (a race between the translations from GTM and loading en.json.js, fixed in 2.0); the reference is the correct state
    if ('1.6.0' === version && await page.evaluate(() => /More information/.test(document.querySelector('#s-bl')?.textContent || ''))) {
        if ((attempt || 0) < 5) {
            await page.context().clearCookies();

            return capture(page, version, scenario, (attempt || 0) + 1);
        }
    }

    if ('preferences' === scenario.freeze) {
        await page.evaluate(`window.__freeze = ${freezeOnStart.toString()}`);
        await page.evaluate((args) => {
            const done = window.__freeze(args);
            const plugin = window.CookieConsentWrapper.unwrap();
            (plugin.showPreferences || plugin.showSettings).call(plugin, 0);
            return done;
        }, [FREEZE_AT, '1.6.0' === version ? '#s-inr' : '#cc-main .pm']);

        return page.screenshot({ caret: 'hide', mask: [page.locator('.demo-header')] });
    }
    if (scenario.preferences) {
        await page.evaluate(() => {
            const plugin = window.CookieConsentWrapper.unwrap();
            (plugin.showPreferences || plugin.showSettings).call(plugin, 0);
        });
        await page.waitForTimeout(800);
    }
    if (scenario.expand) {
        // a click without the automatic scroll of Playwright (it depends on the geometry), focus like after a mouse click
        await page.evaluate(([v, name]) => {
            const title = document.querySelector('1.6.0' === v
                ? `#s-bl .c-bl:has(input.c-tgl[value="${name}"]) .b-tl`
                : `#cc-main .pm__section--toggle:has(input.section__toggle[value="${name}"]) .pm__section-title`);
            title.focus();
            title.click();
        }, [version, scenario.expand]);
        await page.waitForTimeout(800);
    }
    if (scenario.scroll) {
        // scrolls #s-bl (1.6.0) or the body of the modal (2.0)
        await page.evaluate(([v, scroll]) => {
            const el = document.querySelector('1.6.0' === v ? '#s-bl' : '#cc-main .pm__body');
            el.scrollTop = 'bottom' === scroll ? el.scrollHeight : scroll;
        }, [version, scenario.scroll]);
        await page.waitForTimeout(300);
    }

    // the demo header shows the version, only the widget and the page below it are compared
    return page.screenshot({ caret: 'hide', mask: [page.locator('.demo-header')] });
}

// Comparison in the browser through a canvas (no other dependency); returns the ratio of different pixels and an image of the differences.
async function diff(page, a, b) {
    await page.goto('about:blank');

    return page.evaluate(async ([a64, b64]) => {
        const load = (src) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = 'data:image/png;base64,' + src; });
        const [ia, ib] = await Promise.all([load(a64), load(b64)]);
        const w = Math.max(ia.width, ib.width);
        const h = Math.max(ia.height, ib.height);
        const read = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
        const da = read(ia);
        const db = read(ib);
        const out = new OffscreenCanvas(w, h);
        const ctx = out.getContext('2d');
        const res = ctx.createImageData(w, h);
        let count = 0;
        for (let i = 0; i < da.length; i += 4) {
            const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
            const g = (da[i] + da[i + 1] + da[i + 2]) / 3;
            if (d > 48) {
                count++;
                res.data.set([255, 0, 0, 255], i);
            } else {
                res.data.set([g, g, g, 60], i);
            }
        }
        ctx.putImageData(res, 0, 0);
        const blob = await out.convertToBlob();
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i++) {
            bin += String.fromCharCode(buf[i]);
        }

        return { ratio: count / (w * h), image: btoa(bin) };
    }, [a.toString('base64'), b.toString('base64')]);
}

for (const scenario of SCENARIOS) {
    test(`Example Project parity ${scenario.name}`, async ({ page }, testInfo) => {
        const ref = await capture(page, '1.6.0', scenario);
        await page.context().clearCookies();
        const current = await capture(page, '2.0', scenario);
        const result = await diff(page, ref, current);

        fs.mkdirSync(OUT, { recursive: true });
        fs.writeFileSync(new URL(`${scenario.name}-1.6.0.png`, OUT), ref);
        fs.writeFileSync(new URL(`${scenario.name}-2.0.png`, OUT), current);
        fs.writeFileSync(new URL(`${scenario.name}-diff.png`, OUT), Buffer.from(result.image, 'base64'));
        await testInfo.attach('diff', { body: Buffer.from(result.image, 'base64'), contentType: 'image/png' });
        testInfo.annotations.push({ type: 'diff', description: `${(result.ratio * 100).toFixed(3)} %` });
        console.log(`Example Project parity ${scenario.name}: ${(result.ratio * 100).toFixed(3)} %`);

        expect(result.ratio, `different pixels ${(result.ratio * 100).toFixed(2)} %, see var/visual/parity/${scenario.name}-*.png`).toBeLessThanOrEqual(MAX_DIFF_RATIO);
    });
}
