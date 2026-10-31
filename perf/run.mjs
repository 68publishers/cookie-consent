// Performance measurement of the cookie consent build.
// Usage: node perf/run.mjs [--target=var/build] [--variant=V1] [--runs=10] [--baseline] [--compare] [--ref]
//   --ref       measures 1.6.0 downloaded from unpkg into var/perf-ref (variant V0)
//   --baseline  writes perf/baseline-1.6.0.json (only with --ref)
//   --compare   compares the result with perf/baseline-1.6.0.json using perf/budget.json, exits 1 on a breach
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { downloadRef } from './download-ref.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
// --compare is a gate: 20 runs keep the median of the JS time within ~2 % (10 runs varied by up to 20 %)
const runs = Number(args.runs || (args.compare ? 20 : 10));
const CPU_THROTTLING = 4;
// Chrome DevTools "Fast 3G"
const NETWORK = { offline: false, latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 };

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const round = (v) => Math.round(v * 10) / 10;

function sizes(dir) {
    const measure = (file) => {
        const data = fs.readFileSync(path.join(dir, file));
        return { raw: data.length, gzip: zlib.gzipSync(data, { level: 9 }).length, brotli: zlib.brotliCompressSync(data).length };
    };
    return { js: measure('cookie-consent.min.js'), css: measure('cookie-consent.css') };
}

function startServer(target, port) {
    return new Promise((resolve, reject) => {
        const server = spawn(process.execPath, [path.join(root, 'tests/server.mjs')], { env: { ...process.env, CC_TARGET: target, CC_PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
        server.stdout.once('data', () => resolve(server));
        server.once('error', reject);
    });
}

const SCENARIOS = {
    // standalone integration with three locales (cs is the current one)
    standalone: {
        path: '/tests/fixtures/page.html',
        init: (config) => { window.__CC_CONFIG__ = config; },
        arg: {
            locales: ['cs', 'en', 'de'],
            consent_modal_options: { show_third_button: true },
            storage_pool: [
                { name: 'functionality_storage', enabled_by_default: true, display_in_widget: true, readonly: true },
                { name: 'personalization_storage', display_in_widget: true },
                { name: 'ad_storage', display_in_widget: true },
                { name: 'analytics_storage', display_in_widget: true },
            ],
        },
    },
    // GTM template with the tag configuration of the Example Project (1 locale, CMP cookies API mocked)
    'example-project': {
        path: '/tests/fixtures/gtm.html',
        init: (data) => { window.__GTM_DATA__ = data; },
        arg: { ...JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/gtm/example-project.json'), 'utf8')).data, delay: 0 },
    },
};

async function measureOnce(browser, baseURL, scenario) {
    const context = await browser.newContext({ locale: 'cs-CZ' });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', NETWORK);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLING });
    await cdp.send('Performance.enable');

    const requests = [];
    page.on('request', (r) => {
        const p = new URL(r.url()).pathname;
        if (p.startsWith('/pkg/')) {
            requests.push({ path: p, at: Date.now() });
        }
    });

    await page.addInitScript(scenario.init, scenario.arg);
    await page.addInitScript(() => {
        // both plugin generations put "show--consent" on <html> when the consent modal is shown
        // the observer watches the document: <html> may not exist yet when init scripts run
        new MutationObserver((records, observer) => {
            if (document.documentElement && document.documentElement.classList.contains('show--consent')) {
                window.__shownAt = performance.now();
                window.__shownAtEpoch = performance.timeOrigin + window.__shownAt;
                observer.disconnect();
            }
        }).observe(document, { attributes: true, attributeFilter: ['class'], subtree: true });
    });

    if (process.env.PERF_DEBUG) { page.on("console", m => console.log("CON", m.text())); page.on("pageerror", e => console.log("ERR", e.message)); }
    await page.goto(baseURL + scenario.path);
    await page.waitForFunction(() => window.__shownAt !== undefined, null, { timeout: Number(process.env.PERF_TIMEOUT || 60000) });
    const shownAtEpoch = await page.evaluate(() => window.__shownAtEpoch);
    const { metrics } = await cdp.send('Performance.getMetrics');
    const metric = (name) => metrics.find(m => m.name === name)?.value ?? 0;
    const result = {
        ttm: await page.evaluate(() => window.__shownAt),
        // package requests started before the modal was shown (wall clock of this machine)
        requestsBeforeModal: requests.filter(r => r.at <= shownAtEpoch).length,
        requestPaths: requests.filter(r => r.at <= shownAtEpoch).map(r => r.path),
        // seconds of script execution on the main thread until now (includes the tiny test harness)
        scriptMs: metric('ScriptDuration') * 1000,
        taskMs: metric('TaskDuration') * 1000,
    };

    await context.close();
    return result;
}

async function measureTarget(target, variant) {
    const port = 4300 + Math.floor(Math.random() * 500);
    const server = await startServer(target, port);
    const browser = await chromium.launch();
    const result = {
        variant,
        date: new Date().toISOString().slice(0, 10),
        target: path.relative(root, target),
        version: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version,
        conditions: { browser: `chromium ${browser.version()}`, cpuThrottling: CPU_THROTTLING, network: 'Fast 3G (562.5 ms, 180 kB/s), server compresses with brotli', runs, machine: `${process.platform} ${process.arch}`, statistic: 'median' },
        sizes: sizes(target),
        scenarios: {},
    };

    try {
        for (const [name, scenario] of Object.entries(SCENARIOS)) {
            await measureOnce(browser, `http://localhost:${port}`, scenario); // warm-up (browser, server)
            const samples = [];
            for (let i = 0; i < runs; i++) {
                samples.push(await measureOnce(browser, `http://localhost:${port}`, scenario));
            }
            result.scenarios[name] = {
                ttmMs: round(median(samples.map(s => s.ttm))),
                scriptMs: round(median(samples.map(s => s.scriptMs))),
                taskMs: round(median(samples.map(s => s.taskMs))),
                requestsBeforeModal: median(samples.map(s => s.requestsBeforeModal)),
                ttmSpreadMs: round(Math.max(...samples.map(s => s.ttm)) - Math.min(...samples.map(s => s.ttm))),
                requestPaths: samples[0].requestPaths,
            };
        }
    } finally {
        await browser.close();
        server.kill();
    }

    return result;
}

function save(result) {
    fs.mkdirSync(path.join(root, 'perf/results'), { recursive: true });
    const out = path.join(root, `perf/results/${result.date}-${result.variant}.json`);
    fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
    console.log(`written ${path.relative(root, out)}`);
}

async function main() {
    const isRef = !!args.ref;
    const target = isRef ? await downloadRef() : path.resolve(root, args.target || 'var/build');
    const result = await measureTarget(target, args.variant || (isRef ? 'V0' : 'current'));

    console.log(JSON.stringify(result, null, 2));
    save(result);

    if (args.baseline && isRef) {
        fs.writeFileSync(path.join(root, 'perf/baseline-1.6.0.json'), JSON.stringify(result, null, 2) + '\n');
        console.log('written perf/baseline-1.6.0.json');
    }

    if (args.compare) {
        // 1.6.0 measured now on the same machine: timings of another machine are not comparable
        const baseline = await measureTarget(await downloadRef(), `${result.variant}-ref`);
        const budget = JSON.parse(fs.readFileSync(path.join(root, 'perf/budget.json'), 'utf8'));
        const rows = [];
        const check = (name, actual, limit, reference) => rows.push({ name, actual, limit, reference, ok: actual <= limit });

        check('js gzip (B)', result.sizes.js.gzip, budget.jsGzipMax, baseline.sizes.js.gzip);
        check('js raw (B)', result.sizes.js.raw, budget.jsRawMax, baseline.sizes.js.raw);
        check('css gzip (B)', result.sizes.css.gzip, budget.cssGzipMax, baseline.sizes.css.gzip);
        for (const name of Object.keys(SCENARIOS)) {
            check(`${name} ttm (ms)`, result.scenarios[name].ttmMs, round(baseline.scenarios[name].ttmMs * budget.ttmRatioMax), baseline.scenarios[name].ttmMs);
            check(`${name} script (ms)`, result.scenarios[name].scriptMs, round(baseline.scenarios[name].scriptMs * budget.scriptRatioMax), baseline.scenarios[name].scriptMs);
            check(`${name} requests`, result.scenarios[name].requestsBeforeModal, budget.requestsBeforeModalMax, baseline.scenarios[name].requestsBeforeModal);
        }

        const table = ['| Metric | 1.6.0 | 2.0 | Limit | OK |', '|---|---|---|---|---|', ...rows.map(r => `| ${r.name} | ${r.reference} | ${r.actual} | ${r.limit} | ${r.ok ? 'yes' : 'NO'} |`)].join('\n');
        console.log('\n' + table);
        process.env.GITHUB_STEP_SUMMARY && fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Performance against 1.6.0\n\n${table}\n`);

        if (rows.some(r => !r.ok)) {
            process.exitCode = 1;
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
