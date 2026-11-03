import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSection } from '../gtm/extract-template.mjs';
import { root } from './helpers.mjs';

const current = path.join(root, 'gtm_template.tpl');
// npm run ref
const v16 = path.join(root, 'var/perf-ref/gtm_template.tpl');
const keysOf = (file) => JSON.parse(readSection('WEB_PERMISSIONS', file).replace(/\\u0027/g, "'"))
    .flatMap(p => [p.instance.key.publicId, ...JSON.stringify(p.instance.param).match(/"string":"[^"]*"/g) || []]);

describe('GTM template 2.0', () => {
    // GTM rejects access_globals keys starting with a window global (navigator.globalPrivacyControl): no new permission
    it('permissions are the same as in 1.6.0', () => {
        expect(keysOf(current)).toEqual(keysOf(v16));
    });

    it('removed and added fields', () => {
        const names = JSON.stringify(JSON.parse(readSection('TEMPLATE_PARAMETERS', current).replace(/\\u0027/g, "'")));

        for (const removed of ['consent_modal_transition', 'settings_modal_transition', 'use_rfc_cookie']) {
            expect(names).not.toContain(`"${removed}"`);
        }
        for (const added of ['settings_modal_preferences_mode', 'respect_gpc', 'gpc_signal']) {
            expect(names).toContain(`"${added}"`);
        }
        expect(fs.readFileSync(current, 'utf8')).toContain('2.0.0:');
    });
});
