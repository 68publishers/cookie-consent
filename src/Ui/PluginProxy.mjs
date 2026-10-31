import { eraseCookies } from '../Utils/Cookies.mjs';

/**
 * Object returned by CookieConsentWrapper.unwrap(): the API of plugin 3.x plus aliases of the 2.9 API,
 * so Custom HTML tags written for wrapper 1.x keep working (each alias warns once).
 * Will be removed in the next major version.
 */
const GET_CONFIG_KEYS = {
    cookie_name: (config) => config.cookie && config.cookie.name,
    cookie_domain: (config) => config.cookie && config.cookie.domain,
    cookie_path: (config) => config.cookie && config.cookie.path,
    cookie_same_site: (config) => config.cookie && config.cookie.sameSite,
    cookie_expiration: (config) => config.cookie && config.cookie.expiresAfterDays,
    revision: (config) => config.revision,
    autoclear_cookies: (config) => config.autoClearCookies,
    page_scripts: (config) => config.manageScriptTags,
    hide_from_bots: (config) => config.hideFromBots,
    force_consent: (config) => config.disablePageInteraction,
    gui_options: (config) => config.guiOptions,
    languages: (config) => config.language && config.language.translations,
};

export function createPluginProxy(plugin, wrapper) {
    const warned = {};
    const warn = (name, replacement) => {
        if (!warned[name]) {
            warned[name] = true;
            console.warn(`CookieConsentWrapper: unwrap().${name}() is the API of the plugin 2.9 and will be removed in the next major version, use ${replacement}.`);
        }
    };
    let customHideSettings = null;
    const later = (delay, fn) => (delay > 0 ? setTimeout(fn, delay) : fn());

    const proxy = Object.assign({}, plugin, {
        getConfig(field) {
            if (undefined !== field && field in GET_CONFIG_KEYS) {
                warn(`getConfig('${field}')`, 'the keys of the plugin 3.x configuration');
                return GET_CONFIG_KEYS[field](plugin.getConfig());
            }
            if ('current_lang' === field) {
                warn(`getConfig('${field}')`, 'CookieConsentWrapper.currentLocale');
                return wrapper.currentLocale;
            }

            return plugin.getConfig(field);
        },
        show(arg) {
            if ('number' === typeof arg) {
                warn('show(delay)', 'unwrap().show()');
                later(arg, () => plugin.show(true));
                return;
            }
            plugin.show(undefined === arg ? true : arg);
        },
        showSettings(delay) {
            warn('showSettings', 'unwrap().showPreferences()');
            later(delay, () => plugin.showPreferences());
        },
        eraseCookies(cookies, path, domain) {
            plugin.eraseCookies(cookies, path, domain);
            // also the host-only copy, like the plugin 2.9 did
            eraseCookies([].concat(cookies), path || '/', []);
        },
        allowedCategory(name) {
            warn('allowedCategory', 'unwrap().acceptedCategory()');
            return plugin.acceptedCategory(name);
        },
        accept(categories, exclusions) {
            warn('accept', 'unwrap().acceptCategory()');
            plugin.acceptCategory(undefined === categories ? 'all' : categories, exclusions || []);
        },
        updateLanguage(lang, force) {
            warn('updateLanguage', 'CookieConsentWrapper.changeLocale()');
            wrapper.changeLocale(lang, force);
            return true;
        },
        getUserPreferences() {
            const preferences = plugin.getUserPreferences();

            return {
                ...preferences,
                accept_type: preferences.acceptType,
                accepted_categories: preferences.acceptedCategories,
                rejected_categories: preferences.rejectedCategories,
            };
        },
        set(field, data) {
            warn('set', 'unwrap().setCookieData()');
            return 'data' === field ? plugin.setCookieData(data) : false;
        },
        get(field) {
            warn('get', 'unwrap().getCookie()');
            return plugin.getCookie(field);
        },
    });

    // 1.x tags replaced hideSettings to keep the settings modal open (e.g. inside a mobile app)
    Object.defineProperty(proxy, 'hideSettings', {
        enumerable: true,
        get() {
            return customHideSettings || (() => {
                warn('hideSettings', 'unwrap().hidePreferences()');
                plugin.hidePreferences();
            });
        },
        set(fn) {
            warn('hideSettings = ...', 'CookieConsentWrapper.setSettingsModalClosable(false)');
            customHideSettings = 'function' === typeof fn ? fn : null;
            wrapper.setSettingsModalClosable(!customHideSettings);
        },
    });

    return proxy;
}
