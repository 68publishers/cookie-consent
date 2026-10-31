import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSection } from '../gtm/extract-template.mjs';
import { root } from './helpers.mjs';

const current = path.join(root, 'gtm_template.tpl');
const v16 = path.join(root, 'tests/fixtures/gtm/template-1.6.0.tpl');
const keysOf = (file) => JSON.parse(readSection('WEB_PERMISSIONS', file).replace(/\\u0027/g, "'"))
    .flatMap(p => [p.instance.key.publicId, ...JSON.stringify(p.instance.param).match(/"string":"[^"]*"/g) || []]);

describe('GTM template 2.0', () => {
    it('permissions differ from 1.6.0 only by reading navigator.globalPrivacyControl', () => {
        const before = keysOf(v16);
        const after = keysOf(current);
        const added = after.filter((k, i) => before.indexOf(k) === -1 || after.slice(0, i).filter(x => x === k).length >= before.filter(x => x === k).length);

        expect(added.filter(k => !['"string":"key"', '"string":"read"', '"string":"write"', '"string":"execute"'].includes(k))).toEqual(['"string":"navigator.globalPrivacyControl"']);
        expect(before.every(k => after.includes(k))).toBe(true);
    });

    it('removed and added fields', () => {
        const names = JSON.stringify(JSON.parse(readSection('TEMPLATE_PARAMETERS', current).replace(/\\u0027/g, "'")));

        for (const removed of ['consent_modal_transition', 'settings_modal_transition', 'use_rfc_cookie']) {
            expect(names).not.toContain(`"${removed}"`);
        }
        for (const added of ['settings_modal_preferences_mode', 'respect_gpc']) {
            expect(names).toContain(`"${added}"`);
        }
        expect(fs.readFileSync(current, 'utf8')).toContain('2.0.0:');
    });
});
