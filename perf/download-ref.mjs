// Downloads wrapper 1.6.0 from unpkg into var/perf-ref (reference for perf runs and rollback tests).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REF_VERSION = '1.6.0';
export const REF_DIR = path.join(root, 'var/perf-ref');
const FILES = ['cookie-consent.min.js', 'cookie-consent.css', 'translations/cs.json', 'translations/en.json', 'translations/de.json', 'translations/cs.json.js', 'translations/en.json.js', 'translations/de.json.js'];

export async function downloadRef() {
    for (const file of FILES) {
        const out = path.join(REF_DIR, file);
        if (fs.existsSync(out)) {
            continue;
        }
        const res = await fetch(`https://unpkg.com/@68publishers/cookie-consent@${REF_VERSION}/dist/${file}`);
        if (!res.ok) {
            throw new Error(`Download of ${file} failed: ${res.status}`);
        }
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    }
    return REF_DIR;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    downloadRef().then(dir => console.log(`1.6.0 in ${path.relative(root, dir)}`)).catch((e) => { console.error(e); process.exit(1); });
}
