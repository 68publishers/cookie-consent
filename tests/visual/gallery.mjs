// Builds var/visual/index.html: a grid of all visual references for the review by a human.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sources = [
    { title: 'Widget 2.0', dir: 'tests/visual/__screenshots__' },
    { title: 'Example Project: 1.6.0 (reference, not compared; EXAMPLE_PROJECT_REF=1)', dir: 'var/visual/example-project-1.6.0' },
    { title: 'Firefox and WebKit (one-off, not compared; node tests/visual/other-browsers.mjs)', dir: 'var/visual/other-browsers' },
    // 1.6.0, 2.0 and the difference (red) side by side, from the last run of tests/visual/example-project-parity.spec.mjs
    { title: 'Example Project demo: 1.6.0 | 2.0 | difference (npm run test:visual -- example-project-parity)', dir: 'var/visual/parity' },
];
const out = path.join(root, 'var/visual');
fs.mkdirSync(out, { recursive: true });

let html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Cookie consent 2.0: visual references</title>'
    + '<style>body{font:14px system-ui;margin:24px;background:#f4f4f5}h2{margin-top:32px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px}'
    + 'figure{margin:0;background:#fff;padding:8px;border-radius:6px}img{width:100%;border:1px solid #ddd}figcaption{margin-top:6px;font-weight:600}</style></head><body>'
    + `<h1>Cookie consent 2.0: visual references</h1><p>Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')}.</p>`;

for (const source of sources) {
    const dir = path.join(root, source.dir);
    if (!fs.existsSync(dir)) {
        continue;
    }
    const images = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
    html += `<h2>${source.title} (${images.length})</h2><div class="grid">`;
    for (const image of images) {
        html += `<figure><a href="../../${source.dir}/${image}"><img loading="lazy" src="../../${source.dir}/${image}" alt="${image}"></a><figcaption>${image.replace(/(-darwin)?\.png$/, '')}</figcaption></figure>`;
    }
    html += '</div>';
}

fs.writeFileSync(path.join(out, 'index.html'), html + '</body></html>\n');
console.log(`written ${path.relative(root, path.join(out, 'index.html'))}`);
