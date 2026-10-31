import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { root } from './helpers.mjs';
import { PluginOptions } from '../../src/Config/PluginOptions.mjs';
import { ConsentModalOptions } from '../../src/Config/ConsentModalOptions.mjs';
import { SettingsModalOptions } from '../../src/Config/SettingsModalOptions.mjs';
import { AutoClearOptions } from '../../src/Config/AutoClearOptions.mjs';
import { UiOptions } from '../../src/Config/UiOptions.mjs';
import { CmpApiOptions } from '../../src/Config/CmpApiOptions.mjs';
import { DataLayerOptions } from '../../src/Config/DataLayerOptions.mjs';
import { StorageConfig } from '../../src/Storage/StorageConfig.mjs';

// every key of cc_wrapper_config is documented in the README.
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const section = readme.slice(readme.indexOf('## Configuration without GTM'), readme.indexOf('## Integration with CMP application'));
const documented = (key) => section.includes('`' + key + '`');
const keysOf = (options) => Object.keys(options).filter(key => !key.startsWith('_'));

describe('README: Configuration without GTM', () => {
    const groups = {
        plugin_options: new PluginOptions(),
        consent_modal_options: new ConsentModalOptions(),
        settings_modal_options: new SettingsModalOptions(),
        auto_clear_options: new AutoClearOptions(),
        ui_options: new UiOptions(''),
        cmp_api_options: new CmpApiOptions(),
        data_layer_options: new DataLayerOptions(),
        storage_pool: new StorageConfig({ name: 'x' }),
    };

    for (const [group, options] of Object.entries(groups)) {
        it(`documents ${group}`, () => {
            expect(documented(group)).toBe(true);
            expect(keysOf(options).filter(key => !documented(key))).toEqual([]);
        });
    }

    it('documents the remaining top-level keys', () => {
        for (const key of ['user_options', 'identity', 'attributes', 'event_triggers', 'storage_names', 'locales', 'translations']) {
            expect(documented(key), key).toBe(true);
        }
    });
});
