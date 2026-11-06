// Static server for e2e tests: /pkg/* serves the tested build (CC_TARGET), everything else the repo root.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { sandboxedCode } from './gtm/extract-template.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(root, process.env.CC_TARGET || 'var/build');
// wrapper 1.6.0 for rollback tests (npm run ref)
const ref = path.resolve(root, process.env.CC_REF || 'var/perf-ref');
const port = Number(process.env.CC_PORT || 4173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/__gtm/template.js') {
        // ?file= allows running another template version (e.g. one extracted from git history)
        const file = url.searchParams.get('file') ? path.resolve(root, url.searchParams.get('file')) : undefined;
        res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' });
        res.end('window.__gtmTemplateCode = ' + JSON.stringify(sandboxedCode(file)) + ';');
        return;
    }

    const file = pathname.startsWith('/pkg/') ? path.join(target, pathname.slice(5))
        : pathname.startsWith('/ref/') ? path.join(ref, pathname.slice(5))
            : path.join(root, pathname);

    if (!file.startsWith(root) && !file.startsWith(target) && !file.startsWith(ref)) {
        res.writeHead(403).end();
        return;
    }

    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404).end('not found');
            return;
        }
        const type = types[path.extname(file)] || 'application/octet-stream';
        const headers = { 'content-type': type, 'cache-control': 'no-store' };
        const accept = req.headers['accept-encoding'] || '';

        // compress text like a CDN (unpkg serves brotli/gzip), so transfer sizes are realistic in perf runs
        if (!type.startsWith('image/')) {
            if (accept.includes('br')) {
                headers['content-encoding'] = 'br';
                data = zlib.brotliCompressSync(data);
            } else if (accept.includes('gzip')) {
                headers['content-encoding'] = 'gzip';
                data = zlib.gzipSync(data);
            }
        }

        res.writeHead(200, headers);
        res.end(data);
    });
}).listen(port, () => console.log(`cc test server on ${port}, target ${target}`));
