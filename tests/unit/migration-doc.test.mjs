import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { root } from './helpers.mjs';

// every selector of the 1.x CSS of clients has a row in the migration guide.
const doc = fs.readFileSync(path.join(root, 'docs/migration-from-1.x-to-2.0.md'), 'utf8');
const firstColumn = doc.split('\n').filter(line => line.startsWith('| `')).map(line => line.split('|')[1]).join(' ');

function selectorsOf(css) {
    const withoutUrls = css.replace(/url\([^)]*\)/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = withoutUrls.match(/[^{}]+(?=\{)/g) || [];
    const tokens = new Set();

    for (const rule of rules) {
        if (rule.trim().startsWith('@') || rule.includes(':root')) {
            continue;
        }
        (rule.match(/[#.][a-zA-Z_][\w-]*/g) || []).forEach(token => tokens.add(token));
    }

    return [...tokens].sort();
}

const sources = [
    'tests/fixtures/clients/example-project/branding.css',
    'tests/fixtures/clients/example-project/app-settings.html',
    'tests/fixtures/clients/example-project/app-webview.html',
];

describe('migration guide: CSS selectors', () => {
    for (const source of sources) {
        it(`covers every selector of ${source}`, () => {
            const css = fs.readFileSync(path.join(root, source), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
            const missing = selectorsOf(css).filter(token => !firstColumn.includes('`' + token + '`') && !firstColumn.includes(token + '`') && !new RegExp(`\`${token.replace('.', '\\.')}[\\s\`,]`).test(firstColumn));

            expect(missing).toEqual([]);
        });
    }
});
