import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { root } from './helpers.mjs';

const { version } = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@playwright/test/package.json'), 'utf8'));

describe('Playwright image', () => {
    // browsers in the image must match the installed @playwright/test
    it.each(['Dockerfile', '.github/workflows/tests.yml', '.github/workflows/release-package.yml'])('%s uses the image of the installed @playwright/test', (file) => {
        const tags = fs.readFileSync(path.join(root, file), 'utf8').match(/playwright:v[\d.]+-noble/g);
        expect(tags.length).toBeGreaterThan(0);
        expect(new Set(tags)).toEqual(new Set([`playwright:v${version}-noble`]));
    });
});
