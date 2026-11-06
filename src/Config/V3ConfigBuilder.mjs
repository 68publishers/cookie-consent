/**
 * Builds the configuration of vanilla-cookieconsent 3.x from the wrapper configuration (cc_wrapper_config).
 */
const BAR_POSITIONS = ['top', 'bottom'];

export function resolveConsentModalGui(options) {
    const layout = ['box', 'cloud', 'bar'].includes(options.layout) ? options.layout : 'box';
    let position = options.position || 'bottom center';

    if ('bar' === layout) {
        // the bar has a vertical position only
        const vertical = position.split(' ')[0];
        position = BAR_POSITIONS.includes(vertical) ? vertical : 'bottom';
    }

    return {
        layout,
        position,
        flipButtons: !!options.swap_buttons,
        equalWeightButtons: !!options.equal_weight_buttons,
    };
}

export function resolvePreferencesModalGui(options) {
    const layout = 'bar' === options.layout ? 'bar' : 'box';
    const gui = { layout, flipButtons: false, equalWeightButtons: true };

    if ('bar' === layout) {
        gui.position = 'left' === options.position ? 'left' : 'right';
    }

    return gui;
}

export const PREFERENCES_MODE_SERVICES = 'services';

/**
 * Services of a storage: configured ones (storage_pool[].services) merged with the providers from the CMP (by code).
 * @returns {Object<string, {label: string}>}
 */
export function buildServices(storage, cmpServices = {}) {
    const services = {};
    const label = (name, text) => text || name;

    for (const service of storage.services) {
        services[service.name] = { label: label(service.name, service.label) };
    }

    for (const [code, provider] of Object.entries(cmpServices[storage.name] || {})) {
        if (!(code in services)) {
            services[code] = { label: label(code, provider.name) };
        }
    }

    return services;
}

/**
 * @param {import('./Config.mjs').Config} config
 * @param {import('../Storage/StoragePool.mjs').StoragePool} storagePool
 * @param {Object<string, Object<string, {name: string, link: string}>>} cmpServices providers from the CMP by storage and code
 */
export function buildCategories(config, storagePool, cmpServices = {}) {
    const categories = {};
    const withServices = PREFERENCES_MODE_SERVICES === config.settingsModalOptions.preferences_mode;

    for (const storage of storagePool.all()) {
        if (!storage.displayInWidget) {
            continue;
        }

        categories[storage.name] = {
            // "visible, readonly, disabled" storages are plain categories, the wrapper keeps them disabled
            enabled: storage.enabledByDefault,
            readOnly: storage.readonly && storage.enabledByDefault,
        };

        if (withServices) {
            const services = buildServices(storage, cmpServices);

            if (0 < Object.keys(services).length) {
                categories[storage.name].services = services;
            }
        }
    }

    return categories;
}

/**
 * @param {object} params
 * @param {import('./Config.mjs').Config} params.config
 * @param {import('../Storage/StoragePool.mjs').StoragePool} params.storagePool
 * @param {string[]} params.locales available locales
 * @param {function(string): Promise<object>} params.translation loader of a translation for a locale
 * @param {object} params.callbacks onFirstConsent, onConsent, onChange, onModalReady, onModalShow, onModalHide
 * @param {object} [params.cmpServices] providers from the CMP for the "services" preferences mode
 */
export function buildPluginConfig({ config, storagePool, locales, translation, callbacks = {}, cmpServices = {} }) {
    const plugin = config.pluginOptions;
    const defaultLocale = locales.includes(plugin.current_lang) ? plugin.current_lang : (locales[0] || plugin.current_lang);
    const translations = {};

    for (const locale of locales) {
        translations[locale] = () => translation(locale);
    }

    const pluginConfig = {
        mode: 'opt-in',
        revision: Number(plugin.revision) || 0,
        // the wrapper shows the modal itself (delay, autorun)
        autoShow: false,
        manageScriptTags: !!plugin.page_scripts,
        // the wrapper clears cookies itself (all three strategies, AutoClearOptions)
        autoClearCookies: false,
        hideFromBots: !!plugin.hide_from_bots,
        disablePageInteraction: !!plugin.force_consent,
        lazyHtmlGeneration: false !== plugin.lazy_html_generation,
        cookie: {
            name: plugin.cookie_name,
            domain: plugin.resolveCookieDomain(),
            path: plugin.cookie_path,
            sameSite: plugin.cookie_same_site,
            expiresAfterDays: Number(plugin.cookie_expiration),
        },
        guiOptions: {
            consentModal: resolveConsentModalGui(config.consentModalOptions),
            preferencesModal: resolvePreferencesModalGui(config.settingsModalOptions),
        },
        categories: buildCategories(config, storagePool, cmpServices),
        language: {
            default: defaultLocale,
            translations,
        },
        ...callbacks,
    };

    if (plugin.auto_language) {
        pluginConfig.language.autoDetect = plugin.auto_language;
    }

    return pluginConfig;
}
