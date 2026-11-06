import { describe, expect, it, vi } from 'vitest';
import { buildPluginConfig, resolveConsentModalGui, resolvePreferencesModalGui } from '../../src/Config/V3ConfigBuilder.mjs';
import { PluginOptions } from '../../src/Config/PluginOptions.mjs';
import { ConsentModalOptions } from '../../src/Config/ConsentModalOptions.mjs';
import { SettingsModalOptions } from '../../src/Config/SettingsModalOptions.mjs';
import { createConfig, readJson, wrapperConfigFromTemplate, DEMO_CONFIG } from './helpers.mjs';

const serializable = (pluginConfig) => JSON.parse(JSON.stringify(pluginConfig, (key, value) => ('function' === typeof value ? '[function]' : value)));

function build(wrapperConfig, locales = wrapperConfig.locales || ['en']) {
    const { config, storagePool } = createConfig(wrapperConfig);

    return buildPluginConfig({ config, storagePool, locales, translation: async () => ({}), callbacks: { onConsent: () => {} } });
}

describe('V3ConfigBuilder', () => {
    it('builds the plugin configuration of the demo page', () => {
        expect(serializable(build(DEMO_CONFIG))).toMatchSnapshot();
    });

    it('builds the plugin configuration of the GTM tag of the Example Project', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const wrapperConfig = wrapperConfigFromTemplate(readJson('tests/fixtures/gtm/example-project.json').data);
        const pluginConfig = serializable(build(wrapperConfig));

        expect(pluginConfig).toMatchSnapshot();
        expect(Object.keys(pluginConfig.categories)).toEqual(['functionality_storage', 'personalization_storage', 'ad_storage', 'analytics_storage']);
        expect(pluginConfig.categories.functionality_storage).toEqual({ enabled: true, readOnly: true });
        expect(pluginConfig.cookie.domain).toBe(window.location.hostname);
        vi.restoreAllMocks();
    });

    it('maps the consent modal layouts and positions of the GTM template', () => {
        expect(resolveConsentModalGui({ layout: 'box', position: 'middle left' })).toMatchObject({ layout: 'box', position: 'middle left' });
        expect(resolveConsentModalGui({ layout: 'cloud', position: 'top center' })).toMatchObject({ layout: 'cloud', position: 'top center' });
        expect(resolveConsentModalGui({ layout: 'bar', position: 'top right' })).toMatchObject({ layout: 'bar', position: 'top' });
        expect(resolveConsentModalGui({ layout: 'bar', position: 'middle center' })).toMatchObject({ layout: 'bar', position: 'bottom' });
        expect(resolveConsentModalGui({ layout: 'box', position: 'bottom center', swap_buttons: true })).toMatchObject({ flipButtons: true, equalWeightButtons: false });
        expect(resolvePreferencesModalGui({ layout: 'box', position: 'left' })).toEqual({ layout: 'box', flipButtons: false, equalWeightButtons: true });
        expect(resolvePreferencesModalGui({ layout: 'bar', position: 'left' })).toMatchObject({ layout: 'bar', position: 'left' });
        expect(resolvePreferencesModalGui({ layout: 'bar' })).toMatchObject({ layout: 'bar', position: 'right' });
    });

    it('falls back to the first available locale when current_lang has no translations', () => {
        expect(build({ ...DEMO_CONFIG, plugin_options: { current_lang: 'en' } }, ['cs', 'sk']).language.default).toBe('cs');
    });

    it('has a mapping for every option or marks it as deprecated or wrapper-only', () => {
        // every option of the wrapper must end up somewhere; a new option without a decision fails here
        const handled = {
            plugin: {
                mapped: ['revision', 'page_scripts', 'hide_from_bots', 'force_consent', 'lazy_html_generation', 'cookie_name', 'cookie_domain', 'cookie_path', 'cookie_same_site', 'cookie_expiration', 'current_lang', 'auto_language'],
                wrapper: ['autorun', 'delay', 'script_selector', 'init_after_dom_content_loaded', 'remove_cookie_tables', 'compat_legacy_ids'],
                deprecated: ['use_rfc_cookie'],
            },
            consentModal: {
                mapped: ['layout', 'position', 'swap_buttons', 'equal_weight_buttons'],
                wrapper: ['primary_button_role', 'secondary_button_role', 'show_third_button'],
                deprecated: ['transition'],
            },
            settingsModal: {
                mapped: ['layout', 'position'],
                wrapper: ['modal_trigger_selector', 'preferences_mode'],
                deprecated: ['transition'],
            },
        };
        const keys = (options) => Object.keys(options).filter(k => !k.startsWith('_')).sort();
        const all = (group) => [...group.mapped, ...group.wrapper, ...group.deprecated].sort();

        expect(keys(new PluginOptions())).toEqual(all(handled.plugin));
        expect(keys(new ConsentModalOptions())).toEqual(all(handled.consentModal));
        expect(keys(new SettingsModalOptions())).toEqual(all(handled.settingsModal));
    });
});

describe('deprecated options', () => {
    it('warns about transition and use_rfc_cookie and ignores them', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const withDeprecated = build({
            ...DEMO_CONFIG,
            plugin_options: { ...DEMO_CONFIG.plugin_options, use_rfc_cookie: true },
            consent_modal_options: { ...DEMO_CONFIG.consent_modal_options, transition: 'slide' },
            settings_modal_options: { ...DEMO_CONFIG.settings_modal_options, transition: 'zoom' },
        });

        expect(warn).toHaveBeenCalledTimes(3);
        expect(warn.mock.calls.map(c => c[0]).join('\n')).toMatch(/use_rfc_cookie[\s\S]*transition[\s\S]*transition/);
        expect(serializable(withDeprecated)).toEqual(serializable(build(DEMO_CONFIG)));
        vi.restoreAllMocks();
    });
});

describe('services mode', () => {
    const withServices = {
        settings_modal_options: { preferences_mode: 'services' },
        storage_pool: [
            { name: 'functionality_storage', enabled_by_default: true, display_in_widget: true, readonly: true },
            { name: 'ad_storage', display_in_widget: true, services: [{ name: 'sklik', label: 'Seznam Sklik' }, { name: 'meta' }] },
            { name: 'analytics_storage', display_in_widget: true },
        ],
    };

    it('adds configured services and CMP providers to the categories', () => {
        const { config, storagePool } = createConfig(withServices);
        const pluginConfig = buildPluginConfig({
            config, storagePool, locales: ['en'], translation: async () => ({}),
            cmpServices: { ad_storage: { meta: { name: 'Meta (CMP)' }, google_ads: { name: 'Google Ads' } }, analytics_storage: { google_analytics: { name: 'Google Analytics' } } },
        });

        expect(pluginConfig.categories.ad_storage.services).toEqual({
            sklik: { label: 'Seznam Sklik' },
            meta: { label: 'meta' },
            google_ads: { label: 'Google Ads' },
        });
        expect(pluginConfig.categories.analytics_storage.services).toEqual({ google_analytics: { label: 'Google Analytics' } });
        expect(pluginConfig.categories.functionality_storage.services).toBeUndefined();
    });

    it('ignores services in the categories mode', () => {
        const { config, storagePool } = createConfig({ ...withServices, settings_modal_options: {} });
        const pluginConfig = buildPluginConfig({ config, storagePool, locales: ['en'], translation: async () => ({}), cmpServices: { ad_storage: { meta: { name: 'Meta' } } } });

        expect(Object.values(pluginConfig.categories).some(c => 'services' in c)).toBe(false);
    });
});
