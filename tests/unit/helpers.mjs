import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Config } from '../../src/Config/Config.mjs';
import { StoragePool } from '../../src/Storage/StoragePool.mjs';
import { Storage } from '../../src/Storage/Storage.mjs';
import { sandboxedCode } from '../gtm/extract-template.mjs';

// node paths: jsdom replaces the global URL class
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

/**
 * Runs the GTM template (through the browser shim) in jsdom and returns window.cc_wrapper_config.
 */
export function wrapperConfigFromTemplate(data) {
    delete window.cc_wrapper_config;
    window.dataLayer = [];
    // eslint-disable-next-line no-new-func
    new Function(fs.readFileSync(path.join(root, 'tests/gtm/sandbox-shim.js'), 'utf8'))();
    window.runGtmTemplate(sandboxedCode(), data);

    return JSON.parse(JSON.stringify(window.cc_wrapper_config));
}

/**
 * The same merging as CookieConsentWrapperFactory, without starting the widget.
 */
export function createConfig(wrapperConfig) {
    const config = new Config('https://cdn.example.com/pkg');
    const storagePool = new StoragePool();

    config.pluginOptions.merge(wrapperConfig.plugin_options || {});
    config.consentModalOptions.merge(wrapperConfig.consent_modal_options || {});
    config.settingsModalOptions.merge(wrapperConfig.settings_modal_options || {});
    config.autoClearOptions.merge(wrapperConfig.auto_clear_options || {});
    config.uiOptions.merge(wrapperConfig.ui_options || {});
    config.cmpApiOptions.merge(wrapperConfig.cmp_api_options || {});
    config.dataLayerOptions.merge(wrapperConfig.data_layer_options || {});

    for (const storage of wrapperConfig.storage_pool || []) {
        storagePool.add(new Storage(storage));
    }

    return { config, storagePool };
}

export const DEMO_CONFIG = {
    plugin_options: { cookie_name: 'consent-settings', force_consent: true, page_scripts: true },
    auto_clear_options: { enabled: true, strategy: 'clear_all_except_defined' },
    consent_modal_options: { position: 'middle center', secondary_button_role: 'accept_necessary', show_third_button: true },
    settings_modal_options: { modal_trigger_selector: 'footer .footer-item' },
    locales: ['en'],
    storage_pool: [
        { name: 'functionality_storage', enabled_by_default: true, display_in_widget: true, readonly: true },
        { name: 'personalization_storage', sync_consent_with: 'functionality_storage' },
        { name: 'security_storage', display_in_widget: false },
        { name: 'ad_storage', display_in_widget: true },
        { name: 'analytics_storage', display_in_widget: true },
    ],
};
